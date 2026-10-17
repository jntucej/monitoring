import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Self-scoped visitor log access. /api/visitors is operator/admin-scoped and
 * lists every active pass; this thin endpoint returns only the calling
 * visitor's own visitor_logs rows so the visitor portal can render
 * registration, host info, approval status, visit details, check-in/out and
 * history without leaking other visitors' data.
 *
 * Response slices (per-page, so each portal sub-page renders distinct data):
 *   registration  — caller's own registration profile (name, uniqueId, role, status)
 *   hostInfo       — host details for the most recent visit (or active visit)
 *   approvalStatus— approval state of the active visit (or "no active visit")
 *   checkInOut    — check-in/out timestamps + duration for the active visit
 *   visitDetails   — purpose + host + timestamps for the most recent visit
 *   request        — active-visit summary (what the visitor requested to visit)
 *   history        — all prior completed visits
 */
async function handleGet(req: NextRequest, { auth }: { auth: { userId: string } }) {
  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from("visitor_logs")
      .select("*, person:users!visitor_logs_user_id_fkey(*), host:users!visitor_logs_host_user_id_fkey(*)")
      .eq("user_id", auth.userId)
      .order("check_in_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    const logs = data ?? [];
    const active = logs.find((l: any) => l.status === "active" && !l.check_out_at) ?? null;
    const lastCompleted = logs.find((l: any) => l.status === "completed") ?? null;
    const mostRecent = logs[0] ?? null;

    // Registration: the caller's own profile row (the visitor user record).
    const registration = active?.person
      ? {
          name: active.person.name ?? null,
          uniqueId: active.person.unique_id ?? active.person.roll ?? null,
          role: active.person.role ?? "visitor",
          status: active.person.status ?? "ACTIVE",
        }
      : lastCompleted?.person
      ? {
          name: lastCompleted.person.name ?? null,
          uniqueId: lastCompleted.person.unique_id ?? lastCompleted.person.roll ?? null,
          role: lastCompleted.person.role ?? "visitor",
          status: lastCompleted.person.status ?? "ACTIVE",
        }
      : { name: null, uniqueId: null, role: "visitor", status: "UNKNOWN" };

    // Host info: the host of the most recent visit.
    const hostLog = active ?? mostRecent;
    const hostInfo = hostLog?.host
      ? {
          name: hostLog.host.name ?? null,
          uniqueId: hostLog.host.unique_id ?? hostLog.host.roll ?? null,
          role: hostLog.host.role ?? null,
        }
      : { name: null, uniqueId: null, role: null };

    // Approval status: derived from the active visit's status.
    const approvalStatus = active
      ? {
          state: "ACTIVE" as const,
          checkedInAt: active.check_in_at ?? null,
          purpose: active.purpose ?? null,
        }
      : lastCompleted
      ? {
          state: "COMPLETED" as const,
          checkedInAt: lastCompleted.check_in_at ?? null,
          checkedOutAt: lastCompleted.check_out_at ?? null,
          purpose: lastCompleted.purpose ?? null,
        }
      : { state: "NONE" as const, checkedInAt: null, checkedOutAt: null, purpose: null };

    // Check-in/out: timestamps + duration for the active visit.
    let checkInOut: { checkedInAt: string | null; checkedOutAt: string | null; durationMinutes: number | null } = {
      checkedInAt: null,
      checkedOutAt: null,
      durationMinutes: null,
    };
    if (active?.check_in_at) {
      checkInOut.checkedInAt = active.check_in_at;
      checkInOut.checkedOutAt = active.check_out_at ?? null;
      if (active.check_out_at) {
        const inMs = new Date(active.check_out_at).getTime() - new Date(active.check_in_at).getTime();
        checkInOut.durationMinutes = Math.max(0, Math.round(inMs / 60000));
      }
    } else if (lastCompleted?.check_in_at) {
      checkInOut.checkedInAt = lastCompleted.check_in_at;
      checkInOut.checkedOutAt = lastCompleted.check_out_at ?? null;
      if (lastCompleted.check_out_at) {
        const inMs = new Date(lastCompleted.check_out_at).getTime() - new Date(lastCompleted.check_in_at).getTime();
        checkInOut.durationMinutes = Math.max(0, Math.round(inMs / 60000));
      }
    }

    // Visit details: purpose + host + timestamps for the most recent visit.
    const visitDetails = mostRecent
      ? {
          purpose: mostRecent.purpose ?? null,
          hostName: mostRecent.host?.name ?? null,
          checkedInAt: mostRecent.check_in_at ?? null,
          checkedOutAt: mostRecent.check_out_at ?? null,
          status: mostRecent.status,
        }
      : { purpose: null, hostName: null, checkedInAt: null, checkedOutAt: null, status: null };

    // Request: active-visit summary (what the visitor requested to visit).
    const request = active
      ? {
          requestedAt: active.check_in_at ?? null,
          purpose: active.purpose ?? null,
          hostName: active.host?.name ?? null,
          state: "ACTIVE" as const,
        }
      : mostRecent
      ? {
          requestedAt: mostRecent.check_in_at ?? null,
          purpose: mostRecent.purpose ?? null,
          hostName: mostRecent.host?.name ?? null,
          state: "COMPLETED" as const,
        }
      : { requestedAt: null, purpose: null, hostName: null, state: "NONE" as const };

    // History: all prior completed visits.
    const history = logs.filter((l: any) => l.status === "completed");

    return NextResponse.json({
      success: true,
      data: {
        logs,
        active: active ? { status: "ACTIVE", log: active } : null,
        lastCompleted,
        registration,
        hostInfo,
        approvalStatus,
        checkInOut,
        visitDetails,
        request,
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching own visitor logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch visitor logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet as never, { requiredRole: ["visitor", "operator", "admin", "sysadmin"] }),
  { keyPrefix: "visitors_mine", maxRequests: 60 }
);
