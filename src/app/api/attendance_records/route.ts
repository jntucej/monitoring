import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();                
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("created_at" as any, { ascending: false });

    if (error) {
      console.warn("Could not fetch attendance_records:", error.message);
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/attendance_records:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "operator", "faculty", "warden", "supervisor"],
  }),
  { keyPrefix: "att_records", maxRequests: 60 }
);
