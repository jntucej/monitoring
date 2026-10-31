"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import {
  Loader2,
  UserCircle,
  Phone,
  Building2,
  ShieldCheck,
  Pencil,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function OperatorProfileInner() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleSavePhone = async () => {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUser({ ...user!, phone });
        setEditingPhone(false);
        setMsg("Phone updated.");
      } else {
        setError(json.error?.message || "Failed to update phone");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 flex items-center gap-3 text-sm text-[var(--text-muted)] min-w-0">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
          Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">My Profile</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
          Your operator account details.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{msg}</span>
        </div>
      )}

      <OperatorWidgetBoundary title="Account Details">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 space-y-4 min-w-0">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[var(--action-primary)]/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-8 h-8 text-[var(--action-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-[var(--text-primary)] truncate">{user?.name || "—"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email || "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm min-w-0">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Role</p>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--action-primary)] shrink-0" />
                <p className="text-[var(--text-primary)] capitalize">{user?.role || "—"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Assigned Gate</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <p className="text-[var(--text-primary)]">{user?.gateId ? `Gate ${user.gateId}` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Phone</p>
              {!editingPhone && (
                <button
                  type="button"
                  onClick={() => setEditingPhone(true)}
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs text-[var(--action-primary)] hover:underline"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            {editingPhone ? (
              <div className="flex flex-wrap gap-2 min-w-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none min-w-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSavePhone()}
                  disabled={saving}
                  className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 shrink-0"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingPhone(false); setPhone(user?.phone ?? ""); }}
                  disabled={saving}
                  className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-primary)] font-mono">
                {user?.phone || <span className="text-[var(--text-muted)]">Not set</span>}
              </p>
            )}
          </div>
        </div>
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorProfilePage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorProfileInner />
    </Suspense>
  );
}
