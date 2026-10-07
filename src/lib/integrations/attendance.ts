import { getDbClient } from "@/lib/db";
import { AttendanceRecord } from "@/lib/integration-types";

// Generate attendance report for a specific date
export async function generateAttendanceReport(
  date: string = new Date().toISOString().slice(0, 10)
): Promise<AttendanceRecord[]> {
  // Get all persons who are students, faculty, or staff
  const { data: persons } = await getDbClient()
    .from("users")
    .select("id, unique_id, name, role, department_id")
    .in("role", ["student", "faculty", "staff"]);

  if (!persons || persons.length === 0) return [];

  // Get all scans for the date
  const { data: scans } = await getDbClient()
    .from("movement_logs")
    .select("user_id, direction, timestamp")
    .gte("timestamp", `${date}T00:00:00.000Z`)
    .lte("timestamp", `${date}T23:59:59.999Z`);

  const scanMap: Record<string, { in: string | null; out: string | null }> = {};

  for (const scan of scans || []) {
    if (!scanMap[scan.user_id]) {
      scanMap[scan.user_id] = { in: null, out: null };
    }
    if (scan.direction === "IN" && !scanMap[scan.user_id].in) {
      scanMap[scan.user_id].in = scan.timestamp;
    } else if (scan.direction === "OUT") {
      scanMap[scan.user_id].out = scan.timestamp;
    }
  }

  // Build attendance records
  const records: AttendanceRecord[] = [];
  const cutoffTime = new Date(`${date}T09:15:00.000Z`);

  for (const person of persons) {
    const pScans = scanMap[person.id];
    let status: AttendanceRecord["status"] = "absent";
    let timeIn: string | undefined;
    let timeOut: string | undefined;

    if (pScans?.in) {
      timeIn = pScans.in;
      const inTime = new Date(pScans.in);
      status = inTime > cutoffTime ? "late" : "present";
    }

    if (pScans?.out) {
      timeOut = pScans.out;
    }

    records.push({
      personId: person.id,
      uniqueId: person.unique_id,
      name: person.name,
      date,
      timeIn,
      timeOut,
      status,
      department: person.department_id || "",
      personType: person.role,
    });
  }

  return records;
}

// Export attendance report to CSV
export function attendanceToCSV(records: AttendanceRecord[]): string {
  if (records.length === 0) return "No attendance records found";

  const headers = ["ID", "Name", "Type", "Department", "Date", "Time In", "Time Out", "Status"];
  const rows = records.map((r) => [
    r.uniqueId,
    r.name,
    r.personType,
    r.department || "",
    r.date,
    r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : "",
    r.timeOut ? new Date(r.timeOut).toLocaleTimeString() : "",
    r.status,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// Sync attendance to external HR/Attendance system
export async function syncAttendanceToHR(
  date: string,
  records: AttendanceRecord[]
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  for (const record of records) {
    try {
      const { error } = await getDbClient().from("attendance_records").upsert(
        {
          person_id: record.personId,
          date: record.date,
          time_in: record.timeIn,
          time_out: record.timeOut,
          status: record.status,
          synced: true,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "person_id,date" }
      );

      if (error) {
        errors.push(`Failed to sync ${record.uniqueId}: ${error.message}`);
      } else {
        synced++;
      }
    } catch (error: any) {
      errors.push(`Error syncing ${record.uniqueId}: ${error.message || error}`);
    }
  }

  return { success: errors.length === 0, synced, errors };
}
