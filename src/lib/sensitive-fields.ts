// Field-level data minimisation for sensitive personal data.
//
// Caste, subcaste, religion and annual family income are collected solely for
// government-mandated scholarship and reservation compliance. Under DPDP
// (India) and Article 15 constitutional protections they are among the most
// sensitive fields in the database. Access is therefore restricted to
// administrative roles only; every other role gets them redacted from API
// responses.
//
// Call this at the boundary of any GET handler that returns student_details:
//   const safe = redactSensitiveDetails(rawDetails, authRole);

const SENSITIVE_FIELDS = [
  "caste",
  "subcaste",
  "religion",
  "income_per_annum",
] as const;



export function redactSensitiveDetails<T extends Record<string, unknown>>(
  details: T,
  role: string | null | undefined,
): T {
  if (role === "admin" || role === "sysadmin") return details;
  const out: Record<string, unknown> = { ...details };
  for (const f of SENSITIVE_FIELDS) {
    delete out[f];
  }
  // Also hide the nested student_details blob if present
  if (out.student_details && typeof out.student_details === "object") {
    const nested = { ...(out.student_details as Record<string, unknown>) };
    for (const f of SENSITIVE_FIELDS) delete nested[f];
    out.student_details = nested;
  }
  return out as T;
}

export const SENSITIVE_DETAIL_FIELDS: readonly string[] = SENSITIVE_FIELDS;

