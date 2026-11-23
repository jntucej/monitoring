"use client";

import { useEntityInspector } from "@/components/shared/useEntityInspector";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { IncidentsView } from "../../_shared/IncidentsView";

export default function IncidentsPage() {
  const { inspection, inspect, closeInspection } = useEntityInspector();

  return (
    <div>
      <IncidentsView onInspect={inspect} />
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
