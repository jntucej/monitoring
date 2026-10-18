"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, User, Mail, Phone, Building2, Home, Clock,
  ShieldCheck, GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { getAuthHeaders } from "@/lib/utils";
import Link from "next/link";

interface HistoryItem {
  direction?: string;
  gate?: string;
  timestamp?: string;
  status?: string;
  note?: string;
}

/**
 * /admin/students/[id] — full student drill-down. Pulls the live
 * /api/persons/[uniqueId] record + /api/persons/[uniqueId]/history movement log
 * and surfaces flags, guardian link, and campus state. The list page's row
 * click now lands here instead of a floating drawer.
 */
export default function AdminStudentDetailPage() {
  return (
    
      <AdminStudentDetail />
    
    

  );
}

function AdminStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const headers = getAuthHeaders();
    setLoading(true);
    Promise.all([
      fetch(`/api/persons/${encodeURIComponent(id)}`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/persons/${encodeURIComponent(id)}/history?limit=20`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
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
        title="Student Profile"
        subtitle="Full record, movement history, flags, and guardian link"
        breadcrumb={[
          { label: "Students", href: "/admin/students" },
          { label: person?.fullName ?? id ?? "Detail", href: "/admin/students" },
        ]}
      />

      {!loading && !person ? (
        <WidgetBoundary title="Not found">
          <EmptyState
            title="Record not found"
            description={`No student matched the id "${id}". The roster may have changed since this link was opened.`}
          />
        </WidgetBoundary>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity card */}
          <div className="lg:col-span-1">
            <SectionCard title="Identity" showHeader={false}>
              <div className="text-center space-y-3">
                <div className="w-24 h-24 mx-auto rounded-full bg-[var(--action-primary)]/10 flex items-center justify-center text-3xl font-black text-[var(--action-primary)] ring-2 ring-[var(--action-primary)]/25">
                  {(person?.fullName ?? person?.name ?? "S")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase())
                    .join("")}
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {person?.fullName ?? person?.name ?? "Student"}
                  </p>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{id}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    (person?.status ?? "ACTIVE").startsWith("ACTIVE")
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {person?.status ?? "UNKNOWN"}
                </span>
              </div>
            </SectionCard>
          </div>

          {/* Detail grid */}
          <div className="lg:col-span-2 space-y-4">
            <SectionCard title="Profile details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fact label="Email" value={person?.email} icon={Mail} />
                <Fact label="Phone" value={person?.phone} icon={Phone} />
                <Fact label="Department" value={person?.department ?? person?.departmentId} icon={Building2} />
                <Fact label="Course / Year" value={person?.course ? `${person.course} · Y${person.year ?? ""}` : undefined} icon={GraduationCap} />
                <Fact label="Hostel" value={person?.hostelBlock ? `${person.hostelBlock} · ${person.roomNumber ?? "—"}` : undefined} icon={Home} />
                <Fact label="Guardian" value={person?.guardianId ? "Linked" : "Not linked"} icon={User} />
              </div>
            </SectionCard>

            {/* Movement history */}
            <SectionCard title="Movement history" description="Recent in/out scans">
              {history.length === 0 ? (
                <EmptyState title="No recent movement" description="No in/out scans recorded yet for this student." />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          h.direction === "IN" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      <span className="font-mono text-[var(--text-primary)]">
                        {h.direction === "IN" ? "IN" : h.direction === "OUT" ? "OUT" : h.direction}
                      </span>
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
                href="/admin/students"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to roster
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({
  label, value, icon: Icon,
}: { label: string; value?: string | null; icon: typeof User }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5">{value || "—"}</p>
    </div>
  );
}
