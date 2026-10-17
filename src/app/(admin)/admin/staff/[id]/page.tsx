"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, Building2, Clock, Briefcase,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { getAuthHeaders } from "@/lib/utils";

interface StaffHistoryItem {
  direction?: string;
  gate?: string;
  timestamp?: string;
}

/**
 * /admin/staff/[id] — full staff drill-down: duty roster, leave history,
 * contact info. Pulls /api/persons/[uniqueId] + /api/persons/[uniqueId]/history.
 */
export default function AdminStaffDetailPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminStaffDetail />
    </AuthGuard>
  );
}

function AdminStaffDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<StaffHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const headers = getAuthHeaders();
    setLoading(true);
    Promise.all([
      fetch(`/api/persons/${encodeURIComponent(id)}`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/persons/${encodeURIComponent(id)}/history?limit=20`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([rec, hist]) => {
      if (!alive) return;
      setRecord(rec?.data ?? rec);
      setHistory(hist?.data?.history ?? hist?.data ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  const person: any = record?.person ?? record;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Staff Profile"
        subtitle="Duty roster, leave history, and contact info"
        breadcrumb={[
          { label: "Staff", href: "/admin/staff" },
          { label: person?.fullName ?? id ?? "Detail", href: "/admin/staff" },
        ]}
      />

      {!loading && !person ? (
        <WidgetBoundary title="Not found">
          <EmptyState
            title="Record not found"
            description={`No staff member matched the id "${id}".`}
          />
        </WidgetBoundary>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SectionCard title="Identity" showHeader={false}>
              <div className="text-center space-y-3">
                <div className="w-24 h-24 mx-auto rounded-full bg-[var(--action-primary)]/10 flex items-center justify-center text-3xl font-black text-[var(--action-primary)] ring-2 ring-[var(--action-primary)]/25">
                  {(person?.fullName ?? person?.name ?? "S")
                    .split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("")}
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {person?.fullName ?? person?.name ?? "Staff"}
                  </p>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{id}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <User className="w-3.5 h-3.5" /> {person?.role ?? "STAFF"}
                </span>
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <SectionCard title="Contact & assignment">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fact label="Designation" value={person?.employeeDetails?.designation} icon={Briefcase} />
                <Fact label="Employee ID" value={person?.employeeDetails?.employee_id ?? person?.uniqueId} icon={User} />
                <Fact label="Department" value={person?.employeeDetails?.department_id} icon={Building2} />
                <Fact label="Phone" value={person?.phone} icon={Phone} />
                <Fact label="Email" value={person?.email} icon={Mail} />
                <Fact label="Status" value={person?.status} icon={Clock} />
              </div>
            </SectionCard>

            <SectionCard title="Movement history" description="Recent in/out scans">
              {history.length === 0 ? (
                <EmptyState title="No recent movement" description="No in/out scans recorded yet." />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${h.direction === "IN" ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <span className="font-mono text-[var(--text-primary)]">{h.direction}</span>
                      <span className="text-[var(--text-muted)]">{h.gate ?? "—"}</span>
                      <span className="ml-auto text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <div className="flex">
              <Link
                href="/admin/staff"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to staff directory
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, icon: Icon }: { label: string; value?: string | null; icon: typeof User }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5">{value || "—"}</p>
    </div>
  );
}
