import { getSupabaseServiceClient } from "@/lib/dbClient";
import {
  STAFF_REGISTER_A,
  STAFF_REGISTER_B,
  type StaffCategory,
} from "@/lib/types";

export type RegisterKey = "A" | "B";

export interface StaffMovement {
  id: string;
  direction: "IN" | "OUT";
  reason: string | null;
  timestamp: string;
  gateName: string;
  operatorName: string | null;
}

export interface StaffRegisterRow {
  staffId: string;
  employeeId: string;
  name: string;
  category: StaffCategory | null;
  /** Populated only for asst prof/faculty rows (Register A). */
  department: string | null;
  /** Populated only for support/service rows (Register B). */
  service_type: string | null;
  firstIn: string | null;
  lastOut: string | null;
  currentStatus: "IN" | "OUT";
  movements: StaffMovement[];
}

export interface StaffRegister {
  register: RegisterKey;
  date: string;
  entries: number;
  exits: number;
  byReason: Record<string, { in: number; out: number }>;
  rows: StaffRegisterRow[];
}

const categoriesFor = (register: RegisterKey): StaffCategory[] =>
  register === "A" ? STAFF_REGISTER_A : STAFF_REGISTER_B;

export async function getStaffRegister(
  register: RegisterKey,
  date?: string,
): Promise<StaffRegister> {
  const db = getSupabaseServiceClient();
  const day = date || new Date().toISOString().slice(0, 10);
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${day}T23:59:59.999Z`;
  const cats = categoriesFor(register);

  // 1. Load employees with their user details
  const { data: employees, error: empErr } = await db
    .from("employee_details")
    .select(
      "user_id, employee_id, designation, department_id, is_hod, staff_category, " +
      "users!employee_details_user_id_fkey(id, unique_id, name, role, status, department_id)"
    )
    .in("staff_category", cats);

  if (empErr || !employees) {
    console.error("getStaffRegister: employee query failed", empErr);
    return { register, date: day, entries: 0, exits: 0, byReason: {}, rows: [] };
  }

  const activeEmployees = employees.filter(
    (e: any) => e.users && e.users.status === "ACTIVE",
  );

  if (activeEmployees.length === 0) {
    return { register, date: day, entries: 0, exits: 0, byReason: {}, rows: [] };
  }

  const ids = activeEmployees.map((e: any) => e.user_id);

  // 2. Load today's movements for these employees
  const { data: mvts, error: mvtsErr } = await db
    .from("movement_logs")
    .select(
      "id, user_id, direction, reason, timestamp, gate_name, operator_name"
    )
    .in("user_id", ids)
    .gte("timestamp", dayStart)
    .lte("timestamp", dayEnd)
    .order("timestamp", { ascending: true });

  if (mvtsErr) {
    console.error("getStaffRegister: movement_logs query failed", mvtsErr);
    return { register, date: day, entries: 0, exits: 0, byReason: {}, rows: [] };
  }

  // 3. Group movements by employee
  const movementsByUser = new Map<string, any[]>();
  for (const m of mvts || []) {
    const arr = movementsByUser.get(m.user_id) || [];
    arr.push(m);
    movementsByUser.set(m.user_id, arr);
  }

  // 4. Build rows
  const rows: StaffRegisterRow[] = activeEmployees.map((e: any) => {
    const u = e.users;
    const userMvts = movementsByUser.get(e.user_id) || [];

    const firstIn = userMvts.find((m: any) => m.direction === "IN");
    const lastOut = [...userMvts].reverse().find((m: any) => m.direction === "OUT");
    const last = userMvts[userMvts.length - 1];

    return {
      staffId: e.user_id,
      employeeId: e.employee_id || u.unique_id,
      name: u.name,
      category: e.staff_category || null,
      department: register === "A" ? e.department_id || u.department_id || null : null,
      service_type: register === "B" ? e.staff_category || null : null,
      firstIn: firstIn?.timestamp || null,
      lastOut: lastOut?.timestamp || null,
      currentStatus: last?.direction === "IN" ? "IN" : "OUT",
      movements: userMvts.map((m: any) => ({
        id: m.id,
        direction: m.direction,
        reason: m.reason,
        timestamp: m.timestamp,
        gateName: m.gate_name,
        operatorName: m.operator_name,
      })),
    };
  });

  // 5. Aggregate totals
  const byReason: Record<string, { in: number; out: number }> = {};
  let entries = 0;
  let exits = 0;
  for (const m of mvts || []) {
    const key = m.reason || "Regular";
    byReason[key] ??= { in: 0, out: 0 };
    if (m.direction === "IN") {
      byReason[key].in++;
      entries++;
    } else {
      byReason[key].out++;
      exits++;
    }
  }

  return { register, date: day, entries, exits, byReason, rows };
}
