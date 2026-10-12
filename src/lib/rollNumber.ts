/**
 * Roll Number Parser & Decoder
 *
 * Decodes the 10-character JNTUH hall-ticket / roll-number schema:
 *
 *   ┌──────┬─────────┬────────────┬─────────────┬──────────┐
 *   │  25  │   JJ    │     5A     │     12      │    03    │
 *   └──────┴─────────┴────────────┴─────────────┴──────────┘
 *    Year  College  Entry/Degree  Department  Sequence
 *    (2)   (2 α)    (2 αnum)      (2 digits)  (2 αnum)
 *
 * Reference: SEMANTICS_GATE_MONITOR.md § roll-number structural blueprint
 *            + user-provided decoding model.
 */

/* ------------------------------------------------------------------ *
 *  TYPE DEFINITIONS
 * ------------------------------------------------------------------ */

export type CollegeCode = "JJ"; // JNTUH University College of Engineering Jagtial (UCEJ)
export type EntryModeCode = "1A" | "5A"; // Regular B.Tech | Lateral Entry B.Tech / M.Tech

export interface CourseType {
  name: string;
  shortName: string;
  /** Total programme duration in years. */
  durationYears: number;
  /** Entry mode that admits students directly into the 2nd year. */
  lateralEntryMode: EntryModeCode;
}

export const COURSE_TYPES: Record<string, CourseType> = {
  "B.Tech": {
    name: "B.Tech",
    shortName: "B.Tech",
    durationYears: 4,
    lateralEntryMode: "5A",
  },
  "M.Tech": {
    name: "M.Tech",
    shortName: "M.Tech",
    durationYears: 2,
    lateralEntryMode: "5A",
  },
};

/**
 * Resolve the course type from a roll + optional course label. The COURSE
 * column in the import sheet is authoritative when present; otherwise the
 * roll's branch/entry codes only tell us the degree if we know the mapping.
 */
export function resolveCourseType(
  courseLabel?: string | null,
  entryModeCode?: EntryModeCode
): CourseType {
  const norm = (courseLabel || "").trim().toUpperCase();
  if (norm === "M.TECH" || norm === "MTECH") return COURSE_TYPES["M.Tech"];
  if (norm === "B.TECH" || norm === "BTECH") return COURSE_TYPES["B.Tech"];
  // Fallback: B.Tech is the default programme at this college.
  return COURSE_TYPES["B.Tech"];
}
export type RollDeptCode = "02" | "03" | "04" | "05" | "12"; // EEE | ME | ECE | CSE | IT

export interface CollegeInfo {
  code: CollegeCode;
  name: string;
  shortName: string;
}

export interface EntryModeInfo {
  code: EntryModeCode;
  label: string;
  description: string;
  durationYears: number;
}

export interface RollNumberDecoded {
  /** Full raw roll number string (e.g. "24JJ1A0201") */
  raw: string;
  /** Full 4-digit admission year (e.g. 2024) */
  admissionYear: number;
  /** Last 2 digits of admission year (e.g. 24) */
  yearCode: string;
  /** College code (e.g. "JJ") */
  collegeCode: CollegeCode;
  /** College display name */
  collegeName: string;
  /** College short name */
  collegeShortName: string;
  /** Entry mode code (e.g. "1A") */
  entryModeCode: EntryModeCode;
  /** Entry mode label (e.g. "Regular B.Tech") */
  entryMode: string;
  /** Entry mode description */
  entryModeDescription: string;
  /** Department code as it appears in roll (e.g. "02", "12") */
  departmentCode: string;
  /** Department short name (e.g. "EEE", "CSE") */
  department: string;
  /** Department full name (e.g. "Electrical & Electronics Engineering") */
  departmentFullName: string;
  /** Full human-readable department + entry label */
  branch: string;
  /** Student serial index within the batch+dept+entry group */
  serial: string;
  /** Parsed integer serial (when numeric) */
  serialNumber?: number;
}

/* ------------------------------------------------------------------ *
 *  CONSTANTS
 * ------------------------------------------------------------------ */

/**
 * College codes used in positions 3–4 of the roll number.
 * Reference: the decoding model specifies `JJ` → JNTUH UCEJ.
 */
