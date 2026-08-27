import { supabase } from "./supabaseClient";
import { getCached, setCached } from "./cache";

export interface DepartmentInfo {
  code: string;
  numericCode?: string;
  shortName: string;
  name: string;
  hod?: string;
}

const FALLBACK_DEPARTMENTS: DepartmentInfo[] = [
  { code: "CSE",   numericCode: "01", shortName: "CSE",   name: "Computer Science & Engineering",          hod: "Dr. K. Sridhar" },
  { code: "EEE",   numericCode: "02", shortName: "EEE",   name: "Electrical & Electronics Engineering",    hod: "Dr. K. Ramesh" },
  { code: "ME",    numericCode: "03", shortName: "ME",    name: "Mechanical Engineering",                  hod: "Dr. R. Mahesh" },
  { code: "ECE",   numericCode: "04", shortName: "ECE",   name: "Electronics & Communication Engineering", hod: "Dr. M. Srinivas" },
  { code: "IT",    numericCode: "12", shortName: "IT",    name: "Information Technology",                  hod: "Dr. P. Sreedhar" },
  { code: "CIVIL", numericCode: "06", shortName: "CIVIL", name: "Civil Engineering",                       hod: "Dr. A. Kumar" },
];

const CACHE_KEY = "departments:all";
const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function getDepartments(): Promise<DepartmentInfo[]> {
  try {
    const cached = await getCached<DepartmentInfo[]>(CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const { data, error } = await supabase
      .from("departments")
      .select("*");

    if (error || !data || data.length === 0) {
      return FALLBACK_DEPARTMENTS;
    }

    const depts: DepartmentInfo[] = data.map((row: any) => ({
      code: row.code,
      numericCode: row.numeric_code || row.numericCode || undefined,
      shortName: row.short_name || row.shortName || row.code,
      name: row.name || row.full_name || row.code,
      hod: row.hod || "Not Assigned",
    }));

    await setCached(CACHE_KEY, depts, CACHE_TTL_SECONDS);
    return depts;
  } catch (error) {
    console.error("[Departments Service] Failed to fetch departments:", error);
    return FALLBACK_DEPARTMENTS;
  }
}

export async function getDepartmentByCode(code: string): Promise<DepartmentInfo | null> {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const depts = await getDepartments();
  return depts.find(d =>
    d.code.toUpperCase() === normalized ||
    d.shortName.toUpperCase() === normalized ||
    d.numericCode === normalized
  ) || null;
}

export async function getDepartmentByNumericCode(numericCode: string): Promise<DepartmentInfo | null> {
  if (!numericCode) return null;
  const normalized = numericCode.trim();
  const depts = await getDepartments();
  return depts.find(d => d.numericCode === normalized) || null;
}

export async function getDepartmentByShortName(shortName: string): Promise<DepartmentInfo | null> {
  if (!shortName) return null;
  const normalized = shortName.trim().toUpperCase();
  const depts = await getDepartments();
  return depts.find(d => d.shortName.toUpperCase() === normalized || d.code.toUpperCase() === normalized) || null;
}
