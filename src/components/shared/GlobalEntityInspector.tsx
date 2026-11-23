"use client";

/**
 * GlobalEntityInspector — a self-contained, URL-driven entity inspection drawer.
 *
 * Reads `?inspect=<kind>:<id>` from the URL (written by EntityLink's peek
 * action or set manually / via deep-link). Fetches the entity via the shared
 * resolver registry and renders the result in a right-side drawer using the
 * standard `EntityInspector` component.
 *
 * This component is a MOUNT helper for role shells: it requires no per-page
 * state. Mount it once in a shell layout (e.g. the guardian layout) and every
 * page within that shell can use `<EntityLink>` to open the inspector.
 *
 * Lifecycle:
 *   1. No `inspect` param → render null (zero DOM cost).
 *   2. `inspect` param present → fetch via `useEntityResolver`.
 *      - Loading → skeleton drawer.
 *      - Error   → muted error drawer with close + retry.
 *      - Resolved → full `EntityInspector` with the model.
 *   3. User closes the drawer (X, Esc, backdrop) → `onClose` removes the
 *      `inspect` param via `router.replace`, cleaning the URL.
 *
 * Usage in a shell layout:
 *   <GuardianConsoleLayout>
 *     ...existing shell...
 *     <GlobalEntityInspector />
 *   </GuardianConsoleLayout>
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  EntityInspector,
  type EntityInspection,
} from "@/components/shared/EntityInspector";
import {
  useEntityResolver,
  hasResolver,
} from "@/components/shared/entityResolvers";
import { cn } from "@/lib/utils";

/* ── split inspect param ────────────────────────────────────────────────── */

interface ParsedInspect {
  kind: string;
  id: string;
}

function parseInspectParam(raw: string | null): ParsedInspect | null {
  if (!raw) return null;
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return null;
  const kind = raw.slice(0, colonIdx);
  const id = raw.slice(colonIdx + 1);
  if (!kind || !id) return null;
  return { kind, id };
}

/* ── main component ─────────────────────────────────────────────────────── */

export function GlobalEntityInspector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);

  const inspectRaw = searchParams.get("inspect");
  const parsed = useMemo(() => parseInspectParam(inspectRaw), [inspectRaw]);

  const kind = parsed?.kind ?? null;
  const id = parsed?.id ?? null;

  // Hooks must be called unconditionally (Rules of Hooks). Pass null when
  // there is no inspect param so the resolver stays idle.
  const resolver = useEntityResolver(
    kind && hasResolver(kind) ? kind : null,
    kind && hasResolver(kind) ? id : null,
    role ? { role } : undefined,
  );

  /** Remove the `inspect` param, preserving all other query params. */
  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("inspect");
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, searchParams, router]);

  // No inspect param → zero DOM cost.
  if (!parsed || !kind || !id) return null;

  /* ── No resolver registered for this kind ───────────────────────────── */
  if (!hasResolver(kind)) {
    return (
      <DrawerShell onClose={close}>
        <DrawerHeader kind={kind} id={id} />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-text-primary">Unknown entity kind</p>
          <p className="text-xs text-text-muted mt-1">
            No resolver is registered for kind &ldquo;{kind}&rdquo;.
          </p>
        </div>
      </DrawerShell>
    );
  }

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (resolver.loading) {
    return (
      <DrawerShell onClose={close}>
        <DrawerHeader kind={kind} id={id} />
        <div className="space-y-4 animate-pulse" role="status" aria-live="polite">
          <div className="h-4 w-2/3 bg-bg-elevated rounded" />
          <div className="h-3 w-1/3 bg-bg-elevated rounded" />
          <div className="space-y-2 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-3 bg-bg-elevated rounded"
                style={{ width: `${100 - i * 10}%` }}
              />
            ))}
          </div>
        </div>
      </DrawerShell>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────────── */
  if (resolver.error) {
    return (
      <DrawerShell onClose={close}>
        <DrawerHeader kind={kind} id={id} />
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-text-primary">Failed to load</p>
          <p className="text-xs text-text-muted mt-1">{resolver.error}</p>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={resolver.retry}
              className="text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none rounded"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={close}
              className="text-xs font-semibold text-text-muted hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none rounded"
            >
              Close
            </button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  /* ── Resolved ───────────────────────────────────────────────────────── */
  const model: EntityInspection | null = resolver.inspection;

  if (model) {
    // EntityInspector renders its own fixed overlay (backdrop + drawer) and
    // shows kind + title + subtitle in its header — the "peek" affordance
    // is already there. onClose cleans the URL param.
    return <EntityInspector inspection={model} onClose={close} />;
  }

  // Shouldn't reach here (loading/error handled above), but guard.
  return (
    <DrawerShell onClose={close}>
      <DrawerHeader kind={kind} id={id} />
      <p className="text-xs text-text-muted">No data available.</p>
    </DrawerShell>
  );
}

/* ── sub-components (kept local; not exported) ─────────────────────────── */

/**
 * The fixed-position drawer wrapper. When the resolved model is available we
 * render the standard EntityInspector (which has its own fixed overlay);
 * for loading/error/unknown states we render our own minimal shell so the
 * user always sees a meaningful panel (design rule 31).
 */
function DrawerShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Entity inspector"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "surface-card relative w-full max-w-md h-full overflow-y-auto bg-bg-surface p-5",
        )}
      >
        {children}
      </aside>
    </div>
  );
}

/**
 * Small "peek" affordance header: shows the kind + id so the user knows
 * which entity is being inspected.
 */
function DrawerHeader({ kind, id }: { kind: string; id: string }) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Peeking
        </p>
        <p className="text-xs font-mono text-text-secondary mt-0.5 truncate">
          {kind}:{id}
        </p>
      </div>
    </header>
  );
}
