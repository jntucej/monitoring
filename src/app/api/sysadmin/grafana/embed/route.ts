import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { MONITORING_GRAFANA_URL, grafanaAuthHeaders } from "@/lib/monitoring";

/**
 * GET /api/sysadmin/grafana/embed?dashboard=<id-or-path>&from=now-6h&to=now&kiosk=1
 * Streams a Grafana dashboard through the web app with the read-only "viewer"
 * credentials applied SERVER-SIDE. The browser never receives admin or
 * service-account secrets — it only ever sees this auth-gated route. The
 * viewer account is read-only (no admin actions), and we allow only a fixed
 * set of query params (never forward arbitrary user input to Grafana).
 *
 * X-Frame-Options is set to SAMEORIGIN + CSP frame-ancestors 'self' so the
 * proxied HTML renders inside our iframe (this route is already auth-gated to
 * sysadmin, so embedding it is safe).
 */
export const dynamic = "force-dynamic";

async function handleGet(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const dashboard = sp.get("dashboard") || "explore";
  const from = sp.get("from") || "now-6h";
  const to = sp.get("to") || "now";
  const kiosk = sp.get("kiosk") === "1";

  const params = new URLSearchParams({
    from,
    to,
    kiosk: kiosk ? "1" : "0",
  });
  const grafanaPath =
    dashboard === "explore"
      ? `/explore?${params.toString()}`
      : `/d/${encodeURIComponent(dashboard)}?${params.toString()}`;

  const upstream = `${MONITORING_GRAFANA_URL.replace(/\/$/, "")}${grafanaPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "text/html", ...grafanaAuthHeaders() },
    });
  } catch (e) {
    clearTimeout(timer);
    const message = e instanceof Error ? e.message : "grafana upstream unreachable";
    return NextResponse.json(
      {
        success: false,
        error: { code: "GRAFANA_UNREACHABLE", message },
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!upstreamRes.ok) {
    const text = (await upstreamRes.text().catch(() => "")).slice(0, 200);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GRAFANA_UPSTREAM_ERROR",
          message: `Grafana ${upstreamRes.status}: ${text}`,
        },
      },
      { status: 502 },
    );
  }

  const html = await upstreamRes.text();
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-frame-options": "SAMEORIGIN",
    "content-security-policy": "frame-ancestors 'self'",
  });
  return new Response(html, { status: 200, headers });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/grafana/embed",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "grafana_embed", maxRequests: 60, windowMs: 60_000 },
});
