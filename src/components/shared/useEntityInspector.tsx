"use client";

import { useState } from "react";

/**
 * useEntityInspector — the state hook that pairs with `EntityInspector`.
 *
 * Every dashboard composes this the same way:
 *
 *   const { inspection, inspect, closeInspection } = useEntityInspector();
 *   ...
 *   <button onClick={() => inspect(model)}>…</button>
 *   <EntityInspector
 *     inspection={inspection}
 *     onClose={closeInspection}
 *     state={inspectorState}
 *     onRetry={retry}
 *   />
 *
 * The `inspect()` call is the single "element → quick overview" entry
 * point; the panel renders the full hierarchy.
 *
 * ── Close behavior (context preservation) ─────────────────────────────────
 *
 * `closeInspection()` sets `inspection` to `null`. It does NOT:
 *
 *   - Unmount the page (the hook is a plain `useState` inside the page
 *     component; the page stays mounted).
 *   - Clear any other local state the page holds (filters, sort, scroll
 *     position, form inputs).
 *   - Trigger a router push.
 *
 * When `inspection` becomes `null`, `EntityInspector` renders its
 * state-placeholder (loading / empty / error / unauthorized / missing)
 * or, if the panel is fully closed (`inspection === null` AND the page
 * does not keep the inspector open), it unmounts itself. The page's
 * own state — including the trigger element that had focus before the
 * panel opened — is fully preserved because:
 *
 *   1. The page component never re-mounts on close.
 *   2. `EntityInspector` restores focus to the previously focused
 *      element (via `prevFocusRef`) when `inspection` flips to `null`.
 *
 * This is the "no state destruction on close" contract documented in
 * the design rules.
 */
import { EntityInspector, type EntityInspection } from "@/components/shared/EntityInspector";

export function useEntityInspector() {
  const [inspection, setInspection] = useState<EntityInspection | null>(null);
  const inspect = (entity: EntityInspection) => setInspection(entity);
  const closeInspection = () => setInspection(null);
  return { inspection, inspect, closeInspection };
}

/**
 * <InspectorHost /> — render once per page, right before the closing tag.
 * It owns the `inspection` state for the page and exposes it to any
 * `<button onClick={...}>` via the page's own state.
 *
 * Note: this is a passthrough wrapper for API symmetry. The actual
 * state lives in `useEntityInspector`, not in the host.
 */
export function InspectorHost({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/**
 * <EntityInspectorPanel /> — the presentational piece a page renders at
 * the end of its JSX:
 *
 *   const { inspection, inspect, closeInspection } = useEntityInspector();
 *   ...
 *   <EntityInspectorPanel
 *     inspection={inspection}
 *     onClose={closeInspection}
 *     state={inspectorState}
 *     onRetry={retry}
 *   />
 *
 * It is a thin wrapper around `EntityInspector` so pages don't need to
 * import the inspector component directly.
 */
export function EntityInspectorPanel(props: {
  inspection: EntityInspection | null;
  onClose: () => void;
  state?: import("@/components/shared/EntityInspector").InspectorState;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return <EntityInspector {...props} />;
}
