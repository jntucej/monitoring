import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withTransaction } from "@/lib/db";
import { withMutationGuard } from "@/server/http/mutation-guard";

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
    const service = getSupabaseServiceClient();

    const { error } = await service
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

    // RLS write discipline: gates is an RLS table; delete goes through
    // withTransaction (gate_app GUC context).
    await withTransaction(async (client) => {
      await client.query("DELETE FROM public.gates WHERE id = $1", [id]);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withMutationGuard(handlePatch, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "gate_patch", maxRequests: 10 }});

export const DELETE = withMutationGuard(handleDelete, {requiredRole: ["admin", "sysadmin"], rateLimit: { keyPrefix: "gate_delete", maxRequests: 10 }});
