"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {ArrowLeft, User, Phone, Building2, Clock, Briefcase, BookOpen}  from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { getAuthHeaders } from "@/lib/utils";

interface FacultyHistoryItem {
  direction?: string;
  gate?: string;
  timestamp?: string;
}
interface FacultyAssignment {
  id: string;
  facultyId: string;
  classId: string;
  subjectCode: string;
  role: string;
  isActive: boolean;
}

/**
 * /admin/faculty/[id] — full faculty drill-down: class assignments and
 * attendance heatmap data. Pulls /api/persons/[uniqueId] +
 * /api/faculty-assignments (filtered to this faculty) + history.
 */
export default function AdminFacultyDetailPage() {
  return (
    
      <AdminFacultyDetail />
    
    

  );
}

function AdminFacultyDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<any | null>(null);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [history, setHistory] = useState<FacultyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const headers = getAuthHeaders();
    setLoading(true);
    Promise.all([
      fetch(`/api/persons/${encodeURIComponent(id)}`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/faculty-assignments", { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/persons/${encodeURIComponent(id)}/history?limit=20`, { headers, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([rec, fa, hist]) => {
      if (!alive) return;
      setRecord(rec?.data ?? rec);
      const all: FacultyAssignment[] = fa?.data ?? fa ?? [];
      setAssignments(all.filter((a) => a.facultyId === id));
      setHistory(hist?.data?.history ?? hist?.data ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  const person: any = record?.person ?? record;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Faculty Profile"
        subtitle="Class assignments and attendance summary"
        breadcrumb={[
          { label: "Faculty", href: "/admin/faculty" },
          { label: person?.fullName ?? id ?? "Detail", href: "/admin/faculty" },
        ]}
      />

      {!loading && !person ? (
        <WidgetBoundary title="Not found">
          <EmptyState
            title="Record not found"
            description={`No faculty member matched the id "${id}".`}
          />
        </WidgetBoundary>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SectionCard title="Identity" showHeader={false}>
              <div className="text-center space-y-3">
                <div className="w-4 h-4 mx-auto rounded-full bg-action-primary/10 flex items-center justify-center text-3xl font-black text-action-primary ring-2 ring-action-primary/25">
                  {(person?.fullName ?? person?.name ?? "F")
                    .split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("")}
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {person?.fullName ?? person?.name ?? "Faculty"}
                  </p>
                  <p className="font-mono text-xs text-text-muted">{id}</p>
                </div>
                <span className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-action-success">
                  <User className="w-3.5 h-3.5" /> {person?.role ?? "FACULTY"}
                </span>
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <SectionCard title="Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Fact label="Designation" value={person?.employeeDetails?.designation} icon={Briefcase} />
                <Fact label="Employee ID" value={person?.employeeDetails?.employee_id ?? person?.uniqueId} icon={User} />
                <Fact label="Department" value={person?.employeeDetails?.department_id} icon={Building2} />
                <Fact label="Phone" value={person?.phone} icon={Phone} />
              </div>
            </SectionCard>

            <SectionCard
              title="Class assignments"
              description="Active faculty↔class↔subject links"
            >
              {assignments.length === 0 ? (
                <EmptyState title="No assignments" description="No classes assigned to this faculty member." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="surface-card flex items-center gap-3 bg-bg-elevated/40 p-3"
                    >
                      <div className="surface-card p-2 bg-action-primary/10 text-action-primary">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-2 flex-1">
                        <p className="text-sm font-medium text-text-primary">{a.subjectCode}</p>
                        <p className="text-xs text-text-muted capitalize">{a.role.replace("_", " ")} · class {a.classId.slice(0, 8)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${a.isActive ? "bg-emerald-500/10 text-action-success" : "bg-rose-500/10 text-action-danger"}`}>
                        {a.isActive ? "Active" : "Off"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Movement history" description="Recent in/out scans">
              {history.length === 0 ? (
                <EmptyState title="No recent movement" description="No in/out scans recorded yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${h.direction === "IN" ? "bg-action-success" : "bg-action-danger"}`} />
                      <span className="font-mono text-text-primary">{h.direction}</span>
                      <span className="text-text-muted">{h.gate ?? "—"}</span>
                      <span className="ml-auto text-xs text-text-muted flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <div className="flex">
              <Link
                href="/admin/faculty"
                className="surface-card inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to faculty directory
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
      <p className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm text-text-primary mt-0.5">{value || "—"}</p>
    </div>
  );
}
