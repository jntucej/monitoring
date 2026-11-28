"use client";

/**
 * useStudentState — the single state hook for the catalog-driven Student OS.
 * Backed by GET /api/student/state (live DB, per-student, null-tolerant).
 *
 * Every consumer must render an explicit "no data" state when a field is
 * null — no fabricated percentages, no seeded defaults.
 */
import { useApiResource } from "@/hooks/useApiResource";

export interface StudentState {
  identity: {
    rollNo: string | null;
    name: string;
    program: string | null;
    regulationId: string | null;
    branch: string | null;
    section: string | null;
    semester: number | null;
    isResidential: boolean;
    facultyAdvisor: string | null;
  };
  academic: {
    attendedClasses: number;
    totalClasses: number;
    aggregatePct: number | null;
    hallTicketStatus: string | null;
    duesBalanceInr: number | null;
    disciplinaryClearance: boolean | null;
    activeCondonation: boolean;
    hasAttendanceData: boolean;
  };
  gate: {
    campusStatus: "INSIDE" | "OUTSIDE" | null;
    activePass: {
      id: string;
      reason: string;
      from: string;
      to: string;
      status: string;
      qrCode: string;
      approvalStep: number;
      approvalTotal: number;
      deadlineWatchDueAt: string | null;
    } | null;
    anomalyTag: string | null;
  };
  authorityBridge: {
    classFeedItems: Array<{
      id: string;
      kind: "circular" | "official_answer";
      body: string;
      constraintTag?: string;
      superseded?: boolean;
      at: string;
    }>;
    agentMessages: Array<{
      id: string;
      question: string;
      answer: string | null;
      fastLookupMode: boolean;
      at: string;
    }>;
    privateTickets: Array<{
      id: string;
      title: string;
      assignedRole: string;
      slaDueAt: string;
      nextEscalationRole: string | null;
      status: string;
    }>;
  };
}

export function useStudentState(enabled = true): {
  state: StudentState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: StudentState;
  }>("/api/student/state", { ttlMs: 30_000, enabled });
  return {
    state: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
