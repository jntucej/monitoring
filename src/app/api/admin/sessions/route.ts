import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Query active sessions from sessions table with joined user record
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, user_id, refresh_hash, expires_at, last_seen_at, ip_address, user_agent, users(id, name, email, role, status)")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("last_seen_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    const activeSessions = (sessions || []).map((s: any) => ({
      sessionId: s.id,
      userId: s.user_id,
      name: s.users?.name,
      email: s.users?.email,
      role: s.users?.role,
      status: s.users?.status,
      sessionTokenTruncated: s.refresh_hash
        ? `${s.refresh_hash.slice(0, 10)}...${s.refresh_hash.slice(-6)}`
        : "ACTIVE",
      lastActive: s.last_seen_at || s.expires_at,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
    }));

    return NextResponse.json({ success: true, data: activeSessions });
  } catch (err: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
