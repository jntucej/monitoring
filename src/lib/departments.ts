import { getDbClient } from "@/lib/db";
import { getCached, setCached } from "./cache";
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache-tags';

const CACHE_VERSION = 2;
const CACHE_TTL_SECONDS = 300;

async function getCacheKey(suffix: string): Promise<string> {
  return `departments:v${CACHE_VERSION}:${suffix}`;
}

export interface DepartmentInfo {
  id?: string;
  code: string;
  numericCode?: string;
  shortName: string;
  name: string;
  hod?: string;
}

function mapRow(row: any): DepartmentInfo {
  return {
    id: row.id,
    code: row.code,
    numericCode: row.numeric_code || row.numericCode || undefined,
    shortName: row.short_name || row.shortName || row.code,
    name: row.name || row.full_name || row.code,
    hod: row.hod || "Not Assigned",
  };
}

export async function getDepartments(): Promise<DepartmentInfo[]> {
  const key = await getCacheKey('all');
  const cached = await getCached<DepartmentInfo[]>(key);
  if (cached) return cached;

  try {
    const { data, error } = await getDbClient()
      .from("departments")
      .select("*")
      .order("code");

    if (error) throw error;
    const departments = (data || []).map(mapRow);
    await setCached(key, departments, CACHE_TTL_SECONDS);
    return departments;
  } catch (error) {
    console.error("[Departments Service] Failed to fetch departments:", error);
    return [];
  }
}

export async function createDepartment(input: {
  code: string; name: string; numericCode?: string; shortName?: string;
}): Promise<DepartmentInfo> {
  const svc = getDbClient();
  const { data, error } = await svc.from("departments").insert({
    code: input.code.toUpperCase(),
    name: input.name,
    numeric_code: input.numericCode ?? null,
    short_name: input.shortName ?? input.code.toUpperCase(),
  }).select().single();
  if (error) throw new Error(error.message);
  (revalidateTag as any)(CACHE_TAGS.departments);
  return mapRow(data);
}

export async function updateDepartment(
  code: string,
  patch: Partial<{ name: string; numericCode: string; shortName: string }>
): Promise<DepartmentInfo> {
  const svc = getDbClient();
  const { data, error } = await svc.from("departments")
    .update({
      ...(patch.name        !== undefined && { name: patch.name }),
      ...(patch.numericCode !== undefined && { numeric_code: patch.numericCode }),
      ...(patch.shortName   !== undefined && { short_name: patch.shortName }),
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .select()
    .single();
  if (error) throw new Error(error.message);
  (revalidateTag as any)(CACHE_TAGS.departments);
  return mapRow(data);
}

export async function deleteDepartment(code: string): Promise<void> {
  const svc = getDbClient();

  const { count } = await svc.from("users")
    .select("id", { count: "exact", head: true })
    .eq("department_id", code);
  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete ${code}: ${count} user(s) still assigned.`);
  }

  const { error, count: deleted } = await svc.from("departments")
    .delete({ count: "exact" })
    .eq("code", code);
  if (error) throw new Error(error.message);
  if (!deleted) throw new Error(`Department ${code} not found`);

  (revalidateTag as any)(CACHE_TAGS.departments);
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
