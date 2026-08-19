"use client";

import React, { useState, useEffect } from "react";
import { PersonIdCard } from "@/components/person/PersonIdCard";
import { EmployeeStats } from "@/components/person/EmployeeStats";
import { RecentActivity } from "@/components/student/RecentActivity";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { Briefcase, Building, Clock, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function FacultyDashboardPage() {
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadFaculty = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const uniqueId = auth?.user?.uniqueId ?? auth?.user?.roll ?? "FAC-001";
        
        const res = await fetch(`/api/persons/${encodeURIComponent(uniqueId)}`, { cache: "no-store" });
        const json = await res.json();
        
        if (!cancelled && json.success) {
          setPerson(json.data?.person ?? json.data ?? null);
        }
      } catch (err) {
        console.error("Failed to load faculty details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFaculty();
    return () => {
      cancelled = true;
    };
  }, []);

  const isHod = person?.employeeDetails?.is_hod || person?.designation?.toLowerCase().includes("head") || person?.designation?.toLowerCase().includes("hod");

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Faculty Portal
            </h1>
            <PersonBadge type="faculty" />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Welcome back, {person?.fullName || "Professor"}. View your digital identity card and campus attendance history.
          </p>
        </div>

        {isHod && (
          <Link
            href="/hod"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-sm shrink-0"
          >
            <Building className="w-4 h-4" />
            HOD Department Console
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Main Grid: Digital ID & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Digital Faculty Identity Card</h2>
          <PersonIdCard person={person} type="faculty" />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Attendance Insights</h2>
            <EmployeeStats loading={loading} />
          </div>

          {/* Department Card */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Briefcase className="w-4 h-4" />
              Academic Assignment
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {person?.department || "Computer Science & Engineering"}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Designation: <span className="text-[var(--text-primary)] font-medium">{person?.designation || "Senior Assistant Professor"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Entrance & Departure History</h2>
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
