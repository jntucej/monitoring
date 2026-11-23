export type SlotStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "swapped"
  | "exam_override"
  | "holiday";

export interface ResolvedTimetableSlot {
  id: string;
  date: string; // YYYY-MM-DD
  periodNumber: number;
  startTime: string; // "09:30"
  endTime: string; // "10:20"
  classId: string;
  classLabel: string;
  subjectCode: string;
  subjectLabel: string;
  facultyId: string;
  facultyName: string;
  roomNumber: string | null;
  status: SlotStatus;
  attendanceMarked: boolean;
  overrideNote?: string;
}

export interface TimetableOverride {
  slotId?: string;
  periodNumber?: number;
  date: string;
  status: SlotStatus;
  overrideNote?: string;
  substituteFacultyId?: string;
  substituteFacultyName?: string;
}

export interface TimetableRoleAbility {
  canEditMasterSlot: boolean;
  canRequestSwapOrCancel: boolean;
  canApproveOverride: boolean;
  canMarkAttendance: boolean;
  nextActionLabel: string | null;
  nextActionHref: (slot: ResolvedTimetableSlot) => string | null;
}

export function getTimetableAbility(role: string | undefined): TimetableRoleAbility {
  const r = (role ?? "student").toLowerCase();

  if (r === "faculty") {
    return {
      canEditMasterSlot: false,
      canRequestSwapOrCancel: true,
      canApproveOverride: false,
      canMarkAttendance: true,
      nextActionLabel: "Take Attendance",
      nextActionHref: (slot) =>
        `/faculty/attendance/${slot.classId}?period=${slot.periodNumber}&date=${slot.date}`,
    };
  }

  if (r === "hod") {
    return {
      canEditMasterSlot: true,
      canRequestSwapOrCancel: true,
      canApproveOverride: true,
      canMarkAttendance: true,
      nextActionLabel: "Manage Period / Sub",
      nextActionHref: (slot) => `/hod/classes?classId=${slot.classId}&slotId=${slot.id}`,
    };
  }

  if (["admin", "sysadmin", "vice_principal", "principal"].includes(r)) {
    return {
      canEditMasterSlot: true,
      canRequestSwapOrCancel: false,
      canApproveOverride: true,
      canMarkAttendance: false,
      nextActionLabel: "Edit Assignment",
      nextActionHref: () => "/admin/faculty-assignments",
    };
  }

  return {
    canEditMasterSlot: false,
    canRequestSwapOrCancel: false,
    canApproveOverride: false,
    canMarkAttendance: false,
    nextActionLabel: r === "student" ? "Attendance History" : null,
    nextActionHref: () => (r === "student" ? "/student/attendance-calendar" : null),
  };
}

export function resolveTimetableSlots(
  baseSlots: ResolvedTimetableSlot[],
  overrides: TimetableOverride[],
  date: string,
): ResolvedTimetableSlot[] {
  const dayOverrides = overrides.filter((o) => o.date === date);
  return baseSlots.map((slot) => {
    const match = dayOverrides.find(
      (o) => (o.slotId && o.slotId === slot.id) || o.periodNumber === slot.periodNumber,
    );
    if (!match) return { ...slot, date };
    return {
      ...slot,
      date,
      status: match.status,
      overrideNote: match.overrideNote ?? slot.overrideNote,
      facultyId: match.substituteFacultyId ?? slot.facultyId,
      facultyName: match.substituteFacultyName ?? slot.facultyName,
    };
  });
}
