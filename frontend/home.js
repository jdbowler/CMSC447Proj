// home.js
function Home() {
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Finding route from "${start}" to "${end}"`);
  };

  return(
    <div className="container mt-4">
      <h1 className="text-center mb-4">UMBC Accessible Navigation System</h1>

      <div className="row">
        {/* Input panel */}
        <div className="col-md-4">
          <div className="card p-3 shadow-sm">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-bold">Starting Point</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search UMBC map:"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Destination</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search UMBC map:"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Find Route
              </button>
            </form>
          </div>
        </div>

        {/* Map area - how to integrate this?*/}
        
      </div>
    </div>
  );
}
