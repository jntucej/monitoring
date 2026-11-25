import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { requireEnabled, KillSwitchDisabledError } from "@/lib/kill-switch";
import type { AuthContext } from "@/lib/authContext";
import { ROLES, type Role } from "@/lib/roles";
import {
  createAiRuntime,
  type AiRuntime,
} from "@model-runtime";
import type { DocumentExtraction } from "@model-runtime/schemas/doc";

// The AI runtime is a process-level singleton: one ModelManager, one backend.
// Ollama is a host daemon (M1/M3) and the OCR sidecar is per-burst (M2), so
// this holds no resident model memory when idle.
let _runtime: AiRuntime | null = null;
function getRuntime(): AiRuntime {
  if (!_runtime) _runtime = createAiRuntime();
  return _runtime;
}

/**
 * POST /api/ai/documents
 * Body: { base64: string; schemaFields?: string[]; metadata?: Record<string,unknown> }
 *   - base64: the PDF file contents
 *   - schemaFields: optional list of extra fields to extract
 *   - metadata: optional source/type hints
 *
 * Runs M2 (OCR, only if the PDF is scanned) then M3 (document intelligence).
 * M2 and M3 are serialized by the model manager so they never co-resident in RAM.
 */
async function handler(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  // Reuse the existing kill-switch pattern: one SQL flip disables the whole
  // AI layer with no deploy.
  try {
    await requireEnabled("ai_models_enabled");
  } catch (e) {
    if (e instanceof KillSwitchDisabledError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "AI_DISABLED", message: "The AI model layer is disabled by the operator." },
        },
        { status: 503 },
      );
    }
    throw e;
  }

  const body = (await req.json().catch(() => null)) as {
    base64?: string;
    schemaFields?: string[];
    metadata?: Record<string, unknown>;
  } | null;

  if (!body?.base64 || typeof body.base64 !== "string") {
    return NextResponse.json(err("BAD_REQUEST", "base64_pdf_required").body, { status: 400 });
  }
  if (body.base64.length > 25 * 1024 * 1024) {
    return NextResponse.json(
      err("BAD_REQUEST", "pdf_too_large (max 25 MB base64)").body,
      { status: 400 },
    );
  }

  const pdf = Buffer.from(body.base64, "base64");
  if (pdf.length === 0 || pdf.subarray(0, 4).toString("latin1") !== "%PDF") {
    return NextResponse.json(err("BAD_REQUEST", "not_a_pdf").body, { status: 400 });
  }

  try {
    const runtime = getRuntime();
    const result = await runtime.runDocumentPipeline({
      pdf,
      metadata: body.metadata ?? { uploadedBy: auth.userId, role: auth.role },
      schemaFields: body.schemaFields ?? [],
    });
    return NextResponse.json({
      success: true,
      data: {
        doc: result.doc as DocumentExtraction,
        usedOcr: result.usedOcr,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fail closed: an AI runtime error is a 502, not a silent success.
    return NextResponse.json(
      { success: false, error: { code: "AI_PIPELINE_FAILED", message: msg } },
      { status: 502 },
    );
  }
}

export const POST = withAuthorization(handler, {
  requiredRole: [
    ROLES.STUDENT,
    ROLES.FACULTY,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
    ROLES.PRINCIPAL,
  ] as Role[],
});
