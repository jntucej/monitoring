import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Extract the [id] dynamic segment from the request URL.
 */
function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/gates/:id
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePatch(req: NextRequest) {
  try {
    const id = getId(req);
    const body = await req.json();

    const { error } = await supabase
      .from('gates')
      .update({
        name: body.name,
        location: body.location,
        type: body.type,
        is_active: body.isActive,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update gate' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const id = getId(req);

    const { error } = await supabase.from('gates').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete gate' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_patch", maxRequests: 10 }
);

export const DELETE = withRateLimit(
  withAuthorization(handleDelete, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_delete", maxRequests: 10 }
);
