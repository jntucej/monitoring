"use client";
// src/app/(sysadmin)/sysadmin/promotions/page.tsx
// PROMOTIONS sysadmin page (kind: kanban, pollMs 30000).
//
// Wrapper: the sysadmin layout already enforces withAuthorization
// (requiredRole ['sysadmin','admin']) + withRateLimit. This client page pulls
// the aggregated dashboard payload via useDashboardData from
// /api/admin/promotions/overview, and renders the PENDING/APPROVED/REJECTED
// kanban with per-column mini donuts, per-card SLA arcs, and the
// from-role → to-role Sankey.
//
// "use client" tsx; cn from @/lib/utils; viz from kit/viz; minis from
// kit/sidebar; query from @/lib/postgres on the server (NOT Supabase).

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PromotionRequests } from "@/components/sysadmin/PromotionRequests";
=======
import { useDashboardData } from "@/hooks/useDashboardData";
import { PromotionsContent } from "@/components/sysadmin/domains/identity/PromotionsContent";
import type { PromotionsData } from "@/components/sysadmin/domains/identity/types";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

export default function PromotionsPage() {
  const { data, loading, error } = useDashboardData<PromotionsData>(
    "/api/admin/promotions/overview",
    { ttlMs: 90_000, pollMs: 30_000 },
  );

  return <PromotionsContent data={data} loading={loading} error={error} />;
}
