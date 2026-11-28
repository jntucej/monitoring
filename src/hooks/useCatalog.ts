"use client";

import { useApiResource } from "@/hooks/useApiResource";

/**
 * useCatalog — the zero-hardcoding metadata hook. The frontend is a pure
 * schema-driven renderer: every dropdown / filter pill / Kanban column /
 * lockdown target picker / analytics grouping reads from here instead of a
 * static array. Backed by GET /api/config/catalog (live DB, short TTL cache).
 *
 * Returns null while loading / on error; consumers render an explicit
 * "no data" state rather than fabricating a default list.
 */
export interface CatalogItem {
  code: string;
  name?: string;
  count?: number;
}
export interface Catalog {
  departments: CatalogItem[];
  hostelBlocks: CatalogItem[];
  yearSections: { year: number; section: string }[];
  gates: CatalogItem[];
  passTypes: Array<{
    code: string;
    name: string;
    requiresApproval?: boolean;
    approvalFlow?: string;
  }>;
  roles: CatalogItem[];
  complaintCategories: CatalogItem[];
  // Zero-hardcoding topology + versioned policy (code-keyed, no raw UUIDs).
  orgUnits: Array<{ code: string; name: string; type: string }>;
  facilities: Array<{ code: string; name: string; category: string; config?: Record<string, unknown> }>;
  activeRegulations: Array<{ code: string; version: number; status: string }>;
  workflowSchemas: Array<{ key: string; name: string; states: Record<string, unknown>; formSchema: Record<string, unknown> }>;
  /** JSON Schema + UI Schema form registry (form_schemas, migration 59). */
  formSchemas: Array<{
    key: string;
    name: string;
    description?: string;
    jsonSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
    workflowCode?: string | null;
    bypassStaging: boolean;
  }>;
  /** Exam-eligibility thresholds for the client What-If simulator. */
  examEligibility: {
    eligibleMinPct: number | null;
    condonationMinPct: number | null;
    requireFeesPaid: boolean;
    requireAcademicActive: boolean;
  };
  routingPolicies: Array<{ key: string; category: string; stage1: string; status: string; version: number }>;
  governanceMatrix: Array<{ key: string; channel: string; approvers: number; status: string; version: number }>;
  retentionRules: Array<{ key: string; artifact: string; hotDays: number; coldYears: number; status: string }>;
  spatialPolicies: Array<{ key: string; role: string; layers: string[]; status: string }>;
  programBlueprints: Array<{
    code: string;
    name: string;
    totalSemesters: number;
    entrySemester: number;
    componentTypes: string[];
    status: string;
  }>;
  subjectEquivalency: Array<{
    key: string;
    source: string;
    target: string;
    credits: number;
    status: string;
  }>;
  lifecyclePlaybooks: Array<{
    key: string;
    trigger: string;
    onCompletion: string | null;
    onDetention: string | null;
    status: string;
  }>;
  integrationAdapters: Array<{
    key: string;
    direction: string;
    transport: string;
    status: string;
  }>;
  /**
   * HOD OS policy layer — every threshold the HOD screens render (eligibility
   * JSONLogic, course-offering rules, routing/escalation, HOD form schemas,
   * LLM circuit state, HOD 1-click vs quorum governance scope). Zero
   * hardcoding: the HOD UI is a pure schema renderer on this object.
   */
  hodOsPolicy: {
    activeRegulation: string | null;
    eligibilityJsonLogic: Record<string, unknown> | null;
    courseOffering: {
      minEnrollment: number | null;
      maxSectionCapacity: number | null;
      alternateReallocationWindowDays: number | null;
      maxAdditionalElectiveCredits: number | null;
      facultyMenteeRatioMax: number | null;
    };
    routing: {
      privateOnlyCategories: string[];
      escalationChain: string[];
      abstentionClusterThreshold: number;
      slaTimeoutHours: number | null;
    };
    hodActions: {
      oneClick: string[];
      quorumLocked: Array<{ key: string; approvers: number }>;
    };
    llmCircuitOpen: boolean;
    hodFormSchemas: Array<{
      key: string;
      name: string;
      description?: string;
      jsonSchema: Record<string, unknown>;
      uiSchema: Record<string, unknown>;
    }>;
  };
  /**
   * Principal (Data Owner / CAC Chair) OS policy layer — the two-person quorum
   * split (1-click vs StepUpModal quorum), retention TTLs, audit-gated
   * emergency telemetry, and the declarative annual-rollover playbook. Zero
   * hardcoding: the Principal UI renders these live, not static arrays.
   */
  principalOsPolicy: {
    activeRegulation: string | null;
    quorumActions: Array<{
      key: string;
      requiredApprovers: number;
      eligibleRoles: string[];
      isImmutableMetaRule: boolean;
    }>;
    oneClickActions: string[];
    retention: Array<{ policyKey: string; hotDays: number | null; coldYears: number | null }>;
    emergencyTelemetry: { gated: boolean; layers: string[] };
    rollover: {
      playbookKey: string | null;
      status: string | null;
      transitions: Array<{ from: string; to: string; label: string }>;
    };
    llmCircuitOpen: boolean;
  };
  generated_at: string;
}

export function useCatalog(enabled = true): {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: Catalog;
  }>("/api/config/catalog", { ttlMs: 60_000, enabled });
  return {
    catalog: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
