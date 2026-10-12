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

  const result = await ingestKbDocument({ title, source, content, roles: roles ?? ["all"] });
  return NextResponse.json({
    success: true,
    documentId: result.documentId,
    chunkCount: result.chunkCount,
    deduped: result.deduped,
  });
}

export const POST = withAuthorization(handler, { requiredRole: ["admin", "sysadmin"] });
