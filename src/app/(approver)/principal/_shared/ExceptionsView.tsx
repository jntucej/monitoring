"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildPersonInspection,
  type PersonRecord,
  type RoleGate,
} from "./entityInspectionModels";

interface AcademicsResponse {
  success?: boolean;
  data: {
    exceptions: {
      absent: Array<{
        id: string;
        name: string;
        role: string;
        designation: string | null;
        department: string | null;
      }>;
      late: Array<{
        id: string;
        name: string;
        role: string;
        designation: string | null;
        department: string | null;
        minutesLate: number;
      }>;
      flagged: Array<{
        id: string;
        name: string;
        department: string | null;
        reason: string;
      }>;
    };
  };
}

function toPersonRecord(id: string, name: string, role: string, designation: string | null, department: string | null): PersonRecord {
  return {
    id,
    uniqueId: id,
    name,
    role,
    designation: designation ?? undefined,
    department: department ?? undefined,
    status: "ACTIVE",
  };
}

export function ExceptionsView() {
  const { data, loading } = useApiResource<AcademicsResponse>("/api/vp/academics", {
    ttlMs: 60_000,
  });

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [inspection, setInspection] = useState<
    ReturnType<typeof buildPersonInspection> | null
  >(null);
  const inspect = (rec: PersonRecord) => setInspection(buildPersonInspection(rec, gate));

  const d = data?.data;
  const absent = d?.exceptions?.absent ?? [];
  const late = d?.exceptions?.late ?? [];
  const flagged = d?.exceptions?.flagged ?? [];
  const total = absent.length + late.length + flagged.length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Attendance exceptions</h1>
        <p className="text-xs text-text-muted">
          {total} exception{total === 1 ? "" : "s"} today · click any person to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Absent" value={absent.length} tone="danger" />
        <KpiCard label="Late" value={late.length} tone="warn" />
        <KpiCard label="Flagged" value={flagged.length} tone="info" />
      </div>

      {loading && !d ? (
        <ListSkeleton rows={5} />
      ) : total === 0 ? (
        <EmptyState title="No exceptions" description="Everyone checked in on time." />
      ) : (
        <div className="space-y-3">
          {absent.length > 0 && (
            <section className="rounded-2xl border border-border bg-bg-surface">
              <header className="surface-card px-4 py-3">
                <h2 className="text-sm font-semibold">Absent today ({absent.length})</h2>
              </header>
              <ul className="divide-y divide-border">
                {absent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs cursor-pointer hover:bg-bg-elevated transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      inspect(
                        toPersonRecord(p.id, p.name, p.role, p.designation, p.department)
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonRecord(p.id, p.name, p.role, p.designation, p.department));
                    }}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-text-muted">
                      {p.designation ?? p.role}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {late.length > 0 && (
            <section className="rounded-2xl border border-border bg-bg-surface">
              <header className="surface-card px-4 py-3">
                <h2 className="text-sm font-semibold">Late arrivals ({late.length})</h2>
              </header>
              <ul className="divide-y divide-border">
                {late.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs cursor-pointer hover:bg-bg-elevated transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      inspect(
                        toPersonRecord(p.id, p.name, p.role, p.designation, p.department)
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonRecord(p.id, p.name, p.role, p.designation, p.department));
                    }}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-action-warning">{p.minutesLate}m late</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {flagged.length > 0 && (
            <section className="rounded-2xl border border-border bg-bg-surface">
              <header className="surface-card px-4 py-3">
                <h2 className="text-sm font-semibold">Flagged ({flagged.length})</h2>
              </header>
              <ul className="divide-y divide-border">
                {flagged.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs cursor-pointer hover:bg-bg-elevated transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      inspect(toPersonRecord(p.id, p.name, "staff", null, p.department))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonRecord(p.id, p.name, "staff", null, p.department));
                    }}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-action-danger">{p.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <EntityInspector inspection={inspection} onClose={() => setInspection(null)} />
    </div>
  );
}
