import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: configs, error } = await supabase
      .from("integration_configs")
      .select("*")
      .order("name");

    if (error) {
      // Return empty configuration list when table is empty or unpopulated
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: configs || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, context?: { auth?: AuthContext }) {
  try {
    const auth = context?.auth;
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    if (!body.type || !body.name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "type and name are required" } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("integration_configs")
      .upsert({
        id: body.id || `int-${body.type}-${Date.now()}`,
        type: body.type,
        name: body.name,
        enabled: body.enabled ?? true,
        config: body.config || {},
        status: body.status || "configured",
        last_sync: body.lastSync || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    if (auth) {
      await addAudit({
        action: "UPDATE_INTEGRATION_CONFIG",
        userId: auth.userId,
        userName: auth.loginIdentifier || "Admin",
        role: auth.role,
        details: `Updated integration config: ${body.name} (${body.type})`,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const PUT = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });


