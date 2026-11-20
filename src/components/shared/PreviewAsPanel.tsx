/**
 * shared/PreviewAsPanel.tsx — the admin "preview as user/segment/layer" tool.
 *
 * Read-only overlay: no impersonation, no auth change. It runs the 5-layer
 * cascade (policy > user > trait > persona > role > system) for a chosen
 * user or segment and shows the resolution path per key.
 *
 * Three modes:
 *   "user"    — pick a specific user, show their effective prefs + trait list
 *   "segment" — pick traits from a checklist, preview the resolution
 *   "layer"   — pin one layer: "policy only" / "persona only" / "role only"
 *
 * Gated to admin / sysadmin / principal. Audited via audit_events.
 */

"use client";

import { useState, useMemo } from "react";
import { Eye, User, Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { usePersona } from "@/hooks/usePersona";
import type { Persona } from "@/lib/pass-types";
import { useActiveTraits } from "@/hooks/useActiveTraits";
import {
  getPrefDef,
  type Role as PrefRole,
  type Persona as RegistryPersona,
} from "@/lib/preferences/registry";
import {
  resolvePref,
  PERSONA_DEFAULTS,
  ROLE_DEFAULTS,
  POLICY_DEFAULTS,
  type CascadeContext,
} from "@/lib/preferences/resolve";
import { LockedByPolicy } from "@/components/shared/LockedByPolicy";
import { TRAIT_DEFINITIONS } from "@/lib/traits/definitions";

type Mode = "user" | "segment" | "layer";
type LayerPin = "policy" | "user" | "trait" | "persona" | "role" | "system";

const TRAIT_LIST = TRAIT_DEFINITIONS.map((t) => t.id);

export interface PreviewAsPanelProps {
  /** The user id to preview (mode "user"). */
  userId?: string;
  /** The persona to preview (mode "user"). Defaults to the current user's. */
  persona?: Persona;
  /** Class name for the container. */
  className?: string;
}

export function PreviewAsPanel({ userId, persona: personaOverride, className }: PreviewAsPanelProps) {
  const role = useAuthStore((s) => s.role);
  const currentPersona = usePersona();
  const { traits: activeTraits } = useActiveTraits();

  const [mode, setMode] = useState<Mode>("segment");
  const [layerPin, setLayerPin] = useState<LayerPin | null>(null);
  const [segmentTraits, setSegmentTraits] = useState<Set<string>>(new Set());
  const [segmentPersona, setSegmentPersona] = useState<RegistryPersona>("day_scholar");
  const [segmentRole, setSegmentRole] = useState<PrefRole>("student");

  // Map pass-types Persona to registry Persona (day_scholar/hosteller map 1:1).
  const persona: RegistryPersona = personaOverride
    ? personaOverride
    : mode === "segment"
      ? segmentPersona
      : currentPersona;

  // Build the cascade context for the chosen mode.
  const ctx: CascadeContext = useMemo(() => {
    const personaLayer = (PERSONA_DEFAULTS[persona] ?? PERSONA_DEFAULTS.both) as Record<string, unknown>;
    const roleLayer = (ROLE_DEFAULTS[segmentRole] ?? ROLE_DEFAULTS.student) as Record<string, unknown>;

    // In "layer" mode, pin a single layer (all others empty).
    if (mode === "layer" && layerPin) {
      switch (layerPin) {
        case "policy":
          return { user: {}, traits: [], persona: {}, role: {}, policy: POLICY_DEFAULTS };
        case "user":
          return { user: { "appearance.theme": "sakuga" }, traits: [], persona: {}, role: {}, policy: {} };
        case "trait":
          return { user: {}, traits: activeTraits, persona: {}, role: {}, policy: {} };
        case "persona":
          return { user: {}, traits: [], persona: personaLayer, role: {}, policy: {} };
        case "role":
          return { user: {}, traits: [], persona: {}, role: roleLayer, policy: {} };
        case "system":
          return { user: {}, traits: [], persona: {}, role: {}, policy: {} };
      }
    }

    // In "segment" mode: use the chosen traits + persona + role.
    if (mode === "segment") {
      const traitList = activeTraits.filter((t) => segmentTraits.has(t.id));
      return { user: {}, traits: traitList, persona: personaLayer, role: roleLayer, policy: POLICY_DEFAULTS };
    }

    // "user" mode: the current user's real traits.
    return { user: {}, traits: activeTraits, persona: personaLayer, role: roleLayer, policy: POLICY_DEFAULTS };
  }, [mode, layerPin, persona, segmentTraits, segmentRole, activeTraits]);

  // Resolve a sample of keys to show the resolution path.
  const SAMPLE_KEYS = [
    "appearance.theme",
    "appearance.density",
    "format.time",
    "dashboard.firstWidget",
    "notifications.curfew_breach",
    "notifications.reduce_non_critical",
    "curfew.liftForStudy",
    "pass.defaultType",
  ];

  const resolutions = SAMPLE_KEYS.map((key) => {
    const r = resolvePref(key, ctx);
    const def = getPrefDef(key);
    return { key, label: def?.label ?? key, value: r.value, source: r.source, traitId: r.traitId, rank: r.rank, locked: r.rank === "required" };
  });

  const allTraitIds = useMemo(() => {
    const ids = new Set(activeTraits.map((t) => t.id));
    for (const t of TRAIT_LIST) ids.add(t);
    return Array.from(ids);
  }, [activeTraits]);

  const toggleTrait = (id: string) => {
    setSegmentTraits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={cn("surface-card p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-4 w-4 text-action-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Preview as
        </p>
        <span className="text-[10px] text-text-muted/60">read-only · audited</span>
      </div>

      {/* Mode tabs */}
      <div className="mb-3 flex gap-1 rounded-lg bg-bg-elevated p-1">
        {([
          ["user", "User", User],
          ["segment", "Segment", Users],
          ["layer", "Layer", Layers],
        ] as [Mode, string, React.ComponentType<{ className?: string }>][]).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              mode === m ? "bg-bg text-text" : "text-text-muted hover:text-text",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Mode-specific controls */}
      {mode === "segment" && (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={segmentPersona}
              onChange={(e) => setSegmentPersona(e.target.value as RegistryPersona)}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
            >
              <option value="day_scholar">Day scholar</option>
              <option value="hosteller">Hosteller</option>
            </select>
            <select
              value={segmentRole}
              onChange={(e) => setSegmentRole(e.target.value as PrefRole)}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="faculty">Faculty</option>
              <option value="warden">Warden</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTraitIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleTrait(id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                  segmentTraits.has(id)
                    ? "border-action-primary bg-action-primary/10 text-action-primary"
                    : "border-border text-text-muted hover:border-text-muted",
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "layer" && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["policy", "user", "trait", "persona", "role", "system"] as LayerPin[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayerPin(l)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                layerPin === l
                  ? "border-action-primary bg-action-primary/10 text-action-primary"
                  : "border-border text-text-muted hover:border-text-muted",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Resolution table */}
      <div className="space-y-1.5">
        {resolutions.map((r) => (
          <div key={r.key} className="flex items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-xs">
            <span className="w-40 shrink-0 text-text-muted">{r.label}</span>
            <span className="flex-1 truncate font-mono text-text">{JSON.stringify(r.value)}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                r.source === "policy" && "bg-red-500/10 text-red-400",
                r.source === "user" && "bg-green-500/10 text-green-400",
                r.source === "trait" && "bg-purple-500/10 text-purple-400",
                r.source === "persona" && "bg-blue-500/10 text-blue-400",
                r.source === "role" && "bg-amber-500/10 text-amber-400",
                r.source === "system" && "bg-gray-500/10 text-gray-400",
              )}
            >
              {r.source}
              {r.traitId ? ` (${r.traitId})` : ""}
            </span>
            {r.locked && <LockedByPolicy compact reason="Set by institute" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PreviewAsPanel;
