export type MealType = "BREAKFAST" | "LUNCH" | "DINNER";
export const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];
export const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast (Tiffin)",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** Default serving window per meal, in Asia/Kolkata. */
export const MEAL_WINDOW: Record<MealType, { start: [number, number]; end: [number, number] }> = {
  BREAKFAST: { start: [7, 0], end: [9, 30] },
  LUNCH:     { start: [12, 0], end: [14, 30] },
  DINNER:    { start: [19, 0], end: [21, 30] },
};

export type Satisfaction = "VERY_GOOD" | "GOOD" | "AVERAGE" | "BAD" | "VERY_BAD";
export const SATISFACTION_LEVELS: {
  value: Satisfaction;
  label: string;
  emoji: string;
  score: number;
  tone: string;
}[] = [
  { value: "VERY_GOOD", label: "Very Good", emoji: "😍", score: 5, tone: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { value: "GOOD",      label: "Good",      emoji: "🙂", score: 4, tone: "text-lime-400 border-lime-500/40 bg-lime-500/10" },
  { value: "AVERAGE",   label: "Average",   emoji: "😐", score: 3, tone: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { value: "BAD",       label: "Bad",       emoji: "🙁", score: 2, tone: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  { value: "VERY_BAD",  label: "Very Bad",  emoji: "😞", score: 1, tone: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
];

export function satisfactionScore(s: Satisfaction): number {
  return SATISFACTION_LEVELS.find((x) => x.value === s)?.score ?? 0;
}

export function satisfactionLabel(s: Satisfaction): string {
  return SATISFACTION_LEVELS.find((x) => x.value === s)?.label ?? s;
}

export type SpecialItemCategory = "VEG" | "NON_VEG" | "SWEET" | "OTHER";
export const SPECIAL_CATEGORIES: { value: SpecialItemCategory; label: string; tone: string }[] = [
  { value: "VEG",     label: "Veg",     tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { value: "NON_VEG", label: "Non-Veg", tone: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
  { value: "SWEET",   label: "Sweet",   tone: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { value: "OTHER",   label: "Other",   tone: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
];

export type SpecialEventStatus = "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";

export interface SpecialItem {
  id: string;
  code: string;
  label: string;
  category: SpecialItemCategory;
  isPrimary: boolean;
  sortOrder: number;
}

export interface SpecialEvent {
  id: string;
  title: string;
  eventDate: string;
  mealType: MealType;
  announcementAt: string;
  interestDeadline: string;
  servingStartAt: string;
  servingEndAt: string;
  notes: string | null;
  status: SpecialEventStatus;
  hostelOnly: boolean;
  items: SpecialItem[];
  myItemIds: string[];
  counts: Record<string, number>;
  canGetToken: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Derive the effective status from the timestamps + manual status. */
export function effectiveEventStatus(
  e: Pick<SpecialEvent, "status" | "announcementAt" | "interestDeadline">,
  now: Date = new Date(),
): SpecialEventStatus {
  if (e.status === "CANCELLED") return "CANCELLED";
  if (e.status === "CLOSED") return "CLOSED";
  const nowMs = now.getTime();
  const ann = new Date(e.announcementAt).getTime();
  const dl = new Date(e.interestDeadline).getTime();
  if (nowMs < ann) return "SCHEDULED";
  if (nowMs <= dl) return "OPEN";
  return "CLOSED";
}

export function canStudentRespond(e: SpecialEvent, now: Date = new Date()): boolean {
  return effectiveEventStatus(e, now) === "OPEN";
}

/** True if the meal token can be issued right now. */
export function canIssueToken(e: SpecialEvent, now: Date = new Date()): boolean {
  if (e.status !== "SCHEDULED" && e.status !== "OPEN") return false;
  const n = now.getTime();
  const dl = new Date(e.interestDeadline).getTime();
  const start = new Date(e.servingStartAt).getTime();
  const end = new Date(e.servingEndAt).getTime();
  // Token can be issued from 1h before serving_start until serving_end.
  return n >= Math.max(dl, start - 60 * 60_000) && n <= end;
}

export function countdownLabel(deadlineIso: string, now: Date = new Date()): string {
  const ms = new Date(deadlineIso).getTime() - now.getTime();
  if (ms <= 0) return "Closed";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

/** Hostel-student check used by every token endpoint. */
export interface HostelStatus {
  isHostelStudent: boolean;
  reason?: string;
  studentType?: string | null;
  currentEntryType?: string | null;
  hostelBlock?: string | null;
}

export function classifyHostelStatus(row: {
  role?: string;
  student_type?: string | null;
  current_entry_type?: string | null;
  hostel_block?: string | null;
}): HostelStatus {
  if (row.role && row.role !== "student") {
    return { isHostelStudent: false, reason: "not_a_student", studentType: row.student_type ?? null };
  }
  const st = row.student_type ?? null;
  const ce = row.current_entry_type ?? null;
  const hb = row.hostel_block ?? null;
  const isHostel = st === "HM" || st === "HF" || ce === "hosteller" || (hb !== null && hb !== "");
  if (isHostel) {
    return { isHostelStudent: true, studentType: st, currentEntryType: ce, hostelBlock: hb };
  }
  return {
    isHostelStudent: false,
    reason: st === "DM" || st === "DF" ? "day_scholar" : "not_hostel_student",
    studentType: st,
    currentEntryType: ce,
    hostelBlock: hb,
  };
}
