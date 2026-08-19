import { NextRequest, NextResponse } from "next/server";
import { findGatePasses, createGatePass, getParentChildren } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Student } from "@/lib/types";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const authUserId = auth.userId;
    const authRole = auth.role;

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    let roll = params.get("roll") || undefined;
    let parentId = params.get("parentId") || undefined;

    // Authorization: Non-admins can only query their own data.
    const isAdmin = ['admin', 'supervisor', 'sysadmin'].includes(authRole);

    if (!isAdmin) {
      if (authRole === 'student') {
        // Students must query by their own roll number, which we can get from their user profile.
        const { data: profile } = await supabase
          .from('users')
          .select('login_identifier')
          .eq('id', authUserId)
          .single();

        const userRoll = profile?.login_identifier;
        if (!userRoll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "No roll number associated with this account." } },
            { status: 403 }
          );
        }
        if (roll && roll !== userRoll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own passes." } },
            { status: 403 }
          );
        }
        roll = userRoll;
      } else if (authRole === 'parent') {
        if (parentId && parentId !== authUserId) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your children's passes." } },
            { status: 403 }
          );
        }
        parentId = authUserId;
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } },
          { status: 403 }
        );
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

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const requestedById = auth.userId;
    const authRole = auth.role;
    const authUserId = auth.userId;

    const body = await req.json();
    const { roll, reason, from, to, description } = body;

    if (!roll || !reason || !from || !to) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "roll, reason, from, to are required" } },
        { status: 400 }
      );
    }

    // Validate that the user is authorized to create a pass for this roll
    if (authRole === 'student') {
      // Student can only create passes for themselves
      const { data: profile } = await supabase
        .from('users')
        .select('login_identifier')
        .eq('id', authUserId)
        .single();

      if (profile?.login_identifier !== roll) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only create passes for yourself." } },
          { status: 403 }
        );
      }
    } else if (authRole === 'parent') {
      // Parent can only create passes for their children
      const children = await getParentChildren(authUserId);
      const childRolls = children.map((c: Student) => c.roll);
      if (!childRolls.includes(roll)) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only create passes for your children." } },
          { status: 403 }
        );
      }
    } else if (!['admin', 'sysadmin', 'supervisor'].includes(authRole)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to create a pass." } },
        { status: 403 }
      );
    }

    const pass = await createGatePass({
      roll,
      reason,
      from,
      to,
      description,
      requestedById,
    });

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
  withAuthAndStatus(withAuthorization(handlePost, { requiredRole: ['student', 'parent', 'admin', 'supervisor', 'sysadmin'] })),
  { keyPrefix: 'passes_create', maxRequests: 10 }
);
