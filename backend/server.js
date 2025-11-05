const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: "https://slotswapper-frontend-4zls.onrender.com", // Only allow React dev server
  methods: ["GET", "POST","PUT","DELETE"],        // Allowed HTTP methods
  credentials: true                // Allow cookies/auth headers if needed 
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'], default: 'BUSY' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const swapRequestSchema = new mongoose.Schema({
  mySlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  theirSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const SwapRequest = mongoose.model('SwapRequest', swapRequestSchema);

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Auth routes
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event routes
app.get('/api/events', auth, async (req, res) => {
  try {
    const events = await Event.find({ ownerId: req.userId });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', auth, async (req, res) => {
  try {
    const { title, startTime, endTime, status } = req.body;
    const event = new Event({
      title,
      startTime,
      endTime,
      status: status || 'BUSY',
      ownerId: req.userId,
    });
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    Object.assign(event, req.body);
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Swappable slots
app.get('/api/swappable-slots', auth, async (req, res) => {
  try {
    const slots = await Event.find({
      status: 'SWAPPABLE',
      ownerId: { $ne: req.userId }
    }).populate('ownerId', 'name');
    
    const result = slots.map(slot => ({
      id: slot._id,
      title: slot.title,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      ownerId: slot.ownerId._id,
      ownerName: slot.ownerId.name,
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Swap request routes
app.post('/api/swap-request', auth, async (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;
    
    const mySlot = await Event.findOne({ _id: mySlotId, ownerId: req.userId });
    if (!mySlot || mySlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Your slot must be swappable' });
    }
    
    const theirSlot = await Event.findById(theirSlotId);
    if (!theirSlot || theirSlot.status !== 'SWAPPABLE' || theirSlot.ownerId.toString() === req.userId) {
      return res.status(400).json({ error: 'Invalid target slot' });
    }
    
    mySlot.status = 'SWAP_PENDING';
    theirSlot.status = 'SWAP_PENDING';
    await mySlot.save();
    await theirSlot.save();
    
    const swapRequest = new SwapRequest({
      mySlotId,
      theirSlotId,
      fromUserId: req.userId,
      toUserId: theirSlot.ownerId,
    });
    await swapRequest.save();
    
    res.json(swapRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/swap-response/:requestId', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { action } = req.body;
    
    const swapRequest = await SwapRequest.findOne({
      _id: req.params.requestId,
      toUserId: req.userId,
      status: 'PENDING'
    });
    
    if (!swapRequest) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const mySlot = await Event.findById(swapRequest.mySlotId);
    const theirSlot = await Event.findById(swapRequest.theirSlotId);
    
    if (action === 'ACCEPT') {
      const tempOwner = mySlot.ownerId;
      mySlot.ownerId = theirSlot.ownerId;
      theirSlot.ownerId = tempOwner;
      
      mySlot.status = 'BUSY';
      theirSlot.status = 'BUSY';
      swapRequest.status = 'ACCEPTED';
    } else {
      mySlot.status = 'SWAPPABLE';
      theirSlot.status = 'SWAPPABLE';
      swapRequest.status = 'REJECTED';
    }
    
    await mySlot.save({ session });
    await theirSlot.save({ session });
    await swapRequest.save({ session });
    
    await session.commitTransaction();
    res.json(swapRequest);
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

app.get('/api/swap-requests', auth, async (req, res) => {
  try {
    const requests = await SwapRequest.find({
      $or: [{ fromUserId: req.userId }, { toUserId: req.userId }]
    })
    .populate('mySlotId')
    .populate('theirSlotId')
    .populate('fromUserId', 'name')
    .populate('toUserId', 'name');
    
    const result = requests.map(req => ({
      id: req._id,
      mySlotId: req.mySlotId._id,
      theirSlotId: req.theirSlotId._id,
      fromUserId: req.fromUserId._id,
      toUserId: req.toUserId._id,
      status: req.status,
      createdAt: req.createdAt,
      mySlot: req.mySlotId,
      theirSlot: req.theirSlotId,
      from: req.fromUserId,
      to: req.toUserId,
      incoming: req.toUserId._id.toString() === req.userId
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
