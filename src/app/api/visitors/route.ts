import { NextRequest, NextResponse } from "next/server";
import { createVisitor, checkInVisitor, checkOutVisitor } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") || "active";

    const { data, error } = await supabase
      .from("visitor_logs")
      .select("*, person:person_id(*), host:host_person_id(*)")
      .eq("status", status)
      .order("check_in_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching visitors:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch visitors" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, visitorHost, visitorPurpose, hostPersonId } = body;

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "fullName is required" } },
        { status: 400 }
      );
    }

    const visitor = await createVisitor({
      fullName,
      email,
      phone,
      visitorHost,
      visitorPurpose,
    });

    if (!visitor) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to create visitor" } },
        { status: 500 }
      );
    }

    if (hostPersonId) {
      await checkInVisitor(visitor.id, hostPersonId, visitorPurpose);
    }

    return NextResponse.json({ success: true, data: visitor });
  } catch (error: unknown) {
    console.error("Error creating visitor:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create visitor" } },
      { status: 500 }
    );
  }
}

async function handlePut(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, personId, logId, hostPersonId, purpose } = body;

    if (action === "check-in") {
      if (!personId) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "personId is required for check-in" } },
          { status: 400 }
        );
      }
      const log = await checkInVisitor(personId, hostPersonId, purpose);
      return NextResponse.json({ success: true, data: log });
    } else if (action === "check-out") {
      const targetId = logId || personId;
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "logId or personId is required for check-out" } },
          { status: 400 }
        );
      }
      const log = await checkOutVisitor(targetId);
      return NextResponse.json({ success: true, data: log });
    } else {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Invalid action. Use 'check-in' or 'check-out'." } },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("Error updating visitor status:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update visitor status" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthAndStatus(withAuthorization(handleGet, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] })),
  { keyPrefix: "visitors_get", maxRequests: 100 }
);

export const POST = withRateLimit(
  withAuthAndStatus(withAuthorization(handlePost, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] })),
  { keyPrefix: "visitors_post", maxRequests: 30 }
);

export const PUT = withRateLimit(
  withAuthAndStatus(withAuthorization(handlePut, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] })),
  { keyPrefix: "visitors_put", maxRequests: 30 }
);
