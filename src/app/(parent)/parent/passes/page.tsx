"use client";
import { useEffect, useState } from "react";
import { RequestPassForm } from "@/components/parent/RequestPassForm";
import { Ticket, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { GatePass, GatePassStatus } from "@/lib/types";
import { getPassTypeName } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";

function statusStyle(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") {
    return "bg-emerald-500/10 text-emerald-400";
  }
  if (status === "PENDING" || status === "APPROVED_PARENT" || status === "APPROVED_ADMIN") {
    return "bg-amber-500/10 text-amber-400";
  }
  return "bg-rose-500/10 text-rose-400";
}

function statusIcon(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return <CheckCircle2 className="w-3 h-3" />;
  if (status === "REJECTED") return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

export default function ParentPassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const authRaw = sessionStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.user?.parentId ?? auth?.user?.id ?? "pa-1";
      const res = await fetch(`/api/passes?parentId=${parentId}`, { 
        headers: getAuthHeaders(),
        cache: "no-store" 
      });
      if (!res.ok) throw new Error("Failed to fetch passes");
      const json = await res.json();
      if (json.success) {
        setPasses(Array.isArray(json.data) ? json.data : []);
        setError(null);
      } else {
        setError(typeof json.error === "string" ? json.error : json.error?.message ?? "Failed to load passes");
      }
    } catch (err: any) {
      console.error("Failed to load pass requests:", err);
      setError(err?.message ?? "Failed to load pass requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pass Requests</h1>
        <p className="text-[var(--text-muted)]">Request and track gate passes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RequestPassForm />

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-[var(--action-primary)]" />
            Recent Pass Requests
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : passes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No pass requests yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {passes.map((pass) => (
                <div key={pass.id} className="p-3 bg-[var(--bg-base)]/50 rounded-lg border border-[var(--border)]/40">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium">{getPassTypeName(pass.reason)}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle(pass.finalStatus)}`}>
                      {statusIcon(pass.finalStatus)}
                      <span>{pass.finalStatus}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {pass.studentName} • {pass.roll}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {new Date(pass.from).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" → "}
                    {new Date(pass.to).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {pass.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">"{pass.description}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
