// src/app/api/auth/pin-change/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const userId = auth?.userId || req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { currentPin, newPin } = await req.json().catch(() => ({}));

    if (!newPin || typeof newPin !== "string" || !/^\d{4,8}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "New PIN must be 4–8 digits" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, name, initial_pin_hash, pin_hash")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr || !user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const existingHash = user.initial_pin_hash || user.pin_hash;
    if (existingHash) {
      if (!currentPin) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Current PIN is required" } },
          { status: 400 }
        );
      }
      const isValid = await bcrypt.compare(currentPin, existingHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Incorrect current PIN" } },
          { status: 401 }
        );
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        initial_pin_hash: hashedPin,
        pin_hash: hashedPin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: updateErr.message } },
        { status: 500 }
      );
    }

    await logAuditEvent({
      action: "PIN_CHANGED",
      userId: userId,
      userName: user.name || "User",
      userRole: auth?.role || "user",
      details: { timestamp: new Date().toISOString() },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "PIN successfully updated",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(withAuthorization(handlePost), { keyPrefix: "pin_change", maxRequests: 10 });
