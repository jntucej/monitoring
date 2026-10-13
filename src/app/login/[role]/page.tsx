import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitor",
  description: "Login to the Gate Monitoring System",
};

/**
 * /login/[role]?redirect=/foo → /login?role=<role>&redirect=/foo
 * Preserves role + redirect so LoginForm's post-auth redirect override works.
 */
export default function RoleLoginRedirect({
  params,
  searchParams,
}: {
  params: { role: string };
  searchParams: { redirect?: string };
}) {
  const r = searchParams?.redirect;
  const qs = r ? `?role=${params.role}&redirect=${encodeURIComponent(r)}` : `?role=${params.role}`;
  redirect(`/login${qs}`);
}
