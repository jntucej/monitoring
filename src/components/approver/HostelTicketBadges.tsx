"use client";

// Shared helpers for the hostel-permission-hierarchy UI surfaces
// (PermissionList + StageQueuePanel). Kept here so both lists read the
// same ticket-extension fields and apply the same pinned/SLA sort without
// each having to re-derive the hierarchy.

import { Forward } from "lucide-react";
import { L1_ROLE, L2_ROLE, L3_ROLE, L4_ROLE } from "@/lib/permission-workflow-pure";

/**
 * The NEW optional routing/forward fields the DB now carries on `permissions`
 * rows (TASK 3). Every field is optional so the interface is trivially
 * satisfied by both the `PermissionItem` read shape and the queue-feed row
 * shape — no caller needs to cast just to use the badges or the sort.
 */
export interface HostelTicketRow {
  /** Current hostel level the ticket is routed to (forward target / stage). */
  routed_to_role?: string | null;
  /** Set when this ticket was forwarded from a lower level. */
  forwarded_from_role?: string | null;
  /** Forwarder's comment explaining the handoff. */
  forward_comment?: string | null;
  /** True when the pass was generated directly (bypassed the chain). */
  direct_generated?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  [L1_ROLE]: "Caretaker",
  [L2_ROLE]: "Deputy Warden",
  [L3_ROLE]: "Hostel Manager",
  warden_or_principal: "Warden / Principal",
  [L4_ROLE]: "Principal",
};

/** Map a hostel role to its 1-based chain level label (L1..L4). */
const ROLE_LEVELS: Record<string, string> = {
  [L1_ROLE]: "L1",
  [L2_ROLE]: "L2",
  [L3_ROLE]: "L3",
  [L4_ROLE]: "L4",
};

/**
 * Renders the level badge (current hostel stage) for a ticket row. The
 * effective level prefers the explicit routing field, falling back to the
 * plain `current_stage` passed in by the caller.
 */
export function LevelBadge({ row, fallbackStage }: { row: HostelTicketRow; fallbackStage?: string }) {
  const stage = row.routed_to_role || fallbackStage || "";
  if (!stage) return null;
  const label = ROLE_LABELS[stage] || stage;
  const level = ROLE_LEVELS[stage];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--action-primary)]"
      title={`Current level: ${stage}`}
    >
      {level ? `${level} · ${label}` : label}
    </span>
  );
}

/**
 * Renders a "Forwarded from X" chip when the ticket was forwarded up from a
 * lower level.
 */
export function ForwardedFromChip({ row }: { row: HostelTicketRow }) {
  if (!row.forwarded_from_role) return null;
  const from = ROLE_LABELS[row.forwarded_from_role] || row.forwarded_from_role;
  const fromLevel = ROLE_LEVELS[row.forwarded_from_role];
  const fromLabel = fromLevel ? `${fromLevel} · ${from}` : from;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"
      title={row.forward_comment ? `Forward comment: ${row.forward_comment}` : undefined}
    >
      <Forward className="w-3 h-3" aria-hidden />
      Forwarded from {fromLabel}
    </span>
  );
}

/**
 * Renders a "Direct" badge when the pass was generated directly (bypassed the
 * staged chain).
 */
export function DirectBadge({ row }: { row: HostelTicketRow }) {
  if (!row.direct_generated) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
      Direct
    </span>
  );
}

/**
 * Minimal row shape the sort needs to read (the fields it ranks on). Declared
 * here (not on `HostelTicketRow`) so the generic `sortHostelTickets` can be
 * called with a superset row type and still return the original element type.
 */
interface SortableRow {
  routed_to_role?: string | null;
  sla_deadline?: string | null;
  created_at?: string;
}

/**
 * Sorts ticket rows the way the approver queue expects:
 *  1. Tickets forwarded TO the current user (routed_to_role === viewerRole) pin first.
 *  2. SLA-overdue tickets next (sla_deadline < now, earlier deadline first).
 *  3. Everything else, then by SLA deadline / created_at where present.
 *
 * `viewerRole` is the caller's own role; pass undefined to skip the pin.
 * Generic so the caller's richer row type (e.g. `StageQueueRow`,
 * `PermissionItem`) is preserved on return.
 */
export function sortHostelTickets<T extends SortableRow>(
  rows: T[],
  viewerRole?: string | null,
): T[] {
  const now = Date.now();
  const isMine = (r: T) => !!viewerRole && r.routed_to_role === viewerRole;
  const isOverdue = (r: T) => {
    if (!r.sla_deadline) return false;
    const t = Date.parse(r.sla_deadline);
    return Number.isNaN(t) ? false : t < now;
  };
  const slaMs = (r: T) => {
    const t = r.sla_deadline ? Date.parse(r.sla_deadline) : Number.POSITIVE_INFINITY;
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  const rank = (r: T): number => {
    if (isMine(r)) return 0;
    if (isOverdue(r)) return 1;
    return 2;
  };
  return [...rows].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const sa = slaMs(a);
    const sb = slaMs(b);
    if (sa !== sb) return sa - sb;
    const ca = Date.parse(a.created_at || "") || 0;
    const cb = Date.parse(b.created_at || "") || 0;
    return cb - ca; // newest first within a rank
  });
}

