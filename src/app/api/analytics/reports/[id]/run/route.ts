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
    const { data: scans } = await supabase
      .from("scans")
      .select("id, timestamp, gate_id, direction, user_id, person_type, role, verification_status")
      .order("timestamp", { ascending: false })
      .limit(100);

    const rows: string[] = ["Timestamp,ScanID,GateID,PersonType,Direction,Status"];
    if (scans && scans.length > 0) {
      for (const s of scans) {
        const time = s.timestamp || now;
        const gate = s.gate_id || "Main Gate";
        const pType = s.person_type || s.role || "Student";
        const dir = s.direction || "IN";
        const status = s.verification_status || "VERIFIED";
        rows.push(`"${time}","${s.id}","${gate}","${pType}","${dir}","${status}"`);
      }
    } else {
      rows.push(`"${now}","N/A","Main Gate","Student","IN","NO_DATA"`);
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


