import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Query active sessions from sessions table or active users with handle
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, role, handle, status, updated_at")
      .not("handle", "is", null)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    const activeSessions = (users || []).map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      sessionTokenTruncated: u.handle ? `${u.handle.slice(0, 10)}...${u.handle.slice(-6)}` : "ACTIVE",
      lastActive: u.updated_at || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, data: activeSessions });
  } catch (err: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
