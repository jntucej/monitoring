import { getCategory, getChain } from "./complaint-taxonomy";

export interface RouteResult {
  code: string;
  domain: string;
  label: string;
  primaryOwner: string;
  slaHours: number;
  anonymousAllowed: boolean;
  isStatutory: boolean;
  girlsCellEligible: boolean;
  chain: { role: string; slaHours: number; autoEscalate: boolean }[];
}

export async function routeComplaint(code: string): Promise<RouteResult | null> {
  const cat = await getCategory(code);
  if (!cat) return null;
  const chain = await getChain(code);
  return {
    code: cat.code,
    domain: cat.domain,
    label: cat.label,
    primaryOwner: cat.ownerRole,
    slaHours: cat.slaHours,
    anonymousAllowed: cat.anonymousAllowed,
    isStatutory: cat.isStatutory,
    girlsCellEligible: cat.girlsCellEligible,
    chain: chain.map((s) => ({
      role: s.role,
      slaHours: s.slaHours,
      autoEscalate: s.autoEscalateOnBreach,
    })),
  };
}
