import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import type { Scan, ScanDirection } from "@/lib/types";
import { getDailyStats, campusCount, findUserById } from "@/lib/db";

/** No-permission outing time limit (minutes) before a student is flagged overdue. */
const OUTING_LIMIT_MINUTES = 180;

type CategoryKey = "hostellers" | "dayscholars" | "facultyStaff" | "authorities" | "visitors" | "others";

const EMPTY_BREAKDOWN = () => ({
  hostellers: { inside: 0, inToday: 0, outToday: 0 },
  dayscholars: { inside: 0, inToday: 0, outToday: 0 },
  facultyStaff: { inside: 0, inToday: 0, outToday: 0 },
  authorities: { inside: 0, inToday: 0, outToday: 0 },
  visitors: { inside: 0, inToday: 0, outToday: 0 },
  others: { inside: 0, inToday: 0, outToday: 0 },
});

function categorize(role: string | undefined, studentType: string | undefined): CategoryKey {
  if (role === "student") {
    if (studentType === "HM" || studentType === "HF") return "hostellers";
    return "dayscholars"; // DM / DF and unknown default to dayscholars
  }
  if (role === "faculty" || role === "staff" || role === "worker") return "facultyStaff";
  if (role === "warden" || role === "admin") return "authorities";
  if (role === "visitor") return "visitors";
  return "others";
}

/**
 * GET /api/operator/stats
 *
 * Server-side today's stats for the logged-in operator's gate. The browser's
 * anon Supabase client is blocked by RLS, so the operator page reads stats
 * through this route (service client; access control via authenticated identity).
 *
 * Also returns:
 *  - breakdown: inside-now / in-today / out-today per person category
 *    (hostellers, dayscholars, faculty & staff, authorities, visitors)
 *  - outing: people currently out on a no-permission short outing
 *    (last OUT reason "Day Out"), with elapsed time vs the allowed limit.
 */
async function handleGet(req: NextRequest) {
  try {
    let service;
    try {
      const { getSupabaseServiceClient } = await import("@/lib/supabaseClient");
      service = getSupabaseServiceClient();
    } catch {
      const { supabase } = await import("@/lib/supabaseClient");
      service = supabase;
    }

    const userId = req.headers.get("x-user-id") || "";
    const user = await findUserById(userId);
    const gateId = user?.gateId || undefined;
    const day = new Date().toISOString().slice(0, 10);
    const dayStartUTC = `${day}T00:00:00.000Z`;

    // ---- 1. All of today's movement logs (gate-scoped when known) ----------
    let logsQuery = service
      .from("movement_logs")
      .select("*, users:users!movement_logs_user_id_fkey(name, unique_id, role)")
      .gte("timestamp", dayStartUTC)
      .order("timestamp", { ascending: true })
      .limit(1000);
    if (gateId) logsQuery = logsQuery.eq("gate_id", gateId);
    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) console.error("operator stats logs:", logsError);
    const todaysLogs: any[] = logs || [];

    // ---- 2. Reference maps -------------------------------------------------
    const [{ data: studentRows }, { data: userRows }] = await Promise.all([
      service.from("student_details").select("user_id, student_type"),
      service.from("users").select("id, role"),
    ]);
    const studentTypeOf = new Map<string, string>();
    ((studentRows as any[]) || []).forEach((s) => studentTypeOf.set(s.user_id, s.student_type));
    const roleOf = new Map<string, string>();
    ((userRows as any[]) || []).forEach((u) => roleOf.set(u.id, u.role));


    // ---- 3. Entries / Exits: daily_stats first, live computation fallback --
    let entries = 0;
    let exits = 0;
    try {
      const row = await getDailyStats(day, gateId);
      const r = Array.isArray(row) ? row[0] : row;
      if (r) {
        entries = r.entries;
        exits = r.exits;
      }
    } catch { /* daily_stats may not exist yet */ }
    if (!entries && !exits) {
      entries = todaysLogs.filter((l) => l.direction === "IN").length;
      exits = todaysLogs.filter((l) => l.direction === "OUT").length;
    }

    // ---- 4. Campus occupancy ----------------------------------------------
    const onCampus = await campusCount().catch(() => 0);
    const { data: occRows } = await service.from("campus_occupancy").select("user_id, current_status");

    // ---- 5. Per-category breakdown ----------------------------------------
    const breakdown = EMPTY_BREAKDOWN();
    ((occRows as any[]) || []).forEach((o) => {
      if (o.current_status !== "IN") return;
      breakdown[categorize(roleOf.get(o.user_id), studentTypeOf.get(o.user_id))].inside += 1;
    });
    todaysLogs.forEach((l) => {
      const key = categorize(l.users?.role ?? roleOf.get(l.user_id), studentTypeOf.get(l.user_id));
      if (l.direction === "IN") breakdown[key].inToday += 1;
      else breakdown[key].outToday += 1;
    });

    // ---- 6. Outing panel: last movement per person -------------------------
    const lastByUser = new Map<string, any>();
    todaysLogs.forEach((l) => lastByUser.set(l.user_id, l)); // asc → last wins
    const outing: Array<{
      userId: string; name: string; roll: string; category: CategoryKey;
      reason: string | null; outAt: string;
      minutesGone: number; limitMinutes: number; overdue: boolean;
    }> = [];
    ((occRows as any[]) || []).forEach((o) => {
      if (o.current_status !== "OUT") return;
      const last = lastByUser.get(o.user_id);
      if (!last || last.direction !== "OUT") return;
      if ((last.reason || "").toLowerCase() !== "day out") return; // only no-permission outings
      const minutesGone = Math.max(0, Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 60000));
      outing.push({
        userId: o.user_id,
        name: last.users?.name || "",
        roll: last.users?.unique_id || "",
        category: categorize(last.users?.role ?? roleOf.get(o.user_id), studentTypeOf.get(o.user_id)),
        reason: last.reason,
        outAt: last.timestamp,
        minutesGone,
        limitMinutes: OUTING_LIMIT_MINUTES,
        overdue: minutesGone > OUTING_LIMIT_MINUTES,
      });
    });
    outing.sort((a, b) => b.minutesGone - a.minutesGone);

    // ---- 7. Recent scans (most recent 10) ----------------------------------
    const recentScans: Scan[] = [...todaysLogs]
      .slice(-10)
      .reverse()
      .map((r: any): Scan => ({
        id: r.id,
        roll: r.users?.unique_id || "",
        uniqueId: r.users?.unique_id || "",
        name: r.users?.name || "",
        personType: (r.users?.role || "student") as Scan["personType"],
        direction: r.direction as ScanDirection,
        reason: r.reason,
        gateId: r.gate_id,
        gateName: r.gate_name,
        operatorId: r.operator_id || "",
        operatorName: r.operator_name || "",
        timestamp: r.timestamp,
        isManual: !!r.is_manual,
        isCorrection: !!r.is_correction,
        originalScanId: r.original_log_id || undefined,
        personId: r.user_id || undefined,
      }));

    return NextResponse.json({
      success: true,
      data: { entries, exits, onCampus, recentScans, breakdown, outing },
    });
  } catch (error) {
    console.error("Error fetching operator stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load stats" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["operator", "admin", "sysadmin"] });
