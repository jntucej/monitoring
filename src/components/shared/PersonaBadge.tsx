/**
 * shared/PersonaBadge — small colored pill showing the active persona.
 * Used by approvers (who they act for) and on the profile shell header.
 */

"use client";

import { cn } from "@/lib/utils";
import { usePersona } from "@/hooks/usePersona";
import type { Persona } from "@/lib/pass-types";

const PERSONA_STYLES: Record<Persona, string> = {
  hosteller: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  day_scholar: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  both: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const PERSONA_LABELS: Record<Persona, string> = {
  hosteller: "Hosteller",
  day_scholar: "Day Scholar",
  both: "Both",
};

export function PersonaBadge({
  persona,
  className,
}: {
  /** Override the persona (e.g. staff acting on behalf of a specific student). */
  persona?: Persona;
  className?: string;
}) {
  const active = usePersona();
  const p: Persona = persona ?? active;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PERSONA_STYLES[p],
        className
      )}
    >
      {PERSONA_LABELS[p]}
    </span>
  );
}

export default PersonaBadge;
