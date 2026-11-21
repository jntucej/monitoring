/**
 * lib/pass-types.ts — data-driven pass type configuration.
 *
 * Replaces the `DirectGenReason` TypeScript union and the 5-field
 * `PassType` interface in `admin/PassTypesForm.tsx`.
 *
 * Every pass type is now a `PassTypeConfig` row, keyed by `code`,
 * scoped by `persona`. The frontend reads this via `usePassTypes({ persona })`
 * and renders the config-driven form — no code change to add a new type.
 */

// ── Enums ─────────────────────────────────────────────────────────────────

export type Persona = "day_scholar" | "hosteller" | "both";
export type PassCategory = "exit" | "entry" | "residence" | "mess" | "leave";
export type DurationUnit = "hours" | "days";
export type QuotaWindow = "month" | "semester" | "year";

export type ApprovalRole =
  | "teacher"
  | "hod"
  | "deputy_warden"
  | "principal"
  | "vice_principal"
  | "parent"
  | "medical"
  | "faculty_incharge"
  | "exam_branch"
  | "caretaker"
  | "hostel_manager"
  | "self";

// ── PassTypeConfig ────────────────────────────────────────────────────────

// P1: authorization kind — distinguishes what the pass ACTUALLY IS, not
// just what the UI calls it. Stops "leave" and "credential" and "visitor
// token" pretending to be the same object.
//   identity   → a credential / ID (who you are)
//   standing   → a standing authorization (you're always allowed to do X)
//   movement   → a movement authorization (go OUT / come IN now)
//   assignment → a duty / exam / official assignment
//   emergency  → an emergency override (evacuation, medical, …)
//
// Existing pass records default to "movement" (no data migration needed).
export type PassKind =
  | "identity"
  | "standing"
  | "movement"
  | "assignment"
  | "emergency";

export interface PassTypeConfig {
  code: string;
  label: string;
  description: string;

  // persona & category
  persona: Persona;
  category: PassCategory;
  /** P1: the authorization kind. Defaults to "movement" for existing passes. */
  kind?: PassKind;

  // duration
  durationUnit: DurationUnit;
  minDuration: number;
  maxDuration: number;

  // approval
  requiresApproval: boolean;
  approvalChain: ApprovalRole[];
  requiresParentConsent: boolean;
  parentConsentExpiryHours: number;

  // gate / curfew
  requiresGateScan: boolean;
  curfewApplies: boolean;
  expectedReturnRequired: boolean;

  // form fields
  destinationRequired: boolean;
  guardianAddressRequired: boolean;
  attachmentRequired: boolean;
  attachmentKinds: Array<"medical" | "invitation" | "letter">;

  // quota
  quotaKey: string | null;
  quotaLimit: number | null;
  quotaWindow: QuotaWindow | null;
  quotaOverrideTier: number; // role tier allowed to override (higher = less privileged)

  // mess coupling
  messOffCoupling: boolean;
  messOffStandalone: boolean;

  // legacy compat
  approvalFlow?: string;
  isActive: boolean;
}

// ── Seed data (replaces DirectGenReason union) ───────────────────────────

