"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";
import type { AreaId } from "@/lib/org-map-adapters";

export interface ScopedHierarchyPageProps {
  allowedRoles: string[];
  roleLabel: string;
  homeHref: string;
  area: AreaId;
  enforceVpPrivacy?: boolean;
  purpose?: string;
}

export function ScopedHierarchyPage({
  allowedRoles,
  roleLabel,
  homeHref,
  area,
  enforceVpPrivacy = false,
  purpose,
}: ScopedHierarchyPageProps) {
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4 min-w-0">
        <ContextSituationBar
          roleLabel={roleLabel}
          purpose={
            purpose ??
            `Inspect the live ${area} hierarchy, active personnel, and downstream units under your ${roleLabel} scope.`
          }
          contextLabel={`${roleLabel} · Scoped Hierarchy`}
          statusTone="info"
          statusSummary="Showing only units and roles within your authorized hierarchy."
          primaryAction={{ label: "Back to Console", href: homeHref }}
        />
        <SpatialPeopleMapWorkspace
          defaultArea={area}
          lockedArea
          enforceVpPrivacy={enforceVpPrivacy}
          compact
        />
      </div>
    </AuthGuard>
  );
}
