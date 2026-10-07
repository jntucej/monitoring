import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Gate Monitor",
  description: "Login to the Gate Monitoring System",
};

/**
 * Role-specific login routes are deprecated.
 * All users now share a single unified login form at /login.
 * This redirect preserves backward compatibility for bookmarks/links.
 */
export default function RoleLoginRedirect() {
  redirect("/login");
}
