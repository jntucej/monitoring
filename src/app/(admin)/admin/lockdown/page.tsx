"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert, ShieldOff, Loader2, Clock,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface LockdownRow {
  id: string;
  scope: string;
  message: string | null;
  initiatedBy: string | null;
  createdAt: string;
}

/**
 * Admin Lockdown — emergency campus lockdown control.
 * Backend: /api/admin/lockdown (GET active, POST broadcast, DELETE lift).
 * Admin-only (admin|sysadmin|principal|supervisor).
 */
function AdminLockdownInner() {
  const [active, setActive] = useState<LockdownRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ scope: "all-gates", message: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lockdown", { headers: getAuthHeaders() });
      const body = await res.json();
      setActive(body?.data ?? null);
    } catch (e) {
      console.error("lockdown", e);
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/admin/lockdown", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: [draft.scope], message: draft.message || null }),
      });
      load();
    } catch (e) {
      console.error("lockdown broadcast", e);
    } finally {
      setBusy(false);
    }
  };

  const lift = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/lockdown", { method: "DELETE", headers: getAuthHeaders() });
      load();
    } catch (e) {
      console.error("lockdown lift", e);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Emergency Lockdown"
        subtitle="Broadcast or lift a campus-wide gate lockdown"
        onRefresh={load}
      />

      {/* Active state */}
      <WidgetBoundary title="Active lockdown">
        {active ? (
          <SectionCard
            title="Lockdown in effect"
            description={`Scope: ${active.scope}`}
            icon={ShieldAlert}
            iconTone="accent"
          >
            <div className="space-y-3">
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Gates are in lockdown mode. Unauthorized movement is being blocked
                  across the {active.scope} scope.
                </span>
              </div>
              {active.message && (
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong>Message:</strong> {active.message}
                </p>
              )}
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Since {new Date(active.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="flex">
                <button
                  onClick={lift}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  Lift Lockdown
                </button>
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="No active lockdown"
            description="All gates are in normal operation"
            icon={ShieldOff}
            iconTone="default"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              The campus is in normal operation. Use the broadcast form below to initiate
              an emergency lockdown.
            </p>
          </SectionCard>
        )}
      </WidgetBoundary>

      {/* Broadcast form */}
      {!active && (
        <WidgetBoundary title="Broadcast lockdown">
          <form onSubmit={broadcast}>
            <SectionCard
              title="Initiate lockdown"
              description="Sends an immediate lockdown broadcast to the selected gate scope"
              icon={ShieldAlert}
              iconTone="accent"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label>
                    <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Scope</span>
                    <select
                      value={draft.scope}
                      onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                    >
                      <option value="all-gates">All gates</option>
                      <option value="entry">Entry gates</option>
                      <option value="exit">Exit gates</option>
                      <option value="hostel">Hostel gates</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                      Broadcast message (optional)
                    </span>
                    <input
                      type="text"
                      value={draft.message}
                      onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                      placeholder="e.g. Emergency: seal campus"
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                    />
                  </label>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Broadcasting a lockdown immediately blocks gate movement in the
                    selected scope. Use only for genuine emergencies.
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    Broadcast Lockdown
                  </button>
                </div>
              </div>
            </SectionCard>
          </form>
        </WidgetBoundary>
      )}
    </div>
  );
}

export default function AdminLockdownPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminLockdownInner />
    </AuthGuard>
  );
}
