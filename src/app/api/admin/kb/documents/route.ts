import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ingestKbDocument } from "@/lib/rag/ingest";

interface KBDocBody {
  title?: string;
  source?: string;
  content?: string;
  roles?: string[];
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => null)) as KBDocBody | null;
  const title = (body?.title ?? "").trim();
  const source = (body?.source ?? "").trim();
  const content = (body?.content ?? "").trim();
  const roles = Array.isArray(body?.roles)
    ? body!.roles.filter((r) => typeof r === "string" && r.length).slice(0, 16)
    : undefined;

  if (!title || !source || !content) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "title, source and content are required" } },
      { status: 400 }
    );
  }
  if (content.length > 500_000) {
    return NextResponse.json(
      { success: false, error: { code: "TOO_LARGE", message: "content exceeds 500KB limit" } },
      { status: 400 }
    );
  }

  try {
    const result = await ingestKbDocument({ title, source, content, roles: roles ?? ["all"] });
    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunkCount: result.chunkCount,
      deduped: result.deduped,
    });
  } catch (err) {
    // Fail-closed: embedTexts now throws when the embedding service is
    // unavailable instead of silently storing placeholder vectors that
    // retrieval can never reach. Surface the specific reason to the admin
    // (the document is already deactivated by the rollback in ingest.ts).
    if ((err as { code?: string }).code === "RAG_EMBEDDING_UNAVAILABLE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMBEDDING_UNAVAILABLE",
            message: `Ingestion failed — embedding service unavailable: ${(err as Error).message}. The document was not stored.`,
          },
        },
        { status: 503 },
      );
    }
    console.error("KB ingestion failed:", err);
    return NextResponse.json(
      { success: false, error: { code: "INGESTION_FAILED", message: "KB ingestion failed." } },
      { status: 500 },
    );
  }
}

export const POST = withAuthorization(handler, { requiredRole: ["admin", "sysadmin"] });
