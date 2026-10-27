/**
 * Shared response types for the staff console sub-pages.
 * Each sub-page renders a DISTINCT slice of /api/staff/my-day (or another
 * distinct endpoint), so the shapes are declared here once.
 */

export interface MovementRow {
  id: string;
  user_id: string;
  gate_id: string | null;
  direction: string;
  timestamp: string;
}

export interface StaffRequestRow {
  id: string;
  ticket_number: string | null;
  workflow_type: string;
  status: string;
  current_stage: string | null;
  created_at: string;
  updated_at: string;
}

export interface DutyRosterRow {
  id: string;
  name: string;
  role: string;
}

export interface AssignedTasksSlice {
  openRequests: StaffRequestRow[];
  lastMovement: MovementRow | null;
  totalOpen: number;
}

export interface DutiesSlice {
  roster: DutyRosterRow[];
  totalOnShift: number;
}

export interface MyDaySummarySlice {
  movementsToday: number;
  lastMovements: MovementRow[];
  openRequestsCount: number;
  rosterOnShift: number;
}

export interface NotificationRow {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string | null;
  meta?: unknown;
}

export interface StaffMyDayResponse {
  success: boolean;
  data: {
    myRecent: MovementRow[];
    openRequests: StaffRequestRow[];
    dutyRoster: DutyRosterRow[];
    assignedTasks: AssignedTasksSlice;
    duties: DutiesSlice;
    myDaySummary: MyDaySummarySlice;
    notifications: NotificationRow[];
  };
}
