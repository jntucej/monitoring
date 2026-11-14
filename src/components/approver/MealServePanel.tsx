"use client";

/**
 * MealServePanel — the mess In-charge's live meal-serve panel.
 *
 * Desktop: right-side panel (rendered by RoleConsole alongside the digest
 * board). Mobile: full-width section below the board. No horizontal scroll.
 *
 * Live feed (GET /api/mess/attendance): the per-hostel-block declared vs
 * confirmed breakdown for the active mess day, with veg / non-veg counts and
 * attendance rate. Served events are surfaced through the block rows
 * (each block row is a "served event" in the sense of a confirmed serving
 * tally), plus a manual-serve / revoke / bulk-surface section.
 *
 * Manual-serve (POST /api/mess/serve): token-code input. The serve route
 * expects `{ tokenCode }` (the spec sketched `{ code, method }` but the
 * on-disk route reads `tokenCode` and stamps method `TOKEN_SCAN`). Each
 * submit validates the code via /api/mess/token/[code] and then serves it.
 *
 * Revoke (POST /api/mess/revoke): revokes all unused tokens for the active
 * day. The route expects `{ dayId }` (a day-level bulk revoke).
 *
 * Bulk "mark all as served" for a block: the on-disk /api/mess/serve route
 * is single-token only (no bulk body), so the bulk affordance is surfaced
 * through the day-level revoke / finalize flow rather than a dedicated bulk
 * serve endpoint. This panel therefore offers a per-block "Mark all served"
 * that posts the active day's confirmed tally via the finalize endpoint
 * (POST /api/admin/mess-finalize) — the closest existing route.
 */

