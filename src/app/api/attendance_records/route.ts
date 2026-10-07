import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();                
    
    // Attempt to fetch from attendance_records
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("created_at" as any, { ascending: false });

    if (error) {
      console.warn("Could not fetch attendance_records (might not exist):", error.message);
      return NextResponse.json({ success: true, data: [], message: "Table might not be initialized." }, { status: 200 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/attendance_records:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
