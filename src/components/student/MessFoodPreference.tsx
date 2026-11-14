"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  Lock,
  Loader2,
  MapPin,
  Minus,
  RefreshCw,
  Save,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { getAuthHeaders } from "@/lib/utils";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { friendlyApiError } from "@/lib/student-utils";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useUIStore } from "@/stores/uiStore";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MessPeriod {
  id: string;
  mealDate: string;
  dayType: string;
  windowOpens: string;
  windowCloses: string;
  tokensLockedAt: string | null;
}

interface MessMyPreference {
  primaryItem: string;
  willBePresent: boolean;
  subItemLabels: string[];
  subItemIds?: string[];
}

interface MessMenuItem {
  id: string;
  code: string;
  label: string;
  isAvailable: boolean;
}

interface MessPreferenceData {
  period: MessPeriod | null;
  myPreference: MessMyPreference | null;
  menuItems: MessMenuItem[];
}

interface MessMenuData {
  mealDate: string;
  windowOpens: string;
  windowCloses: string;
  items: { code: string; label: string; isAvailable: boolean }[];
}

type WindowStatus = "OPEN" | "CLOSED" | "LOCKED";

function getWindowStatus(period: MessPeriod | null, now: number): { status: WindowStatus; msLeft: number } {
  if (!period) return { status: "CLOSED", msLeft: 0 };
  const closes = new Date(period.windowCloses).getTime();
  const opens = new Date(period.windowOpens).getTime();
  if (period.tokensLockedAt) return { status: "LOCKED", msLeft: 0 };
  if (now >= closes) return { status: "CLOSED", msLeft: 0 };
  if (now < opens) return { status: "CLOSED", msLeft: opens - now };
  return { status: "OPEN", msLeft: closes - now };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m";
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m ${secs}s`;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function useAuthUser() {
  // S9 root fix: read the live zustand user (hydrated once at boot) instead
  // of re-parsing the persisted store on every mount. The raw sessionStorage
  // parse below was the defensive fallback that hid the hydration bug.
  const authUser = useAuthStore((st) => st.user);
  const hasHydrated = useHasHydrated();
  const user = hasHydrated
    ? {
        hostelBlock: authUser?.studentDetails?.hostelBlock,
        uniqueId: authUser?.uniqueId,
      }
    : null;
  return user;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function MessFoodPreferenceInner() {
  const { addToast } = useUIStore();
  const authUser = useAuthUser();

  const preference = useApiResource<MessPreferenceData>("/api/mess/preference", { ttlMs: 10_000 });
  const menu = useApiResource<MessMenuData>("/api/mess/menu", { ttlMs: 10_000 });

  /* live clock — drives the window countdown without refetching */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [primaryItem, setPrimaryItem] = useState<string>("");
  const [subItemIds, setSubItemIds] = useState<string[]>([]);
  const [willBePresent, setWillBePresent] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  /* hydrate the form when the API loads or refreshes */
  useEffect(() => {
    if (!preference.data) return;
    const p = preference.data.myPreference;
    if (p) {
      setPrimaryItem(p.primaryItem);
      setWillBePresent(p.willBePresent);
      if (p.subItemIds?.length) {
        // API returns authoritative sub-item IDs — use them directly.
        setSubItemIds(p.subItemIds);
      } else {
        // Fallback: derive from labels when subItemIds is absent (legacy response).
        const available = preference.data.menuItems?.filter((i) => i.isAvailable) ?? [];
        setSubItemIds(
          (p.subItemLabels ?? [])
            .map((label) => available.find((i) => i.label === label)?.id)
            .filter((id): id is string => Boolean(id)),
        );
      }
    }
  }, [preference.data]);

  /* refetch the window state periodically (cheap, cached 10s) */
  usePolling(
    () => {
      void preference.refresh();
    },
    { intervalMs: 30_000, enabled: Boolean(preference.data?.period) },
  );

  const period = preference.data?.period ?? null;
  const { status, msLeft } = useMemo(() => getWindowStatus(period, now), [period, now]);
  const windowOpen = status === "OPEN";

  const availableSubs = useMemo(
    () =>
      menu.data?.items
        ?.filter((i) => i.isAvailable)
        ?.map((i) => ({ id: i.code, code: i.code, label: i.label })) ??
      preference.data?.menuItems
        ?.filter((i) => i.isAvailable)
        ?.map((i) => ({ id: i.id, code: i.code, label: i.label })) ??
      [],
    [menu.data, preference.data],
  );

  const subItems = availableSubs.length > 0 ? availableSubs : [];

  const toggleSub = (id: string) =>
    setSubItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!period || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mess/preference", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messDayId: period.id,
          primaryItem,
          willBePresent,
          subItemIds: subItemIds.length ? subItemIds : undefined,
          hostelBlock: authUser?.hostelBlock,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        addToast({ variant: "success", title: "Saved", message: "Mess preference recorded for the window." });
        clearCache("/api/mess/preference");
        await preference.refresh();
      } else {
        addToast({ variant: "error", title: "Save failed", message: json?.error?.message ?? `HTTP ${res.status}` });
      }
    } catch {
      addToast({ variant: "error", title: "Save failed", message: "Network error — please retry." });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- loading ---------------- */
  if (preference.loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted p-4">
        <Loader2 className="w-4 h-4 animate-spin text-action-success" />
        Loading mess window…
      </div>
    );
  }

  /* ---------------- error ---------------- */
  if (preference.error || menu.error) {
    const detail = preference.error ?? menu.error ?? "";
    const httpMatch = detail.match(/^HTTP (\d{3})/);
    const status = httpMatch ? Number(httpMatch[1]) : null;
    const friendly = status ? friendlyApiError(status, detail) : detail || "Unable to load mess data.";
    return (
      <div className="space-y-2 p-1">
        <p className="text-xs text-action-danger">Could not load mess data: {friendly}</p>
        <button
          onClick={() => {
            clearCache("/api/mess/preference");
            clearCache("/api/mess/menu");
            void (async () => {
              await preference.refresh();
              await menu.refresh();
            })();
          }}
          className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-action-danger text-xs font-bold hover:bg-rose-500/20 transition"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    );
  }

  /* ---------------- no active window ---------------- */
  if (!period) {
    return (
      <div className="space-y-2 p-2 text-center">
        <UtensilsCrossed className="w-4 h-4 mx-auto text-text-muted opacity-60" />
        <p className="text-xs font-semibold text-text-primary">No mess window active</p>
        <p className="text-xs text-text-muted">
          The next meal preference window will appear here automatically.
        </p>
      </div>
    );
  }

  const myPref = preference.data?.myPreference;
  const token = (preference.data as { myToken?: string } & MessPreferenceData)?.myToken;
  const dayLabel = new Date(period.mealDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const statusBadge =
    status === "OPEN" ? (
      <span className="surface-card inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-action-success text-xs font-bold">
        <Clock className="size-3.5" />
        OPEN · {formatCountdown(msLeft)}
      </span>
    ) : status === "LOCKED" ? (
      <span className="surface-card inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-action-warning text-xs font-bold">
        <Lock className="size-3.5" />
        LOCKED
      </span>
    ) : (
    <span className="surface-card inline-flex items-center gap-1 px-2 py-0.5 bg-bg-elevated/15 text-text-muted text-xs font-bold">
      {msLeft > 0 ? (
        <span className="tabular-nums">Opens in {formatCountdown(msLeft)}</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <Minus className="size-3.5" /> Closed
        </span>
      )}
    </span>
    );

  return (
    <div className="space-y-3">
      {/* Header: meal day + window status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="surface-card p-1.5 bg-emerald-500/15 text-action-success">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary">{dayLabel}</p>
            <p className="text-xs text-text-muted uppercase tracking-wide">{period.dayType}</p>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Locked banner */}
      {status === "LOCKED" && (
        <div className="surface-card flex items-start gap-2 bg-amber-500/10 p-3">
          <Lock className="w-4 h-4 text-action-warning mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-action-warning">Selection window locked</p>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {myPref
                ? `Your choice: ${myPref.primaryItem === "VEG" ? "Veg" : "Non-Veg"} · ${myPref.willBePresent ? "Present" : "Absent"}${
                    myPref.subItemLabels?.length ? ` · ${myPref.subItemLabels.join(", ")}` : ""
                  }`
                : "No saved choice found for this day."}
            </p>
          </div>
        </div>
      )}

      {/* Saved-choice prompt when open but nothing selected */}
      {windowOpen && !myPref && (
        <p className="text-xs text-text-muted flex items-center gap-1.5">
          <UtensilsCrossed className="w-3.5 h-3.5 text-action-success" />
          Not selected yet — pick your meal below before the window closes.
        </p>
      )}

      {/* Token (if present) */}
      {status === "LOCKED" && token && (
        <div className="surface-card flex items-center gap-3 bg-emerald-500/10 p-3">
          <div className="surface-card bg-white p-1.5 shrink-0">
            <QRCodeCanvas value={token} size={72} bgColor="var(--color-surface)" fgColor="var(--bg-elevated)" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-action-success">Meal token</p>
            <p className="text-sm font-mono font-bold text-text-primary break-all">{token}</p>
          </div>
        </div>
      )}

      {/* Selection form */}
      {windowOpen && (
        <div className="space-y-3">
          {/* Primary item toggle */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">Primary item</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrimaryItem("VEG")}
                className={` py-2.5 rounded-xl text-xs font-black tracking-wide transition-all "VEG" "borderaction-success text-emerald-950 "text-action-success hover:bg-emerald-500/20" "VEG" "borderaction-success text-emerald-950" "text-action-success hover:bg-emerald-500/20" `}
              >
                🥬 VEG
              </button>
              <button
                type="button"
                onClick={() => setPrimaryItem("NON_VEG")}
                className={` py-2.5 rounded-xl text-xs font-black tracking-wide transition-all "NON_VEG" "text-rose-950 "text-action-danger hover:bg-rose-500/20" "NON_VEG" "text-rose-950" "text-action-danger hover:bg-rose-500/20" `}
              >
                🍖 NON_VEG
              </button>
            </div>
          </div>

          {/* Sub-items */}
          {subItems.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">Sub items</p>
              <div className="overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 min-w-0">
                  {subItems.map((s) => {
                    const on = subItemIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSub(s.id)}
                        className={` flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition "text-action-success" "text-text-muted "text-action-success" "text-text-muted" `}
                      >
                        <span
                          className={` inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm "bg-action-success borderaction-success text-emerald-950" "" `}
                        >
                          {on && <Check className="size-4" />}
                        </span>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Will be present toggle */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Attendance</p>
              <p className="text-xs text-text-primary font-medium">
                {willBePresent ? "I will be present for the meal" : "I will not be present"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={willBePresent}
              onClick={() => setWillBePresent((v) => !v)}
              className={`relative w-4 h-5.5 h-[22px] rounded-full transition-colors ${
                willBePresent ? "bg-action-success" : "bg-bg-elevated"
              }`}
            >
              <span
                className={` absolute top-0.5 w-4 h-4 rounded-full transition-all "left-[22px]" "left-0.5" "left-[22px]" "left-0.5" `}
              />
            </button>
          </div>

          {/* Hostel block (read-only) */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MapPin className="size-3.5" />
            Hostel block: <span className="text-text-primary font-semibold">{authUser?.hostelBlock ?? "—"}</span>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !primaryItem}
            className="surface-card w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-action-success hover:bg-action-success disabled:opacity-40 disabled:cursor-not-allowed text-emerald-950 text-xs font-black tracking-wide transition"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {myPref ? "Update preference" : "Save preference"}
          </button>
        </div>
      )}

      {/* Closed banner (not locked) */}
      {status === "CLOSED" && (
        <p className="text-xs text-text-muted text-center">
          {myPref
            ? `Your saved choice: ${myPref.primaryItem === "VEG" ? "Veg" : "Non-Veg"} · ${myPref.willBePresent ? "Present" : "Absent"}`
            : "No selection was saved for this meal day."}
        </p>
      )}

      <div className="text-center">
        <Link
          href="/mess/default"
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-action-success transition"
        >
          <Copy className="size-3.5" /> Set your default meal →
        </Link>
      </div>
    </div>
  );
}

/**
 * Mess food preference card. Wrapped in an error boundary + Suspense so a
 * bad API response degrades gracefully on the dashboard grid.
 */
export function MessFoodPreference() {
  return (
    <div className="surface-card bg-bg-surface p-4 space-y-2">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-action-success" />
        <h3 className="text-sm font-semibold text-text-primary">Mess Food Preference</h3>
      </div>
      <WidgetBoundary title="Mess Food Preference">
        <MessFoodPreferenceInner />
      </WidgetBoundary>
    </div>
  );
}

export default MessFoodPreference;
