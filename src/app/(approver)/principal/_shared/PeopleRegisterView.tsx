"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { useAuthStore } from "@/stores/authStore";
import { useRoleContext } from "@/hooks/useRoleContext";
import { EntityInspector } from "@/components/shared/EntityInspector";
import {
  buildPersonInspection,
  type RoleGate,
} from "./entityInspectionModels";
import type { Person } from "@/lib/types";
import { CommandPivotDrawer, type CommandPivotTarget } from "@/components/nav/level3/CommandPivotDrawer";
import { SatisfactionOverviewPanel } from "@/components/shared/SatisfactionOverviewPanel";

interface PersonsResponse {
  success?: boolean;
  data: Person[];
}

/**
 * PeopleRegisterView — the /principal/people register.
 *
 * The page-level ?person=<id> deep-link convention is owned by the shell:
 * the PrincipalCommandBar entity results navigate here with the person
 * pre-identified. On mount, if the param is present, the matching person's
 * Unified Entity Inspector opens on it — context preserved.
 */
export function PeopleRegisterView({ personParam }: { personParam: string | null }) {
  const user = useAuthStore((s) => s.user);
  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };

  const { data } = useApiResource<PersonsResponse>(
    user?.id ? `/api/persons?limit=200` : null,
    { enabled: true, ttlMs: 30_000 }
  );
  const [active, setActive] = useState<Person | null>(null);
  const [pivot, setPivot] = useState<CommandPivotTarget | null>(null);

  const openPerson = (p: Person) => {
    setActive(p);
    setPivot({
      kind: p.role === "faculty" || p.personType === "faculty" ? "faculty" : "student",
      id: p.id,
      title: p.fullName || p.name || p.uniqueId,
      subtitle: `${p.uniqueId} · ${p.role ?? p.personType}`,
      fullRoute: p.role === "faculty" || p.personType === "faculty"
        ? `/admin/faculty/${p.id}`
        : `/admin/students/${p.id}`,
      relatedLinks: [
        { label: "People", href: "/principal/people" },
        { label: "Gates", href: "/principal/operations/gates" },
        { label: "Incidents", href: "/principal/operations/incidents" },
        { label: "Hostel", href: "/principal/operations/hostel" },
        { label: "Approvals", href: "/principal/approvals" },
        { label: "Cases", href: "/principal/cases" },
      ],
    });
  };

  const people = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  const target = personParam ? people.find((p) => p.id === personParam || p.uniqueId === personParam) : null;
  useEffect(() => {
    if (target) openPerson(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personParam]);

  const inspection = active
    ? buildPersonInspection(active, gate)
    : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">People Register</h1>
          <p className="text-xs text-text-muted">
            {people.length} active persons · click any person to inspect
          </p>
        </div>
        <Link
          href="/principal/people/assignment-tree"
          className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-semibold text-action-primary hover:bg-bg-elevated"
        >
          Assignment Tree &rarr;
        </Link>
      </header>

      <SatisfactionOverviewPanel
        onCampusCount={people.filter((p) => (p as { isOnCampus?: boolean }).isOnCampus).length}
        totalPeopleCount={people.length}
      />

      {people.length === 0 ? (
        <p className="text-xs text-text-muted">Person records are currently unavailable.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openPerson(p)}
                className="surface-card w-full p-3 text-left hover:bg-bg-elevated transition-colors"
              >
                <p className="text-sm font-medium text-text-primary truncate">
                  {p.fullName || p.name}
                </p>
                <p className="text-xs text-text-muted font-mono truncate">
                  {p.uniqueId} · {p.role ?? p.personType}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <EntityInspector inspection={inspection} onClose={() => { setActive(null); setPivot(null); }} />
      <CommandPivotDrawer target={pivot} onClose={() => setPivot(null)} />
    </div>
  );
}

export default PeopleRegisterView;
