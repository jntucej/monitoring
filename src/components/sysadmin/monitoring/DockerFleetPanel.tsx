"use client";

import { useEffect, useState, useCallback } from "react";
import { Server, RefreshCw, ExternalLink } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface PromSample {
  metric: Record<string, string>;
  value: [number, string];
}

interface FleetRow {
  name: string;
  cpu: number;
  memoryBytes: number;
  restarts: number;
  up: boolean;
}

const GRAFANA_BASE = process.env.NEXT_PUBLIC_MONITORING_GRAFANA_URL || "";

export function DockerFleetPanel() {
  const [rows, setRows] = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const fetchQ = (id: string) =>
        fetch(`/api/admin/monitoring?queryId=${id}`, { headers, cache: "no-store" }).then((r) => r.json());

      const [cpu, mem, restarts, up] = await Promise.all([
        fetchQ("fleet.cpu"),
        fetchQ("fleet.memory"),
        fetchQ("fleet.restarts"),
        fetchQ("fleet.up"),
      ]);

      if (!cpu.success) throw new Error(cpu.error?.message || "cpu query failed");

      const collect = (res: any) => {
        const m = new Map<string, number>();
        (res?.data?.result || []).forEach((s: PromSample) => {
          if (s.metric?.name) m.set(s.metric.name, parseFloat(s.value[1]));
        });
        return m;
      };
      const cpuMap = collect(cpu);
      const memMap = collect(mem);
      const restartMap = collect(restarts);
      const upMap = collect(up);

      const names = Array.from(new Set([...cpuMap.keys(), ...memMap.keys(), ...upMap.keys()]));
      const assembled: FleetRow[] = names.map((name) => ({
        name,
        cpu: cpuMap.get(name) ?? 0,
        memoryBytes: memMap.get(name) ?? 0,
        restarts: restartMap.get(name) ?? 0,
        up: (upMap.get(name) ?? 0) > 0,
      }));
      assembled.sort((a, b) => a.name.localeCompare(b.name));

      setRows(assembled);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const fmtMem = (bytes: number) => {
    const mib = bytes / 1024 / 1024;
    if (mib < 1) return `${(bytes / 1024).toFixed(0)} KiB`;
    if (mib < 1024) return `${mib.toFixed(0)} MiB`;
    return `${(mib / 1024).toFixed(2)} GiB`;
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Docker Fleet
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-[var(--bg-base)] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="p-4 m-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          Monitoring stack unreachable: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-[var(--text-muted)]">
          {loading ? "Loading fleet…" : "No gate_* or mon_* containers found"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                <th className="py-2.5 px-4 font-medium">Container</th>
                <th className="py-2.5 px-4 font-medium">State</th>
                <th className="py-2.5 px-4 font-medium text-right">CPU %</th>
                <th className="py-2.5 px-4 font-medium text-right">Memory</th>
                <th className="py-2.5 px-4 font-medium text-right">Restarts (1h)</th>
                <th className="py-2.5 px-4 font-medium text-right">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row) => (
                <tr key={row.name} className="hover:bg-[var(--bg-elevated)]/40">
                  <td className="py-2.5 px-4 font-mono text-[var(--text-primary)]">{row.name}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${row.up ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <span className={row.up ? "text-emerald-400" : "text-rose-400"}>
                        {row.up ? "Up" : "Down"}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{row.cpu.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{fmtMem(row.memoryBytes)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {row.restarts > 0 ? (
                      <span className="text-amber-400">{row.restarts}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {GRAFANA_BASE ? (
                      <a
                        href={`${GRAFANA_BASE}/explore?orgId=1&left=${encodeURIComponent(
                          JSON.stringify({
                            datasource: "Loki",
                            queries: [{ expr: `{container="${row.name}"}`, refId: "A" }],
                            range: { from: "now-1h", to: "now" },
                          })
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-emerald-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
