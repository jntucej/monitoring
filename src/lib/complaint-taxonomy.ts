import { query } from "@/lib/postgres";

export interface ComplaintCategory {
  code: string;
  domain: string;
  label: string;
  description: string | null;
  ownerRole: string;
  slaHours: number;
  anonymousAllowed: boolean;
  isStatutory: boolean;
  girlsCellEligible: boolean;
  sortOrder: number;
}

export interface EscalationStep {
  position: number;
  role: string;
  slaHours: number;
  autoEscalateOnBreach: boolean;
}

let _cache: ComplaintCategory[] | null = null;
let _cacheAt = 0;
const TTL_MS = 60_000;

export async function getCategories(): Promise<ComplaintCategory[]> {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;
  const { rows } = await query<any>(
    `SELECT code, domain, label, description, owner_role, sla_hours,
            anonymous_allowed, is_statutory, girls_cell_eligible, sort_order
       FROM public.complaint_categories
      WHERE is_active
      ORDER BY domain, sort_order`,
  );
  _cache = rows.map((r) => ({
    code: r.code,
    domain: r.domain,
    label: r.label,
    description: r.description,
    ownerRole: r.owner_role,
    slaHours: Number(r.sla_hours),
    anonymousAllowed: Boolean(r.anonymous_allowed),
    isStatutory: Boolean(r.is_statutory),
    girlsCellEligible: Boolean(r.girls_cell_eligible),
    sortOrder: Number(r.sort_order),
  }));
  _cacheAt = now;
  return _cache;
}

export async function getCategory(code: string): Promise<ComplaintCategory | null> {
  const all = await getCategories();
  return all.find((c) => c.code === code) ?? null;
}

export async function getChain(code: string): Promise<EscalationStep[]> {
  const { rows } = await query<any>(
    `SELECT position, role, sla_hours, auto_escalate_on_breach
       FROM public.complaint_escalation_chains
      WHERE category_code = $1
      ORDER BY position`,
    [code],
  );
  return rows.map((r) => ({
    position: Number(r.position),
    role: r.role,
    slaHours: Number(r.sla_hours),
    autoEscalateOnBreach: Boolean(r.auto_escalate_on_breach),
  }));
}

export function invalidateCategoryCache() {
  _cache = null;
  _cacheAt = 0;
}
