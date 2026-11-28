"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { ShieldAlert, X } from "lucide-react";

interface MeLockdownItem {
  id: string;
  scope_type: string;
  direction: "IN" | "OUT" | "BOTH";
  public_message: string | null;
  expires_at: string | null;
  evacuation: boolean;
  human_label: string;
}

/**
 * GlobalLockdownBanner — a high-contrast, dismissible strip shown to ANY
 * logged-in user who is currently covered by an active lockdown rule.
 *
 * Data source: GET /api/me/active-lockdown, which is server-side filtered to
 * the caller only — so a student never sees another student's (or a hostel
 * block's) private lockdown. Campus-wide rules appear to everyone; scoped
 * rules appear only to their matched cohort.
 *
 * Rendered inside ClientProviders (SafeAreaAppShell region) on every
 * non-marketing page, so the affected person sees the restriction on their
 * own home screen, not just at the gate.
 */
export function GlobalLockdownBanner() {
  const { request } = useApi();
  const authenticated = useAuthStore((s) => s.authenticated);
  const [items, setItems] = useState<MeLockdownItem[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const cancelledRef = { current: false };

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await request<MeLockdownItem[] | null>(
          "/api/me/active-lockdown",
        );
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setItems(list.filter((i) => i.public_message));
      } catch {
        // A lockdown-banner fetch failure must not break the page.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, request]);

  // Re-check on a short interval so a newly-issued campus lockdown shows up
  // without a reload; stop when nothing is active.
  useEffect(() => {
    if (!authenticated || items.length === 0) return;
    const t = setInterval(() => {
      (async () => {
        try {
          const res = await request<MeLockdownItem[] | null>(
            "/api/me/active-lockdown",
          );
          if (!cancelledRef.current) {
            setItems(Array.isArray(res.data) ? res.data : []);
          }
        } catch {
          /* keep showing last known state */
        }
      })();
    }, 20000);
    return () => clearInterval(t);
  }, [authenticated, items.length, request]);

  const visible = items.filter((i) => !dismissed[i.id]);
  if (!loaded || visible.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none sticky top-0 z-40 flex flex-col gap-1 px-3 pt-3"
    >
      {visible.map((it) => (
        <div
          key={it.id}
          className="pointer-events-auto mx-auto flex max-w-3xl items-start gap-2.5 rounded-xl border border-action-danger/40 bg-action-danger/95 px-3 py-2.5 text-sm text-white shadow-lg"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">
              {it.public_message}
            </p>
            <p className="mt-0.5 text-xs text-white/80">
              {describeScope(it)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss lockdown notice"
            onClick={() => setDismissed((d) => ({ ...d, [it.id]: true }))}
            className="rounded p-1 text-white/70 hover:bg-white/15 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

function describeScope(it: MeLockdownItem): string {
  const dir =
    it.direction === "BOTH"
      ? "entry and exit"
      : it.direction === "OUT"
        ? "exit"
        : "entry";
  const bits: string[] = [];
  if (it.scope_type !== "campus") bits.push(it.human_label);
  bits.push(`restricted for ${dir}`);
  if (it.expires_at) {
    bits.push(
      `until ${new Date(it.expires_at).toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      })}`,
    );
  }
  return bits.join(" · ");
}
