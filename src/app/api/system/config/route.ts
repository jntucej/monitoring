import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/cache";

const defaultConfig = {
  notificationsEnabled: true,
  securityLevel: "high",
  // Default OFF: deployments without a 2FA enrollment flow would otherwise
  // lock every sysadmin out. Toggle ON from System Settings when ready.
  mfaRequiredForAdmin: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  auditRetentionDays: 90,
  updatedAt: new Date().toISOString(),
};

// Helper: always return defaultConfig on any missing/invalid DB payload
function toConfig(value: any) {
  if (!value || typeof value !== "object") return defaultConfig;
  return { ...defaultConfig, ...value };
}

async function handleGet(_req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();

    // Expecting schema:
    // system_config(key text primary key, data jsonb, updated_at timestamptz)
    const { data, error } = await service
      .from("system_config")
      .select("*")
      .eq("key", "global_settings")
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { success: true, data: defaultConfig },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toConfig((data as any)?.data ?? (data as any)?.value),
    });
  } catch (_err) {
    return NextResponse.json({ success: true, data: defaultConfig });
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getSupabaseServiceClient();

    const { data: existing, error: readError } = await service
      .from("system_config")
      .select("*")
      .eq("key", "global_settings")
      .single();

    // If not found, treat as empty existing config
    if (readError && readError.code !== "PGRST116") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_READ_ERROR", message: readError.message },
        },
        { status: 500 }
      );
    }

    const mergedValue = {
      ...(toConfig((existing as any)?.data ?? (existing as any)?.value) as any),
      ...(body || {}),
      updatedAt: new Date().toISOString(),
    };

    const nowIso = new Date().toISOString();

    const { data: upserted, error: upsertError } = await service
      .from("system_config")
      .upsert(
        {
          key: "global_settings",
          data: mergedValue,
          updated_at: nowIso,
        },
        { onConflict: "key" }
      )
      .select("*")
      .single();

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_ERROR", message: upsertError.message },
        },
        { status: 500 }
      );
    }

    // The MFA gate caches this flag for 60s; flip it immediately on change.
    if ("mfaRequiredForAdmin" in mergedValue) {
      await invalidateCache("system_config:*");
    }

    return NextResponse.json({ success: true, data: toConfig((upserted as any)?.data ?? (upserted as any)?.value) });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: err?.message ?? "Unknown error" },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "sys_config_get", maxRequests: 60 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "sys_config_patch", maxRequests: 20 }
);