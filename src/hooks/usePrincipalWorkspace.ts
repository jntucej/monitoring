"use client";

/**
 * PR-03 — Principal workspace state + navigation.
 *
 * Makes the Principal experience context-preserving. The rule (ADR
 * docs/principal/architecture.md): the SHAREABLE context — active workspace,
 * a filter that should survive refresh, the inspected entity, and where to
 * return to — lives in the URL so it is refresh-safe, deep-linkable and
 * navigable through the browser history. Transient presentation (inspector
 * open/collapsed, current step, in-flight execution) stays LOCAL via
 * useEntityInspector / component state.
 *
 * This does NOT introduce a second global store: it is a thin URL-sync layer
 * over next/navigation + the PR-02 contracts.
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  PrincipalEntityRef,
  PrincipalEntityType,
} from "@/lib/principal/contracts";

const KNOWN_KINDS: PrincipalEntityType[] = [
  "student",
  "faculty",
  "staff",
  "department",
  "hostel",
  "gate",
  "incident",
  "complaint",
  "permission",
  "approval",
  "delegation",
  "examination_case",
  "institutional_case",
];

function isKnownKind(v: string | null): v is PrincipalEntityType {
  return v != null && (KNOWN_KINDS as string[]).includes(v);
}

export interface PrincipalWorkspaceState {
  /** Current top-level workspace (route segment, e.g. "approvals", "cases"). */
  workspace: string;
  /** A shareable filter/search value, when present. */
  filter: string | null;
  /** The entity currently in scope for inspection (from the URL). */
  inspect:
    | { entity: PrincipalEntityRef; returnTo: string | null }
    | null;
}

export interface UsePrincipalWorkspaceOptions {
  /**
   * Whether to write the inspected entity into the URL. Default true. When
   * false the entity is read-only (the URL is a deep-link target but the
   * page does not rewrite it on local selection changes).
   */
  trackInspectInUrl?: boolean;
}

export function usePrincipalWorkspace(
  options: UsePrincipalWorkspaceOptions = {},
): PrincipalWorkspaceState & {
  setInspect: (entity: PrincipalEntityRef, returnTo?: string) => void;
  clearInspect: () => void;
  setFilter: (filter: string | null) => void;
  /** The path to return to when the inspector/workspace closes. */
  returnTo: string | null;
} {
  const { trackInspectInUrl = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ── read the shareable context from the URL ──
  const workspace = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean);
    // (approver)/principal/<workspace>  →  the first principal segment
    const idx = seg.indexOf("principal");
    return idx >= 0 && seg[idx + 1] ? seg[idx + 1] : "";
  }, [pathname]);

  const filter = sp.get("filter");

  const inspect = useMemo(() => {
    const kind = sp.get("entity");
    const id = sp.get("entityId");
    const label = sp.get("entityLabel");
    const returnTo = sp.get("returnTo");
    if (!isKnownKind(kind) || !id) return null;
    return {
      entity: { type: kind, id, label: label ?? id },
      returnTo,
    };
  }, [sp]);

  // ── write the shareable context back to the URL ──
  const replace = useCallback(
    (patch: { entity?: string | null; id?: string | null; label?: string | null; returnTo?: string | null; filter?: string | null }) => {
      const next = new URLSearchParams(sp);
      const set = (k: string, v: string | null) => {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      };
      if ("entity" in patch) set("entity", patch.entity ?? null);
      if ("id" in patch) set("entityId", patch.id ?? null);
      if ("label" in patch) set("entityLabel", patch.label ?? null);
      if ("returnTo" in patch) set("returnTo", patch.returnTo ?? null);
      if ("filter" in patch) set("filter", patch.filter ?? null);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, sp],
  );

  const setInspect = useCallback(
    (entity: PrincipalEntityRef, returnTo?: string) => {
      if (!trackInspectInUrl) return;
      replace({
        entity: entity.type,
        id: entity.id,
        label: entity.label,
        returnTo: returnTo ?? null,
      });
    },
    [replace, trackInspectInUrl],
  );

  const clearInspect = useCallback(() => {
    replace({ entity: null, id: null, label: null });
  }, [replace]);

  const setFilter = useCallback(
    (filter: string | null) => {
      replace({ filter });
    },
    [replace],
  );

  const returnTo = inspect?.returnTo ?? null;

  return {
    workspace,
    filter,
    inspect,
    returnTo,
    setInspect,
    clearInspect,
    setFilter,
  };
}
