"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { User, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "./KpiCard";
import { WeekBar } from "./WeekBar";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  photoUrl?: string;
  department?: string;
}

export function ProfileView() {
  const { data, loading } = useApiResource<{ success: boolean; data: ProfileData }>("/api/profile", {
    ttlMs: 60_000,
  });

  const profile = data?.data;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Supervisor Profile</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Account details and shift supervisor information
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Account Status" value="Active" tone="ok" />
        <KpiCard label="Authority Tier" value="Shift Supervisor" tone="ok" />
        <KpiCard label="Security" value="MFA Enabled" tone="ok" />
      </div>

      {loading && !profile ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : profile ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
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
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {profile.name}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {profile.role?.replace(/_/g, " ") ?? "SUPERVISOR"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Email</div>
                <div className="text-[var(--text-primary)] font-medium">
                  {profile.email}
                </div>
              </div>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                <Phone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <div>
                  <div className="text-[10px] text-[var(--text-muted)]">Phone</div>
                  <div className="text-[var(--text-primary)] font-medium">
                    {profile.phone}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
