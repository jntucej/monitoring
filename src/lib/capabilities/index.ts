// src/lib/capabilities/index.ts — single import surface for the capability engine.
export type {
  WorkspaceContext,
  AccessAuthorization,
  ApprovalStage,
  CapabilityDef,
  CapabilityId,
  CapabilityRegistry,
} from "./types";
export {
  hasCapability,
  resolveCapabilities,
  capabilityDecision,
} from "./types";
export { CAPABILITY_REGISTRY, CAPABILITY_REGISTRY_VERSION } from "./registry";
export { projectWorkspace, STUDENT_NAV } from "./project";
export type { NavItem, Projection } from "./project";
