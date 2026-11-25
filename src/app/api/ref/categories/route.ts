import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { errMsg } from "@/lib/err-msg";
import { withAuthorization } from "@/middleware/authorization";
import { getRefCategories } from "@/lib/gate/blueprints";

/**
 * GET /api/ref/categories?domains=visitor_category,id_document_type
 *   → { domains: { visitor_category: RefCategory[], ... } }
 *
 * Powers the `premade` dropdowns in the operator form. Without ?domains,
 * returns every active domain (bounded to a sane cap for the sysadmin view).
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const domainsParam = sp.get("domains");
  const domains = domainsParam
    ? domainsParam.split(",").map((d) => d.trim()).filter(Boolean).slice(0, 30)
    : null;

  try {
    // If no domains given, fetch all active domains (for the taxonomy admin view).
    let result;
    if (domains && domains.length > 0) {
      result = await getRefCategories(domains);
    } else {
      const all = await import("@/lib/postgres").then((m) =>
        m.query<{ domain: string }>(
          `SELECT DISTINCT domain FROM public.ref_categories WHERE active ORDER BY domain`
        )
      );
      const allDomains = all.rows.map((r) => r.domain);
      result = await getRefCategories(allDomains);
    }
    return NextResponse.json({ domains: result });
  } catch (e) {
    return NextResponse.json({ success: false, error: errMsg(e) }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, {
  requiredRole: [
    "operator",
    "supervisor",
    "deputy_warden",
    "exam_superintendent",
    "oie",
    "admin",
    "sysadmin",
  ],
});
