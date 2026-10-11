import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const { query } = await import("@/lib/postgres");

    // Query active sessions with joined user record using raw SQL
    const { rows: sessions } = await query(`
      SELECT s.id, s.user_id, s.refresh_hash, s.expires_at, s.last_seen_at,
             s.ip_address, s.user_agent,
             u.name, u.email, u.role, u.status
        FROM sessions s
        JOIN users u ON u.id = s.user_id
       WHERE s.revoked_at IS NULL
         AND s.expires_at > NOW()
       ORDER BY s.last_seen_at DESC
    `);

    const activeSessions = sessions.map((s: any) => ({
      sessionId: s.id,
      userId: s.user_id,
      name: s.name,
      email: s.email,
      role: s.role,
      status: s.status,
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
