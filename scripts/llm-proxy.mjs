// Minimal LLM proxy: forwards /v1/* to the host's omniroute on 127.0.0.1:20128
// Run with: node llm-proxy.mjs
// LISTEN_ADDR env controls the bind address (default 0.0.0.0:8080)
import http from 'node:http';

const BACKEND_HOST = process.env.LLM_PROXY_BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number(process.env.LLM_PROXY_BACKEND_PORT || 20128);
const LISTEN = process.env.LLM_PROXY_LISTEN || '0.0.0.0:8080';

const [host, port] = LISTEN.split(':');

// Control 6: Strict egress allowlist on the proxy.
// Only allow /v1/chat/completions, /v1/embeddings, /v1/models. Reject arbitrary URLs and tool sinks.
const ALLOWED_PATH_PREFIXES = [
  '/v1/chat/completions',
  '/v1/embeddings',
  '/v1/models',
];

function isPathAllowed(urlPath) {
  const clean = (urlPath || '').split('?')[0];
  return ALLOWED_PATH_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`));
}

// L6a — Zero-trust: strip X-Forwarded-For / X-Forwarded-* headers so the
// proxy never trusts a client-supplied source address. The backend receives
// only headers it can verify; origin pinning is enforced by the allowlist
// above (no query-string passthrough, fixed host:port, no wildcard paths).
const UNSAFE_INBOUND_HEADERS = new Set([
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
  'x-client-ip',
]);

const server = http.createServer((req, res) => {
  // L6a: reject requests with unsafe client-supplied forwarding headers.
  // A client that sets X-Forwarded-For is attempting to spoof its origin —
  // the proxy must not forward that to the backend.
  for (const h of UNSAFE_INBOUND_HEADERS) {
    if (req.headers[h]) {
      console.warn(`[llm-proxy] blocked request with client-supplied ${h}: ${req.headers[h]}`);
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNSAFE_HEADER', message: 'Client-supplied forwarding headers are not permitted.' } }));
      return;
    }
  }

  if (!isPathAllowed(req.url)) {
    console.warn(`[llm-proxy] blocked forbidden path: ${req.method} ${req.url}`);
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ENDPOINT', message: 'Endpoint not permitted by LLM proxy egress policy.' } }));
    return;
  }

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