export const COLLEGE_CODES: Record<string, CollegeInfo> = {
  JJ: {
    code: "JJ",
    name: "JNTUH CEJ",
    shortName: "JNTUH CEJ",
  },
};

/**
 * Entry-mode / degree codes used in positions 5–6 of the roll number.
 * Reference: the decoding model specifies:
 *   `1A` → Regular 4-Year B.Tech (1st year entry)
 *   `5A` → Lateral Entry B.Tech (2nd year / 3rd semester entry)
 */
export const ENTRY_MODE_CODES: Record<string, EntryModeInfo> = {
  "1A": {
    code: "1A",
    label: "Regular B.Tech",
    description: "Regular 4-Year B.Tech (Joined in 1st year)",
    durationYears: 4,
  },
  "5A": {
    code: "5A",
    label: "Lateral Entry B.Tech",
    description: "Lateral Entry B.Tech (Joined directly into 2nd year / 3rd semester)",
    durationYears: 3,
  },
};

/**
 * Department codes used in positions 7–8 of the roll number.
 *
 * **Important:** These numeric codes differ from the internal `DEPARTMENT_CODES`
 * mapping in types.ts. The roll-number schema uses a different numbering:
 *   02 → EEE, 03 → ME, 04 → ECE, 05 → CSE, 12 → IT
 *
 * Reference: user-provided decoding model.
 */
export const ROLL_DEPT_CODES: Record<string, { short: string; full: string }> = {
  "01": { short: "CIVIL", full: "Civil Engineering" },
  "02": { short: "EEE", full: "Electrical & Electronics Engineering" },
  "03": { short: "MECH", full: "Mechanical Engineering" },
  "04": { short: "ECE", full: "Electronics & Communication Engineering" },
  "05": { short: "CSE", full: "Computer Science & Engineering" },
  "12": { short: "IT",  full: "Information Technology" },
};

/**
 * Regex that validates the 10-character roll-number structure.
 *
 * Breakdown:
 *   ^(\d{2})       – YY: 2 digits (year)
 *   ([A-Z]{2})     – CC: 2 uppercase letters (college)
 *   ([0-9A-Z]{2})  – ED: 2 alphanumeric (entry/degree)
 *   (\d{2})        – BB: 2 digits (department)
 *   ([0-9A-Z]{2})  – SS: 2 alphanumeric (serial)
 *   $
 */
export const ROLL_NUMBER_REGEX = /^(\d{2})([A-Z]{2})([0-9A-Z]{2})(\d{2})([0-9A-Z]{2})$/;

/* ------------------------------------------------------------------ *
 *  CORE FUNCTIONS
 * ------------------------------------------------------------------ */

/**
 * Parse a 10-character roll number (hall ticket number) into its
 * structural components.
 *
 * Follows the 5-part composite schema:
 *   YY CC ED BB SS
 *
 * @param roll - The raw roll number string (case-insensitive).
 * @returns Decoded `RollNumberDecoded` object, or `null` if the roll
 *          number does not match the expected schema.
 *
 * @example
 * ```ts
 * const decoded = parseRollNumber("24JJ1A0201");
 * // { admissionYear: 2024, college: "JJ (UCEJ)", entryMode: "1A (Regular B.Tech)",
 * //   department: "02 (EEE)", serial: "01" }
 *
 * const decoded2 = parseRollNumber("25JJ5A1203");
 * // { admissionYear: 2025, entryMode: "5A (Lateral Entry)",
 * //   department: "12 (IT)", serial: "03" }
 * ```
 */
