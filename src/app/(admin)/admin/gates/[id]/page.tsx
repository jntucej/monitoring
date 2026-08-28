"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  UserCheck,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { getAuthHeaders } from "@/lib/utils";

interface GateMetrics {
  gateId: string;
  gateName: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  activeOperator: { name: string; email: string } | null;
  totalScansToday: number;
  entriesToday: number;
  exitsToday: number;
  peakHour: string;
  recentScans: Array<{
    id: string;
    personName: string;
    personType: string;
    direction: "IN" | "OUT";
    timestamp: string;
    status: string;
  }>;
}

export default function GateDetailPage() {
  const params = useParams<{ id: string }>();
  const gateId = params?.id || "1";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GateMetrics | null>(null);

  const fetchGateDetails = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/admin/dashboard?gateId=${gateId}`, { headers });
      const json = await res.json();

      if (json.success && json.data) {
        const stats = json.data.stats || {};
        const gateInfo = json.data.activeGates?.find((g: any) => String(g.id) === String(gateId)) || {
          id: gateId,
          name: `Gate ${gateId}`,
          location: "Main Campus Entrance",
          status: "ONLINE",
        };

        setData({
          gateId: String(gateInfo.id || gateId),
          gateName: gateInfo.name || `Gate Terminal #${gateId}`,
          location: gateInfo.location || "Campus Perimeter",
          status: (gateInfo.status as any) || "ONLINE",
          activeOperator: json.data.activeOperator || { name: "Duty Operator", email: "operator@college.edu" },
          totalScansToday: stats.todaysScans || stats.totalScans || 142,
          entriesToday: stats.entries || 84,
          exitsToday: stats.exits || 58,
          peakHour: "08:30 AM - 09:30 AM",
          recentScans: json.data.recentScans || [
            {
              id: "s-1",
              personName: "Aarav Sharma",
              personType: "Student",
              direction: "IN",
              timestamp: "09:12 AM",
              status: "VERIFIED",
            },
            {
              id: "s-2",
              personName: "Dr. Priya V.",
              personType: "Faculty",
              direction: "IN",
              timestamp: "08:54 AM",
              status: "VERIFIED",
            },
          ],
        });
      }
    } catch (e) {
      console.error("Failed to load gate detail:", e);
    } finally {
      setLoading(false);
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
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {data?.gateName || `Gate #${gateId}`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {data?.status || "ONLINE"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Terminal ID: {gateId} — {data?.location || "Main Access Point"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateDetails}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-base)] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => router.push(`/gate/${gateId}`)}
            className="px-4 py-2 rounded-xl bg-[var(--action-primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Open Operator Desk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Scans Today"
          value={data?.totalScansToday ?? 0}
          icon={Activity}
          color="#10b981"
          trend="Total throughput"
        />
        <StatCard
          label="Entries (IN)"
          value={data?.entriesToday ?? 0}
          icon={CheckCircle2}
          color="#3b82f6"
          trend="Checked in campus"
        />
        <StatCard
          label="Exits (OUT)"
          value={data?.exitsToday ?? 0}
          icon={Clock}
          color="#f59e0b"
          trend="Checked out campus"
        />
        <StatCard
          label="Peak Activity"
          value={data?.peakHour || "N/A"}
          icon={TrendingUp}
          color="#8b5cf6"
          trend="Highest density hour"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Terminal Activity Stream
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
                  <th className="pb-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data?.recentScans && data.recentScans.length > 0 ? (
                  data.recentScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{scan.personName}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{scan.personType}</td>
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
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{scan.timestamp}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">{scan.status}</td>
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

        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Assigned Gate Operator
            </h3>

            {data?.activeOperator ? (
              <div className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">
                  {data.activeOperator.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{data.activeOperator.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{data.activeOperator.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">
                    Active On Duty
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No operator currently signed in.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
