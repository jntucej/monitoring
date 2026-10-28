// Minimal LLM proxy: forwards /v1/* to the host's omniroute on 127.0.0.1:20128
// Run with: node llm-proxy.mjs
// LISTEN_ADDR env controls the bind address (default 0.0.0.0:8080)
import http from 'node:http';

const BACKEND_HOST = process.env.LLM_PROXY_BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number(process.env.LLM_PROXY_BACKEND_PORT || 20128);
const LISTEN = process.env.LLM_PROXY_LISTEN || '0.0.0.0:8080';

const [host, port] = LISTEN.split(':');

const server = http.createServer((req, res) => {
  // Stream the request body through
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const backendReq = http.request(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${BACKEND_HOST}:${BACKEND_PORT}`,
        },
      },
      (backendRes) => {
        res.writeHead(backendRes.statusCode || 502, backendRes.headers);
        backendRes.pipe(res);
      }
    );
    backendReq.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `LLM proxy upstream error: ${err.message}` } }));
    });
    if (body.length > 0) backendReq.write(body);
    backendReq.end();
  });
  req.on('error', (err) => {
    res.writeHead(500);
    res.end(err.message);
  });
});

server.listen(Number(port), host, () => {
  console.log(`LLM proxy listening on ${host}:${port} -> ${BACKEND_HOST}:${BACKEND_PORT}`);
});
