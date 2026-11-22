"use client";

import { useState } from "react";

/**
 * UseEntityInspector — the state hook that pairs with `EntityInspector`.
 *
 * Every dashboard composes this the same way:
 *
 *   const [inspection, inspect, closeInspection] = useEntityInspector();
 *   ...
 *   <button onClick={() => inspect(studentRow)}>…</button>
 *   <EntityInspector inspection={inspection} onClose={closeInspection} />
 *
 * The `inspect()` call is the single "element → quick overview" entry
 * point; the panel renders the full hierarchy.
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
 *   const [inspection, inspect, close] = useEntityInspector();
 *   ...
 *   <EntityInspectorPanel inspection={inspection} onClose={close} />
 */
export function EntityInspectorPanel(props: {
  inspection: EntityInspection | null;
  onClose: () => void;
}) {
  return <EntityInspector {...props} />;
}
