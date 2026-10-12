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

async function handleGet(req: NextRequest): Promise<Response> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const workflowType = (searchParams.get("workflowType") ||
      searchParams.get("workflow_type")) as WorkflowType | null;

    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("custom_reasons")
      .select("id, code, label, workflow_type, created_by, created_at")
      .order("workflow_type", { ascending: true })
      .order("label", { ascending: true });

    if (workflowType) {
      query = query.eq("workflow_type", workflowType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Custom Reasons API] GET Error:", error);
      return NextResponse.json(
        {
          success: false,
          error: { code: "SERVER_ERROR", message: error.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Custom Reasons API] Unexpected GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest): Promise<Response> {
  try {
    const authUserId = req.headers.get("x-user-id") || "";
    const body = await req.json().catch(() => ({}));
    const { code, label, workflowType, workflow_type } = body;

    const rawWorkflow = (workflow_type || workflowType || "").toString().trim();
    const rawCode = (code || "").toString().trim().toLowerCase();
    const rawLabel = (label || "").toString().trim();

    if (!rawCode || !CODE_REGEX.test(rawCode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Reason code must contain only lowercase alphanumeric characters and underscores (/^[a-z0-9_]+$/).",
          },
        },
        { status: 400 }
      );
    }

    if (!rawLabel) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Reason label is required.",
          },
        },
        { status: 400 }
      );
    }

    if (!VALID_WORKFLOWS.includes(rawWorkflow as WorkflowType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Invalid workflow type '${rawWorkflow}'. Must be one of: ${VALID_WORKFLOWS.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const insertPayload = {
      code: rawCode,
      label: rawLabel,
      workflow_type: rawWorkflow,
      created_by: authUserId || null,
    };

    const { data, error } = await supabase
      .from("custom_reasons")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message: `A reason with code '${rawCode}' already exists for workflow '${rawWorkflow}'.`,
            },
          },
          { status: 409 }
        );
      }
      console.error("[Custom Reasons API] POST Error:", error);
      return NextResponse.json(
        {
          success: false,
          error: { code: "SERVER_ERROR", message: error.message },
        },
        { status: 500 }
      );
    }

    addAudit({
      userId: authUserId || "system",
      action: "CREATE_CUSTOM_REASON",
      details: {
        id: data?.id,
        code: rawCode,
        label: rawLabel,
        workflow_type: rawWorkflow,
      },
    }).catch((err) => console.error("[Custom Reasons API] addAudit error:", err));

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Custom Reasons API] Unexpected POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, {
  keyPrefix: "custom_reasons_get",
  maxRequests: 120,
});

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["sysadmin", "admin", "principal", "hod", "principal", "oie"],
  }),
  {
    keyPrefix: "custom_reasons_post",
    maxRequests: 60,
  }
);
