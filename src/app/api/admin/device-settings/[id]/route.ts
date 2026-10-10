import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import withAuthorization from "@/middleware/authorization";
import { addAudit } from "@/lib/db";

const VALID_SCOPES = ["global", "gate", "hostel"] as const;

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePatch(req: NextRequest): Promise<Response> {
  try {
    const authUserId = req.headers.get("x-user-id") || "";
    const id = getIdFromPath(req);

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing device setting ID" } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { enabled, scope, scope_id, scopeId } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof enabled === "boolean") {
      updates.enabled = enabled;
    }

    const effectiveScope = scope || undefined;
    if (effectiveScope !== undefined) {
      if (!VALID_SCOPES.includes(effectiveScope)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: `Invalid scope '${effectiveScope}'. Must be one of: ${VALID_SCOPES.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
      updates.scope = effectiveScope;
    }

    const effectiveScopeId = scope_id !== undefined ? scope_id : scopeId;
    if (effectiveScopeId !== undefined) {
      updates.scope_id = effectiveScopeId || null;
    }

    if (updates.enabled === undefined && !updates.scope && updates.scope_id === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Check if ID is UUID or device_type
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from("device_verification_settings").update(updates);

    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("device_type", id);
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error("[Device Settings API] PATCH Error:", error);
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    addAudit({
      userId: authUserId || "system",
      action: "UPDATE_DEVICE_SETTING",
      details: { id, updates },
    }).catch((err) => console.error("[Device Settings API] addAudit error:", err));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Device Settings API] Unexpected PATCH Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, {
    requiredRole: ["sysadmin", "admin"],
  }),
  {
    keyPrefix: "device_settings_patch",
    maxRequests: 60,
  }
);
