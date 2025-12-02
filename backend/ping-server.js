// Node.js 내장 http 모듈 사용 (의존성 없음)
const http = require('http');
const https = require('https');

const URL = process.env.PING_URL || 'https://www.knuh-ditdo.kr/health';
const INTERVAL = 2 * 60 * 1000; // 2분 (Render.com은 15분 비활성 시 sleep하므로 2분 간격으로 유지)

function ping() {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(URL);
    const client = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000 // 10초 타임아웃
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`[${new Date().toISOString()}] Pinged ${URL}: ${res.statusCode} - ${data.substring(0, 100)}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Ping error:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`[${new Date().toISOString()}] Ping timeout`);
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

console.log(`Ping script started. Target: ${URL}, Interval: 2분`);
ping().catch(() => {}); // 즉시 실행 (에러 무시)
setInterval(() => {
  ping().catch(() => {}); // 에러 무시하고 계속 실행
}, INTERVAL); 