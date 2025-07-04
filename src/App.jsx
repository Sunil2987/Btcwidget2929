import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

const defaultTickers = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "TSLA", "NVDA", "NFLX", "AMD", "INTC", "JPM", "BAC", "GS", "WFC", "C", "XOM", "CVX", "COP", "NEE", "DUK", "DIS", "WMT", "TGT", "HD", "LOW", "BA", "CAT", "UNH", "JNJ", "PFE", "DIA", "QQQ"];

const App = () => {
  const [stocks, setStocks] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [theme, setTheme] = useState("light");
  const [marketClosed, setMarketClosed] = useState(false);
  const [tickers, setTickers] = useState(() => {
    const saved = localStorage.getItem("tickers");
    return saved ? JSON.parse(saved) : defaultTickers;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/stock-bot", { tickers });
      const { alerts, summary, chart, marketClosed } = res.data;

      setStocks(alerts);
      setSummary(summary);
      setMarketClosed(marketClosed);

      const now = new Date().toLocaleTimeString();
      setLog((prev) => [`[${now}] Data checked`, ...prev.slice(0, 20)]);
    } catch (err) {
      console.error(err);
      setLog((prev) => [`[!] Fetch error`, ...prev.slice(0, 20)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tickers]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.body.style.background = next === "dark" ? "#111" : "#f9f9f9";
    document.body.style.color = next === "dark" ? "#fff" : "#000";
  };

  const updateTickers = (e) => {
    const value = e.target.value.toUpperCase().split(",").map(s => s.trim());
    setTickers(value);
    localStorage.setItem("tickers", JSON.stringify(value));
  };

  return (
    <div style={{ padding: "1rem", maxWidth: 900, margin: "auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>📉 US Stock Alert Dashboard</h1>
        <button onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      <p>Monitoring {tickers.length} tickers. Refreshes every 10 mins.</p>

      <button onClick={fetchData} disabled={loading}>
        {loading ? "🔄 Loading..." : "🔁 Manual Refresh"}
      </button>

      {marketClosed && (
        <p style={{ color: "orange", fontWeight: "bold" }}>
          📅 Market is closed today. Data may be stale.
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <label><b>⚙️ Tickers:</b></label>
        <input
          value={tickers.join(", ")}
          onChange={updateTickers}
          style={{ width: "100%", padding: "4px", marginTop: "4px" }}
        />
      </div>

      <hr />

      <h2>🚨 Alerts</h2>
      {stocks.length === 0 ? (
        <p>No alerts triggered.</p>
      ) : (
        <ul>
          {stocks.map((a, i) => (
            <li key={i}>
              <strong>{a.symbol}</strong> — {a.reason} <em>{a.perf}</em>
            </li>
          ))}
        </ul>
      )}

      {summary && (
        <>
          <hr />
          <h3>🧠 AI Summary</h3>
          <p style={{ fontStyle: "italic" }}>{summary}</p>
        </>
      )}

      {stocks.length > 0 && stocks[0].chart && (
        <>
          <hr />
          <h3>📊 Chart: {stocks[0].symbol}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stocks[0].chart}>
              <XAxis dataKey="time" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#007bff" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      <hr />
      <h4>📜 Log</h4>
      <ul style={{ fontSize: "0.9rem", opacity: 0.8 }}>
        {log.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  );
};

export default App;
