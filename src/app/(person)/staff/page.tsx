"use client";

import React, { useState, useEffect } from "react";
import { PersonIdCard } from "@/components/person/PersonIdCard";
import { EmployeeStats } from "@/components/person/EmployeeStats";
import { RecentActivity } from "@/components/student/RecentActivity";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { UserCheck, Clock, Shield } from "lucide-react";
import type { Person } from "@/lib/types";

export default function StaffDashboardPage() {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadStaff = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const uniqueId = auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.user?.uniqueId ?? auth?.user?.roll;
        if (!uniqueId) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        
        const res = await fetch(`/api/persons/${encodeURIComponent(uniqueId)}`, { cache: "no-store" });
        const json = await res.json();
        
        if (!cancelled && json.success) {
          setPerson(json.data?.person ?? json.data ?? null);
        }
      } catch (err) {
        console.error("Failed to load staff details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Staff Portal
            </h1>
            <PersonBadge type="staff" />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Welcome back, {person?.fullName || "Staff Member"}. Track your daily campus access & digital staff ID pass.
          </p>
        </div>
      </div>

      {/* Main Grid: Digital ID & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Digital Staff Identity Pass</h2>
          <PersonIdCard person={person} type="staff" />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Shift & Access Metrics</h2>
            <EmployeeStats loading={loading} />
          </div>

          {/* Staff Shift Card */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <UserCheck className="w-4 h-4" />
              Administrative Assignment
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {person?.department || "Campus Operations & Administration"}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Designation: <span className="text-[var(--text-primary)] font-medium">{person?.designation || "Administrative Officer"}</span>
            </p>
            <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center justify-between">
              <span>Work Shift:</span>
              <span className="font-semibold text-[var(--text-primary)]">09:00 AM - 05:30 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Staff Entry & Exit Logs</h2>
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
