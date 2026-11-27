"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Maximize2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/**
 * GrafanaEmbed — embeds a Grafana dashboard through the SERVER-SIDE proxy
 * (/api/sysadmin/grafana/embed) so the browser never sees credentials. A
 * health probe (/api/sysadmin/grafana/health) drives an explicit "unavailable"
 * state (Grafana is often unreachable on the dev topology) — never fake data.
 *
 * Full-screen / open-in-new-tab open the same proxied route in a new tab so
 * the iframe's auth context is preserved.
 */
const DASHBOARDS: Array<{ id: string; label: string; desc: string }> = [
  { id: "server-monitoring-dashboard", label: "Server Monitoring", desc: "Host + fleet + API" },
  { id: "error-hunter-dashboard", label: "Error Hunter", desc: "Application errors" },
  { id: "explore", label: "Explore", desc: "Free-query the data sources" },
];

interface Health {
  reachable: boolean;
  version?: string | null;
  error?: string | null;
  configuredUrl: boolean;
}

export function GrafanaEmbed() {
  const [dashboard, setDashboard] = useState(DASHBOARDS[0].id);
  const [range, setRange] = useState("6"); // hours
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const probe = useCallback(async () => {
    setChecking(true);
    try {
      const headers = { credentials: "include" as const };
      const r = await fetch("/api/sysadmin/grafana/health", { headers, cache: "no-store" });
      const j = await r.json();
      setHealth(j?.data ?? null);
    } catch {
      setHealth({ reachable: false, error: "health probe failed", configuredUrl: false });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    probe();
    const t = setInterval(probe, 60_000);
    return () => clearInterval(t);
  }, [probe]);

  // The proxied iframe URL — same origin, auth-gated, no secrets.
  const embedUrl = useMemo(() => {
    const from = `now-${range}h`;
    const to = "now";
    return `/api/sysadmin/grafana/embed?dashboard=${encodeURIComponent(dashboard)}&from=${from}&to=${to}&kiosk=1`;
  }, [dashboard, range]);

  const openInTab = (url: string) => {
    // Open the proxied URL in a new tab (preserves auth via cookie).
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (checking && !health) {
    return (
      <div className="rounded-xl border border-border bg-bg-surface flex flex-col items-center justify-center py-16 text-text-muted text-sm gap-3">
        <Loader2 className="size-6 animate-spin text-action-primary" />
        <span>Checking Grafana availability…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-action-primary" />
          <div>
            <p className="text-sm font-bold">Grafana Dashboards</p>
            <p className="text-xs text-text-muted">
              Embedded via authenticated server proxy{health?.version ? ` · v${health.version}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted flex items-center gap-1.5">
            Range
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="surface-card bg-bg-elevated text-xs px-2 py-1 rounded"
            >
              <option value="1">1h</option>
              <option value="3">3h</option>
              <option value="6">6h</option>
              <option value="24">24h</option>
            </select>
          </label>
          <button
            onClick={probe}
            className="surface-card inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-elevated hover:bg-bg-base"
          >
            <RefreshCw className="size-3.5" /> Check
          </button>
          <button
            onClick={() => openInTab(embedUrl)}
            className="surface-card inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-elevated hover:bg-bg-base"
            title="Open in new tab (full screen)"
          >
            <Maximize2 className="size-3.5" /> Full
          </button>
        </div>
      </div>

      {/* Dashboard + datasource tabs */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {DASHBOARDS.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setDashboard(d.id);
              setIframeKey((k) => k + 1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              dashboard === d.id
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-base"
            }`}
          >
            {d.label}
            <span className="text-text-muted">{d.desc}</span>
          </button>
        ))}
      </div>

      {health && !health.reachable ? (
        <div className="m-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-action-warning mb-2" />
          <p className="text-sm font-semibold text-action-warning">Grafana unavailable</p>
          <p className="text-xs text-text-muted max-w-md mx-auto mt-1">
            {health.error
              ? `Grafana did not respond: ${health.error}`
              : "No Grafana host is configured or reachable from the web app."}
            {health.configuredUrl
              ? " Set MONITORING_GRAFANA_URL + MONITORING_GRAFANA_TOKEN (a read-only viewer) and attach mon_grafana to a shared Docker network, then redeploy."
              : " Set MONITORING_GRAFANA_URL to the Grafana host and create a read-only viewer account."}
          </p>
          <button
            onClick={() => openInTab(embedUrl)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-elevated hover:bg-bg-base rounded-lg border border-border"
          >
            <ExternalLink className="size-3.5" /> Try opening the proxied dashboard
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <iframe
            key={iframeKey}
            src={embedUrl}
            title={`Grafana: ${dashboard}`}
            className="w-full h-[68vh] min-h-[480px] rounded-lg border border-border bg-white"
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
          <p className="text-[11px] text-text-muted mt-2">
            Read-only viewer access. Administrative actions are not exposed to the browser.
          </p>
        </div>
      )}
    </div>
  );
}

export default GrafanaEmbed;
