import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  const service = getSupabaseServiceClient();
  const { data, error } = await service.from('gates').select('*');
  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch gates' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from('gates')
      .insert({
        id: body.id || `gate-${Date.now()}`,
        name: body.name,
        location: body.location,
        type: body.type,
        is_active: body.isActive,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create gate' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "supervisor", "operator"] }),
  { keyPrefix: "gate_get", maxRequests: 50 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_post", maxRequests: 10 }
);
