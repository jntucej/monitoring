import { NextRequest, NextResponse } from "next/server";
import { findGatePasses, createGatePass } from "@/lib/db";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const authUserId = req.headers.get('x-user-id');
    const authRole = req.headers.get('x-user-role');

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    let roll = params.get("roll") || undefined;
    let parentId = params.get("parentId") || undefined;

    // Authorization: Non-admins can only query their own data.
    const isAdmin = ['admin', 'supervisor', 'sysadmin'].includes(authRole || '');
    if (!isAdmin) {
        if (authRole === 'student') {
            // Students must query by their own roll number, which we can get from their user record.
            // For now, we will assume the user ID is the roll number for simplicity. A better implementation
            // would look up the user's roll number from their profile.
            const userRoll = authUserId; // This is a simplification
            if (roll && roll !== userRoll) {
                 return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "You can only view your own passes." } }, { status: 403 });
            }
            roll = userRoll ?? undefined; // Enforce filtering by the authenticated user
        } else if (authRole === 'parent') {
            if (parentId && parentId !== authUserId) {
                return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "You can only view your children's passes." } }, { status: 403 });
            }
            parentId = authUserId ?? undefined; // Enforce filtering by the authenticated parent
        } else {
             return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } }, { status: 403 });
        }
    }

    const passes = await findGatePasses({ status, roll, parentId });
    return NextResponse.json({ success: true, data: passes });
  } catch (error) {
    console.error("Error fetching passes:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load passes" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const requestedById = req.headers.get('x-user-id');
    if (!requestedById) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Could not identify the user." } }, { status: 401 });
    }

    const body = await req.json();
    const { roll, reason, from, to, description } = body;

    if (!roll || !reason || !from || !to) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "roll, reason, from, to are required" } },
        { status: 400 }
      );
    }

    // `requestedByName` is removed; the backend should look this up from `requestedById`.
    const pass = await createGatePass({ roll, reason, from, to, description, requestedById });
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pass });
  } catch (error) {
    console.error("Error creating pass:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create pass" } },
      { status: 500 }
    );
  }
}


export const GET = withRateLimit(
  withAuthAndStatus(withAuthorization(handleGet, { requiredRole: ['admin', 'supervisor', 'sysadmin', 'parent', 'student'] })),
  { keyPrefix: 'passes_list', maxRequests: 100 }
);

export const POST = withRateLimit(
  withAuthAndStatus(withAuthorization(handlePost, { requiredRole: ['student'] })),
  { keyPrefix: 'passes_create', maxRequests: 10 }
);