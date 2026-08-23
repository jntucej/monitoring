"use client";
import { useEffect, useState } from "react";
import { Ticket, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { GatePass } from "@/lib/types";

function expiryLabel(to: string, status: string): string {
  if (status === "REJECTED") return "Rejected";
  if (status === "PENDING" || status === "APPROVED_PARENT" || status === "APPROVED_ADMIN") return "Awaiting approval";
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `Expires in ${Math.floor(ms / 60_000)} min`;
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function statusStyle(s: string) {
  if (s === "APPROVED" || s === "COMPLETED") return { text: "text-emerald-300", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" /> };
  if (s === "REJECTED") return { text: "text-rose-300", bg: "bg-rose-500/10", icon: <XCircle className="w-8 h-8 text-rose-400" /> };
  return { text: "text-amber-300", bg: "bg-amber-500/10", icon: <Clock className="w-8 h-8 text-amber-400" /> };
}

export function ActivePasses() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setPasses(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Active Passes</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : passes.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">No passes yet.</p>
      ) : (
        <div className="space-y-4">
          {passes.map((pass) => {
            const s = statusStyle(pass.finalStatus);
            return (
              <div key={pass.id} className={`flex items-center gap-4 p-3 rounded-lg ${s.bg}`}>
                {s.icon}
                <div className="flex-1">
                  <p className={`font-medium ${s.text}`}>{pass.reason}</p>
                  <p className={`text-sm ${s.text} opacity-80`}>
                    {expiryLabel(pass.to, pass.finalStatus)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-black/20 px-2 py-1 rounded">
                    {pass.finalStatus}
                  </span>
                  {pass.parentStatus !== 'APPROVED' && (
                    <span className="text-[9px] opacity-60">Parent: {pass.parentStatus}</span>
                  )}
                  {pass.adminStatus !== 'APPROVED' && (
                    <span className="text-[9px] opacity-60">Admin: {pass.adminStatus}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
