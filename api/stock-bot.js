import axios from "axios";

const TELEGRAM_TOKEN = "6149322443:AAF3Fj7-FsLlyR0msZ2B0sPiP8X_AemcZ9g";
const TELEGRAM_CHAT_ID = "-1001929831103";
const ALPHA_API_KEY = "XCHRXA73EI71XJHG";
const OPENAI_KEY = "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";

let alertLog = [];

const delay = ms => new Promise(res => setTimeout(res, ms));

const getTimeSeries = async (symbol, interval = "60min") => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${ALPHA_API_KEY}`;
  const res = await axios.get(url);
  return res.data[`Time Series (${interval})`] || null;
};

const getHighLow = async (symbol) => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${symbol}&apikey=${ALPHA_API_KEY}`;
  const res = await axios.get(url);
  const data = res.data["Weekly Adjusted Time Series"];
  if (!data) return null;
  const prices = Object.values(data).slice(0, 72).map(d => parseFloat(d["4. close"]));
  const high = Math.max(...prices);
  return high;
};

const sendTelegram = async (msg) => {
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: msg,
  });
};

const generateSummary = async (alerts) => {
  const prompt = `Summarize the following US stock alerts in plain English:\n\n${alerts.map(a => `- ${a.symbol}: ${a.reason} (${a.perf})`).join("\n")}`;
  const res = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
  });
  return res.data.choices[0].message.content.trim();
};

const getChartData = (series) => {
  const entries = Object.entries(series).slice(0, 12).reverse();
  return entries.map(([time, val]) => ({
    time: time.split(" ")[1],
    price: parseFloat(val["4. close"]),
  }));
};

export default async function handler(req, res) {
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const isHoliday = now.getMonth() === 6 && now.getDate() === 4; // July 4

  if (req.method === "POST" && req.body?.tickers) {
    const tickers = req.body.tickers;
    const alerts = [];
    let chart = null;

    for (let symbol of tickers) {
      try {
        await delay(12000); // 5 req/min
        const series = await getTimeSeries(symbol);
        if (!series) continue;

        const times = Object.keys(series);
        const latest = parseFloat(series[times[0]]["4. close"]);
        const past = parseFloat(series[times[4]]["4. close"]);
        const change = (latest - past) / past;

        const high = await getHighLow(symbol);
        const dropFromHigh = ((latest - high) / high);

        if (change <= -0.03) {
          const msg = `⚠️ ${symbol} dropped ${(change * 100).toFixed(1)}% in 4h`;
          if (!alertLog.includes(msg)) {
            await sendTelegram(msg);
            alertLog.push(msg);
          }
          alerts.push({ symbol, reason: "Dropped >3% in 4h", perf: `${(change * 100).toFixed(1)}%` });
        }

        if (dropFromHigh <= -0.35) {
          const msg = `📉 ${symbol} is ${(dropFromHigh * 100).toFixed(1)}% below its 72-week high`;
          if (!alertLog.includes(msg)) {
            await sendTelegram(msg);
            alertLog.push(msg);
          }
          alerts.push({ symbol, reason: "Below 72-week high", perf: `${(dropFromHigh * 100).toFixed(1)}%` });
        }

        if (!chart) chart = getChartData(series);

      } catch (e) {
        console.error("Error on", symbol, e.message);
      }
    }

    let summary = "";
    if (alerts.length > 0) {
      try {
        summary = await generateSummary(alerts);
        await sendTelegram(`🧠 Summary:\n${summary}`);
      } catch (err) {
        console.error("OpenAI error", err.message);
      }
    }

    return res.status(200).json({
      alerts: alerts.map(a => ({ ...a, chart })),
      summary,
      marketClosed: isWeekend || isHoliday,
    });
  }

  // Handle GET for Telegram command /status or /reset
  const text = req.query?.text || "";
  if (text.includes("/reset")) {
    alertLog = [];
    await sendTelegram("✅ Alert log reset.");
    return res.status(200).json({ ok: true });
  }
  if (text.includes("/status")) {
    const msg = `Bot is active. ${alertLog.length} alerts stored.`;
    await sendTelegram(msg);
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ status: "Bot running" });
}
