import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [page, setPage] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  
  const [events, setEvents] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('my-events');
  
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function fetchUser() {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: decoded.userId });
      setPage('app');
    } catch (err) {
      localStorage.removeItem('token');
      setToken(null);
    }
  }

  async function loadData() {
    try {
      const [eventsRes, marketplaceRes, requestsRes] = await Promise.all([
        fetch(`${API_URL}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/swappable-slots`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/swap-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setEvents(await eventsRes.json());
      setMarketplace(await marketplaceRes.json());
      setRequests(await requestsRes.json());
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  async function handleAuth() {
    setError('');
    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const body = isSignup ? { name, email, password } : { email, password };
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setPage('app');
    } catch (err) {
      setError('Network error');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPage('login');
    setEmail('');
    setPassword('');
  }

  async function createEvent() {
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          startTime: newStart,
          endTime: newEnd,
          status: 'BUSY'
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewStart('');
        setNewEnd('');
        setShowNewEvent(false);
        loadData();
      }
    } catch (err) {
      alert('Error creating event');
    }
  }

  async function toggleStatus(id, current) {
    if (current === 'SWAP_PENDING') return;
    
    try {
      const newStatus = current === 'SWAPPABLE' ? 'BUSY' : 'SWAPPABLE';
      await fetch(`${API_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      alert('Error updating event');
    }
  }

  function requestSwap(theirSlot) {
    setSelectedSlot(theirSlot);
    setShowSwapPicker(true);
  }

  async function confirmSwap(mySlotId) {
    try {
      const res = await fetch(`${API_URL}/api/swap-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mySlotId,
          theirSlotId: selectedSlot.id
        })
      });

      if (res.ok) {
        setShowSwapPicker(false);
        setSelectedSlot(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Error creating swap request');
    }
  }

  async function respondSwap(reqId, accept) {
    try {
      await fetch(`${API_URL}/api/swap-response/${reqId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: accept ? 'ACCEPT' : 'REJECT' })
      });
      loadData();
    } catch (err) {
      alert('Error responding to swap');
    }
  }

  function formatTime(t) {
    return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '28px', textAlign: 'center' }}>SlotSwapper</h1>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
            {isSignup ? 'Create account' : 'Sign in'}
          </p>

          {error && (
            <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {isSignup && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <button onClick={handleAuth} style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}>
            {isSignup ? 'Sign Up' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px' }}>
            {isSignup ? 'Have an account?' : "Don't have an account?"}{' '}
            <span onClick={() => { setIsSignup(!isSignup); setError(''); }} style={{ color: '#667eea', cursor: 'pointer' }}>
              {isSignup ? 'Sign in' : 'Sign up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #ddd', padding: '15px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>SlotSwapper</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px' }}>Hi, User</span>
            <button onClick={logout} style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setTab('my-events')}
            style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === 'my-events' ? '2px solid #667eea' : 'none', marginBottom: '-2px', fontWeight: tab === 'my-events' ? 'bold' : 'normal' }}
          >
            My Events
          </button>
          <button
            onClick={() => setTab('marketplace')}
            style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === 'marketplace' ? '2px solid #667eea' : 'none', marginBottom: '-2px', fontWeight: tab === 'marketplace' ? 'bold' : 'normal' }}
          >
            Marketplace
          </button>
          <button
            onClick={() => setTab('requests')}
            style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === 'requests' ? '2px solid #667eea' : 'none', marginBottom: '-2px', fontWeight: tab === 'requests' ? 'bold' : 'normal' }}
          >
            Requests {requests.filter(r => r.incoming && r.status === 'PENDING').length > 0 && `(${requests.filter(r => r.incoming && r.status === 'PENDING').length})`}
          </button>
        </div>

        {tab === 'my-events' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>My Events</h2>
              <button onClick={() => setShowNewEvent(true)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                + New Event
              </button>
            </div>

            {events.map(evt => (
              <div key={evt._id} style={{ background: 'white', padding: '20px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px' }}>{evt.title}</h3>
                    <p style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>
                      {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                    </p>
                    <span style={{ display: 'inline-block', padding: '4px 12px', background: evt.status === 'SWAPPABLE' ? '#e8f5e9' : evt.status === 'SWAP_PENDING' ? '#fff3e0' : '#f5f5f5', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {evt.status.replace('_', ' ')}
                    </span>
                  </div>
                  {evt.status !== 'SWAP_PENDING' && (
                    <button
                      onClick={() => toggleStatus(evt._id, evt.status)}
                      style={{ padding: '8px 16px', background: evt.status === 'SWAPPABLE' ? '#f5f5f5' : '#4caf50', color: evt.status === 'SWAPPABLE' ? '#333' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {evt.status === 'SWAPPABLE' ? 'Mark Busy' : 'Mark Swappable'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'marketplace' && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Available Slots</h2>
            {marketplace.map(slot => (
              <div key={slot.id} style={{ background: 'white', padding: '20px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px' }}>{slot.title}</h3>
                    <p style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </p>
                    <p style={{ margin: 0, color: '#999', fontSize: '13px' }}>Owner: {slot.ownerName}</p>
                  </div>
                  <button
                    onClick={() => requestSwap(slot)}
                    style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Request Swap
                  </button>
                </div>
              </div>
            ))}
            {marketplace.length === 0 && <p style={{ textAlign: 'center', color: '#999' }}>No available slots</p>}
          </div>
        )}

        {tab === 'requests' && (
          <div>
            <h3 style={{ marginBottom: '15px' }}>Incoming</h3>
            {requests.filter(r => r.incoming).map(req => (
              <div key={req.id} style={{ background: 'white', padding: '20px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '15px' }}>
                  <strong>{req.from.name}</strong> wants to swap
                  <span style={{ marginLeft: '10px', padding: '2px 8px', background: req.status === 'PENDING' ? '#fff3e0' : req.status === 'ACCEPTED' ? '#e8f5e9' : '#ffebee', borderRadius: '8px', fontSize: '12px' }}>
                    {req.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '12px', color: '#999' }}>They offer:</p>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{req.mySlot?.title}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{formatTime(req.mySlot?.startTime)}</p>
                  </div>
                  <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '12px', color: '#999' }}>For your:</p>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{req.theirSlot?.title}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{formatTime(req.theirSlot?.startTime)}</p>
                  </div>
                </div>
                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => respondSwap(req.id, true)} style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Accept
                    </button>
                    <button onClick={() => respondSwap(req.id, false)} style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {requests.filter(r => r.incoming).length === 0 && <p style={{ color: '#999', marginBottom: '30px' }}>No incoming requests</p>}

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Outgoing</h3>
            {requests.filter(r => !r.incoming).map(req => (
              <div key={req.id} style={{ background: 'white', padding: '20px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '15px' }}>
                  Request to <strong>{req.to.name}</strong>
                  <span style={{ marginLeft: '10px', padding: '2px 8px', background: req.status === 'PENDING' ? '#fff3e0' : req.status === 'ACCEPTED' ? '#e8f5e9' : '#ffebee', borderRadius: '8px', fontSize: '12px' }}>
                    {req.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '12px', color: '#999' }}>You offer:</p>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{req.mySlot?.title}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{formatTime(req.mySlot?.startTime)}</p>
                  </div>
                  <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '12px', color: '#999' }}>For their:</p>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{req.theirSlot?.title}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{formatTime(req.theirSlot?.startTime)}</p>
                  </div>
                </div>
              </div>
            ))}
            {requests.filter(r => !r.incoming).length === 0 && <p style={{ color: '#999' }}>No outgoing requests</p>}
          </div>
        )}
      </div>

      {showNewEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0 }}>New Event</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Start</label>
              <input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>End</label>
              <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createEvent} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Create
              </button>
              <button onClick={() => setShowNewEvent(false)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwapPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '600px' }}>
            <h2 style={{ marginTop: 0 }}>Pick your slot</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Requesting: <strong>{selectedSlot.title}</strong> ({formatTime(selectedSlot.startTime)})
            </p>
            {events.filter(e => e.status === 'SWAPPABLE').map(evt => (
              <div
                key={evt._id}
                onClick={() => confirmSwap(evt._id)}
                style={{ padding: '15px', background: '#f9f9f9', marginBottom: '10px', borderRadius: '6px', cursor: 'pointer', border: '2px solid #f9f9f9' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#667eea'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#f9f9f9'}
              >
                <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{evt.title}</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{formatTime(evt.startTime)} - {formatTime(evt.endTime)}</p>
              </div>
            ))}
            {events.filter(e => e.status === 'SWAPPABLE').length === 0 && (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No swappable slots</p>
            )}
            <button onClick={() => { setShowSwapPicker(false); setSelectedSlot(null); }} style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;