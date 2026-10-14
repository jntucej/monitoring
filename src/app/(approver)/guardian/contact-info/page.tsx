"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Save
} from "lucide-react";

/* ── shape ── */

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  uniqueId?: string;
  twoFactorEnabled?: boolean;
}

interface ProfileResponse {
  success: boolean;
  data: ProfileData;
  error?: string;
}

/* ── main ── */

function ContactInfoInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const {
    data: profile,
    loading,
    error,
    refresh,
  } = useApiResource<ProfileResponse>("/api/profile", {
    ttlMs: 60_000,
    enabled: !!userId,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile?.data) {
      setName(profile.data.name || "");
      setPhone(profile.data.phone || "");
    }
  }, [profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setMsg({ ok: true, text: "Contact details updated." });
        refresh();
      } else {
        setMsg({ ok: false, text: json?.error || "Failed to update contact details." });
      }
    } catch {
      setMsg({ ok: false, text: "Network error — please retry." });
    } finally {
      setBusy(false);
    }
  };

  const p = profile?.data;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Contact Information
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Your account contact details as registered on the campus portal
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* read-only summary card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Registered details
          </h2>

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
            </div>
          ) : p ? (
            <dl className="space-y-3">
              {[
                { icon: User, label: "Full name", value: p.name || "—" },
                { icon: Mail, label: "Email", value: p.email || "—" },
                { icon: Phone, label: "Phone", value: p.phone || "Not set" },
                { icon: ShieldCheck, label: "Role", value: p.role || "—" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <row.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-[var(--text-muted)]">{row.label}</dt>
                    <dd className="text-sm text-[var(--text-primary)] truncate">{row.value}</dd>
                  </div>
                </div>
              ))}
              {p.twoFactorEnabled === false && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                  Two-factor authentication is not enabled on this account. You can enable it under
                  account settings for stronger security.
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No profile data available.</p>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            Email changes, password resets, PIN changes and role changes must go through the
            dedicated account endpoints or the campus admin office.
          </p>
        </div>

        {/* update form */}
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Update name &amp; phone
          </h2>

          <div>
            <label htmlFor="contactName" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Full name
            </label>
            <input
              id="contactName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || loading}
              required
              minLength={2}
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Phone
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy || loading}
              placeholder="+91 90000 00000"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={busy || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {busy ? "Saving…" : "Save changes"}
          </button>

          {msg && (
            <div
              className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
                msg.ok
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-300"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{msg.text}</span>
            </div>
          )}
        </form>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function ContactInfoPage() {
  return (
    <WidgetBoundary title="Contact Information">
      <Suspense fallback={<PageLoading />}>
        <ContactInfoInner />
      </Suspense>
    </WidgetBoundary>
  );
}
