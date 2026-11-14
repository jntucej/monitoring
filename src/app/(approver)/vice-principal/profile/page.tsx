"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { usePolling } from "@/hooks/usePolling";
import { User, Mail, Phone, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  uniqueId?: string;
  photoUrl?: string;
  departmentId?: string;
  createdAt?: string;
}

function VicePrincipalProfileInner() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success && json.data) setProfile(json.data as ProfileData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0">
      <h1 className="text-xl font-bold text-text-primary">Vice Principal Profile</h1>

      <WidgetBoundary title="Vice Principal Profile">
        <div className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
          {error && <p className="text-xs text-action-danger mb-2">{error}</p>}

          {!profile && !error ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : profile ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center">
                    <User className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {profile.name}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-indigo-500/10 text-action-primary border border-indigo-500/20">
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated border border-border">
                  <Mail className="w-4 h-4 text-text-muted shrink-0" />
                  <div>
                    <div className="text-xs text-text-muted">Email</div>
                    <div className="text-text-primary font-medium">
                      {profile.email}
                    </div>
                  </div>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated border border-border">
                    <Phone className="w-4 h-4 text-text-muted shrink-0" />
                    <div>
                      <div className="text-xs text-text-muted">Phone</div>
                      <div className="text-text-primary font-medium">
                        {profile.phone}
                      </div>
                    </div>
                  </div>
                )}
                {profile.uniqueId && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-elevated border border-border">
                    <Shield className="w-4 h-4 text-text-muted shrink-0" />
                    <div>
                      <div className="text-xs text-text-muted">
                        Unique ID
                      </div>
                      <div className="font-mono text-text-primary">
                        {profile.uniqueId}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted py-4 text-center">
              Profile data unavailable.
            </p>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VicePrincipalProfilePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VicePrincipalProfileInner />
    </Suspense>
  );
}
