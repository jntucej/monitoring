import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/cache";
import { log, getRequestId } from "@/lib/log";

const defaultConfig = {
  notificationsEnabled: true,
  securityLevel: "high",
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  auditRetentionDays: 90,
  updatedAt: new Date().toISOString(),
};

// Helper: always return defaultConfig on any missing/invalid DB payload
type ConfigRow = { data?: unknown; value?: unknown };
function toConfig(value: unknown) {
  if (!value || typeof value !== "object") return defaultConfig;
  return { ...defaultConfig, ...(value as Partial<typeof defaultConfig>) };
}

function configPayload(row: unknown): unknown {
  return (row as ConfigRow | null)?.data ?? (row as ConfigRow | null)?.value;
}

async function handleGetInner(_req: NextRequest) {
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
      data: toConfig(configPayload(data)),
    });
  } catch {
    return NextResponse.json({ success: true, data: defaultConfig });
  }
}

async function handlePatchInner(req: NextRequest) {
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
          error: { code: "DB_READ_ERROR", message: readError.message, requestId: getRequestId(req) },
        },
        { status: 500 }
      );
    }

    const mergedValue = {
      ...(toConfig(configPayload(existing)) as Partial<typeof defaultConfig>),
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
          error: { code: "DB_ERROR", message: upsertError.message, requestId: getRequestId(req) },
        },
        { status: 500 }
      );
    }

    // Invalidate cached config on any change so the new values take effect.
    await invalidateCache("system_config:*");

    return NextResponse.json({ success: true, data: toConfig(configPayload(upserted)) });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: errMsg(err) ?? "Unknown error", requestId: getRequestId(req) },
      },
      { status: 500 }
    );
  }
}

// Structured observability: auto-log the request lifecycle with the correlation ID.
const handleGet = log.wrap("/api/system/config:GET", handleGetInner);
const handlePatch = log.wrap("/api/system/config:PATCH", handlePatchInner);

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "sys_config_get", maxRequests: 60 }
);

export const PATCH = withMutationGuard(handlePatch, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "sys_config_patch", maxRequests: 20 }});
