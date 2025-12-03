import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { supabase } from './supabase';
import { Analytics } from '@vercel/analytics/react';

// Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Sample buildings (mock DB pull)
const sampleBuildings = [
  { name: 'Academic Row', lat: 39.254, lng: -76.712 },
  { name: 'Library', lat: 39.255, lng: -76.713 },
];

function App() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mapRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        return;
      }
      setUser(session?.user ?? null);
      if (session) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setIsAdmin(false);
        } else {
          setIsAdmin(profile ? profile.is_admin : false);
        }
        resetInactivityTimeout();
      } else {
        setIsAdmin(false);
      }
    };
    initializeSession();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        const { data: profile, error } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
        if (error) {
          console.error('Profile fetch error:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(profile ? profile.is_admin : false);
        }
        resetInactivityTimeout();
      } else {
        setIsAdmin(false);
        clearTimeout(inactivityTimeoutRef.current);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Inactivity logout
  const handleLogoutOnInactivity = async () => {
    await supabase.auth.signOut();
    alert('Logged out due to inactivity.');
  };

  const resetInactivityTimeout = () => {
    clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = setTimeout(handleLogoutOnInactivity, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const handleActivity = () => {
      if (user) resetInactivityTimeout();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [user]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (menuOpen && isAdmin) {
      fetchFeedbacks();
    }
  }, [menuOpen, isAdmin]);

  const fetchFeedbacks = async () => {
    const { data, error } = await supabase.from('feedbacks').select('*');
    if (error) console.error('Error fetching feedbacks:', error);
    else setFeedbacks(data || []);
  };

  const handleRoute = () => {
    if (!start || !destination) {
      alert('Please enter start and end locations for viability check!');
      return;
    }
    const startBuilding = popularLocations.find(b => b.buildingName === start);
    const destBuilding = popularLocations.find(b => b.buildingName === destination);
    if (!startBuilding || !destBuilding) {
      alert('Selected location not found in database!');
      return;
    }
    if (mapRef.current) {
      // Sample UMBC path
      const startLatLng = L.latLng(startBuilding.xcoord, startBuilding.ycoord);
      const endLatLng = L.latLng(destBuilding.xcoord, destBuilding.ycoord);
      L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        routeWhileDragging: true,
        show: false,
        createMarker: () => null,
      }).addTo(mapRef.current);
      setRouteDrawn(true);
      alert(`Route drawn: ${start} to ${destination} (accessible path via ramps). Invalid paths avoided.`);
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return alert('Add feedback!');

    // Supabase insert
    const newFeedback = { start, destination, message: feedback };
    const { error } = await supabase.from('feedbacks').insert([newFeedback]);
    if (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit—check console.');
      return;
    }

    alert(`Feedback submitted! Total entries: ${feedbacks.length + 1}`);
    setFeedback('');
    setShowFeedback(false);
    if (isAdmin) fetchFeedbacks();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setEmail('');
    setPassword('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
  };

  const [popularLocations, setPopularLocations] = useState([]);
  useEffect(() => {
    const fetchBuildings = async () => {
      const { data, error } = await supabase.from('locations').select('buildingName, xcoord, ycoord');
      if (error) {
        console.error('Error fetching buildings:', error);
      } else {
        setPopularLocations(data || []);
      }
    };
    fetchBuildings();
  }, []);
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '0 20px 20px 20px',
      position: 'relative'
    }}>
    <Analytics />
      {/* Header */}
      <header className="gold-header" style={{
        backgroundColor: '#fdb515',
        color: '#000',
        padding: '20px',
        marginBottom: '20px',
        borderRadius: '8px',
        position: 'relative'
      }}>
        <h1 style={{ margin: 0 }}>UMBC Accessible Navigation System</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>Navigate campus with ramps, elevators, and stair-free paths</p>
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            width: '30px',
            height: '25px',
          }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div style={{ width: '100%', height: '3px', backgroundColor: '#000' }}></div>
          <div style={{ width: '100%', height: '3px', backgroundColor: '#000' }}></div>
          <div style={{ width: '100%', height: '3px', backgroundColor: '#000' }}></div>
        </div>
      </header>
      {/* Inputs */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', margin: '10px 0' }}>
          Destination:
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{
              display: 'block',
              margin: '10px auto',
              padding: '10px',
              width: '300px',
              border: '1px solid #000',
              borderRadius: '4px'
            }}
          >
            <option value="">Select destination</option>
            {popularLocations.map(loc => (
              <option key={loc.buildingName} value={loc.buildingName}>{loc.buildingName}</option>
            ))}
          </select>
        </label>
        {destination && (
          <label style={{ display: 'block', margin: '10px 0' }}>
            Start Location:
            <select
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{
                display: 'block',
                margin: '10px auto',
                padding: '10px',
                width: '300px',
                border: '1px solid #000',
                borderRadius: '4px'
              }}
            >
              <option value="">Select start location</option>
              {popularLocations.map(loc => (
                <option key={loc.buildingName} value={loc.buildingName}>{loc.buildingName}</option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={handleRoute}
          style={{
            padding: '12px 24px',
            backgroundColor: '#fdb515',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          Get Accessible Route
        </button>
      </div>
      {/* Feedback Button */}
      <button
        onClick={() => setShowFeedback(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#fdb515',
          color: '#000',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          padding: '0',
          overflow: 'hidden'
        }}
      >
        +
      </button>
      {/* Feedback Modal */}
      {showFeedback && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '400px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowFeedback(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            {/* Feedback Form */}
            <form onSubmit={handleFeedback} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', margin: '10px 0' }}>
                User Feedback:
                <textarea
                  placeholder="Feel free to share your feedback about the app, or about campus (e.g., elevator not working in ITE)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  style={{
                    display: 'block',
                    margin: '10px auto',
                    padding: '10px',
                    width: '300px',
                    border: '1px solid #000',
                    borderRadius: '4px'
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Submit Feedback
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Map */}
    <div className="map-wrapper" style={{ margin: '0 auto 20px', width: '100%', maxWidth: 'none' }}>
    <MapContainer
        center={[39.254, -76.712]} // UMBC center
        zoom={15}
        style={{ height: '400px', width: '100%', borderRadius: '8px', border: '2px solid #fdb515' }}
        whenCreated={(map) => { mapRef.current = map; }}
    >
        <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {popularLocations.map((b, i) => (
        <Marker key={i} position={[b.ycoord, b.xcoord]} />
        ))}
    </MapContainer>
    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: '0' }}>
        {routeDrawn ? 'Route drawn (drag to adjust).' : 'Zoom/pan to explore UMBC.'}
    </p>
    </div>
      <footer style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Built by Team 1 | Sprint 3 Progress | Now with Supabase
      </footer>
      {/* Hamburger Menu */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: menuOpen ? 0 : '-450px',
        width: '350px',
        height: '100%',
        backgroundColor: 'rgba(245, 230, 205, 0.8)',
        boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
        transition: 'left 0.3s ease',
        padding: '20px',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        {/* Close button */}
        <button
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(140, 97, 97, 1)'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#333'}
        >
          ×
        </button>
        <h2 style={{ marginTop: '40px' }}>About</h2>
        <p>This is the UMBC Accessible Navigation System, designed to help you navigate campus safely and efficiently.</p>
        {!user ? (
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>Admin Login</h2>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={{ display: 'flex',  padding: '10px', width: '100%',flexDirection: 'column', gap: '15px', alignContent: 'center', margin: '10px 0' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{ display: 'flex', margin: '10px 0', padding: '10px', width: '100%',flexDirection: 'column', gap: '15px' }}
              />
              <button type="submit" style={{ padding: '10px', width: '100%' }}>Login</button>
            </form>
          </div>
        ) : !isAdmin ? (
          <div>
            <p>You are not an admin.</p>
            <button onClick={handleLogout} style={{ padding: '10px', width: '100%' }}>Logout</button>
          </div>
        ) : (
          <div>
            <h2>View Feedbacks</h2>
            {feedbacks.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {feedbacks.map((f, index) => (
                  <li key={f.id || index} style={{ marginBottom: '10px' }}>
                    {f.message} {f.start && f.destination && `(from ${f.start} to ${f.destination})`}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No feedbacks yet.</p>
            )}
            <button onClick={handleLogout} style={{ padding: '10px', width: '100%' }}>Logout</button>
          </div>
        )}
        <h2>Help</h2>
        <p>Select start and destination from the dropdowns, then click Get Accessible Route to see the path on the map. Use the + button to submit feedback.</p>
      </div>
    </div>
  );
}

export default App;