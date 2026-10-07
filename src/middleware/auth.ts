import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { verifyAuthToken } from "@/lib/auth-token";

export async function authMiddleware(req: NextRequest) {
  let token: string | undefined;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    token = req.cookies.get("access_token")?.value;
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.sub) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
      { status: 401 }
    );
  }

  const userRes = await query(
    "SELECT id, unique_id, email, name, role, status FROM users WHERE id = $1 LIMIT 1",
    [payload.sub]
  );

  if (userRes.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "User profile not found" } },
      { status: 404 }
    );
  }

  const profile = userRes.rows[0];

  if (profile.status !== "ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "ACCOUNT_INACTIVE", message: `Account is ${profile.status}` } },
      { status: 403 }
    );
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", profile.id);
  requestHeaders.set("x-user-role", profile.role);
  requestHeaders.set("x-user-email", profile.email || "");
  requestHeaders.set("x-user-unique-id", profile.unique_id || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function requireRole(allowedRoles: string[]) {
  return async (req: NextRequest) => {
    const authResult = await authMiddleware(req);
    if (authResult.status !== 200 && authResult.status !== 307 && authResult.status !== 308) {
      return authResult;
    }

    const role = req.headers.get("x-user-role");
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}
