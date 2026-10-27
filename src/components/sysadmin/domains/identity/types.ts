// src/components/sysadmin/domains/identity/types.ts
// Shared types for the identity domain (PEOPLE faceted-table + drawer and
// PROMOTIONS kanban). These mirror the wire payloads returned by:
//   GET /api/admin/people/overview
//   GET /api/admin/people/[id]
//   GET /api/admin/promotions/overview
// Keep in sync with those routes.

import type { SankeyNode, SankeyLink } from "@/components/sysadmin/kit/viz";
import type { Entity } from "@/types/entities";

// ── Scaffold entity stubs (kept for pre-existing drawer wrappers) ───────────

export interface PeopleEntity extends Entity {
  id: string;
  [k: string]: unknown;
}

export interface PromotionsEntity extends Entity {
  id: string;
  [k: string]: unknown;
}

// ── People (faceted directory) ───────────────────────────────────────────────

export interface PeopleCohortGrid {
  /** e.g. ["2024", "2025"] */
  years: string[];
  /** e.g. ["Q1".."Q4"] */
  semesters: string[];
  /** data[yearIdx][semesterIdx] — % active (0..100, -1 = missing). */
  data: number[][];
}

/** The faceted table row (one person). */
export interface PersonRow {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Account status, e.g. ACTIVE / SUSPENDED / LOCKED / DISABLED / DEPROVISIONED. */
  state: string;
  two_factor_enabled: boolean;
  created_at: string;
  /** % of the person's cohort (admission year x quarter) still active, 0..100. */
  cohort_active_pct: number;
  last_login_at: string | null;
  sessions_count: number;
}

export interface PeopleData {
  total: number;
  byRole: Record<string, number>;
  byState: Record<string, number>;
  /** role -> state -> count, the faceted source of truth. */
  roleState: Record<string, Record<string, number>>;
  active: number;
  newThisWeek: number;
  suspended: number;
  /** active / total, 0..1 (null when total is 0). */
  activePct: number | null;
  cohortGrid: PeopleCohortGrid;
  /** The faceted-table row list (capped server-side). */
  rows: PersonRow[];
}

/** Drawer detail for one person (from /api/admin/people/[id]). */
export interface PersonDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  state: string;
  department_id: string | null;
  two_factor_enabled: boolean;
  last_password_change: string | null;
  created_at: string;
  updated_at: string | null;
  roles: Array<{ role: string; granted_at: string }>;
  sessionsCount: number;
  sessions: Array<{
    id: string;
    created_at: string;
    last_seen_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
    revoked_at: string | null;
  }>;
  audit: Array<{
    action: string;
    details: unknown;
    ip_address: string | null;
    timestamp: string;
  }>;
  links: {
    users: string;
    userRoles: string;
    roleRequests: string;
    auditLogs: string;
  };
}

// ── Promotions (role-change kanban) ─────────────────────────────────────────

export type PromotionStatus = "PENDING" | "APPROVED" | "REJECTED";

/** One promotion / role-change request card in the kanban. */
export interface PromotionRow {
  id: string;
  target_user_id: string;
  target_user_name: string | null;
  target_user_role: string | null;
  requested_role: string;
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
  approver_name: string | null;
  /** Seconds between created_at and updated_at; null while PENDING. */
  decision_seconds: number | null;
}

/** from-role -> to-role transition cell for the Sankey. */
export interface PromotionTransitionCell {
  from_role: string;
  to_role: string;
  count: number;
}

export interface PromotionsData {
  pending: number;
  approved_this_month: number;
  rejected: number;
  /** Median time-to-decision in hours (0 when none). */
  median_time_to_decision_h: number;
  /** Full per-column rows for the kanban. */
  columns: Record<PromotionStatus, PromotionRow[]>;
  /** Transition matrix cells. */
  transitions: PromotionTransitionCell[];
  /** Pre-built Sankey node/link sets. */
  sankey: {
    source: SankeyNode[];
    target: SankeyNode[];
    links: SankeyLink[];
  };
  /** Flattened status counts for consumers preferring a keyed map. */
  counts: Record<string, number>;
}

// ── Envelope aliases ─────────────────────────────────────────────────────────
// ok() from @/server/http/response wraps the payload in `{ data: T }`.
// Pages that type useDashboardData with these aliases will correctly receive
// the envelope and pass `data.data` to the content component.

export type PeopleEnvelope = { data: PeopleData };
export type PromotionsEnvelope = { data: PromotionsData };
