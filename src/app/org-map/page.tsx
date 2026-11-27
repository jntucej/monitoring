"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";

export default function OrgMapPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<PageLoading />}>
        <SpatialPeopleMapWorkspace defaultArea="institutional" />
      </Suspense>
    </AuthGuard>
  );
}
