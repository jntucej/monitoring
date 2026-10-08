import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filter = segments.filter((s) => s !== "dismiss");
  return decodeURIComponent(filter[filter.length - 1]);
}

async function handlePost(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const supabase = getSupabaseServiceClient();

    const dismissalRow = {
      id: `dis-${Date.now()}-${randomBytes(4).toString("hex")}`,
      announcement_id: id,
      user_id: actorId,
      dismissed_at: new Date().toISOString(),
    };

    await supabase.from("user_announcement_dismissals").insert(dismissalRow);

    return NextResponse.json({ success: true, data: { announcementId: id, dismissed: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });

