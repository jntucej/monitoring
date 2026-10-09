import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // ---- DEBUG: begin ----
    const SESSIONS_SELECT =
      "id, user_id, refresh_hash, expires_at, last_seen_at, ip_address, user_agent, users(id, name, email, role, status)";

    console.log("DEBUG_SELECT_JSON:", JSON.stringify(SESSIONS_SELECT));
    console.log("DEBUG_SELECT_LEN:", SESSIONS_SELECT.length); // expected: 117

    const _debugQuery = supabase.from("sessions").select(SESSIONS_SELECT);
    console.log("DEBUG_POSTGREST_URL:", (_debugQuery as any).url?.toString());
    // ---- DEBUG: end ----


    // Query active sessions from sessions table with joined user record
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select(SESSIONS_SELECT)
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
