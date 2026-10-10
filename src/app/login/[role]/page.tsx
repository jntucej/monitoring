import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitor",
  description: "Login to the Gate Monitoring System",
};

export default function RoleLoginRedirect({ searchParams }: { searchParams: { redirect?: string } }) {
  const r = searchParams?.redirect;
  redirect(r ? `/login?redirect=${encodeURIComponent(r)}` : "/login");
}
