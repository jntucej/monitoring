import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { listGates } from "@/server/services/gates/list";
import { ok } from "@/server/http/response";

async function handleGet() {
  const result = await listGates();
  return ok(result);
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getSupabaseServiceClient();
    const insertPayload: Record<string, any> = {
      name: body.name,
      location: body.location,
      type: body.type,
      is_active: body.isActive ?? true,
    };
    if (body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
      insertPayload.id = body.id;
    }

    const { data, error } = await service
      .from("gates")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: "Failed to create gate" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "gate_get", maxRequests: 50 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_post", maxRequests: 10 }
);
