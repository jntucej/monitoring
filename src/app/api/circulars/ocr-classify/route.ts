import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import {
  classifyCircularTargets,
  extractCircularFields,
} from "@/lib/circulars/pipeline";

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const rawText = String(b?.raw_text ?? "").trim();
  const titleOverride = b?.title ? String(b.title) : undefined;
  if (!rawText) {
    return fail("INVALID_INPUT", "raw_text (OCR or circular text) is required", 400);
  }

  const fields = extractCircularFields(rawText, titleOverride);
  const targets = await classifyCircularTargets(rawText);

  return ok({
    fields,
    targets,
    raw_ocr_text: rawText,
    attachment_url: b?.attachment_url ? String(b.attachment_url) : null,
  });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});
