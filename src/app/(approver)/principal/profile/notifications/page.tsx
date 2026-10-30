"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Bell, Mail, MessageSquare, Phone, Siren } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import Link from "next/link";

function NotificationsPageInner() {
  const addToast = useUIStore((s) => s.addToast);
  const [prefs, setPrefs] = useState<{
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data) setPrefs(json.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  const update = useCallback(
    async (key: string, value: boolean) => {
      setPrefs((prev) => (prev ? { ...prev, [key]: value } : null));
      try {
        await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ [key]: value }),
        });
      } catch {
        // silent
      }
    },
    [],
  );

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <Link
        href="/principal/profile"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ← Back to profile
      </Link>

      <h1 className="text-xl font-bold text-[var(--text-primary)]">Notification Preferences</h1>

      <PrincipalWidgetBoundary title="Notification Channels">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3 max-w-md">
          {loading ? (
            <div className="text-xs text-[var(--text-muted)]">Loading preferences…</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">Email Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={() => update("email", !prefs?.email)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    prefs?.email ? "bg-indigo-500" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      prefs?.email ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">SMS Alerts</span>
                </div>
                <button
                  type="button"
                  onClick={() => update("sms", !prefs?.sms)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    prefs?.sms ? "bg-indigo-500" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      prefs?.sms ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Siren className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">Push Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={() => update("push", !prefs?.push)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    prefs?.push ? "bg-indigo-500" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      prefs?.push ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">In-App Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={() => update("inApp", !prefs?.inApp)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    prefs?.inApp ? "bg-indigo-500" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      prefs?.inApp ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Preferences are saved to your account and affect how you receive alerts about
                pending approvals, SLA breaches, and emergency escalations.
              </p>
            </div>
          )}
        </div>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <NotificationsPageInner />
    </Suspense>
  );
}
