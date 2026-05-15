import { useState, useEffect } from "react";

const API = "http://localhost:5000/api";
const WEATHER_API_KEY = "aapki_key_yahan";

export default function App() {
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [searches, setSearches] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editLocation, setEditLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    try {
      const res = await fetch(`${API}/searches`);
      const data = await res.json();
      setSearches(data);
    } catch (err) {
      console.error("Could not load search history");
    }
  };

  const getSuggestions = async (value) => {
    if (value.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${value}&limit=5&appid=${WEATHER_API_KEY}`);
      const data = await res.json();
      setSuggestions(data);
    } catch { setSuggestions([]); }
  };

  const getWeather = async (loc) => {
    const searchLocation = loc || location;
    if (!searchLocation.trim()) { setError("Please enter a location!"); return; }
    setLoading(true); setError(""); setSuggestions([]);
    try {
      const res = await fetch(`${API}/weather?location=${searchLocation}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setWeather(null); }
      else { setWeather(data); fetchForecast(searchLocation); fetchSearches(); }
    } catch { setError("Could not connect to server. Is the backend running?"); }
    setLoading(false);
  };

  const fetchForecast = async (loc) => {
    try {
      const res = await fetch(`${API}/forecast?location=${loc || location}`);
      const data = await res.json();
      if (!data.error) setForecast(data);
    } catch { console.error("Forecast fetch failed"); }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported!"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${WEATHER_API_KEY}`);
          const data = await res.json();
          if (data.length > 0) { setLocation(data[0].name); getWeather(data[0].name); }
        } catch { setError("Could not determine your location!"); }
        setLoading(false);
      },
      () => { setError("Location access denied!"); setLoading(false); }
    );
  };

  const deleteSearch = async (id) => {
    try { await fetch(`${API}/searches/${id}`, { method: "DELETE" }); fetchSearches(); }
    catch { setError("Could not delete record"); }
  };

  const updateSearch = async (id) => {
    if (!editLocation.trim()) { setError("Location cannot be empty"); return; }
    try {
      await fetch(`${API}/searches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: editLocation }),
      });
      setEditId(null); fetchSearches();
    } catch { setError("Could not update record"); }
  };

  const filteredSearches = searches.filter((s) =>
    s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif", padding: "30px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "2.2rem", color: "#2c3e50", margin: "0 0 6px 0" }}>🌤️ Weather App</h1>
          <p style={{ color: "#7f8c8d", fontSize: "14px", margin: "0 0 16px 0" }}>Built by <strong>Mahrang Riaz</strong></p>
          <div style={{ background: "white", border: "1px solid #dce1e7", borderRadius: "10px", padding: "14px 20px", maxWidth: "660px", margin: "0 auto", fontSize: "13px", color: "#555", lineHeight: "1.6", textAlign: "left" }}>
            <strong style={{ color: "#2c3e50" }}>About PM Accelerator: </strong>
            Product Manager Accelerator is the world's leading AI product management community,
            empowering the next generation of PMs through mentorship, hands-on projects, and
            AI-powered career tools. We help aspiring and experienced product managers break into
            top tech companies and become exceptional leaders.
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input type="text" placeholder="Enter city, zip code, or coordinates..."
                value={location}
                onChange={(e) => { setLocation(e.target.value); getSuggestions(e.target.value); }}
                onKeyPress={(e) => e.key === "Enter" && getWeather()}
                style={{ flex: 1, minWidth: "200px", padding: "12px 16px", fontSize: "15px", borderRadius: "8px", border: "1px solid #dce1e7", outline: "none", color: "#2c3e50" }}
              />
              <button onClick={() => getWeather()} style={{ padding: "12px 24px", background: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px", fontWeight: "600" }}>
                {loading ? "Loading..." : "Search"}
              </button>
              <button onClick={getCurrentLocation} style={{ padding: "12px 16px", background: "#27ae60", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px" }}>
                📍 My Location
              </button>
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: "absolute", background: "white", width: "70%", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 100, marginTop: "4px", border: "1px solid #dce1e7" }}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => { setLocation(s.name); setSuggestions([]); getWeather(s.name); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", color: "#2c3e50", fontSize: "14px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                    🌍 {s.name}, {s.country} {s.state ? `— ${s.state}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fde8e8", border: "1px solid #e74c3c", color: "#c0392b", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          <div style={{ flex: "1 1 55%" }}>

            {weather && (
              <div style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h2 style={{ margin: "0 0 16px 0", color: "#2c3e50", fontSize: "1.5rem" }}>📍 {weather.location}, {weather.country}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="weather icon" />
                  <div>
                    <p style={{ fontSize: "48px", fontWeight: "700", margin: 0, color: "#2c3e50" }}>{Math.round(weather.temperature)}°C</p>
                    <p style={{ textTransform: "capitalize", color: "#7f8c8d", margin: "4px 0 0 0" }}>{weather.description}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <span style={{ background: "#eaf4fd", color: "#2980b9", padding: "6px 14px", borderRadius: "20px", fontSize: "13px" }}>💧 Humidity: {weather.humidity}%</span>
                  <span style={{ background: "#eaf4fd", color: "#2980b9", padding: "6px 14px", borderRadius: "20px", fontSize: "13px" }}>🌬️ Wind: {weather.wind_speed} m/s</span>
                  <span style={{ background: "#eaf4fd", color: "#2980b9", padding: "6px 14px", borderRadius: "20px", fontSize: "13px" }}>🌡️ Feels like: {Math.round(weather.feels_like)}°C</span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <a href={`https://www.google.com/maps/search/${weather.location}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 16px", background: "#eaf4fd", color: "#2980b9", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
                    🗺️ Google Maps
                  </a>
                  <a href={`https://www.youtube.com/results?search_query=${weather.location}+city+travel`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 16px", background: "#fde8e8", color: "#e74c3c", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
                    ▶️ YouTube Videos
                  </a>
                </div>
              </div>
            )}

            {forecast.length > 0 && (
              <div style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>📅 5-Day Forecast</h3>
                <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
                  {forecast.map((day, i) => (
                    <div key={i} style={{ background: "#2c3e50", border: "1px solid #34495e", borderRadius: "10px", padding: "14px", textAlign: "center", minWidth: "120px", flex: "0 0 auto" }}>
                      <p style={{ fontWeight: "700", fontSize: "13px", margin: "0 0 6px 0", color: "white" }}>{day.date}</p>
                      <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="icon" />
                      <p style={{ fontSize: "20px", fontWeight: "700", margin: "4px 0", color: "white" }}>{Math.round(day.temperature)}°C</p>
                      <p style={{ fontSize: "11px", textTransform: "capitalize", color: "rgba(255,255,255,0.7)", margin: 0 }}>{day.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 14px 0", color: "#2c3e50" }}>📥 Export Data</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a href={`${API}/export/csv`} style={{ padding: "10px 20px", background: "#27ae60", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>📄 Export CSV</a>
                <a href={`${API}/export/json`} style={{ padding: "10px 20px", background: "#8e44ad", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>📦 Export JSON</a>
                <a href={`${API}/export/pdf`} style={{ padding: "10px 20px", background: "#e74c3c", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>📑 Export PDF</a>
              </div>
            </div>

          </div>

          <div style={{ flex: "1 1 40%", position: "sticky", top: "20px" }}>
            {searches.length > 0 && (
              <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#2c3e50" }}>📋 Search History</h3>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <input type="text" placeholder="🔍 Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: "9px 14px", fontSize: "13px", borderRadius: "8px", border: "1px solid #dce1e7", outline: "none", color: "#2c3e50" }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      style={{ padding: "9px 14px", background: "#f0f2f5", color: "#7f8c8d", border: "1px solid #dce1e7", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                      ✕ Clear
                    </button>
                  )}
                </div>
                {filteredSearches.length === 0 && searchQuery ? (
                  <p style={{ color: "#7f8c8d", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No records found for "{searchQuery}"</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px 10px", color: "#2c3e50", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #dce1e7" }}>Location</th>
                          <th style={{ padding: "12px 10px", color: "#2c3e50", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #dce1e7" }}>Temp</th>
                          <th style={{ padding: "12px 10px", color: "#2c3e50", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #dce1e7" }}>Date</th>
                          <th style={{ padding: "12px 10px", color: "#2c3e50", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #dce1e7" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSearches.map((s) => (
                          <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "10px", color: "#2c3e50" }}>
                              {editId === s.id ? (
                                <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #3498db", fontSize: "13px", width: "100px" }} />
                              ) : s.location}
                            </td>
                            <td style={{ padding: "10px", color: "#2c3e50" }}>{Math.round(s.temperature)}°C</td>
                            <td style={{ padding: "10px", color: "#7f8c8d", fontSize: "12px" }}>{s.created_at}</td>
                            <td style={{ padding: "10px" }}>
                              {editId === s.id ? (
                                <span style={{ display: "flex", gap: "4px" }}>
                                  <button onClick={() => updateSearch(s.id)} style={{ background: "#27ae60", color: "white", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Save</button>
                                  <button onClick={() => setEditId(null)} style={{ background: "#95a5a6", color: "white", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                                </span>
                              ) : (
                                <span style={{ display: "flex", gap: "4px" }}>
                                  <button onClick={() => { setEditId(s.id); setEditLocation(s.location); }} style={{ background: "#f39c12", color: "white", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                                  <button onClick={() => deleteSearch(s.id)} style={{ background: "#e74c3c", color: "white", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        <p style={{ textAlign: "center", color: "#95a5a6", fontSize: "12px", marginTop: "20px" }}>
          Weather App by Mahrang Riaz © 2026
        </p>

      </div>
    </div>
  );
}