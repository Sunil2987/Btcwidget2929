import React, { useEffect, useState } from "react";
import axios from "axios";

const TICKERS = ["AAPL", "MSFT", "GOOG", "AMZN", "TSLA", "US30", "US100"];
const TELEGRAM_BOT_STATUS = true;

const App = () => {
  const [stocks, setStocks] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/stock-bot");
      if (res.data && res.data.alerts) {
        setStocks(res.data.alerts);
        const time = new Date().toLocaleTimeString();
        setLog((prev) => [`[${time}] Alerts checked`, ...prev.slice(0, 20)]);
      }
    } catch (err) {
      console.error("Error fetching stock data", err);
      setLog((prev) => [`[!] Fetch error`, ...prev.slice(0, 20)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 10 * 60 * 1000); // every 10 mins
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.body.style.background = newTheme === "dark" ? "#1a1a1a" : "#f9f9f9";
    document.body.style.color = newTheme === "dark" ? "#fff" : "#000";
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "800px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>📉 US Stock Alert Dashboard</h1>
        <button onClick={toggleTheme} style={{ fontSize: "0.9rem" }}>
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </div>

      <p>Monitoring {TICKERS.length} tickers. Alerts run every 10 mins.</p>
      <button onClick={fetchStockData} disabled={loading}>
        {loading ? "Checking..." : "🔁 Manual Refresh"}
      </button>

      <hr />

      <h3>🚨 Alerts</h3>
      {stocks.length === 0 ? (
        <p>No alerts triggered.</p>
      ) : (
        <ul>
          {stocks.map((s, i) => (
            <li key={i} style={{ marginBottom: "0.5rem" }}>
              <strong>{s.symbol}</strong>: {s.reason}
              {s.perf && <span> ({s.perf})</span>}
            </li>
          ))}
        </ul>
      )}

      <hr />
      <h4>📜 Log</h4>
      <ul>
        {log.map((entry, i) => (
          <li key={i} style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
