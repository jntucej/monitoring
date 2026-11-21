// src/lib/teaching-binding.ts
// Client-safe helper: checks if a user has an active teaching binding via
// a lightweight API call. The actual DB check happens server-side in
// /api/teaching-bindings. This file is imported by client components
// (faculty layout, RoleSidebar) and must not import pg directly.

export interface TeachingBinding {
  subjectCode: string;
  classId: string;
  className: string;
  role: string;
}

const cache = new Map<string, TeachingBinding[]>();

export async function getTeachingBindings(userId: string): Promise<TeachingBinding[]> {
  const cached = cache.get(userId);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/teaching-bindings?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const body = await res.json();
    const rows: TeachingBinding[] = body.data ?? [];
    cache.set(userId, rows);
    return rows;
  } catch {
    return [];
  }
}

export async function hasTeachingBinding(userId: string): Promise<boolean> {
  const bindings = await getTeachingBindings(userId);
  return bindings.length > 0;
}

export function clearTeachingBindingCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
