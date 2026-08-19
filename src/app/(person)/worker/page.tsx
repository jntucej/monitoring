"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { PersonIdCard } from "@/components/person/PersonIdCard";
import { WorkerStats } from "@/components/person/WorkerStats";
import { AccessRestrictions } from "@/components/person/AccessRestrictions";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { Person } from "@/lib/types";
import { HardHat, History, RefreshCw, Clock } from "lucide-react";

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mock worker profile if not logged in or fetching
  const defaultWorker: Person = {
    id: "wrk-001-uuid",
    uniqueId: "WRK-001",
    fullName: "Rajesh Kumar",
    personType: "worker",
    department: "Maintenance",
    designation: "Senior Electrician",
    email: "rajesh.k@campus.edu",
    phone: "+91 98765 43210",
    photoUrl: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&auto=format&fit=crop&q=80",
    qrCode: "WRK-001",
    status: "active",
  };

  useEffect(() => {
    async function loadPersonData() {
      if (user?.uniqueId) {
        try {
          const res = await fetch(`/api/persons/${user.uniqueId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              setPerson(data.data);
            } else {
              setPerson(defaultWorker);
            }
          } else {
            setPerson(defaultWorker);
          }
        } catch {
          setPerson(defaultWorker);
        }
      } else {
        setPerson(defaultWorker);
      }
      setLoading(false);
    }

    loadPersonData();
  }, [user]);

  const activeWorker = person || defaultWorker;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-slate-800 to-zinc-900 border border-gray-700/50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gray-700/50 border border-gray-600/50 text-gray-300">
            <HardHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Worker Portal & Gate Pass
              </h1>
              <PersonBadge type="worker" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Time-restricted campus entry identity & shift management
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-600/50 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Access Restriction Banner */}
      <AccessRestrictions personType="worker" />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Digital Worker ID Card */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <HardHat className="w-4 h-4 text-gray-400" />
            Digital Worker Identity
          </h2>
          <PersonIdCard person={activeWorker} />
        </div>

        {/* Worker Stats */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Shift Metrics & Log
          </h2>
          <WorkerStats loading={loading} />
        </div>
      </div>

      {/* Entry / Exit Activity History */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          Recent Gate Activity History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="pb-3 px-2">Date & Time</th>
                <th className="pb-3 px-2">Gate</th>
                <th className="pb-3 px-2">Direction</th>
                <th className="pb-3 px-2">Access Rule Check</th>
                <th className="pb-3 px-2">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              <tr className="hover:bg-[var(--background)]/50 transition">
                <td className="py-3 px-2 font-mono font-medium text-[var(--text-primary)]">
                  Today, 05:45 AM
                </td>
                <td className="py-3 px-2 font-semibold">Gate 1 (Main Entrance)</td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    IN
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                    ✓ Allowed (Shift Window)
                  </span>
                </td>
                <td className="py-3 px-2 text-[var(--text-muted)]">Gate Operator A</td>
              </tr>
              <tr className="hover:bg-[var(--background)]/50 transition">
                <td className="py-3 px-2 font-mono font-medium text-[var(--text-primary)]">
                  Yesterday, 02:05 PM
                </td>
                <td className="py-3 px-2 font-semibold">Gate 1 (Main Entrance)</td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    OUT
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                    ✓ Allowed (Shift End)
                  </span>
                </td>
                <td className="py-3 px-2 text-[var(--text-muted)]">Gate Operator B</td>
              </tr>
              <tr className="hover:bg-[var(--background)]/50 transition">
                <td className="py-3 px-2 font-mono font-medium text-[var(--text-primary)]">
                  Yesterday, 05:50 AM
                </td>
                <td className="py-3 px-2 font-semibold">Gate 1 (Main Entrance)</td>
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    IN
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                    ✓ Allowed (Shift Window)
                  </span>
                </td>
                <td className="py-3 px-2 text-[var(--text-muted)]">Gate Operator A</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
