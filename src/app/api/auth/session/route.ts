import { NextRequest, NextResponse } from "next/server";
import { supabase, getSupabaseServiceClient, canUserAuthenticate } from "@/lib/supabaseClient";
import { withRateLimit } from "@/lib/rate-limit";

async function handleSessionCheck(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const refreshToken = req.headers.get("x-refresh-token");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    let token = authHeader.slice(7);

    // 1. Attempt token validation via Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.getUser(token);
    let newSession = null;

    // 2. If token expired/invalid and refresh token is provided, attempt session refresh
    if ((authError || !authData?.user) && refreshToken) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData?.session && refreshData?.user) {
        token = refreshData.session.access_token;
        authData = { user: refreshData.user };
        newSession = refreshData.session;
      }
    }

    if (!authData?.user) {
      return NextResponse.json(
        { success: false, error: { code: "SESSION_EXPIRED", message: "Session expired" } },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 3. Verify user exists in public.users and is active
    const canAuthenticate = await canUserAuthenticate(userId);
    if (!canAuthenticate) {
      return NextResponse.json(
        { success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account inactive or disabled" } },
        { status: 403 }
      );
    }

    // 4. Fetch full user profile
    const service = getSupabaseServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("id, name, role, employee_id, unique_id, email, status, handle, gate_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active" } },
        { status: 403 }
      );
    }

    // 5. Verify single-device active session token header if provided
    const sessionTokenHeader = req.headers.get("x-session-token");
    if (sessionTokenHeader && profile.handle && sessionTokenHeader !== profile.handle) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SESSION_EXPIRED",
            message: "LoggedIn on another device",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: newSession?.access_token || token,
        refreshToken: newSession?.refresh_token || refreshToken || null,
        user: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          employeeId: profile.employee_id,
          uniqueId: profile.unique_id,
          email: profile.email,
          status: profile.status,
          currentSessionToken: profile.handle,
          gateId: profile.gate_id,
        },
      },
    });
  } catch (error: any) {
    console.error("Session check API route error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to validate session" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleSessionCheck, {
  keyPrefix: "auth_session",
  maxRequests: 60,
  windowMs: 60 * 1000,
});
