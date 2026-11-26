import { query } from "@/lib/postgres";
import type { PresenceState } from "./presence";

export type ScopeKey =
  | "hostel_resident"
  | "mess_member"
  | "mess_token_available"
  | "library_member"
  | "is_cr"
  | "is_nss"
  | "is_sports"
  | "is_day_scholar"
  | "academics_visible";

export const SHOW_SCOPE_MAP: Record<ScopeKey, string[]> = {
  hostel_resident: ["/student/hostel", "HostelWidget"],
  mess_member: ["/student/mess", "MessMenuWidget"],
  mess_token_available: ["/student/mess", "MessTokenCard"],
  library_member: ["/student/library", "LibraryColumn"],
  is_cr: ["/student/cr", "CRPortalButton"],
  is_nss: ["/student/nss", "NssWidget"],
  is_sports: ["/student/sports", "SportsWidget"],
  is_day_scholar: ["/student/transport", "DayScholarWidget"],
  academics_visible: ["/student/academics", "AcademicsPanel"],
};

export interface ResolvedScope {
  role: string;
  presence: {
    state: PresenceState;
    block_id: string | null;
    since: string | null;
  };
  scopes: Record<ScopeKey, boolean>;
  academics_visible: boolean;
  reasons: Record<string, string>;
}

export async function resolveScope(userId: string): Promise<ResolvedScope> {
  const { rows } = await query<{
    role: string;
    hostel_block: string | null;
    student_type: string | null;
    class_representative: boolean | null;
    presence_state: PresenceState | null;
    presence_block: string | null;
    presence_since: string | null;
    mess_active: boolean | null;
    lib_active: boolean | null;
  }>(
    `SELECT u.role,
            COALESCE(sd.hostel_block, u.hostel_block) AS hostel_block,
            sd.student_type,
            sd.class_representative,
            sp.state AS presence_state,
            sp.block_id AS presence_block,
            sp.since::text AS presence_since,
            me.eligible AS mess_active,
            lm.active AS lib_active
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
       LEFT JOIN public.student_presence sp ON sp.student_id = u.id
       LEFT JOIN LATERAL (
         SELECT eligible FROM public.mess_eligibility
          WHERE user_id = u.id
          ORDER BY decided_at DESC LIMIT 1
       ) me ON true
       LEFT JOIN public.library_memberships lm ON lm.user_id = u.id
      WHERE u.id = $1::uuid
      LIMIT 1`,
    [userId],
  );

  const r = rows[0];
  const state: PresenceState = r?.presence_state ?? "unknown";
  const blockId = r?.presence_block ?? r?.hostel_block ?? null;
  const isDayScholar =
    r?.student_type === "day_scholar" || (!blockId && r?.student_type !== "hosteller");
  const hostelResident = !isDayScholar && Boolean(blockId);
  const messMember = Boolean(r?.mess_active) || hostelResident;
  const messTokenAvailable = messMember && state === "in_hostel";
  const libraryMember = Boolean(r?.lib_active);
  const isCr = Boolean(r?.class_representative);

  return {
    role: r?.role ?? "student",
    presence: {
      state,
      block_id: blockId,
      since: r?.presence_since ?? null,
    },
    scopes: {
      hostel_resident: hostelResident,
      mess_member: messMember,
      mess_token_available: messTokenAvailable,
      library_member: libraryMember,
      is_cr: isCr,
      is_nss: false,
      is_sports: false,
      is_day_scholar: isDayScholar,
      academics_visible: true,
    },
    academics_visible: true,
    reasons: {
      mess_token_available: messTokenAvailable
        ? "in hostel"
        : `presence state is '${state}' (must be in_hostel)`,
    },
  };
}
