// src/lib/capabilities/project.ts
//
// Client-safe projection: capabilities → which nav items / widgets / actions
// are visible. The client NEVER computes capabilities itself (guardrail #1) —
// it receives them from /api/me/workspace and just maps id → surface.
//
// This file has no DB/fetch: it runs on both server and client.

import type { CapabilityDef, CapabilityId, WorkspaceContext } from "./types";
import { resolveCapabilities, hasCapability } from "./types";
import { CAPABILITY_REGISTRY, CAPABILITY_REGISTRY_VERSION } from "./registry";

export interface NavItem {
  id: string;
  label: string;
  /** the capability that must be present for this item to show. */
  requires: CapabilityId;
  /** "ux" items may be shown fail-open; "security" items are hidden unless the cap is present. */
  kind: "ux" | "security";
}

/**
 * The student workspace nav, expressed as capabilities (not roles). The same
 * item list serves every student; which ones render depends on the resolved
 * capability set (day scholar vs hosteller, IN vs OUT).
 */
export const STUDENT_NAV: NavItem[] = [
  { id: "home", label: "Home", requires: "campus.status.view", kind: "ux" },
  { id: "classes", label: "Today's Classes", requires: "classes.view", kind: "ux" },
  { id: "attendance", label: "Attendance", requires: "attendance.view", kind: "ux" },
  { id: "movement", label: "My Movement", requires: "movement.view", kind: "ux" },
  { id: "credential", label: "My QR / Credential", requires: "credential.view", kind: "security" },
  { id: "leave", label: "Hostel Leave", requires: "hostel.leave.apply", kind: "security" },
  { id: "curfew", label: "Curfew", requires: "curfew.view", kind: "ux" },
  { id: "expected-return", label: "Expected Return", requires: "expected-return.view", kind: "ux" },
  { id: "day-out", label: "Day Out", requires: "day.out.request", kind: "security" },
];

export interface Projection {
  capabilities: CapabilityId[];
  visibleNav: NavItem[];
  hiddenNav: NavItem[];
  /** widget families that should render (capability → widget id). */
  widgets: CapabilityId[];
  registryVersion: number;
}

/**
 * Project the capability set into surfaces. Pure + client-safe.
 * Fail-open for ux items (a missing ux cap shows the item), fail-closed for
 * security items (a missing security cap hides the item) — guardrail #2.
 */
export function projectWorkspace(
  ctx: WorkspaceContext,
  defs: CapabilityDef[] = CAPABILITY_REGISTRY,
): Projection {
  const capabilities = resolveCapabilities(defs, ctx);
  const capSet = new Set(capabilities);

  const visibleNav: NavItem[] = [];
  const hiddenNav: NavItem[] = [];
  for (const item of STUDENT_NAV) {
    const present = capSet.has(item.requires);
    // ux items: show even if their cap is absent (fail open) → visible unless
    // explicitly a security cap. security items: hidden unless present.
    if (item.kind === "ux" || present) visibleNav.push(item);
    else hiddenNav.push(item);
  }

  // Widgets = the caps that are present (each widget family is gated by one cap).
  const widgets = capabilities;

  return {
    capabilities,
    visibleNav,
    hiddenNav,
    widgets,
    registryVersion: CAPABILITY_REGISTRY_VERSION,
  };
}

export { CAPABILITY_REGISTRY, CAPABILITY_REGISTRY_VERSION, resolveCapabilities, hasCapability };
