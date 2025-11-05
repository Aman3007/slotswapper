# SlotSwapper - Time Slot Exchange Platform

A web application that allows users to mark their calendar slots as swappable and exchange them with other users through a request/response system.
view site : https://slotswapper-frontend-4zls.onrender.com
## Features

- JWT-based authentication (signup/login)
- Create and manage calendar events
- Mark events as swappable
- Browse marketplace of available slots from other users
- Request swaps by offering your own swappable slots
- Accept or reject incoming swap requests
- Automatic slot locking during pending swaps
- Transactional swap completion

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- bcryptjs for password hashing

**Frontend:**
- React 
- Vanilla CSS (inline styles)
- Fetch API for HTTP requests

## Project Structure
```
slotswapper/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js /Express
- MongoDB 

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm init
npm install
```

3. Create `.env` file:
```
MONGO_URI=mongodb://localhost:27017/slotswapper
JWT_SECRET=your-super-secret-key-change-this
PORT=5000
```

4. Start the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```



Frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication

**POST** `/auth/signup`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
Returns: `{ token, user }`

**POST** `/auth/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
Returns: `{ token, user }`

### Events

**GET** `/api/events`  
Headers: `Authorization: Bearer <token>`  
Returns: Array of user's events

**POST** `/api/events`  
Headers: `Authorization: Bearer <token>`
```json
{
  "title": "Team Meeting",
  "startTime": "2025-11-05T10:00:00Z",
  "endTime": "2025-11-05T11:00:00Z",
  "status": "BUSY"
}
```

**PUT** `/api/events/:id`  
Headers: `Authorization: Bearer <token>`
```json
{
  "status": "SWAPPABLE"
}
```

**DELETE** `/api/events/:id`  
Headers: `Authorization: Bearer <token>`

### Marketplace

**GET** `/api/swappable-slots`  
Headers: `Authorization: Bearer <token>`  
Returns: Array of swappable slots from other users

### Swap Requests

**POST** `/api/swap-request`  
Headers: `Authorization: Bearer <token>`
```json
{
  "mySlotId": "event_id_1",
  "theirSlotId": "event_id_2"
}
```

**POST** `/api/swap-response/:requestId`  
Headers: `Authorization: Bearer <token>`
```json
{
  "action": "ACCEPT"
}
```
Action can be: `ACCEPT` or `REJECT`

**GET** `/api/swap-requests`  
Headers: `Authorization: Bearer <token>`  
Returns: Array of incoming and outgoing swap requests

## How It Works

1. User signs up/logs in - Gets a JWT token for authentication
2. Create events - Add calendar slots with title, start/end times
3. Mark as swappable - Change event status from BUSY to SWAPPABLE
4. Browse marketplace - See all swappable slots from other users
5. Request swap - Pick one of your swappable slots to offer in exchange
6. Both slots lock - Status changes to SWAP_PENDING during the request
7. Owner responds - Can accept or reject the swap
   - If accepted : Events swap owners, both become BUSY
   - If rejected : Both return to SWAPPABLE status

## Future Enhancements

- Real-time notifications (WebSocket/Socket.io)
- Calendar view with date picker
- Swap history
- User profiles



