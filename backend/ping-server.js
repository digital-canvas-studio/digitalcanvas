const fetch = require('node-fetch');

const URL = process.env.PING_URL || 'https://www.knuh-ditdo.kr/health';
const INTERVAL = 5 * 60 * 1000; // 5분

async function ping() {
  try {
    const res = await fetch(URL);
    const text = await res.text();
    console.log(`[${new Date().toISOString()}] Pinged ${URL}: ${res.status} - ${text}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ping error:`, err.message);
  }
}

console.log(`Ping script started. Target: ${URL}, Interval: 5분`);
ping();
setInterval(ping, INTERVAL); 