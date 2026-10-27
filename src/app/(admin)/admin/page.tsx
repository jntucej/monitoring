export const dynamic = "force-dynamic";
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin dashboard root page — now a redirect to /admin/overview.
 *
 * Historically this page was `return null` with the manifest pointing
 * "Campus Dashboard" at `/admin`. The actual dashboard content lives at
 * `/admin/overview`. Rather than duplicating it, the root path simply
 * forwards the user there.
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/overview");
  }, [router]);
  return null;
}