export function parseRollNumber(roll: string | null | undefined): RollNumberDecoded | null {
  if (!roll) return null;

  const normalized = roll.trim().toUpperCase().replace(/\s+/g, "");

  const match = normalized.match(ROLL_NUMBER_REGEX);
  if (!match) return null;

  const [, yearCode, collegeCode, entryModeCode, deptCode, serial] = match;

  // Validate college code
  const collegeInfo = COLLEGE_CODES[collegeCode];
  if (!collegeInfo) return null;

  // Validate entry mode
  const entryInfo = ENTRY_MODE_CODES[entryModeCode as EntryModeCode];
  if (!entryInfo) return null;

  // Validate department code
  const deptInfo = ROLL_DEPT_CODES[deptCode];
  if (!deptInfo) return null;

  // Compute full admission year (2000–2099 range)
  const yearNum = parseInt(yearCode, 10);
  const admissionYear = 2000 + yearNum;

  // Try to parse serial as number
  const serialNumber = /^\d{2}$/.test(serial) ? parseInt(serial, 10) : undefined;

  return {
    raw: normalized,
    admissionYear,
    yearCode,
    collegeCode: collegeCode as CollegeCode,
    collegeName: collegeInfo.name,
    collegeShortName: collegeInfo.shortName,
    entryModeCode: entryModeCode as EntryModeCode,
    entryMode: entryInfo.label,
    entryModeDescription: entryInfo.description,
    departmentCode: deptCode,
    department: deptInfo.short,
    departmentFullName: deptInfo.full,
    branch: `${deptInfo.short} — ${entryInfo.label}`,
    serial,
    serialNumber,
  };
}

/**
 * Validate whether a string is a well-formed roll number.
 *
 * @param roll - The raw roll number string.
 * @returns `true` if the roll number matches the 10-character schema
 *          **and** every component is a recognised code.
 */
export function validateRollNumber(roll: string | null | undefined): boolean {
  return parseRollNumber(roll) !== null;
}

/**
 * Reconstruct a roll-number string from its decoded components.
 *
 * @param decoded - A partial or complete `RollNumberDecoded`.
 * @returns The 10-character roll number string.
 */
export function formatRollNumber(decoded: Partial<RollNumberDecoded>): string {
  const parts: string[] = [
    decoded.yearCode ?? "",
    decoded.collegeCode ?? "",
    decoded.entryModeCode ?? "",
    decoded.departmentCode ?? "",
    decoded.serial ?? "",
  ];
  return parts.join("");
}

/**
 * Convenience: extract just the department code from a roll number,
 * resolving it to the internal department short-name.
 *
 * This bridges the roll-number department codes (e.g. "02", "12")
 * to the system's internal department short names (e.g. "EEE", "IT").
 *
 * @param roll - The raw roll number string.
 * @returns Department short-name (e.g. "EEE", "CSE") or `null`.
 */
export function getDepartmentFromRoll(roll: string | null | undefined): string | null {
  const decoded = parseRollNumber(roll);
  return decoded ? decoded.department : null;
}

/**
 * Convenience: extract the admission year from a roll number.
 *
 * @param roll - The raw roll number string.
 * @returns Full 4-digit year (e.g. 2024) or `null`.
 */
export function getAdmissionYearFromRoll(roll: string | null | undefined): number | null {
  const decoded = parseRollNumber(roll);
  return decoded ? decoded.admissionYear : null;
}

/**
 * Compute the "today" reference date used for year-of-study calculation,
 * using the Indian academic-year convention: a new academic year starts
 * on July 1. So Jan–Jun of year Y belongs to academic year (Y-1)-Y, and
 * Jul–Dec of year Y belongs to academic year Y-(Y+1).
 *
 *   25-Jan-2027 -> academic year 2026-27
 *   01-Jul-2027 -> academic year 2027-28
 */
