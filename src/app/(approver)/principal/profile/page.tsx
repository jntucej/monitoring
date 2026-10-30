"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { User, Mail, Phone, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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

function ProfilePageInner() {
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
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Profile</h1>

      <PrincipalWidgetBoundary title="Principal Profile">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

          {!profile && !error ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                    <User className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{profile.name}</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)]">Email</div>
                    <div className="text-[var(--text-primary)] font-medium">{profile.email}</div>
                  </div>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <Phone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Phone</div>
                      <div className="text-[var(--text-primary)] font-medium">{profile.phone}</div>
                    </div>
                  </div>
                )}
                {profile.uniqueId && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <Shield className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Unique ID</div>
                      <div className="font-mono text-[var(--text-primary)]">{profile.uniqueId}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation links */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href="/principal/profile/password"
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Change Password
                </Link>
                <Link
                  href="/principal/profile/notifications"
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Notification Preferences
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Profile data unavailable.</p>
          )}
        </div>
      </PrincipalWidgetBoundary>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <ProfilePageInner />
    </Suspense>
  );
}
