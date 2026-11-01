import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

// GET /api/student/next-exam — next upcoming exam from the admin-managed
// system_settings.exam_schedule JSONB (decision: Option A; a proper exam
// schedule table supersedes this later).
async function handler(_req: NextRequest) {
  const { rows } = await query<{
    value: Array<{ date: string; label: string; subject: string | null }>;
  }>(`SELECT value FROM public.system_settings WHERE id = 'exam_schedule' LIMIT 1`);
  const list = rows[0]?.value ?? [];
  const upcoming = list
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return ok(upcoming ?? null);
}

export const GET = withAuthorization(handler);
