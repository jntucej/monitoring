import "./rate-limit-cleanup.mjs";
import http from "node:http";

// Worker health probe: the compose healthcheck (and any orchestrator) hits
// /health on 3001. Keep the process alive and report readiness. The rate-limit
// cleanup interval (imported above) plus the postCronEndpoint helper below are
// the worker's actual work; this listener exists so the container can report
// healthy rather than staying stuck in "starting" forever.
const WORKER_PORT = Number(process.env.WORKER_PORT || 3001);

const worker = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

worker.listen(WORKER_PORT, () => {
  console.log(`[worker] health listener on :${WORKER_PORT}`);
});

async function postCronEndpoint(path) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://web:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[worker] CRON_SECRET missing — refusing to call ${path}`);
    throw new Error("CRON_SECRET not set");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[worker] ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}
