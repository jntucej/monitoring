import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import {
  classifyCircularTargets,
  extractCircularFields,
} from "@/lib/circulars/pipeline";
import { buildPreAnnouncementConfig } from "@/lib/agent/knowledgeMatcher";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";
import { createAiRuntime } from "../../../../../model-runtime";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  let rawText = String(b?.raw_text ?? "").trim();
  const base64 = b?.base64 ? String(b.base64).trim() : "";
  const titleOverride = b?.title ? String(b.title) : undefined;

  if (!rawText && !base64) {
    return fail("INVALID_INPUT", "Either base64 (PDF/image) or raw_text is required", 400);
  }

  let aiExtraction: Record<string, unknown> | null = null;
  if (base64) {
    try {
      const runtime = createAiRuntime();
      const res = await runtime.runDocumentPipeline({
        pdf: Buffer.from(base64, "base64"),
        schemaFields: ["circular_no", "issued_by", "effective_date", "deadline", "target_audience", "summary"],
        metadata: { kind: "circular" },
      });
      const doc = res.doc;
      aiExtraction = doc as unknown as Record<string, unknown>;
      const extraText = [
        doc.document_number,
        doc.issuer,
        doc.recipient,
        doc.valid_until,
        JSON.stringify(doc.extra ?? {}),
      ]
        .filter(Boolean)
        .join("\n");
      if (!rawText) rawText = extraText || "Uploaded circular document";
    } catch {
      if (!rawText) rawText = titleOverride || "Uploaded circular document";
    }
  }

  const fields = extractCircularFields(rawText, titleOverride);
  if (aiExtraction) {
    if (typeof aiExtraction.document_number === "string" && !fields.circular_no) {
      fields.circular_no = aiExtraction.document_number;
    }
    if (typeof aiExtraction.issuer === "string" && !fields.issued_by) {
      fields.issued_by = aiExtraction.issuer;
    }
    if (typeof aiExtraction.valid_until === "string" && !fields.deadline) {
      fields.deadline = aiExtraction.valid_until.slice(0, 10);
    }
  }

  const targets = await classifyCircularTargets(rawText);

  const { rows: suggestedGroups } = await query<{ slug: string; name: string; group_type: string; class_id: string | null }>(
    `SELECT g.slug, g.name, g.group_type, g.class_id
       FROM public.chat_groups g
       JOIN public.chat_group_members m ON m.group_id = g.id
      WHERE m.user_id = $1::uuid
        AND g.is_archived = FALSE
      ORDER BY g.updated_at DESC
      LIMIT 10`,
    [auth.userId],
  ).catch(() => ({ rows: [] }));

  const primarySlug =
    (typeof b?.target_group_slug === "string" && b.target_group_slug.trim()) ||
    suggestedGroups[0]?.slug ||
    "";

  const preAnnouncement = buildPreAnnouncementConfig(auth, {
    class_id: typeof b?.class_id === "string" ? b.class_id : suggestedGroups[0]?.class_id ?? null,
    subject_code: typeof b?.subject_code === "string" ? b.subject_code : null,
    target_group_slug: primarySlug,
    also_applies_to: suggestedGroups.slice(1, 4).map((g) => g.slug),
    summary: fields.summary || fields.title || rawText.slice(0, 280),
    require_noted: true,
    deadline: fields.deadline ?? null,
  });

  return ok({
    fields,
    targets,
    ai_extraction: aiExtraction,
    raw_ocr_text: rawText,
    attachment_url: b?.attachment_url ? String(b.attachment_url) : null,
    suggested_groups: sanitizeAgentPayload(suggestedGroups, auth.role),
    pre_announcement: preAnnouncement,
  });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});
