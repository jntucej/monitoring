"use client";

/**
 * PivotStrip — Zone 3: Relational Pivot Strip.
 *
 * A horizontal, scrollable pill bar of connected entities for a record.
 * Each pill is an `<EntityLink/>` so clicking it sets `?inspect=kind:id`
 * in the URL, which the GlobalEntityInspector reads and opens the drawer.
 *
 * Usage:
 *   <PivotStrip
 *     pivots={[
 *       { kind: "student", id: "25JJ5A1203", label: "Student: Rahul" },
 *       { kind: "gate",    id: "GATE-01",   label: "Main Gate" },
 *       { kind: "ticket",  id: "PASS-402",  label: "Active Pass" },
 *     ]}
 *   />
 */

import { EntityLink } from "@/components/shared/EntityLink";

export interface PivotItem {
  kind: string;
  id: string;
  label: string;
  sublabel?: string;
}

export function PivotStrip({
  pivots,
  className = "",
}: {
  pivots: PivotItem[];
  className?: string;
}) {
  if (pivots.length === 0) return null;

  return (
    <div
      data-testid="pivot-strip"
      className={`flex items-center gap-2 overflow-x-auto pb-1 px-0.5 -mx-0.5 scrollbar-thin ${className}`}
      role="list"
      aria-label="Related entities"
    >
      {pivots.map((p) => (
        <EntityLink
          key={`${p.kind}-${p.id}`}
          kind={p.kind}
          id={p.id}
          label={p.label}
          sublabel={p.sublabel}
          mode="peek"
        />
      ))}
      {/* Spacer to allow scroll-to-end padding */}
      <div className="w-1 shrink-0" aria-hidden />
    </div>
  );
}
