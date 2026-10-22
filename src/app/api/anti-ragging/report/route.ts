// src/app/api/anti-ragging/report/route.ts
// POST — confidential anti-ragging report.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { generateCaseNumber, reporterHash, loadAlertConfig, resolveAlertRecipients } from "@/lib/anti-ragging";
import { sendEmail } from "@/lib/integrations/email";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Only students can file anti-ragging reports", 403);

  const body = (await req.json().catch(() => ({}))) as {
    isAnonymous?: boolean;
    category?: string;
    severity?: string;
    narrative?: string;
    location?: string;
    occurredAt?: string;
    accusedInfo?: string;
    witnessInfo?: string;
  };

  const narrative = (body.narrative ?? "").trim();
  const category = ["ragging", "harassment", "bullying", "sexual_harassment", "other"].includes(body.category ?? "")
    ? body.category!
    : "ragging";
  const severity = ["medium", "high", "critical"].includes(body.severity ?? "") ? body.severity! : "high";
  const isAnonymous = body.isAnonymous !== false;

  if (!narrative) return fail("VALIDATION_ERROR", "narrative required", 400);

  const caseNumber = generateCaseNumber();
  const rHash = isAnonymous ? reporterHash(auth.userId) : null;

  await query(
    `INSERT INTO public.anti_ragging_cases (
       case_number, is_anonymous, reporter_hash, category, severity,
       narrative, location, occurred_at, accused_info, witness_info
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10)`,
    [
      caseNumber,
      isAnonymous,
      rHash,
      category,
      severity,
      narrative.slice(0, 5000),
      body.location ? body.location.trim().slice(0, 250) : null,
      body.occurredAt ?? null,
      body.accusedInfo ? body.accusedInfo.trim().slice(0, 1000) : null,
      body.witnessInfo ? body.witnessInfo.trim().slice(0, 1000) : null,
    ],
  );

  // Send alerts if configured
  try {
    const cfg = await loadAlertConfig();
    if (cfg.enabled) {
      const roleEmails = await resolveAlertRecipients(cfg.email_roles);
      const to = Array.from(new Set([...roleEmails, ...(cfg.extra_emails ?? [])]));
      if (to.length > 0) {
        await sendEmail({
          to,
          subject: `[URGENT] Anti-Ragging Case Filed — ${caseNumber}`,
          body: [
            `A new anti-ragging/harassment case has been filed.`,
            ``,
            `Case Number: ${caseNumber}`,
            `Category:    ${category}`,
            `Severity:    ${severity}`,
            `Anonymous:   ${isAnonymous}`,
            ``,
            `Check admin console immediately.`,
            ``,
            `— Campus Governance System`,
          ].join("\n"),
        });
      }
    }
  } catch (err) {
    console.error("[anti-ragging] Failed to send email alert:", err);
  }

  await addAudit({
    action: "ANTI_RAGGING_CASE_FILED",
    userId: null as any,
    role: "system" as Role,
    details: { caseNumber, category, severity, isAnonymous },
  });

  return ok({ caseNumber, filed: true });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 5 });
