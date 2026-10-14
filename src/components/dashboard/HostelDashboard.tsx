/* ------------------------------------------------------------------ *
 *  Hostel Dashboard — boys/girls pending, stage funnel, overdue,
 *  and biometric completion.
 * ------------------------------------------------------------------ */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { RadialMeter } from "./RadialMeter";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useApi } from "@/hooks/useApi";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

interface HostelDashboardData {
  pending: number;
  boysPending: number;
  girlsPending: number;
  completedToday: number;
  stageCounts: Record<string, number>;
  overdue: Array<{ ticket: string; student: string; stage: string; ageHours: number }>;
  biometric: { hostelDone: number; hostelTotal: number; gateDone: number; gateTotal: number };
}

interface DashboardResponse {
  success: boolean;
  data?: HostelDashboardData;
  error?: { code: string; message: string };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export function HostelDashboard() {
  const api = useApi();
  const [data, setData] = useState<HostelDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/hostel", { headers: api.getHeaders(), cache: "no-store" });
      const json: DashboardResponse = await res.json();
      if (json.success && json.data) setData(json.data);
      else console.error("[HostelDashboard] fetch failed:", json.error?.message);
    } catch (err) {
      console.error("[HostelDashboard] network error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNow = useLiveRefresh(fetchDashboard, { intervalMs: 30_000, enabled: true });
  useEffect(() => {
    refreshNow();
    const id = setInterval(refreshNow, 30_000);
    return () => clearInterval(id);
  }, [refreshNow]);

  useEffect(() => {
    if (data) setData((prev) => (prev ? { ...prev } : prev));
  }, [refreshKey]);

  const stageKeys: string[] = [
    "caretaker",
    "deputy_warden",
    "hostel_manager",
    "warden_or_principal",
  ];
  const stageData: { stage: string; count: number }[] = stageKeys.map((k) => ({
    stage: k,
    count: data?.stageCounts[k] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">Hostel Dashboard</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Live hostel permissions — boys, girls, stages, overdue, biometric.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-1.5 rounded-lg">Last refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-[var(--text-muted)]">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardDiv>
              <RadialMeter value={data?.pending ?? 0} label="Total Pending" sublabel={data ? `${data.pending} requests` : "0 requests"} size={120} thickness={10} />
            </CardDiv>
            <CardDiv>
              <RadialMeter value={((data?.boysPending ?? 0) / Math.max(1, data?.pending ?? 1)) * 100} label="Boys Pending" sublabel={`${data?.boysPending ?? 0} of ${data?.pending ?? 0}`} color="var(--action-warning)" size={120} thickness={10} />
            </CardDiv>
            <CardDiv>
              <RadialMeter value={((data?.girlsPending ?? 0) / Math.max(1, data?.pending ?? 1)) * 100} label="Girls Pending" sublabel={`${data?.girlsPending ?? 0} of ${data?.pending ?? 0}`} color="var(--action-info)" size={120} thickness={10} />
            </CardDiv>
            <CardDiv>
              <RadialMeter value={data?.completedToday ?? 0} label="Completed Today" sublabel={`${data?.completedToday ?? 0} requests`} color="var(--action-success)" size={120} thickness={10} />
            </CardDiv>
          </div>

          <CardDiv className="p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Stage Funnel</h2>
            <div className="h-[260px]"><StageFunnel data={stageData} /></div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs text-[var(--text-muted)]">
              {stageData.map((s) => (
                <div key={s.stage} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.count > 0 ? "var(--action-primary)" : "var(--border)" }} />
                  <span>{s.stage.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{s.count}</span>
                </div>
              ))}
            </div>
          </CardDiv>

          <CardDiv className="p-5">
  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Overdue Requests (&gt; 48h)</h2>
  {data?.overdue && data.overdue.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 pb-3 font-medium text-[var(--text-muted)]">Ticket</th>
            <th className="text-left py-2 pb-3 font-medium text-[var(--text-muted)]">Student</th>
            <th className="text-left py-2 pb-3 font-medium text-[var(--text-muted)]">Stage</th>
            <th className="text-left py-2 pb-3 font-medium text-[var(--text-muted)]">Age (hours)</th>
          </tr>
        </thead>
        <tbody>
          {data.overdue.map((o) => (
            <tr key={o.ticket} className="border-b border-[var(--border)]">
              <td className="py-2.5 text-[var(--text-primary)]">{o.ticket}</td>
              <td className="py-2.5 text-[var(--text-muted)]">{o.student}</td>
              <td className="py-2.5 text-[var(--text-muted)]">{o.stage.replace(/_/g, " ")}</td>
              <td className="py-2.5 text-[var(--text-muted)]">{o.ageHours.toFixed(1)}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="text-center py-8 text-[var(--text-muted)]">No overdue requests.</div>
  )}
</CardDiv>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CardDiv className="p-5">
              <div className="flex items-center gap-4">
                <RadialMeter value={data ? ((data.biometric.hostelDone / Math.max(1, data.biometric.hostelTotal)) * 100) : 0} label="Hostel Biometric Done" sublabel={`${data?.biometric.hostelDone ?? 0} / ${data?.biometric.hostelTotal ?? 0}`} size={100} thickness={8} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Hostel Biometric</div>
                  <div className="text-xs text-[var(--text-muted)]">Completed at hostel stage.</div>
                </div>
              </div>
            </CardDiv>
            <CardDiv className="p-5">
              <div className="flex items-center gap-4">
                <RadialMeter value={data ? ((data.biometric.gateDone / Math.max(1, data.biometric.gateTotal)) * 100) : 0} label="Gate Biometric Done" sublabel={`${data?.biometric.gateDone ?? 0} / ${data?.biometric.gateTotal ?? 0}`} size={100} thickness={8} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Gate Biometric</div>
                  <div className="text-xs text-[var(--text-muted)]">Completed at main gate.</div>
                </div>
              </div>
            </CardDiv>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Stage funnel using Recharts BarChart (vertical bars per stage).
 */
function StageFunnel({ data }: { data: { stage: string; count: number }[] }) {
  const colors = ["var(--action-primary)", "var(--action-warning)", "var(--action-info)", "var(--action-success)", "var(--text-muted)"];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 10, left: -10, bottom: 6 }}>
        <XAxis dataKey="stage" type="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} interval={0} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)", borderRadius: "8px" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={colors[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared primitives                                                           */
/* -------------------------------------------------------------------------- */

interface CardDivProps {
  children: ReactNode;
  className?: string;
}

export function CardDiv({ children, className = "" }: CardDivProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 ${className}`}>
      {children}
    </div>
  );
}
