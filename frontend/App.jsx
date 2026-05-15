import { useState, useEffect } from "react";

const API = "http://localhost:5000/api";
const WEATHER_API_KEY = "7b220b6e6252321f832fe66dc441aa19";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [datePart, timePart] = dateStr.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${months[parseInt(month)-1]} ${day}, ${year} — ${h12}:${minute} ${ampm}`;
};

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
  const [unit, setUnit] = useState("C");

  useEffect(() => { fetchSearches(); }, []);

  const fetchSearches = async () => {
    try {
      const res = await fetch(`${API}/searches`);
      const data = await res.json();
      setSearches(data);
    } catch { console.log("error"); }
  };

  const getSuggestions = async (value) => {
    if (value.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${value}&limit=5&appid=${WEATHER_API_KEY}`);
      const data = await res.json();
      setSuggestions(data);
    } catch { setSuggestions([]); }
  };

  const convertTemp = (temp) => {
    if (unit === "F") return Math.round((temp * 9/5) + 32) + "°F";
    return Math.round(temp) + "°C";
  };

  const getWeather = async (loc) => {
    const searchLocation = loc || location;
    if (!searchLocation) { setError("⚠️ Please enter a location!"); return; }
    setLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const res = await fetch(`${API}/weather?location=${searchLocation}`);
      const data = await res.json();
      if (data.error) { setError("❌ Location not found! Please check the city name."); }
      else { setWeather(data); fetchForecast(searchLocation); fetchSearches(); }
    } catch { setError("❌ Server error! Please try again."); }
    setLoading(false);
  };

  const fetchForecast = async (loc) => {
    try {
      const res = await fetch(`${API}/forecast?location=${loc || location}`);
      const data = await res.json();
      setForecast(data);
    } catch { console.log("error"); }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${WEATHER_API_KEY}`);
            const data = await res.json();
            if (data.length > 0) { setLocation(data[0].name); getWeather(data[0].name); }
          } catch { setError("Could not get location!"); }
          setLoading(false);
        },
        () => { setError("❌ Location access denied!"); setLoading(false); }
      );
    } else { setError("❌ Geolocation not supported!"); }
  };

  const deleteSearch = async (id) => {
    await fetch(`${API}/searches/${id}`, { method: "DELETE" });
    fetchSearches();
  };

  const updateSearch = async (id) => {
    if (!editLocation) { return; }
    await fetch(`${API}/searches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: editLocation }),
    });
    setEditId(null);
    fetchSearches();
  };

  const getWeatherBg = () => {
    if (!weather) return "linear-gradient(-45deg, #0a0a2e, #1a1a5e, #0066cc, #00aaff)";
    const desc = weather.description.toLowerCase();
    if (desc.includes("rain")) return "linear-gradient(-45deg, #1a1a2e, #2c3e50, #34495e, #2980b9)";
    if (desc.includes("cloud")) return "linear-gradient(-45deg, #2c3e50, #3498db, #5dade2, #85c1e9)";
    if (desc.includes("clear") || desc.includes("sun")) return "linear-gradient(-45deg, #1a1a5e, #0066cc, #00aaff, #87ceeb)";
    if (desc.includes("snow")) return "linear-gradient(-45deg, #d6eaf8, #aed6f1, #85c1e9, #5dade2)";
    if (desc.includes("thunder")) return "linear-gradient(-45deg, #1a1a2e, #2c3e50, #1f618d, #154360)";
    return "linear-gradient(-45deg, #0a0a2e, #1a1a5e, #0066cc, #00aaff)";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: getWeatherBg(),
      backgroundSize: "400% 400%",
      animation: "gradientBG 8s ease infinite",
      padding: "20px",
      fontFamily: "'Segoe UI', Arial, sans-serif"
    }}>
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card { animation: fadeIn 0.5s ease; }
        input::placeholder { color: rgba(255,255,255,0.6); }
        ::-webkit-scrollbar { height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
      `}</style>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "30px", color: "white" }}>
          <h1 style={{ fontSize: "2.8rem", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            🌤️ Weather App
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "8px" }}>
            Built by <strong>Mahrang Riaz</strong> | <strong>PM Accelerator</strong>
          </p>
          <div style={{
            background: "rgba(0,210,255,0.1)",
            border: "1px solid rgba(0,210,255,0.3)",
            borderRadius: "12px",
            padding: "12px 20px",
            maxWidth: "650px",
            margin: "10px auto 0",
            fontSize: "12px",
            color: "rgba(255,255,255,0.8)",
            lineHeight: "1.6"
          }}>
            <strong style={{ color: "#00d2ff" }}>About PM Accelerator:</strong> Product Manager Accelerator is the world's leading AI product management community, empowering aspiring and experienced PMs through mentorship, hands-on projects, and AI-powered career tools to break into top tech companies.
          </div>
        </div>

        <div className="card" style={{
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
        }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="🔍 Enter city, zip code, or coordinates..."
                value={location}
                onChange={(e) => { setLocation(e.target.value); getSuggestions(e.target.value); }}
                onKeyPress={(e) => e.key === "Enter" && getWeather()}
                style={{
                  flex: 1, minWidth: "200px", padding: "14px 20px",
                  fontSize: "15px", borderRadius: "50px",
                  border: "2px solid rgba(255,255,255,0.3)", outline: "none",
                  background: "rgba(255,255,255,0.15)", color: "white"
                }}
              />
              <button onClick={() => getWeather()} style={{
                padding: "14px 28px", background: "linear-gradient(135deg, #00d2ff, #3a7bd5)",
                color: "white", border: "none", borderRadius: "50px", cursor: "pointer",
                fontSize: "15px", fontWeight: "bold"
              }}>
                {loading ? "⏳ Loading..." : "🔍 Search"}
              </button>
              <button onClick={getCurrentLocation} style={{
                padding: "14px 20px", background: "linear-gradient(135deg, #11998e, #38ef7d)",
                color: "white", border: "none", borderRadius: "50px", cursor: "pointer", fontSize: "15px"
              }}>
                📍 My Location
              </button>
              <button onClick={() => setUnit(unit === "C" ? "F" : "C")} style={{
                padding: "14px 20px", background: "linear-gradient(135deg, #f093fb, #f5576c)",
                color: "white", border: "none", borderRadius: "50px", cursor: "pointer", fontSize: "15px"
              }}>
                °{unit === "C" ? "F" : "C"}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "60px", left: 0,
                background: "rgba(255,255,255,0.95)", width: "60%",
                borderRadius: "15px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                zIndex: 100, overflow: "hidden"
              }}>
                {suggestions.map((s, i) => (
                  <div key={i}
                    onClick={() => { setLocation(s.name); setSuggestions([]); getWeather(s.name); }}
                    style={{ padding: "12px 18px", cursor: "pointer", color: "#333", borderBottom: "1px solid #eee", fontSize: "14px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f0f7ff"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    🌍 {s.name}, {s.country} {s.state ? `— ${s.state}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="card" style={{
            background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.5)",
            color: "white", padding: "14px 20px", borderRadius: "15px", marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        {weather && (
          <div className="card" style={{
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(25px)",
            border: "1px solid rgba(255,255,255,0.25)", color: "white",
            padding: "30px", borderRadius: "25px", marginBottom: "20px"
          }}>
            <h2 style={{ margin: 0, fontSize: "1.8rem" }}>📍 {weather.location}, {weather.country}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "5px 0 20px 0" }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
              <img src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`} alt="icon" style={{ width: "100px" }} />
              <div>
                <p style={{ fontSize: "64px", margin: 0, fontWeight: "bold", lineHeight: 1 }}>{convertTemp(weather.temperature)}</p>
                <p style={{ textTransform: "capitalize", fontSize: "18px", color: "rgba(255,255,255,0.9)", margin: "5px 0" }}>{weather.description}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "20px" }}>
              {[
                { icon: "💧", label: "Humidity", value: `${weather.humidity}%` },
                { icon: "🌬️", label: "Wind", value: `${weather.wind_speed} m/s` },
                { icon: "🌡️", label: "Feels Like", value: convertTemp(weather.feels_like) },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.1)", padding: "12px 20px",
                  borderRadius: "15px", border: "1px solid rgba(255,255,255,0.2)", textAlign: "center"
                }}>
                  <p style={{ margin: 0, fontSize: "22px" }}>{item.icon}</p>
                  <p style={{ margin: "3px 0", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{item.label}</p>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a href={`https://www.google.com/maps/search/${weather.location}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "10px 20px", background: "rgba(255,255,255,0.15)", color: "white", borderRadius: "50px", textDecoration: "none", fontSize: "14px", border: "1px solid rgba(255,255,255,0.3)" }}>
                🗺️ Google Maps
              </a>
              <a href={`https://www.youtube.com/results?search_query=${weather.location}+city+travel+vlog`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "10px 20px", background: "rgba(255,0,0,0.4)", color: "white", borderRadius: "50px", textDecoration: "none", fontSize: "14px", border: "1px solid rgba(255,0,0,0.5)" }}>
                ▶️ YouTube Videos
              </a>
            </div>
          </div>
        )}

        {forecast.length > 0 && (
          <div className="card" style={{
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: "25px",
            padding: "25px", marginBottom: "20px"
          }}>
            <h3 style={{ color: "white", margin: "0 0 20px 0" }}>📅 5-Day Forecast</h3>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
              {forecast.map((day, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.1)", padding: "18px 15px",
                  borderRadius: "18px", textAlign: "center", minWidth: "130px",
                  color: "white", border: "1px solid rgba(255,255,255,0.2)"
                }}>
                  <p style={{ fontWeight: "bold", margin: "0 0 8px 0", fontSize: "13px" }}>{day.date}</p>
                  <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt="icon" style={{ width: "50px" }} />
                  <p style={{ fontSize: "22px", fontWeight: "bold", margin: "5px 0" }}>{convertTemp(day.temperature)}</p>
                  <p style={{ fontSize: "11px", textTransform: "capitalize", color: "rgba(255,255,255,0.8)", margin: 0 }}>{day.description}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "5px 0 0 0" }}>💧 {day.humidity}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px",
          padding: "20px", marginBottom: "20px"
        }}>
          <h3 style={{ color: "white", margin: "0 0 15px 0" }}>📥 Export Data</h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { href: `${API}/export/csv`, bg: "linear-gradient(135deg, #27ae60, #2ecc71)", label: "📊 Export CSV" },
              { href: `${API}/export/json`, bg: "linear-gradient(135deg, #8e44ad, #9b59b6)", label: "📋 Export JSON" },
              { href: `${API}/export/pdf`, bg: "linear-gradient(135deg, #e74c3c, #c0392b)", label: "📄 Export PDF" },
            ].map((btn, i) => (
              <a key={i} href={btn.href} style={{
                padding: "12px 24px", background: btn.bg, color: "white",
                borderRadius: "50px", textDecoration: "none", fontSize: "14px", fontWeight: "bold"
              }}>
                {btn.label}
              </a>
            ))}
          </div>
        </div>

        {searches.length > 0 && (
          <div className="card" style={{
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: "25px",
            padding: "25px", marginBottom: "20px"
          }}>
            <h3 style={{ color: "white", margin: "0 0 20px 0" }}>📋 Search History</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.15)" }}>
                    {["Location", "Temp", "Description", "Date", "Actions"].map((h, i) => (
                      <th key={i} style={{ padding: "12px 15px", color: "white", textAlign: "left", fontSize: "13px", fontWeight: "600" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searches.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <td style={{ padding: "12px 15px", color: "white" }}>
                        {editId === s.id ? (
                          <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #00d2ff", background: "rgba(255,255,255,0.1)", color: "white", width: "120px" }} />
                        ) : s.location}
                      </td>
                      <td style={{ padding: "12px 15px", color: "white" }}>{Math.round(s.temperature)}°C</td>
                      <td style={{ padding: "12px 15px", color: "rgba(255,255,255,0.8)", textTransform: "capitalize" }}>{s.description}</td>
                      <td style={{ padding: "12px 15px", color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>{formatDate(s.created_at)}</td>
                      <td style={{ padding: "12px 15px" }}>
                        {editId === s.id ? (
                          <span style={{ display: "flex", gap: "5px" }}>
                            <button onClick={() => updateSearch(s.id)} style={{ background: "#27ae60", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>✅ Save</button>
                            <button onClick={() => setEditId(null)} style={{ background: "#7f8c8d", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>❌ Cancel</button>
                          </span>
                        ) : (
                          <span style={{ display: "flex", gap: "5px" }}>
                            <button onClick={() => { setEditId(s.id); setEditLocation(s.location); }} style={{ background: "#f39c12", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>✏️ Edit</button>
                            <button onClick={() => deleteSearch(s.id)} style={{ background: "#e74c3c", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>🗑️ Delete</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "20px" }}>
          <p>🌤️ Weather App | Built by Mahrang Riaz | PM Accelerator © 2026</p>
        </div>

      </div>
    </div>
  );
}