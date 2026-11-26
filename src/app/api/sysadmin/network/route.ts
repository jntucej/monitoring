import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { promQuery } from "@/lib/monitoring";

/**
 * GET /api/sysadmin/network
 *
 * Network & connectivity diagnostics: internal service reachability,
 * Cloudflare Tunnel status, Caddy proxy health, and Prometheus
 * scrape health. Read-only, sysadmin + admin only.
 */
async function probe(url: string, timeoutMs = 2000): Promise<{ ok: boolean; status: number | null; latency_ms: number }> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: r.ok, status: r.status, latency_ms: Date.now() - t0 };
  } catch {
    return { ok: false, status: null, latency_ms: Date.now() - t0 };
  }
}

async function handleGet(_req: NextRequest) {
  // Internal service connectivity (via Caddy, the internal reverse proxy)
  const [webHealth, caddy, caddyHealth, promHealthy, promMetrics, caddyProbe] = await Promise.all([
    probe("http://caddy:80/api/health", 1500),
    probe("http://caddy:80/", 1500),
    probe("http://caddy:80/api/health", 1500),
    probe("http://prometheus:9090/-/healthy", 1500),
    probe("http://prometheus:9090/api/v1/query?query=up", 1500),
    probe("http://caddy:80/api/health", 1500),
  ]);

  // Cloudflare Tunnel — check via caddy health (caddy routes external traffic)
  const tunnelStatus: { reachable: boolean; via_caddy: boolean } = {
    reachable: caddy.ok,
    via_caddy: caddyHealth.ok,
  };

  // PostgreSQL direct
  const pgProbe = await probe("http://localhost:5432", 1000);

  // Prometheus scrape status
  let scrapeTargets: Array<{ job: string; instance: string; up: boolean; last_error: string | null }> = [];
  try {
    const scrapeRes = await fetch("http://prometheus:9090/api/v1/targets", {
      signal: AbortSignal.timeout(5000),
    });
    if (scrapeRes.ok) {
      const scrapeJson = await scrapeRes.json();
      const targets = scrapeJson?.data?.activeTargets ?? [];
      scrapeTargets = targets.map((t: Record<string, any>) => ({
        job: String((t as any).labels?.job ?? "unknown"),
        instance: String((t as any).labels?.instance ?? (t as any).scrapeUrl ?? "unknown"),
        up: (t as any).health === "up",
        last_error: (t as any).lastError ?? null,
      }));
    }
  } catch {
    // Prometheus unreachable
  }

  const out = {
    internal_services: {
      web_health: webHealth,
      caddy_proxy: caddy,
      postgres_direct: { ok: pgProbe.ok, note: pgProbe.ok ? "direct probe succeeded" : "direct 5432 probe failed (expected in container)" },
      prometheus: promHealthy,
    },
    cloudflare_tunnel: tunnelStatus,
    prometheus_scrapes: {
      reachable: promHealthy.ok,
      targets_up: scrapeTargets.filter((t) => t.up).length,
      targets_down: scrapeTargets.filter((t) => !t.up).length,
      targets: scrapeTargets,
    },
    last_checked_at: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, data: out });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/network",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "sysadmin_network", maxRequests: 60 },
});
