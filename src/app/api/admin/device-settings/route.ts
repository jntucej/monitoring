import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import withAuthorization from "@/middleware/authorization";

const DEFAULT_DEVICE_SETTINGS = [
  { device_type: "thumb", enabled: false, scope: "global" },
  { device_type: "face", enabled: false, scope: "global" },
  { device_type: "barcode", enabled: false, scope: "global" },
  { device_type: "qr", enabled: false, scope: "global" },
];

async function handleGet(req: NextRequest): Promise<Response> {
  try {
    const authUserId = req.headers.get("x-user-id");
    if (!authUserId) {
      // Proceed with service client fetching
    }
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("device_verification_settings")
      .select("id, device_type, enabled, scope, scope_id, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[Device Settings API] Failed to fetch device settings, falling back to defaults:", error.message);
      return NextResponse.json({
        success: true,
        data: DEFAULT_DEVICE_SETTINGS,
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_DEVICE_SETTINGS,
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Device Settings API] Unexpected GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["sysadmin", "admin"],
  }),
  {
    keyPrefix: "device_settings_get",
    maxRequests: 100,
  }
);
