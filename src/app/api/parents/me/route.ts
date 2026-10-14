// src/app/api/parents/me/route.ts
// Self-service parent/guardian dashboard: the caller's own linked children,
// each with their open permission requests, most recent gate movement, and
// next upcoming campus event they are registered for. Replaces the
// admin-gated /api/parents listing for the parent's own view.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getLinkedPersons } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ROLES: readonly Role[] = ["parent", "guardian", "admin", "sysadmin"] as const;

type ChildRow = {
  childId: string;
  name: string | null;
  roll: string | null;
  openRequests: number;
  lastMovement: { direction: string; gate: string; at: string } | null;
  nextEvent: { title: string; startsAt: string } | null;
};

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  // Scope strictly to the caller's own children — never other users'.
  // getLinkedPersons(userId, "children_of") returns students whose
  // student_details.guardian_id === userId, with child_id set to the
  // student's users.id.
  const children = await getLinkedPersons(auth.userId, "children_of");
  const childIds = children
    .map((c) => (c as { child_id?: string }).child_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const db = getSupabaseServiceClient();
  const nowIso = new Date().toISOString();

  // Open permission requests per child.
  const openByChild = new Map<string, number>();
  let totalOpenRequests = 0;
  if (childIds.length > 0) {
    const { data: reqs, error: reqErr } = await db
      .from("permission_requests")
    .select("requester_user_id, status")
    .in("requester_user_id", childIds)
      .eq("status", "PENDING")
      .limit(500);
    if (reqErr) {
      const { body, status } = err("DB_ERROR", reqErr.message, 500);
      return NextResponse.json(body, { status });
    }
    for (const r of reqs ?? []) {
      const sid = String((r as { requester_user_id: unknown }).requester_user_id ?? "");
      openByChild.set(sid, (openByChild.get(sid) ?? 0) + 1);
    }
    totalOpenRequests = childIds.reduce((sum, id) => sum + (openByChild.get(id) ?? 0), 0);
  }

  // Latest movement per child (newest log wins; direction drives gate context).
  const lastMoveByChild = new Map<string, { direction: string; gate: string; at: string }>();
  if (childIds.length > 0) {
    const { data: logs, error: logErr } = await db
      .from("movement_logs")
      .select("user_id, direction, gate_name, timestamp")
      .in("user_id", childIds)
      .order("timestamp", { ascending: false })
      .limit(500);
    if (!logErr) {
      for (const l of logs ?? []) {
        const rec = l as { user_id: string; direction: string; gate_name: string; timestamp: string };
        if (!lastMoveByChild.has(rec.user_id)) {
          lastMoveByChild.set(rec.user_id, {
            direction: String(rec.direction ?? ""),
            gate: String(rec.gate_name ?? ""),
            at: String(rec.timestamp ?? ""),
          });
        }
      }
    }
  }

  // Next upcoming campus event per child that they are registered for.
  const nextEventByChild = new Map<string, { title: string; startsAt: string }>();
  if (childIds.length > 0) {
    const { data: regs, error: regErr } = await db
      .from("event_registrations")
      .select("user_id, event_id")
      .in("user_id", childIds)
      .eq("status", "registered")
      .limit(500);
    if (!regErr && regs && regs.length > 0) {
      const eventIds = Array.from(new Set(regs.map((r) => String(r.event_id))));
      const { data: events, error: evErr } = await db
        .from("campus_events")
        .select("id, title, starts_at")
        .in("id", eventIds)
        .gte("starts_at", nowIso)
        .eq("is_published", true)
        .order("starts_at", { ascending: true })
        .limit(50);
      if (!evErr && events) {
        const earliestByEvent = new Map<string, { title: string; startsAt: string }>();
        for (const e of events) {
          earliestByEvent.set(String(e.id), {
            title: String(e.title ?? ""),
            startsAt: String(e.starts_at ?? ""),
          });
        }
        // For each child, pick the soonest upcoming event among their regs.
        for (const r of regs) {
          const child = String(r.user_id);
          const ev = earliestByEvent.get(String(r.event_id));
          const prev = nextEventByChild.get(child);
          if (ev && (!prev || ev.startsAt < prev.startsAt)) nextEventByChild.set(child, ev);
        }
      }
    }
  }

  const childrenOut: ChildRow[] = children.map((c) => {
    const rec = c as unknown as Record<string, unknown>;
    const childId = String(rec.child_id ?? rec.id ?? "");
    const studentDetails = (rec.student_details as { roll?: string | null } | null) ?? null;
    const roll = studentDetails?.roll ?? (rec.roll as string | null) ?? null;
    const name = (rec.name as string | null) ?? (rec.fullName as string | null) ?? null;
    return {
      childId,
      name,
      roll,
      openRequests: openByChild.get(childId) ?? 0,
      lastMovement: lastMoveByChild.get(childId) ?? null,
      nextEvent: nextEventByChild.get(childId) ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: { children: childrenOut, totalOpenRequests },
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "parents_me" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
