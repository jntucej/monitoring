import { NextRequest, NextResponse } from "next/server";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/notification-service";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { NotificationPreferences } from "@/lib/notification-types";

async function handleGet(req: NextRequest, context: { auth: AuthContext }) {
  const userId = context.auth.userId;
  if (!userId) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const data = await getNotificationPreferences(userId);
  return NextResponse.json({ success: true, data });
}

async function handlePut(req: NextRequest, context: { auth: AuthContext }) {
  const userId = context.auth.userId;
  if (!userId) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  const success = await updateNotificationPreferences(userId, body as Partial<NotificationPreferences>);
  return NextResponse.json({ success });
}

export const GET = withRateLimit(withAuthorization(handleGet), { keyPrefix: "notif_pref_get", maxRequests: 60 });
export const PUT = withRateLimit(withAuthorization(handlePut), { keyPrefix: "notif_pref_put", maxRequests: 30 });
export const POST = PUT;
