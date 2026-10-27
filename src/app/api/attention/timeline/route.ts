// src/app/api/attention/timeline/route.ts
// G3: Contextual Activity Timeline — SELF-SCOPED, read-only feed for the caller.
//
// Merges the caller's own activity across four sources into one normalized,
// reverse-chronological timeline:
//   • audit_logs          (rows where the caller is the actor, user_id = auth.userId)
//   • permission_requests (as requester; parent/guardian also their children's)
//   • event_registrations (joined to campus_events)
//   • notifications       (the caller's own UNREAD rows, capped at 10)
//
// Scope is always derived from the authenticated identity only — a caller can
// never receive another user's rows. Approver/admin/sysadmin callers stay
// self-scoped to their own actions; "their decisions" are covered by their
// own audit rows, not by other users' request rows.
//
// This route never mutates. Query params:
//   ?limit=   (default 30, max 100)
//   ?source=  request | event | notification | audit

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getLinkedPersons } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Every registered role may read their own timeline. */
const ALL_ROLES: readonly Role[] = [
  "operator", "admin", "sysadmin", "supervisor", "guardian", "parent",
  "hod", "student", "faculty", "staff", "worker", "visitor",
  "caretaker", "deputy_warden", "hostel_manager", "principal",
  "vice_principal", "oie", "exam_branch", "mess_incharge",
] as const;

const TIMELINE_SOURCES = ["request", "event", "notification", "audit"] as const;
type TimelineSource = (typeof TIMELINE_SOURCES)[number];

interface TimelineItem {
  id: string;
  source: TimelineSource;
  title: string;
  detail: string;
  occurredAt: string;
  ctaHref: string | null;
}

/** Role-appropriate deep link for a permission request ticket. */
function requestCtaHref(role: Role): string {
  switch (role) {
    case "parent":
    case "guardian":
      return "/student/permissions";
    case "student":
      return "/student/request-tracking";
    case "admin":
    case "sysadmin":
      return "/admin/permission-policies";
    default:
      // Approver-side roles (faculty, hod, oie, vice_principal, principal,
      // exam_branch, supervisor, ...) own the per-ticket review surface.
      return "/permissions";
  }
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  // Defence in depth: reject requests whose identity headers were not
  // re-signed by withAuthorization.
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const userId = auth.userId;
  const role = auth.role as Role;

  const sp = req.nextUrl.searchParams;
  const rawLimit = sp.get("limit");
  const limit = rawLimit
    ? Math.max(1, Math.min(100, parseInt(rawLimit, 10) || 30))
    : 30;
  const sourceParam = sp.get("source");
  const wanted: TimelineSource[] =
    sourceParam && (TIMELINE_SOURCES as readonly string[]).includes(sourceParam)
      ? [sourceParam as TimelineSource]
      : [...TIMELINE_SOURCES];

  const db = getSupabaseServiceClient();
  const items: TimelineItem[] = [];

  try {
    // ── 1. Own audit rows (caller as actor) ──────────────────────────────
    if (wanted.includes("audit")) {
      const { data, error } = await db
        .from("audit_logs")
        .select("id, action, details, timestamp")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(200);
      if (error) throw error;
      for (const row of data ?? []) {
        const details = row.details as { message?: unknown; [k: string]: unknown } | string | null;
        let detail = row.action;
        if (typeof details === "object" && details !== null && details.message) {
          detail = `${row.action} — ${String(details.message)}`;
        }
        items.push({
          id: `audit-${row.id}`,
          source: "audit",
          title: row.action,
          detail,
          occurredAt: row.timestamp ?? "",
          ctaHref: null,
        });
      }
    }

    // ── 2. Own permission requests ─────────────────────────────────────
    // Parent/guardian: their requests + their children's. Everyone else:
    // only requests where they are the requester (self-scoped).
    if (wanted.includes("request")) {
      let childIds: string[] = [];
      if (role === "parent" || role === "guardian") {
        try {
          const children = await getLinkedPersons(userId);
          childIds = children
            .map((c) => (c as unknown as { child_id?: string; id?: string }).child_id ?? c.id)
            .filter((v): v is string => Boolean(v));
        } catch {
          childIds = [];
        }
      }

      const requestIds = new Set<string>([userId]);
      for (const cid of childIds) requestIds.add(cid);

      const { data: reqRows, error: reqErr } = await db
        .from("permission_requests")
        .select("id, ticket_number, workflow_type, current_stage, status, updated_at, created_at")
        .in("requester_user_id", [...requestIds])
        .order("updated_at", { ascending: false })
        .limit(200);
      if (reqErr) throw reqErr;

      const cta = requestCtaHref(role);
      for (const row of reqRows ?? []) {
        items.push({
          id: `req-${row.id}`,
          source: "request",
          title: row.ticket_number,
          detail: `${row.workflow_type} · ${row.current_stage} · ${row.status}`,
          occurredAt: row.updated_at ?? row.created_at ?? "",
          ctaHref: cta,
        });
      }
    }

    // ── 3. Own event registrations ─────────────────────────────────────
    if (wanted.includes("event")) {
      const { data: regs, error: regErr } = await db
        .from("event_registrations")
        .select("id, event_id, status, registered_at, event:campus_events!event_id(id, title, category, starts_at)")
        .eq("user_id", userId)
        .order("registered_at", { ascending: false })
        .limit(200);
      if (regErr) throw regErr;

      for (const row of regs ?? []) {
        const ev = row.event as { id?: string; title?: string; category?: string; starts_at?: string } | null;
        items.push({
          id: `evreg-${row.id}`,
          source: "event",
          title: ev?.title ?? "Event",
          detail: row.status,
          occurredAt: row.registered_at ?? ev?.starts_at ?? "",
          ctaHref: "/campus",
        });
      }
    }

    // ── 4. Own unread notifications (capped at 10) ─────────────────────
    if (wanted.includes("notification")) {
      const { data: ntfRows, error: ntfErr } = await db
        .from("notifications")
        .select("id, type, title, message, created_at")
        .eq("recipient_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (ntfErr) throw ntfErr;

      for (const row of ntfRows ?? []) {
        items.push({
          id: `ntf-${row.id}`,
          source: "notification",
          title: row.title,
          detail: row.message,
          occurredAt: row.created_at ?? "",
          ctaHref: "/notifications",
        });
      }
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: e instanceof Error ? e.message : String(e) } },
      { status: 500 }
    );
  }

  // Reverse-chronological (most recent first). Rows with empty timestamps
  // sink to the bottom; stable by source order for ties.
  const sourceRank: Record<TimelineSource, number> = {
    notification: 0,
    request: 1,
    event: 2,
    audit: 3,
  };
  items.sort((a, b) => {
    const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    if (ta !== tb) return tb - ta;
    return sourceRank[a.source] - sourceRank[b.source];
  });

  const total = items.length;
  const out = items.slice(0, limit);

  return NextResponse.json({
    success: true,
    data: { items: out, count: out.length, total },
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "attention_timeline" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ALL_ROLES] }),
  readLimit
);
