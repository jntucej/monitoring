import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAdminMutation } from "@/server/http/mutation-guard";
import type { AuthContext } from "@/lib/authContext";
import { addAudit } from "@/lib/db";

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
    description: "Full day leave (requires principal approved pass)",
    applicableTo: ["student"],
    requiresApproval: true,
    approvalBy: "principal",
    parentNotification: "sms",
    maxDurationHours: 12,
  },
  {
    code: "home_out",
    name: "Home Out",
    description: "Weekend overnight leave (requires principal approved pass)",
    applicableTo: ["student"],
    requiresApproval: true,
    approvalBy: "principal",
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

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
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
      await addAudit({
        userId: ctx.auth.userId,
        role: ctx.auth.role,
        action: "CONFIG_EXIT_REASON_SAVED",
        details: { code, name, verb: "POST" },
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

async function handleDelete(req: NextRequest, ctx: { auth: AuthContext }) {
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

    try {
      await addAudit({
        userId: ctx.auth.userId,
        role: ctx.auth.role,
        action: "CONFIG_EXIT_REASON_SAVED",
        details: { code, verb: "DELETE" },
      });
    } catch {
      // Audit fail non-fatal
    }

    return NextResponse.json({ success: true, message: `Deleted exit reason ${code}` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: "config_exit_reasons_get", maxRequests: 100 });
export const POST = withAdminMutation(handlePost, { rateLimit: { windowMs: 60_000, maxRequests: 20 } });
export const PATCH = withAdminMutation(handlePost, { rateLimit: { windowMs: 60_000, maxRequests: 20 } });
export const DELETE = withAdminMutation(handleDelete, { rateLimit: { windowMs: 60_000, maxRequests: 20 } });
