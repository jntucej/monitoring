import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function post(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null) as
    { messageId?: string; feedback?: number } | null;
  if (!body?.messageId || (body.feedback !== 1 && body.feedback !== -1)) {
    return NextResponse.json(err("BAD_REQUEST", "bad_request").body, { status: 400 });
  }

  const own = await query<{ id: string }>(
    `SELECT m.id FROM public.bot_messages m
       JOIN public.bot_conversations c ON c.id = m.conversation_id
      WHERE m.id=$1 AND c.user_id=$2`,
    [body.messageId, auth.userId],
  );
  if (!own.rows.length) return NextResponse.json(err("NOT_FOUND", "not_found").body, { status: 404 });

  await query(`UPDATE public.bot_messages SET feedback=$1 WHERE id=$2`, [body.feedback, body.messageId]);
  return NextResponse.json({ ok: true });
}

export const POST = withAuthorization(post);
