import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";

const DEFAULT_EXIT_REASONS = [
  {
    code: "daily_outing",
    name: "Daily Outing",
    description: "Standard local daily outing (no pass required)",
    applicableTo: ["student"],
    requiresApproval: false,
    approvalBy: "none",
    parentNotification: "silent",
    maxDurationHours: 4,
  },
  {
    code: "home_in",
    name: "Home In",
    description: "Return to campus from home visit (no pass required)",
    applicableTo: ["student"],
    requiresApproval: false,
    approvalBy: "none",
    parentNotification: "silent",
    maxDurationHours: null,
  },
  {
    code: "day_pass",
    name: "Day Pass",
    description: "Full day leave (requires warden approved pass)",
    applicableTo: ["student"],
    requiresApproval: true,
    approvalBy: "warden",
    parentNotification: "sms",
    maxDurationHours: 12,
  },
  {
    code: "home_out",
    name: "Home Out",
    description: "Weekend overnight leave (requires warden approved pass)",
    applicableTo: ["student"],
    requiresApproval: true,
    approvalBy: "warden",
    parentNotification: "sms",
    maxDurationHours: 48,
  },
];

async function handleGet(_req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from("config_exit_reasons")
      .select("*")
      .order("code");

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, data: DEFAULT_EXIT_REASONS });
    }

    const mapped = data.map((item: any) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      applicableTo: item.applicable_to || [],
      requiresApproval: item.requires_approval || false,
      approvalBy: item.approval_by || "none",
      parentNotification: item.parent_notification || "silent",
      maxDurationHours: item.max_duration_hours,
    }));

    return NextResponse.json({
      success: true,
      data: mapped.length > 0 ? mapped : DEFAULT_EXIT_REASONS,
    });
  } catch (error: any) {
    console.error("Error fetching exit reasons, returning defaults:", error);
    return NextResponse.json({ success: true, data: DEFAULT_EXIT_REASONS });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      description,
      applicableTo,
      requiresApproval,
      approvalBy,
      parentNotification,
      maxDurationHours,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Code and Name are required." } },
        { status: 400 },
      );
    }

    const payload = {
      code,
      name,
      description: description || "",
      applicable_to: applicableTo || ["student"],
      requires_approval: Boolean(requiresApproval),
      approval_by: approvalBy || "none",
      parent_notification: parentNotification || "silent",
      max_duration_hours: maxDurationHours ? Number(maxDurationHours) : null,
    };

    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from("config_exit_reasons")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error upserting exit reason:", error);
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 },
      );
    }

    try {
      const authUserId = req.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";
      const authRole = (req.headers.get("x-user-role") as Role) || "sysadmin";
      await addAudit({
        userId: authUserId,
        role: authRole,
        action: "CONFIG_EXIT_REASON_SAVED",
        details: { code, name },
      });
    } catch {
      // Audit fail non-fatal
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error creating exit reason:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing reason code" } },
        { status: 400 },
      );
    }

    const service = getSupabaseServiceClient();
    const { error } = await service.from("config_exit_reasons").delete().eq("code", code);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Deleted exit reason ${code}` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: "config_exit_reasons_get", maxRequests: 100 });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin"] });
