import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleDelete(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();
    await supabase.from("saved_report_definitions").delete().eq("id", id);
    return NextResponse.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const DELETE = withMutationGuard(handleDelete, {requiredRole: ["sysadmin", "admin"]});
