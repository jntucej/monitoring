import { NextRequest, NextResponse } from "next/server";
import { getGateMode, setGateMode, type GateMode } from "@/lib/gate-operations";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

export async function GET() {
  const mode = await getGateMode();
  return NextResponse.json({
    success: true,
    data: {
      mode,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode;
  const reason = body?.reason;

  if (!mode || !["OPEN", "CURFEW", "MAINTENANCE"].includes(mode)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_MODE", message: "Mode must be OPEN, CURFEW, or MAINTENANCE." },
      },
      { status: 400 },
    );
  }

  await setGateMode(
    mode as GateMode,
    auth.userId || "admin",
    reason || `Mode set to ${mode} by ${auth.role}`,
  );

  return NextResponse.json({
    success: true,
    data: {
      mode,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["admin", "sysadmin", "supervisor"],
  }),
  { keyPrefix: "gate_mode_set", maxRequests: 30 },
);