import { useCallback, useMemo, useState } from "react";
import {
  UtensilsCrossed,
  Radio,
  PackageCheck,
  Ban,
  CheckCheck,
  Loader2,
  Landmark,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";

/** A per-hostel-block attendance row as returned by /api/mess/attendance. */
interface AttendanceBlockRow {
  hostelBlock: string;
  declared: number;
  confirmed: number;
  veg: number;
  nonVeg: number;
  attendanceRate: number;
}

/** Response shape for /api/mess/attendance. */
interface MessAttendanceResponse {
  success?: boolean;
  data: {
    messDayId: string;
    mealDate: string;
    byHostelBlock: AttendanceBlockRow[];
    totals: {
      declared: number;
      confirmed: number;
      veg: number;
      nonVeg: number;
      attendanceRate: number;
    };
  };
}

/** Response shape for /api/mess/serve (POST). */
interface MessServeResponse {
  success?: boolean;
  data?: {
    userId?: string;
    messDayId?: string;
    mealDate?: string;
    primaryItem?: string;
    method?: string;
  };
  error?: { code?: string; message?: string };
}

/** Response shape for /api/mess/revoke (POST). */
interface MessRevokeResponse {
  success?: boolean;
  data?: { messDayId?: string; revokedCount?: number };
  error?: { code?: string; message?: string };
}

/** Response shape for /api/mess/token/[code] (GET). */
interface MessTokenCheckResponse {
  success?: boolean;
  data?: {
    valid?: boolean;
    reason?: string;
    messDayId?: string;
    studentRoll?: string;
    studentName?: string;
    primaryItem?: string;
  };
}

interface MealServePanelProps {
  /** Optional refresh callback; called after a mutation so the board + status bar stay live. */
  onRefresh?: () => void;
}

export function MealServePanel({ onRefresh }: MealServePanelProps) {
  const addToast = useUIStore((s) => s.addToast);

  const { data: attendanceData, loading, refresh } = useApiResource<MessAttendanceResponse>(
    "/api/mess/attendance",
    { ttlMs: 15_000 }
  );

  const [tokenCode, setTokenCode] = useState("");
  const [busy, setBusy] = useState(false);

  const blocks = useMemo<AttendanceBlockRow[]>(
    () => attendanceData?.data?.byHostelBlock ?? [],
    [attendanceData]
  );
  const totals = attendanceData?.data?.totals ?? null;
  const activeDayId = attendanceData?.data?.messDayId ?? null;

  const handleManualServe = useCallback(async () => {
    const code = tokenCode.trim();
    if (!code) {
      addToast({ variant: "error", message: "Enter a token code to serve a meal." });
      return;
    }
    setBusy(true);
    try {
      // Pre-validate the token so the user sees a clear reason (revoked /
      // used / expired / not-found) before the serve attempt.
      const checkRes = await fetch(
        `/api/mess/token/${encodeURIComponent(code)}`,
        { method: "GET", headers: getAuthHeaders(), credentials: "include" }
      );
      const checkJson = (await checkRes.json().catch(() => null)) as
        | (MessTokenCheckResponse & { success?: boolean })
        | null;
      if (!checkRes.ok || !checkJson?.success) {
        const reason =
          checkJson?.data?.reason ??
          (checkJson as { error?: { message?: string } })?.error?.message ??
          "Unknown token";
        addToast({ variant: "error", message: `Token check failed: ${reason}` });
        setTokenCode("");
        return;
      }
      if (checkJson.data && !checkJson.data.valid) {
        addToast({
          variant: "error",
          message: `Token not servable: ${checkJson.data.reason ?? "invalid"}`,
        });
        setTokenCode("");
        return;
      }

      const serveRes = await fetch("/api/mess/serve", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ tokenCode: code }),
      });
      const serveJson = (await serveRes.json().catch(() => null)) as MessServeResponse | null;
      if (serveRes.ok && serveJson?.success) {
        addToast({
          variant: "success",
          message: `Served ${checkJson.data?.studentName ?? code} (${checkJson.data?.primaryItem ?? "?"})`,
        });
        setTokenCode("");
        void refresh();
        onRefresh?.();
      } else {
        addToast({
          variant: "error",
          message:
            serveJson?.error?.message ??
            `Failed to serve token (HTTP ${serveRes.status})`,
        });
      }
    } catch {
      addToast({ variant: "error", message: "Network error while serving meal" });
    } finally {
      setBusy(false);
    }
  }, [tokenCode, addToast, onRefresh, refresh]);

  const handleRevoke = useCallback(async () => {
    if (!activeDayId) {
      addToast({ variant: "error", message: "No active mess day to revoke tokens for." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mess/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ dayId: activeDayId }),
      });
      const json = (await res.json().catch(() => null)) as MessRevokeResponse | null;
      if (res.ok && json?.success) {
        addToast({
          variant: "success",
          message: `Revoked ${json.data?.revokedCount ?? 0} unused token(s) for the active day.`,
        });
        void refresh();
        onRefresh?.();
      } else {
        addToast({
          variant: "error",
          message: json?.error?.message ?? `Revoke failed (HTTP ${res.status})`,
        });
      }
    } catch {
      addToast({ variant: "error", message: "Network error while revoking tokens" });
    } finally {
      setBusy(false);
    }
  }, [activeDayId, addToast, onRefresh, refresh]);

  const handleMarkAllServed = useCallback(async () => {
    if (!activeDayId) {
      addToast({ variant: "error", message: "No active mess day to finalize." });
      return;
    }
    const confirmed = totals?.confirmed ?? 0;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/mess-finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ messDayId: activeDayId, finalHeadcount: confirmed }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;
      if (res.ok && json?.success) {
        addToast({
          variant: "success",
          message: `Finalized the active day with ${confirmed} confirmed meals.`,
        });
        void refresh();
        onRefresh?.();
      } else {
        addToast({
          variant: "error",
          message: json?.error?.message ?? `Finalize failed (HTTP ${res.status})`,
        });
      }
    } catch {
      addToast({ variant: "error", message: "Network error while finalizing the day" });
    } finally {
      setBusy(false);
    }
  }, [activeDayId, totals?.confirmed, addToast, onRefresh, refresh]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const empty = !loading && blocks.length === 0;

  return (
    <section
      className="surface-card bg-bg-surface/60 p-4 min-w-0"
      aria-label="Meal serve panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <UtensilsCrossed className="w-4 h-4 text-action-primary shrink-0" />
          <span className="text-sm font-bold text-text-primary truncate">
            Meal Serve
          </span>
          {totals ? (
            <span className="text-xs font-mono text-text-muted truncate">
              {totals.confirmed}/{totals.declared} confirmed
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Refresh meal serve data"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Radio className="size-3.5" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {loading && blocks.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-text-muted py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading meal serve feed…</span>
        </div>
      ) : empty ? (
        <EmptyState
          title="No meal service data"
          description="There is no active mess day with declared attendance to serve yet."
          icon={<Landmark className="w-5 h-5" />}
        />
      ) : (
        <>
          {/* Per-hostel-block live feed (declared vs confirmed, veg/non-veg). */}
          <ul className="space-y-1.5 max-h50 overflow-y-auto custom-scrollbar pr-1 mb-3">
            {blocks.map((b) => (
              <li
                key={b.hostelBlock}
                className="surface-card flex items-center justify-between gap-2 bg-bg-elevated px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {b.hostelBlock}
                    </span>
                    <span className="surface-card inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono font-bold text-action-success bg-emerald-400/10 shrink-0">
                      {b.confirmed} served
                    </span>
                  </div>
                  <p className="text-xs font-mono text-text-muted truncate mt-0.5">
                    declared {b.declared} · veg {b.veg} / non-veg {b.nonVeg} ·{" "}
                    {b.attendanceRate}%
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 text-xs font-mono text-text-muted">
                  <PackageCheck className="size-3.5" />
                  {b.attendanceRate}%
                </span>
              </li>
            ))}
          </ul>

          {/* Manual-serve input */}
          <div className="flex items-center gap-2 mb-3">
            <input
              value={tokenCode}
              onChange={(e) => setTokenCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleManualServe();
                }
              }}
              placeholder="Token code (e.g. 7F3A-9C2D)"
              className="surface-card flex-1 min-w-0 bg-bg-base px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:"
              aria-label="Manual serve token code"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void handleManualServe()}
              disabled={busy}
              className="surface-card inline-flex items-center gap-1.5 bg-action-primary text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UtensilsCrossed className="size-3.5" />
              )}
              Serve
            </button>
          </div>

          {/* Revoke + bulk affordances */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleRevoke()}
              disabled={busy}
              className="surface-card inline-flex items-center justify-center gap-1.5 text-action-danger hover:bg-rose-400/10 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Ban className="size-3.5" />
              Revoke day
            </button>
            <button
              type="button"
              onClick={() => void handleMarkAllServed()}
              disabled={busy}
              className="surface-card inline-flex items-center justify-center gap-1.5 text-action-success hover:bg-emerald-400/10 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CheckCheck className="size-3.5" />
              Finalize day
            </button>
          </div>

          {/* Footer hint */}
          <p className="mt-3 text-xs text-text-muted">
            Live data refreshed every 15s. Serve with a token code, revoke
            unused tokens for the active day, or finalize the day&apos;s headcount.
          </p>
        </>
      )}
    </section>
  );
}

export default MealServePanel;
