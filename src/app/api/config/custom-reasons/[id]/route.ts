import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import withAuthorization from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { WorkflowType } from "@/lib/types";

const VALID_WORKFLOWS: readonly WorkflowType[] = [
  "hostel",
  "exam",
  "memo",
  "staff_leave",
] as const;

const CODE_REGEX = /^[a-z0-9_]+$/;

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
        { success: false, error: { code: "BAD_REQUEST", message: "Missing reason ID" } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { label, code, workflowType, workflow_type } = body;
    const updates: Record<string, unknown> = {};

    if (label !== undefined) {
      const trimmedLabel = String(label).trim();
      if (!trimmedLabel) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Label cannot be empty" } },
          { status: 400 }
        );
      }
      updates.label = trimmedLabel;
    }

    if (code !== undefined) {
      const trimmedCode = String(code).trim().toLowerCase();
      if (!trimmedCode || !CODE_REGEX.test(trimmedCode)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: "Reason code must contain only lowercase alphanumeric characters and underscores.",
            },
          },
          { status: 400 }
        );
      }
      updates.code = trimmedCode;
    }

    const rawWorkflow = workflow_type || workflowType;
    if (rawWorkflow !== undefined) {
      if (!VALID_WORKFLOWS.includes(rawWorkflow as WorkflowType)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: `Invalid workflow type. Must be one of: ${VALID_WORKFLOWS.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
      updates.workflow_type = rawWorkflow;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No fields to update" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("custom_reasons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "CONFLICT", message: "A reason with this code and workflow already exists." },
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    addAudit({
      userId: authUserId || "system",
      action: "UPDATE_CUSTOM_REASON",
      details: { id, updates },
    }).catch((err) => console.error("[Custom Reasons API] addAudit error:", err));

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest): Promise<Response> {
  try {
    const authUserId = req.headers.get("x-user-id") || "";
    const id = getIdFromPath(req);

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing reason ID" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("custom_reasons").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    addAudit({
      userId: authUserId || "system",
      action: "DELETE_CUSTOM_REASON",
      details: { id },
    }).catch((err) => console.error("[Custom Reasons API] addAudit error:", err));

    return NextResponse.json({ success: true, message: `Custom reason ${id} deleted.` });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, {
    requiredRole: ["sysadmin", "admin", "warden", "hod", "principal", "oie"],
  }),
  { keyPrefix: "custom_reasons_patch", maxRequests: 60 }
);

export const DELETE = withRateLimit(
  withAuthorization(handleDelete, {
    requiredRole: ["sysadmin", "admin", "warden", "hod", "principal", "oie"],
  }),
  { keyPrefix: "custom_reasons_delete", maxRequests: 60 }
);
