import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filter = segments.filter((s) => s !== "run");
  return decodeURIComponent(filter[filter.length - 1]);
}

async function handlePost(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();
    const now = new Date().toISOString();

    await supabase
      .from("saved_report_definitions")
      .update({ last_run: now })
      .eq("id", id);

    // Fetch the report definition if available
    const { data: report } = await supabase
      .from("saved_report_definitions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // Query real scans/movement records to generate accurate CSV output
    // Bug 132: query the real scan table (movement_logs). The legacy `scans` table has a
    // different shape (person_id/status/scan_time, no timestamp/user_id/person_type/role/
    // verification_status), so selecting those columns errored and every report was NO_DATA.
    const { data: scans } = await supabase
      .from("movement_logs")
      .select("id, timestamp, gate_id, gate_name, direction, reason, is_manual")
      .order("timestamp", { ascending: false })
      .limit(100);

    // Honest CSV: only columns movement_logs actually has (no fabricated PersonType/Role).
    const rows: string[] = ["Timestamp,ScanID,GateID,Direction,Reason,Manual"];
    if (scans && scans.length > 0) {
      for (const s of scans) {
        const time = s.timestamp || now;
        const gate = s.gate_name || s.gate_id || "Unknown Gate";
        const dir = s.direction || "IN";
        const reason = s.reason || "-";
        const manual = s.is_manual ? "Y" : "N";
        rows.push(`"${time}","${s.id}","${gate}","${dir}","${reason}","${manual}"`);
      }
    } else {
      rows.push(`"${now}","N/A","N/A","N/A","NO_DATA","N/A"`);
    }

    const csvContent = rows.join("\n");

    return NextResponse.json({
      success: true,
      data: {
        reportId: id,
        reportName: report?.name || "Report Execution",
        executedAt: now,
        rowCount: (scans && scans.length) || 0,
        csv: csvContent,
        message: "Report executed successfully and exported to CSV.",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });


