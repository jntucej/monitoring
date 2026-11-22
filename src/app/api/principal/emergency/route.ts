// PR-12 — /api/principal/emergency (current state + latest commands, PR-10)
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { currentEmergencyState, type EmergencyCommandRow } from "@/lib/institutional/emergency";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const READ_ROLES: Role[] = ["principal", "admin", "sysadmin"];

async function getEmergency(_req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const state = await currentEmergencyState();
    const { rows: commands } = await query<EmergencyCommandRow>(
      `SELECT * FROM public.emergency_commands
        WHERE archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20`,
    );
    return ok({ currentState: state, commands });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load emergency state", 500);
  }
}

export const GET = withAuthorization(getEmergency, { requiredRole: READ_ROLES });
