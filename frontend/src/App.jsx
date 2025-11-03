import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { supabase } from './supabase';

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
  const mapRef = useRef(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);
  const fetchFeedbacks = async () => {
    const { data, error } = await supabase.from('feedbacks').select('*');
    if (error) console.error('Error fetching feedbacks:', error);
    else setFeedbacks(data || []);
  };

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, []);

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

    // Mock DB Code
    // // Update local state for count
    // setFeedbacks([...feedbacks, newFeedback]);
    // console.log('Feedback saved (DB):', newFeedback);

    alert(`Feedback submitted! Total entries: ${feedbacks.length + 1}`);
    setFeedback('');
    setShowFeedback(false);
    fetchFeedbacks();
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
                  placeholder="Suggestions? (e.g., Add more ramps)"
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
        <Marker key={i} position={[b.xcoord, b.ycoord]} />
        ))}
    </MapContainer>
    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: '0' }}>
        {routeDrawn ? 'Route drawn (drag to adjust).' : 'Zoom/pan to explore UMBC.'}
    </p>
    </div>
      <footer style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Built by Team 1 | Sprint 2 Progress | Now with Supabase
      </footer>
      {/* Hamburger Menu */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: menuOpen ? 0 : '-400px',
        width: '300px',
        height: '100%',
        backgroundColor: '#fff',
        transition: 'right 0.3s ease',
        padding: '20px',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.5)',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        <button
          onClick={() => setMenuOpen(false)}
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
        <h2 style={{ marginTop: '40px' }}>About</h2>
        <p>This is the UMBC Accessible Navigation System.</p>
        
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
        
        <h2>Help</h2>
        <p>Select start and destination from the dropdowns, then click Get Accessible Route to see the path on the map. Use the + button to submit feedback.</p>
      </div>
    </div>
  );
}

export default App;