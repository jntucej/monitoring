import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { ingestPdfAnnouncement } from "@/lib/student/feed";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const title = String(b?.title ?? "").trim();
  const text = String(b?.text ?? "").trim();
  const pdfUrl = String(b?.pdf_url ?? "").trim();
  if (!title || !pdfUrl) {
    return fail("INVALID_INPUT", "title and pdf_url are required", 400);
  }

  const draft = await ingestPdfAnnouncement({
    title,
    text,
    pdfUrl,
    postedBy: auth.userId,
    postedByRole: auth.role,
    kind: b?.kind,
  });
  return ok(draft, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "principal", "hod", "dean", "sysadmin"],
});
