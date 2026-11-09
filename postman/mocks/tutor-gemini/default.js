const http = require('node:http');
let attempts = 0;
http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.endsWith(':generateContent')) {
    res.writeHead(501); res.end(); return;
  }
  attempts++;
  const unavailable = attempts === 1;
  res.writeHead(unavailable ? 503 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(unavailable
    ? { error: { code: 503, status: 'UNAVAILABLE' } }
    : { candidates: [{ content: { parts: [{ text: 'SIMULATION_RECOVERED' }] } }] }));
}).listen(process.env.PORT);
