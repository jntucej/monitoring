import { redirect } from "next/navigation";

/**
 * Admin dashboard root page — server-redirects to /admin/overview.
 *
 * Historically this was a client-side `router.replace` in a `"use client"`
 * page that returned null, which flashed a blank page and broke when JS
 * was slow or disabled. `redirect()` from next/navigation is a server
 * 307 that sends the Location header before the page body, so the
 * browser lands on /admin/overview with no intermediate render.
 */
export default function AdminDashboardPage() {
  redirect("/admin/overview");
}