export function currentAcademicYearStart(now: Date = new Date()): number {
  // Academic year starts July 1: if month >= July (index 6), the running
  // year is the start of the current AY; otherwise last year is.
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Extract the student's year of study from a roll number, optionally
 * constrained by the course type (B.Tech = 4 years, M.Tech = 2 years).
 *
 * Uses the Indian academic year (July 1 start). A regular B.Tech student
 * (1A) admitted in 2024 (24JJ1A...) is in:
 *   - 1st year during AY 2024-25 (Jul 2024 – Jun 2025)
 *   - 2nd year during AY 2025-26 (Jul 2025 – Jun 2026)
 *   - 3rd year during AY 2026-27 (Jul 2026 – Jun 2027)
 *   - 4th year during AY 2027-28 (Jul 2027 – Jun 2028)
 *
 * A lateral-entry student (5A) joins directly into the 2nd year, so the
 * same admission year puts them one year ahead of a regular student.
 *
 * For M.Tech the programme is 2 years: a 23JJ1A M.Tech regular is in 1st
 * year until Jun 2024, then 2nd (final) year from Jul 2024 onward. A
 * 23JJ5A M.Tech lateral (admitted mid-AY directly into 2nd year) is in
 * their final year from Jul 2023 onward. Both cap at 2.
 *
 * @param roll - The raw roll number string.
 * @param now  - Optional override for "today" (defaults to `new Date()`).
 * @param courseType - Optional course-type code ("B.Tech" | "M.Tech") to
 *   cap the computed year at the programme duration. Defaults to B.Tech (4).
 * @returns Year of study (1–4 for B.Tech, 1–2 for M.Tech) or `null` if
 *         the roll is unparseable.
 */
export function getStudentYearFromRoll(
  roll: string | null | undefined,
  now: Date = new Date(),
  courseType?: string
): number | null {
  const decoded = parseRollNumber(roll);
  if (!decoded) return null;
  const course = resolveCourseType(courseType, decoded.entryModeCode);
  const cap = course.durationYears;
  let yearsElapsed: number;
  if (decoded.entryModeCode === "5A") {
    // Lateral (5A): joins directly into 2nd year of the same batch.
    // A 23JJ5A student is in year 2 during AY 2023-24, year 3 during AY 2024-25,
    // and graduates in the same year as the regular 23JJ1A cohort (2027 for B.Tech).
    // Indian AY: Jul-Dec of calendar year Y belongs to AY Y-(Y+1).
    // "Now" AY start = (month >= 6 ? nowYear : nowYear - 1).
    // Years elapsed for lateral = AY start - admissionYear, capped at (cap - 1)
    // since they start in year 2 (only cap-1 years remain).
    const ayStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    yearsElapsed = Math.min(cap - 1, Math.max(0, ayStart - decoded.admissionYear));
  } else {
    // Regular: 1st year spans Jul–Dec of the admission year. Jan–Jun of the
    // tail belongs to the previous AY's end: 24JJ1A is 3rd year through
    // Jun 2027, and 4th from Jul 2027 onward.
    yearsElapsed = (now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1) - decoded.admissionYear;
  }
  const baseYear = decoded.entryModeCode === "5A" ? 2 : 1;
  let yearOfStudy = yearsElapsed + baseYear;
  if (yearOfStudy <= 0) yearOfStudy = 1;
  return Math.min(cap, Math.max(1, yearOfStudy));
}

/**
 * Compute the batch label from a roll number's admission year, using the
 * Indian academic-year convention. A 2024 admission (24JJ...) belongs to
 * academic year 2024-25, so the batch label is "2024-25".
 */
export function getBatchFromRoll(roll: string | null | undefined): string | null {
  const decoded = parseRollNumber(roll);
  if (!decoded) return null;
  // Batch = admission academic year (AY 2024-25 for a 2024 join).
  return `${decoded.admissionYear}-${String(decoded.admissionYear + 1).slice(-2)}`;
}

/**
 * Build a human-readable description of a roll number.
 *
 * @param roll - The raw roll number string.
 * @returns A description like `"2024 • JJ (UCEJ) • Regular B.Tech • EEE • Student 01"`,
 *          or `"Invalid roll number"` if parsing fails.
 */
export function describeRollNumber(roll: string | null | undefined): string {
  const decoded = parseRollNumber(roll);
  if (!decoded) return "Invalid roll number";

  return [
    decoded.admissionYear,
    `JJ (${decoded.collegeShortName})`,
    decoded.entryMode,
    decoded.department,
    `Student ${decoded.serial}`,
  ].join(" • ");
}

/**
 * Compute the expected graduation year (calendar year) for a student from
 * their roll number. B.Tech = 4 years, M.Tech = 2 years.
 *
 * @param roll - The raw 10-character roll number.
 * @returns The expected graduation year (admissionYear + duration) or `null`
 *          when the roll cannot be parsed.
 */
export function getGraduationYearFromRoll(roll: string | null | undefined): number | null {
  const decoded = parseRollNumber(roll);
  if (!decoded) return null;
  // M.Tech is a 2-year programme; everything else (B.Tech incl. lateral) is 4.
  const courseType = resolveCourseType(undefined, decoded.entryModeCode).name;
  const duration = courseType === "M.Tech" ? 2 : 4;
  return decoded.admissionYear + duration;
}

