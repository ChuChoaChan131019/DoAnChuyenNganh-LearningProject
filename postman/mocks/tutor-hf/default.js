const http = require('node:http');
http.createServer((req, res) => {
  const status = req.method === 'POST' && req.url === '/v1/chat/completions' ? 402 : 501;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'insufficient_quota' } }));
}).listen(process.env.PORT);
