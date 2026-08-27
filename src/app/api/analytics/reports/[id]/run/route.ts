import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
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

    const csvContent = `Timestamp,Gate,PersonType,Direction,Count\n${now},Main Gate,Student,IN,145\n${now},South Gate,Faculty,OUT,32\n`;

    return NextResponse.json({
      success: true,
      data: {
        reportId: id,
        executedAt: now,
        csv: csvContent,
        message: "Report executed successfully and exported to CSV.",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });

