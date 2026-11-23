export type CampusEventKind =
  | "pass"
  | "gate_scan"
  | "attendance"
  | "timetable_slot"
  | "assignment"
  | "mess_meal"
  | "complaint"
  | "system_alert";

export interface CampusEvent {
  id: string;
  kind: CampusEventKind;
  title: string;
  occurredAt: string;
  status:
    | "open"
    | "action_required"
    | "in_progress"
    | "completed"
    | "breached"
    | "cancelled";
  actorName?: string;
  targetRole?: string;
  targetPersonName?: string;
  presenceMark?: "present" | "not_present" | "unknown";
  locationOrScope?: string;
  summary?: string;
}
