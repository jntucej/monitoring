"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useAuthStore } from "@/stores/authStore";
import { useRoleContext } from "@/hooks/useRoleContext";
import { EntityInspector } from "@/components/shared/EntityInspector";
import {
  buildPersonInspection,
  type RoleGate,
} from "./entityInspectionModels";
import type { Person } from "@/lib/types";

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

  const [data] = useApiResource<PersonsResponse>(
    user?.id ? `/api/persons?limit=200` : null,
    { enabled: true, ttlMs: 30_000 }
  );
  const [active, setActive] = useState<Person | null>(null);

  const people = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  const target = personParam ? people.find((p) => p.id === personParam || p.uniqueId === personParam) : null;
  useEffect(() => {
    if (target) setActive(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personParam]);

  const inspection = active
    ? buildPersonInspection(active, gate)
    : null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold text-text-primary">People Register</h1>
        <p className="text-xs text-text-muted">
          {people.length} active persons · click any person to inspect
        </p>
      </header>

      {people.length === 0 ? (
        <p className="text-xs text-text-muted">Person records are currently unavailable.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setActive(p)}
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

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}

export default PeopleRegisterView;
