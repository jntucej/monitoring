"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  UserCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Lock,
  Power,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { useApi } from "@/hooks/useApi";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface GateMetrics {
  gateId: string;
  gateCode: string;
  gateName: string;
  location: string;
  type: string;
  status: "ACTIVE" | "INACTIVE" | string;
  activeOperator: { name: string; email: string | null; since: string } | null;
  scansToday: number | null;
  entriesToday: number | null;
  exitsToday: number | null;
  peakHour: string | null;
  recentScans: Array<{
    id: string;
    personName: string;
    personRole: string;
    direction: "IN" | "OUT" | string;
    reason: string | null;
    operator: string | null;
    timestamp: string;
  }>;
}

export default function GateDetailPage() {
  const api = useApi();
  const params = useParams<{ id: string }>();
  const gateId = params?.id || "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GateMetrics | null>(null);
  const [operatorNote, setOperatorNote] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  const isSentinel = data?.gateCode?.toUpperCase() === "UNKNOWN";

  const fetchGateDetails = async () => {
    setLoading(true);
    setOperatorNote(null);
    try {
      const headers = api.getHeaders();
      const res = await fetch(`/api/admin/gates/${gateId}/metrics`, { headers, cache: "no-store" });
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data as GateMetrics);
      } else {
        const msg =
          typeof json.error === "string" ? json.error : json.error?.message || "Failed to load gate metrics";
        setOperatorNote(msg);
      }
    } catch (e) {
      console.error("Failed to load gate detail:", e);
      setOperatorNote("Network or server error loading gate metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gateId) fetchGateDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateId]);

  const toggleActive = async (activate: boolean) => {
    setToggleBusy(true);
    setConfirmDeactivate(false);
    setOperatorNote(null);
    try {
      const headers = api.getHeaders();
      const res = await fetch(`/api/admin/gates/${gateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ isActive: activate }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchGateDetails();
      } else {
        setOperatorNote(typeof json.error === "string" ? json.error : json.error?.message || "Toggle failed");
      }
    } catch {
      setOperatorNote("Network or server error toggling gate status");
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {data?.gateName || `Gate ${gateId}`}
                </p>
                {data && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      data.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {data.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {data?.gateCode ? `${data.gateCode} — ` : ""}
                Terminal ID: {gateId} — {data?.location || "Campus Access Point"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchGateDetails}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-base)] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {data && !isSentinel && (
              data.status === "ACTIVE" ? (
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  disabled={toggleBusy}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => toggleActive(true)}
                  disabled={toggleBusy}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" /> Activate
                </button>
              )
            )}
            {isSentinel && (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" /> System sentinel gate — read-only
              </span>
            )}
          </div>
        </div>

        {operatorNote && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{operatorNote}</span>
          </div>
        )}

        {loading && !data ? (
          <PageLoading />
        ) : (
          <>
            <WidgetBoundary title="Gate Metrics">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Scans Today"
                  value={data?.scansToday ?? 0}
                  icon={Activity}
                  color="#10b981"
                  trend="Total throughput"
                  onClick={() => router.push("/admin/reports")}
                />
                <StatCard
                  label="Entries (IN)"
                  value={data?.entriesToday ?? 0}
                  icon={CheckCircle2}
                  color="#3b82f6"
                  trend="Checked in campus"
                  onClick={() => router.push("/admin/attendance")}
                />
                <StatCard
                  label="Exits (OUT)"
                  value={data?.exitsToday ?? 0}
                  icon={Clock}
                  color="#f59e0b"
                  trend="Checked out campus"
                  onClick={() => router.push("/admin/attendance")}
                />
                <StatCard
                  label="Peak Activity"
                  value={data?.peakHour || "N/A"}
                  icon={TrendingUp}
                  color="#8b5cf6"
                  trend="Mode entry hour (7 days)"
                  onClick={() => router.push("/admin/analytics/predictive")}
                />
              </div>
            </WidgetBoundary>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WidgetBoundary title="Scan Stream">
                <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Recent Scan Activity (last 20)
                    </h3>
                    <span className="text-xs text-[var(--text-muted)] font-mono">Real-time</span>
                  </div>

                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                          <th className="pb-2 px-3">Subject Name</th>
                          <th className="pb-2 px-3">Category</th>
                          <th className="pb-2 px-3">Movement</th>
                          <th className="pb-2 px-3">Scan Time</th>
                          <th className="pb-2 px-3 text-right">Operator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {data?.recentScans && data.recentScans.length > 0 ? (
                          data.recentScans.map((scan) => (
                            <tr key={scan.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                              <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{scan.personName}</td>
                              <td className="py-3 px-3 text-[var(--text-muted)]">{scan.personRole}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    scan.direction === "IN"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {scan.direction}
                                </span>
                                {scan.reason && (
                                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({scan.reason})</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-[var(--text-muted)]">
                                {new Date(scan.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-400">
                                {scan.operator || "Auto"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                              No recent scans recorded for this gate terminal.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </WidgetBoundary>

              <WidgetBoundary title="Assigned Operator">
                <div className="space-y-4">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      Active Gate Operator
                    </h3>

                    {data?.activeOperator ? (
                      <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">
                          {data.activeOperator.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">{data.activeOperator.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{data.activeOperator.email ?? "No email"}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">
                            Active On Duty
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No operator currently on duty at this gate.</p>
                    )}

                    {!isSentinel && (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Reassigning the operator is managed from the operator desk
                        (<button onClick={() => router.push(`/gate/${gateId}`)} className="underline font-semibold text-emerald-400">
                          open operator desk
                        </button>)
                        — this page is read-only for operator assignment.
                      </p>
                    )}
                  </div>
                </div>
              </WidgetBoundary>
            </div>
          </>
        )}

        <ConfirmDialog
          open={confirmDeactivate}
          onClose={() => setConfirmDeactivate(false)}
          title="Deactivate gate?"
          body={
            data
              ? `This will mark '${data.gateCode} (${data.gateName})' as inactive. New scans will be flagged but will still be recorded. This action is audited.`
              : "Deactivate this gate?"
          }
          confirmText="Deactivate"
          variant="destructive"
          onConfirm={() => toggleActive(false)}
        />
      </motion.div>
    
    

  );
}
