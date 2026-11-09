const http = require('node:http');
http.createServer((req, res) => {
  const status = req.method === 'POST' && req.url === '/v1/chat/completions' ? 429 : 501;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota' } }));
}).listen(process.env.PORT);
