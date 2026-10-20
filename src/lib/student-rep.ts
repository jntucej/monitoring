import { query } from "@/lib/postgres";

export interface RepScope {
  scopeType: "class" | "block" | "department" | "mess" | "hostel" | "girls";
  scopeId: string;
}

export async function getActiveRepScopes(studentId: string): Promise<RepScope[]> {
  const { rows } = await query<any>(
    `SELECT scope_type, scope_id FROM public.student_representatives
      WHERE student_id = $1 AND status = 'active' AND valid_to >= CURRENT_DATE`,
    [studentId],
  );
  return rows.map((r) => ({ scopeType: r.scope_type, scopeId: r.scope_id }));
}

export async function canRaiseForScope(
  studentId: string,
  scopeType: string,
  scopeId: string,
): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM public.student_representatives
      WHERE student_id = $1 AND scope_type = $2 AND scope_id = $3
        AND status = 'active' AND valid_to >= CURRENT_DATE
      LIMIT 1`,
    [studentId, scopeType, scopeId],
  );
  return rows.length > 0;
}
