// src/app/api/config/emergency-contacts/route.ts
// POST /api/config/emergency-contacts — persist the emergency-contacts config.
// Admin-only (withAdminMutation).

import { NextRequest } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok } from "@/server/http/response";
import { query, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const { contacts } = (await req.json().catch(() => ({}))) as {
    contacts?: Array<{ label: string; phone: string }>;
  };

  await query(
    `INSERT INTO public.system_settings (id, value, updated_at)
     VALUES ('emergency_contacts', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify({ contacts: contacts ?? [] })],
  );

  await addAudit({
    action: "EMERGENCY_CONTACTS_UPDATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { count: contacts?.length ?? 0 },
  });

  return ok({ saved: true });
}

export const POST = withAdminMutation(handlePost);
