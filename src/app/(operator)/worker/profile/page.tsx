"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { useApiResource } from "@/hooks/useApiResource";
import { RoleProfileSettingsPanel } from "@/components/nav/RoleProfileSettingsPanel";
import { RoleLogoutButton } from "@/components/shared/RoleLogoutButton";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  uniqueId?: string;
}

export default function WorkerProfilePage() {
  const { data, loading, error, refresh } = useApiResource<{ success?: boolean; data?: ProfileData } & Partial<ProfileData>>(
    "/api/profile",
    { ttlMs: 60_000 },
  );
  const profile: ProfileData | undefined = data?.data ?? (data?.id ? (data as ProfileData) : undefined);

  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <AuthGuard allowedRoles={["worker"]}>
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <h1 className="text-xl font-bold text-foreground">Worker Profile</h1>

          {loading && !profile ? (
            <div className="text-sm text-foreground">Loading profile...</div>
          ) : error && !profile ? (
            <div className="flex items-center justify-between text-sm text-destructive">
              <span>Failed to load profile: {error}</span>
              <button type="button" onClick={() => void refresh()} className="underline">
                Retry
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-2 border-b border-border pb-4 text-sm text-foreground">
              <div className="text-lg font-semibold">{profile.name}</div>
              <div className="text-xs text-muted-foreground">
                {profile.uniqueId ?? "WORKER"} • {profile.email}
                {profile.phone ? ` • ${profile.phone}` : ""}
              </div>
            </div>
          ) : null}

          <RoleProfileSettingsPanel role="worker" />
          <div className="flex justify-end">
            <RoleLogoutButton />
          </div>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
