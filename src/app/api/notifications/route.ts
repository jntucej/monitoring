import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const authUserId = req.headers.get('x-user-id');
    const authRole = req.headers.get('x-user-role');

    const params = req.nextUrl.searchParams;
    const recipientType = params.get("type");
    const recipientId = params.get("id");

    if (!recipientType || !recipientId) {
        return NextResponse.json(
            { success: false, error: { code: "BAD_REQUEST", message: "Recipient type and ID are required." } },
            { status: 400 }
        );
    }

    // Authorization: Prevent user enumeration
    const isAdmin = ['admin', 'sysadmin'].includes(authRole || '');
    if (!isAdmin) {
        if (recipientId !== authUserId || recipientType !== authRole) {
            return NextResponse.json(
                { success: false, error: { code: "FORBIDDEN", message: "You can only access your own notifications." } },
                { status: 403 }
            );
        }
    }

    const data = await getNotifications(recipientType, recipientId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load notifications" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
    withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin', 'parent', 'student'] }),
    { keyPrefix: 'notifications_list', maxRequests: 60 }
);