export const PASS_TYPE_SEED: PassTypeConfig[] = [
  // ── day_scholar ──
  {
    code: "late_arrival",
    label: "Late Arrival",
    description: "Student arriving after the morning gate close.",
    persona: "day_scholar",
    category: "entry",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 0,
    maxDuration: 2,
    requiresApproval: false,
    approvalChain: ["self"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: false,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 3,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "early_leave",
    label: "Early Leave",
    description: "Day scholar leaving campus before dismissal time.",
    persona: "day_scholar",
    category: "exit",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 0,
    maxDuration: 4,
    requiresApproval: false,
    approvalChain: ["self"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: true,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 3,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "day_out",
    label: "Day Out",
    description: "Day scholar absent for a full school day.",
    persona: "day_scholar",
    category: "exit",
    kind: "movement",
    durationUnit: "days",
    minDuration: 1,
    maxDuration: 3,
    requiresApproval: false,
    approvalChain: ["self"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: false,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: false,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 3,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "event_pass",
    label: "Event Pass",
    description: "Short outing for a campus-organised event (sports, cultural).",
    persona: "day_scholar",
    category: "exit",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 1,
    maxDuration: 6,
    requiresApproval: true,
    approvalChain: ["faculty_incharge"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: true,
    guardianAddressRequired: false,
    attachmentRequired: true,
    attachmentKinds: ["invitation"],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 2,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "hostel_stay",
    label: "Hostel Stay (day scholar)",
    description: "Day scholar staying at hostel for the night (exam week, sports camp).",
    persona: "day_scholar",
    category: "residence",
    kind: "standing",
    durationUnit: "days",
    minDuration: 1,
    maxDuration: 14,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal"],
    requiresParentConsent: true,
    parentConsentExpiryHours: 48,
    requiresGateScan: true,
    curfewApplies: true,
    expectedReturnRequired: true,
    destinationRequired: true,
    guardianAddressRequired: true,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 1,
    messOffCoupling: true,
    messOffStandalone: false,
    isActive: true,
  },

  // ── hosteller ──
  {
    code: "outpass_home",
    label: "Outpass (Home)",
    description: "Hosteller leaving campus for home or guardian address.",
    persona: "hosteller",
    category: "exit",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 2,
    maxDuration: 72,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal"],
    requiresParentConsent: true,
    parentConsentExpiryHours: 24,
    requiresGateScan: true,
    curfewApplies: true,
    expectedReturnRequired: true,
    destinationRequired: true,
    guardianAddressRequired: true,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: "outpass",
    quotaLimit: 4,
    quotaWindow: "month",
    quotaOverrideTier: 1,
    messOffCoupling: true,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "night_out",
    label: "Night Out",
    description: "Hosteller out overnight (family function, medical).",
    persona: "hosteller",
    category: "exit",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 12,
    maxDuration: 48,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal"],
    requiresParentConsent: true,
    parentConsentExpiryHours: 24,
    requiresGateScan: true,
    curfewApplies: true,
    expectedReturnRequired: true,
    destinationRequired: true,
    guardianAddressRequired: true,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: "outpass",
    quotaLimit: 2,
    quotaWindow: "semester",
    quotaOverrideTier: 1,
    messOffCoupling: true,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "local_outing",
    label: "Local Outing (< 2 h)",
    description: "Short trip within campus town; no overnight stay.",
    persona: "hosteller",
    category: "exit",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 0.5,
    maxDuration: 2,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: true,
    expectedReturnRequired: true,
    destinationRequired: true,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 2,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "mess_off",
    label: "Mess Off",
    description: "Skip one or more meals; auto-coupled to an active pass or standalone.",
    persona: "hosteller",
    category: "mess",
    kind: "movement",
    durationUnit: "days",
    minDuration: 1,
    maxDuration: 7,
    requiresApproval: false,
    approvalChain: ["self"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: false,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: false,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 3,
    messOffCoupling: true,
    messOffStandalone: true,
    isActive: true,
  },
  {
    code: "medical_leave",
    label: "Medical Leave",
    description: "Hosteller off campus for medical treatment (hospital / doctor).",
    persona: "hosteller",
    category: "leave",
    kind: "emergency",
    durationUnit: "days",
    minDuration: 1,
    maxDuration: 30,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal", "medical"],
    requiresParentConsent: true,
    parentConsentExpiryHours: 72,
    requiresGateScan: true,
    curfewApplies: false,
    expectedReturnRequired: true,
    destinationRequired: true,
    guardianAddressRequired: false,
    attachmentRequired: true,
    attachmentKinds: ["medical"],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 1,
    messOffCoupling: true,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "emergency_leave",
    label: "Emergency Leave",
    description: "Immediate departure due to emergency; warden overrides all other checks.",
    persona: "hosteller",
    category: "leave",
    kind: "emergency",
    durationUnit: "hours",
    minDuration: 0,
    maxDuration: 72,
    requiresApproval: true,
    approvalChain: ["caretaker", "principal"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: false,
    expectedReturnRequired: false,
    destinationRequired: false,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 1,
    messOffCoupling: true,
    messOffStandalone: false,
    isActive: true,
  },
  {
    code: "late_entry",
    label: "Late Entry",
    description: "Hosteller entering campus after the evening curfew scan window.",
    persona: "hosteller",
    category: "entry",
    kind: "movement",
    durationUnit: "hours",
    minDuration: 0,
    maxDuration: 4,
    requiresApproval: true,
    approvalChain: ["caretaker", "deputy_warden", "hostel_manager", "principal"],
    requiresParentConsent: false,
    parentConsentExpiryHours: 0,
    requiresGateScan: true,
    curfewApplies: true,
    expectedReturnRequired: false,
    destinationRequired: false,
    guardianAddressRequired: false,
    attachmentRequired: false,
    attachmentKinds: [],
    quotaKey: null,
    quotaLimit: null,
    quotaWindow: null,
    quotaOverrideTier: 2,
    messOffCoupling: false,
    messOffStandalone: false,
    isActive: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** Filter pass types for a given persona (hosteller also gets "both"). */
export function passTypesForPersona(persona: Persona, onlyActive = true): PassTypeConfig[] {
  return PASS_TYPE_SEED.filter(
    (t) =>
      (onlyActive ? t.isActive : true) &&
      (t.persona === persona || t.persona === "both")
  );
}

/** Look up a single config by code. */
export function passTypeByCode(code: string): PassTypeConfig | undefined {
  return PASS_TYPE_SEED.find((t) => t.code === code);
}

/** Approval chain label for UI (e.g. "Warden → Parent → Deputy Warden"). */
const ROLE_LABELS: Record<ApprovalRole, string> = {
  teacher: "Teacher",
  hod: "HOD",
  deputy_warden: "Deputy Warden",
  principal: "Principal",
  vice_principal: "Vice Principal",
  parent: "Parent",
  medical: "Medical Officer",
  faculty_incharge: "Faculty In-charge",
  exam_branch: "Exam Branch",
  caretaker: "Hostel In-charge",
  hostel_manager: "Hostel Manager",
  self: "Self",
};

export function approvalChainLabel(chain: ApprovalRole[]): string {
  return chain.map((r) => ROLE_LABELS[r] ?? r).join(" → ");
}

export { ROLE_LABELS };
