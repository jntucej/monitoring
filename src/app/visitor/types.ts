/**
 * Shared response types for the visitor portal sub-pages.
 * Each sub-page renders a DISTINCT slice of /api/visitors/mine, so the
 * shape is declared here once and imported everywhere.
 */

export interface VisitorRegistrationSlice {
  name: string | null;
  uniqueId: string | null;
  role: string | null;
  status: string | null;
}

export interface VisitorHostSlice {
  name: string | null;
  uniqueId: string | null;
  role: string | null;
}

export interface VisitorApprovalSlice {
  state: "ACTIVE" | "COMPLETED" | "NONE";
  checkedInAt: string | null;
  checkedOutAt?: string | null;
  purpose: string | null;
}

export interface VisitorCheckInOutSlice {
  checkedInAt: string | null;
  checkedOutAt: string | null;
  durationMinutes: number | null;
}

export interface VisitorDetailsSlice {
  purpose: string | null;
  hostName: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  status: string | null;
}

export interface VisitorRequestSlice {
  requestedAt: string | null;
  purpose: string | null;
  hostName: string | null;
  state: "ACTIVE" | "COMPLETED" | "NONE";
}

export interface VisitorLogRow {
  id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  host_user_id: string | null;
  purpose: string | null;
  status: string;
  person?: {
    name: string | null;
    email: string | null;
    unique_id: string | null;
    roll: string | null;
    role: string | null;
    status: string | null;
  };
  host?: {
    name: string | null;
    email: string | null;
    unique_id: string | null;
    roll: string | null;
    role: string | null;
  };
}

export interface VisitorsMineResponse {
  success: boolean;
  data: {
    logs: VisitorLogRow[];
    active: { status: string; log: VisitorLogRow } | null;
    lastCompleted: VisitorLogRow | null;
    registration: VisitorRegistrationSlice;
    hostInfo: VisitorHostSlice;
    approvalStatus: VisitorApprovalSlice;
    checkInOut: VisitorCheckInOutSlice;
    visitDetails: VisitorDetailsSlice;
    request: VisitorRequestSlice;
    history: VisitorLogRow[];
  };
}
