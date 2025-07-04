// /api/stock-bot.js

import axios from "axios";

const TELEGRAM_TOKEN = "6149322443:AAF3Fj7-FsLlyR0msZ2B0sPiP8X_AemcZ9g";
const TELEGRAM_CHAT_ID = "573040944";
const ALPHA_API_KEY = "XCHRXA73EI71XJHG"; // Replace with your own

const TICKERS = ["AAPL", "MSFT", "GOOG", "AMZN", "TSLA", "US30", "US100"];
const alertLog = [];

const sendTelegram = async (message) => {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }
    );
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
};

const getPrice = async (symbol) => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&apikey=${ALPHA_API_KEY}`;
  const res = await axios.get(url);
  const data = res.data["Time Series (60min)"];
  if (!data) return null;
  const times = Object.keys(data);
  const latest = data[times[0]];
  const past = data[times[4]]; // 4 hours ago
  const change = (latest["4. close"] - past["4. close"]) / past["4. close"];
  return {
    now: parseFloat(latest["4. close"]),
    past: parseFloat(past["4. close"]),
    change,
  };
};

export default async function handler(req, res) {
  const alerts = [];

  for (let symbol of TICKERS) {
    try {
      const price = await getPrice(symbol);
      if (!price) continue;

      // Check drop >3% in last 4 hours
      if (price.change <= -0.03) {
        const msg = `⚠️ ${symbol} dropped ${(price.change * 100).toFixed(1)}% in 4h`;
        if (!alertLog.includes(msg)) {
          await sendTelegram(msg);
          alertLog.push(msg);
        }
        alerts.push({ symbol, reason: "Dropped >3% in 4h", perf: `${(price.change * 100).toFixed(1)}%` });
      }
    } catch (err) {
      console.error("Price error for", symbol, err.message);
    }
  }

  res.status(200).json({
    alerts,
    status: "checked",
  });
}
