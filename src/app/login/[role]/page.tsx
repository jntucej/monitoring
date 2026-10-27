
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitor",
  description: "Login to the Gate Monitoring System",
};

/**
 * /login/[role]?redirect=/foo → /login?role=<role>&redirect=/foo
 * Preserves role + redirect so LoginForm's post-auth redirect override works.
 *
 * In Next.js 15+ `params` and `searchParams` are async (Promise) in server
 * components, so we await both before building the query string.
 */
export default async function RoleLoginRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { role } = await params;
  const sp = await searchParams;
  const r = sp?.redirect;
  const qs = r ? `?role=${role}&redirect=${encodeURIComponent(r)}` : `?role=${role}`;
  redirect(`/login${qs}`);
}
