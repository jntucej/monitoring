import { getSupabaseServiceClient } from "@/lib/dbClient";
import { normalizeExitReason, CANONICAL_EXIT_FLOWS } from "@/lib/student-exit-flow";
import type { ReasonCode } from "@/lib/types";

export interface StudentRegisterEntry {
  userId: string;
  roll: string;
  name: string;
  department: string | null;
  year: number | null;
  hostelBlock: string | null;
  roomNumber: string | null;
  flow: ReasonCode | "regular";
  outTimestamp: string | null;
  inTimestamp: string | null;
  currentStatus: "IN" | "OUT";
  durationMinutes: number | null;
  isOverdue: boolean;
  gateName: string | null;
  operatorName: string | null;
}

export interface StudentRegisterFilter {
  flow?: ReasonCode | "all";
  date?: string;
  department?: string;
  year?: number;
  hostelBlock?: string;
}

export interface StudentRegisterResponse {
  date: string;
  flow: string;
  totals: {
    entries: number;
    exits: number;
    currentlyOut: number;
    overdue: number;
    byReason: Record<string, { in: number; out: number }>;
  };
  rows: StudentRegisterEntry[];
}

export async function getStudentRegister(
  filter: StudentRegisterFilter = {},
): Promise<StudentRegisterResponse> {
  const db = getSupabaseServiceClient();
  const day = filter.date || new Date().toISOString().slice(0, 10);
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${day}T23:59:59.999Z`;

  let studentQuery = db
    .from("users")
    .select(
      "id, unique_id, name, department_id, status, " +
      "student_details(roll, year, section, hostel_block, room_number, student_type)"
    )
    .eq("role", "student")
    .eq("status", "ACTIVE");

  if (filter.department) {
    studentQuery = studentQuery.eq("department_id", filter.department);
  }

  const { data: students, error: studentErr } = await studentQuery;
  if (studentErr || !students || students.length === 0) {
    return {
      date: day,
      flow: filter.flow || "all",
      totals: { entries: 0, exits: 0, currentlyOut: 0, overdue: 0, byReason: {} },
      rows: [],
    };
  }

  const studentList = (students || []) as any[];
  const userMap = new Map<string, any>();
  for (const s of studentList) userMap.set(s.id, s);
  const userIds = studentList.map((s: any) => s.id);

  const { data: mvts, error: mvtsErr } = await db
    .from("movement_logs")
    .select("id, user_id, direction, reason, timestamp, gate_name, operator_name")
    .in("user_id", userIds)
    .gte("timestamp", dayStart)
    .lte("timestamp", dayEnd)
    .order("timestamp", { ascending: true });

  if (mvtsErr) {
    return {
      date: day,
      flow: filter.flow || "all",
      totals: { entries: 0, exits: 0, currentlyOut: 0, overdue: 0, byReason: {} },
      rows: [],
    };
  }

  const movementsByUser = new Map<string, any[]>();
  for (const m of mvts || []) {
    const arr = movementsByUser.get(m.user_id) || [];
    arr.push(m);
    movementsByUser.set(m.user_id, arr);
  }

  const rows: StudentRegisterEntry[] = [];
  let currentlyOutCount = 0;
  let overdueCount = 0;
  const nowMs = Date.now();

  for (const [userId, userMvts] of movementsByUser.entries()) {
    const user = userMap.get(userId);
    if (!user) continue;

    const sDetails = Array.isArray(user.student_details)
      ? user.student_details[0]
      : user.student_details;

    if (filter.year && sDetails?.year !== filter.year) continue;
    if (filter.hostelBlock && sDetails?.hostel_block !== filter.hostelBlock) continue;

    const firstOut = userMvts.find((m: any) => m.direction === "OUT");
    const lastIn = [...userMvts].reverse().find((m: any) => m.direction === "IN");
    const lastMvt = userMvts[userMvts.length - 1];

    const currentStatus: "IN" | "OUT" = lastMvt?.direction === "OUT" ? "OUT" : "IN";
    const primaryReason = (firstOut?.reason || lastMvt?.reason || "daily_outing") as string;
    const canonicalFlow = normalizeExitReason(primaryReason);

    if (filter.flow && filter.flow !== "all" && canonicalFlow !== filter.flow) continue;

    let durationMinutes: number | null = null;
    let isOverdue = false;

    if (firstOut?.timestamp) {
      const outTime = new Date(firstOut.timestamp).getTime();
      const inTime = lastIn?.timestamp ? new Date(lastIn.timestamp).getTime() : nowMs;
      durationMinutes = Math.max(0, Math.round((inTime - outTime) / (60 * 1000)));

      if (currentStatus === "OUT") {
        const flowConfig = (CANONICAL_EXIT_FLOWS as any)[canonicalFlow];
        if (flowConfig?.maxDurationHours && durationMinutes > flowConfig.maxDurationHours * 60) {
          isOverdue = true;
          overdueCount++;
        }
      }
    }

    if (currentStatus === "OUT") currentlyOutCount++;

    rows.push({
      userId: user.id,
      roll: sDetails?.roll || user.unique_id,
      name: user.name,
      department: user.department_id || null,
      year: sDetails?.year || null,
      hostelBlock: sDetails?.hostel_block || null,
      roomNumber: sDetails?.room_number || null,
      flow: canonicalFlow,
      outTimestamp: firstOut?.timestamp || null,
      inTimestamp: lastIn?.timestamp || null,
      currentStatus,
      durationMinutes,
      isOverdue,
      gateName: lastMvt?.gate_name || null,
      operatorName: lastMvt?.operator_name || null,
    });
  }

  const byReasonTotals: Record<string, { in: number; out: number }> = {};
  let totalEntries = 0;
  let totalExits = 0;
  for (const m of mvts || []) {
    const reasonKey = normalizeExitReason(m.reason);
    byReasonTotals[reasonKey] ??= { in: 0, out: 0 };
    if (m.direction === "IN") {
      byReasonTotals[reasonKey].in++;
      totalEntries++;
    } else {
      byReasonTotals[reasonKey].out++;
      totalExits++;
    }
  }

  return {
    date: day,
    flow: filter.flow || "all",
    totals: {
      entries: totalEntries,
      exits: totalExits,
      currentlyOut: currentlyOutCount,
      overdue: overdueCount,
      byReason: byReasonTotals,
    },
    rows,
  };
}
