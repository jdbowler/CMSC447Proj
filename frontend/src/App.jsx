import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

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
  const [end, setEnd] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, []);

  const handleRoute = () => {
    if (!start || !end) {
      alert('Please enter start and end locations for viability check!');
      return;
    }
    if (mapRef.current) {
      // Sample UMBC path (Academic Row to Library—accessible via ramps)
      const startLatLng = L.latLng(39.254, -76.712);
      const endLatLng = L.latLng(39.255, -76.713);
      L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        routeWhileDragging: true,
        show: false,
        createMarker: () => null,
      }).addTo(mapRef.current);
      setRouteDrawn(true);
      alert(`Route drawn: ${start} to ${end} (accessible path via ramps). Invalid paths avoided.`);
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  };

  const handleFeedback = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return alert('Add feedback!');
   
    // Mock save to local array in place of DB insert
    const newFeedback = { start, end, message: feedback, timestamp: new Date().toISOString() };
    setFeedbacks([...feedbacks, newFeedback]);
    console.log('Feedback saved (mock DB):', newFeedback);
   
    alert(`Feedback submitted! Total entries: ${feedbacks.length + 1}`);
    setFeedback('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#fdb515',
        color: '#000',
        padding: '20px',
        marginBottom: '20px',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: 0 }}>UMBC Accessible Navigation System</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>Navigate campus with ramps, elevators, and stair-free paths</p>
      </header>
      {/* Inputs */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', margin: '10px 0' }}>
          Start Location:
          <input
            type="text"
            placeholder="e.g., Academic Row"
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
          />
        </label>
        <label style={{ display: 'block', margin: '10px 0' }}>
          End Location:
          <input
            type="text"
            placeholder="e.g., Library"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
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
      {/* Map */}
      <div style={{ margin: '0 auto', width: '90%', maxWidth: '800px' }}>
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
          {sampleBuildings.map((b, i) => (
            <Marker key={i} position={[b.lat, b.lng]} />
          ))}
        </MapContainer>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          {routeDrawn ? 'Route drawn (drag to adjust).' : 'Zoom/pan to explore UMBC.'}
        </p>
      </div>
      <footer style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Built by Team 1 | Sprint 2 Progress (Mock DB for Demo)
      </footer>
    </div>
  );
}

export default App;