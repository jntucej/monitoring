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
  buildPersonExceptionInspection,
  type PersonExceptionRecord,
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

function toPersonException(
  id: string, name: string, role: string, designation: string | null,
  department: string | null, kind: "absent" | "late" | "flagged", detail?: number | string,
): PersonExceptionRecord {
  return { id, name, role, designation, department, exceptionKind: kind, detail };
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
    ReturnType<typeof buildPersonExceptionInspection> | null
  >(null);
  const inspect = (rec: PersonExceptionRecord) =>
    setInspection(buildPersonExceptionInspection(rec, gate));

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
        <KpiCard
          label="Absent"
          value={absent.length}
          tone="danger"
          onClick={() => {
            if (absent.length) inspect(toPersonException(absent[0].id, absent[0].name, absent[0].role, absent[0].designation ?? null, absent[0].department ?? null, "absent"));
          }}
        />
        <KpiCard
          label="Late"
          value={late.length}
          tone="warn"
          onClick={() => {
            if (late.length) inspect(toPersonException(late[0].id, late[0].name, late[0].role, late[0].designation ?? null, late[0].department ?? null, "late", late[0].minutesLate));
          }}
        />
        <KpiCard
          label="Flagged"
          value={flagged.length}
          tone="info"
          onClick={() => {
            if (flagged.length) inspect(toPersonException(flagged[0].id, flagged[0].name, "", null, flagged[0].department ?? null, "flagged", flagged[0].reason));
          }}
        />
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
                        toPersonException(p.id, p.name, p.role, p.designation, p.department, "absent")
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonException(p.id, p.name, p.role, p.designation, p.department, "absent"));
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
                        toPersonException(p.id, p.name, p.role, p.designation, p.department, "late", p.minutesLate)
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonException(p.id, p.name, p.role, p.designation, p.department, "late", p.minutesLate));
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
                      inspect(toPersonException(p.id, p.name, "", null, p.department, "flagged", p.reason))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        inspect(toPersonException(p.id, p.name, "", null, p.department, "flagged", p.reason));
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
