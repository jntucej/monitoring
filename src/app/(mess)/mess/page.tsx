"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Users,
  UserCheck,
  UserX,
  Building2,
  Leaf,
  Beef,
  CalendarDays,
  Clock,
  Eye,
  Flag,
  Ban,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import type {
  MessAnalytics,
  MessArrival,
  MessDay,
} from "@/lib/types";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmtDate(d: string | undefined): string {
  if (!d) return "No meal day scheduled";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtTime(d: string | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

type WindowStatus = "UPCOMING" | "OPEN" | "CLOSED" | "UNKNOWN";

function windowStatus(day: MessDay | null): { status: WindowStatus; label: string } {
  if (!day || !day.windowOpens || !day.windowCloses)
    return { status: "UNKNOWN", label: "No window set" };
  const now = new Date();
  const opens = new Date(day.windowOpens);
  const closes = new Date(day.windowCloses);
  if (now < opens) return { status: "UPCOMING", label: `Opens ${fmtTime(day.windowOpens)}` };
  if (now > closes) return { status: "CLOSED", label: "Closed" };
  return { status: "OPEN", label: `Closes ${fmtTime(day.windowCloses)}` };
}

const statusStyles: Record<WindowStatus, string> = {
  OPEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  UPCOMING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  CLOSED: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  UNKNOWN: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

/* ── sub components ──────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const toneMap: Record<typeof tone, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 space-y-2">
      <div className={`inline-flex w-9 h-9 items-center justify-center rounded-xl border ${toneMap[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function ArrivalsModal({
  open,
  onClose,
  arrivals,
  dayId,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  arrivals: MessArrival[];
  dayId: string | null;
  onConfirm: (userId: string) => Promise<void>;
}) {
  const { addToast } = useUIStore();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!open) return null;

  const handleConfirm = async (userId: string) => {
    setConfirming(userId);
    try {
      await onConfirm(userId);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Confirm failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80dvh] bg-[#0d1220] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Meal Arrivals</h2>
              <p className="text-[11px] text-slate-500">{arrivals.length} hostellers · tap to confirm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            aria-label="Close"
          >
            <Ban className="w-4 h-4 hidden" />
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {arrivals.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No arrivals recorded yet for this meal day.
            </div>
          ) : (
            arrivals.map((a) => (
              <div key={a.userId} className="flex items-center gap-3 px-5 py-3.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    a.primaryItem === "NON_VEG"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {a.roll ? a.roll.slice(-3).toUpperCase() : "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.name || a.userId}</p>
                  <p className="text-[11px] text-slate-500">
                    Roll {a.roll ?? "—"} · {a.primaryItem === "NON_VEG" ? "🍖 Non-Veg" : "🥬 Veg"}
                  </p>
                </div>
                {a.noShow ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                    <UserX className="w-3 h-3" /> No-show
                  </span>
                ) : a.confirmed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed
                  </span>
                ) : (
                  <button
                    onClick={() => handleConfirm(a.userId)}
                    disabled={confirming === a.userId || !dayId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold transition"
                  >
                    {confirming === a.userId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserCheck className="w-3 h-3" />
                    )}
                    Confirm
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */

function MessDashboardInner() {
  const { addToast } = useUIStore();

  /* meal days (to pick current) */
  const daysRes = useApiResource<MessDay[] | { days: MessDay[] } | null>(
    "/api/mess/days"
  );

  const days: MessDay[] = (() => {
    if (!daysRes.data) return [];
    const d = daysRes.data as unknown;
    if (Array.isArray(d)) return d as MessDay[];
    return (d as { days?: MessDay[] }).days ?? [];
  })();

  const todayIso = new Date().toISOString().slice(0, 10);
  const currentDay =
    days.find((d) => d.mealDate === todayIso) ??
    [...days].filter((d) => !d.mealDate || d.mealDate >= todayIso)[0] ??
    days[0] ??
    null;

  const dayId = currentDay?.id ?? null;
  const wStatus = windowStatus(currentDay);

  /* analytics for current day */
  const analyticsRes = useApiResource<MessAnalytics | null>(
    dayId ? `/api/mess/analytics?dayId=${encodeURIComponent(dayId)}` : null,
    { enabled: Boolean(dayId) }
  );
  usePolling(() => void analyticsRes.refresh(), {
    intervalMs: 30_000,
    enabled: Boolean(dayId),
  });

  /* arrivals (lazy — only when modal opened) */
  const [showArrivals, setShowArrivals] = useState(false);
  const [arrivals, setArrivals] = useState<MessArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  const openArrivals = async () => {
    setShowArrivals(true);
    if (!dayId) return;
    setArrivalsLoading(true);
    try {
      const res = await fetch(`/api/mess/arrivals?dayId=${encodeURIComponent(dayId)}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        const data: unknown = json.success === false ? json : (json.data ?? json);
        const list = Array.isArray(data)
          ? (data as MessArrival[])
          : Array.isArray((data as { arrivals?: MessArrival[] })?.arrivals)
            ? ((data as { arrivals: MessArrival[] }).arrivals)
            : [];
        setArrivals(list);
      }
    } finally {
      setArrivalsLoading(false);
    }
  };

  const confirmArrival = async (userId: string) => {
    if (!dayId) throw new Error("No meal day selected");
    const res = await fetch("/api/mess/arrivals", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, dayId }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
      const msg =
        typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    addToast({
      variant: "success",
      title: "Arrival confirmed",
      message: "Token marked as present.",
    });
    /* refresh list */
    await openArrivals();
  };

  /* revoke modal */
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const handleRevoke = async () => {
    if (!dayId) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/mess/revoke", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayId }),
      });
      const json = await res.json().catch(() => null);
      const count: number | undefined = json?.data?.revoked ?? json?.revoked;
      addToast({
        variant: "success",
        title: "Tokens revoked",
        message: count != null ? `${count} token(s) revoked.` : "All tokens for this day revoked.",
      });
    } catch {
      addToast({ variant: "error", title: "Revoke failed", message: "Network error — try again." });
    } finally {
      setRevoking(false);
    }
  };

  /* no-show flag */
  const [flagging, setFlagging] = useState(false);
  const handleFlagNoShows = async () => {
    if (!dayId) return;
    setFlagging(true);
    try {
      /* flag all unconfirmed arrivals as no-shows via serve endpoint batch */
      const res = await fetch("/api/mess/arrivals", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayId, flagNoShow: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast({
        variant: "success",
        title: "No-shows flagged",
        message: "Unconfirmed hostellers marked as no-show for this meal day.",
      });
    } catch {
      addToast({
        variant: "error",
        title: "Flag failed",
        message: "Could not flag no-shows. The endpoint may not support bulk flags yet.",
      });
    } finally {
      setFlagging(false);
    }
  };

  /* PDF placeholder */
  const handlePdf = () => {
    addToast({
      variant: "info",
      title: "PDF export",
      message: "PDF generation will be available once the report service is wired up.",
    });
  };

  /* veg vs non-veg bar */
  const veg = analyticsRes.data?.byPrimary?.veg ?? 0;
  const nonVeg = analyticsRes.data?.byPrimary?.nonVeg ?? 0;
  const totalPrimary = veg + nonVeg;
  const vegPct = totalPrimary ? Math.round((veg / totalPrimary) * 100) : 0;

  const byBlock = analyticsRes.data?.byBlock ?? [];
  const confirmed = analyticsRes.data?.confirmedPresent ?? 0;
  const declared = analyticsRes.data?.declaredPresent ?? 0;
  const notSelected = analyticsRes.data?.notSelected ?? 0;
  const totalHostellers = analyticsRes.data?.totalHostellers ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-white truncate">Mess Incharge</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                {fmtDate(currentDay?.mealDate)}
                {currentDay?.dayType ? ` · ${currentDay.dayType.replace(/_/g, " ")}` : ""}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusStyles[wStatus.status]}`}
          >
            <Clock className="w-3 h-3" />
            {wStatus.label}
          </span>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={openArrivals}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
          >
            <Eye className="w-3.5 h-3.5" /> View Arrivals
          </button>
          <button
            onClick={handleFlagNoShows}
            disabled={flagging}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 disabled:opacity-40 text-white text-[11px] font-bold transition"
          >
            {flagging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
            Flag No-Shows
          </button>
          <button
            onClick={() => setRevokeOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold transition"
          >
            <Ban className="w-3.5 h-3.5" /> Revoke Tokens
          </button>
          <button
            onClick={handlePdf}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold transition"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" /> Generate PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <WidgetBoundary title="KPI cards">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Total Hostellers"
            value={totalHostellers}
            icon={<Users className="w-4 h-4" />}
            tone="slate"
          />
          <KpiCard
            label="Declared Present"
            value={declared}
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="emerald"
          />
          <KpiCard
            label="Confirmed Present"
            value={confirmed}
            icon={<UserCheck className="w-4 h-4" />}
            tone="emerald"
          />
          <KpiCard
            label="Not Selected"
            value={notSelected}
            icon={<UserX className="w-4 h-4" />}
            tone="amber"
          />
        </div>
      </WidgetBoundary>

      {/* Veg vs Non-Veg */}
      <WidgetBoundary title="Veg vs Non-Veg">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Veg vs Non-Veg</span>
            </div>
            <span className="text-[11px] text-slate-500">{totalPrimary} selections</span>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden bg-slate-800/60">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${vegPct}%` }}
            />
            <div
              className="h-full bg-rose-500 transition-all"
              style={{ width: `${100 - vegPct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <Leaf className="w-3.5 h-3.5" /> Veg
              </span>
              <span className="text-sm font-black text-emerald-400 tabular-nums">
                {veg} <span className="text-[10px] text-emerald-500/60">({vegPct}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                <Beef className="w-3.5 h-3.5" /> Non-Veg
              </span>
              <span className="text-sm font-black text-rose-400 tabular-nums">
                {nonVeg} <span className="text-[10px] text-rose-500/60">({100 - vegPct}%)</span>
              </span>
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* Block breakdown */}
      <WidgetBoundary title="Block breakdown">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">By Hostel Block</span>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-3">Block</th>
                  <th className="py-2.5 px-3 text-emerald-400">Veg</th>
                  <th className="py-2.5 px-3 text-rose-400">Non-Veg</th>
                  <th className="py-2.5 pl-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {byBlock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                      No block data for this meal day yet.
                    </td>
                  </tr>
                ) : (
                  byBlock.map((b) => (
                    <tr key={b.block} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 pr-3 font-semibold text-white">{b.block}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400 tabular-nums">{b.veg}</td>
                      <td className="py-2.5 px-3 font-bold text-rose-400 tabular-nums">{b.nonVeg}</td>
                      <td className="py-2.5 pl-3 font-bold text-slate-300 tabular-nums">
                        {b.veg + b.nonVeg}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>

      {/* Scan link + dev strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Link
          href="/mess/scan"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black uppercase tracking-wider transition"
        >
          <Eye className="w-4 h-4" /> Open Token Scanner
        </Link>
        <div className="flex-1">
          <DevContactStrip />
        </div>
      </div>

      {/* Modals */}
      <ArrivalsModal
        open={showArrivals}
        onClose={() => setShowArrivals(false)}
        arrivals={arrivals}
        dayId={dayId}
        onConfirm={confirmArrival}
      />

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title="Revoke all tokens?"
        body={`This will revoke every outstanding token for ${fmtDate(currentDay?.mealDate)}. Served tokens are unaffected. This action cannot be undone.`}
        onConfirm={handleRevoke}
        confirmText="Revoke tokens"
        variant="destructive"
      />

      {arrivalsLoading && showArrivals && null}
      {analyticsRes.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{analyticsRes.error}</span>
          <button
            onClick={() => void analyticsRes.refresh()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MessDashboardInner />
    </Suspense>
  );
}
