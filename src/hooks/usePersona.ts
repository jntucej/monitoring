/**
 * hooks/usePersona.ts — derive the current user's persona from auth store.
 *
 * Persona is derived in priority order:
 *   1. Explicit `user.persona` field (set by admin, highest priority)
 *   2. `user.currentEntryType` ("hosteller" / "day_scholar")
 *   3. Residence evidence: `user.hostelBlock` or `user.roomNumber` → hosteller
 *   4. Default: day_scholar
 *
 * No prop threading — every component calls `usePersona()` once.
 */

"use client";

import { useAuthStore } from "@/stores/authStore";
import type { Persona } from "@/lib/pass-types";

/**
 * Read an arbitrary key off a User-shaped object without TypeScript complaining.
 * Casts through `unknown` to silence the index-signature check.
 */
function userField(user: unknown, key: string): unknown {
  return (user as Record<string, unknown> | null)?.[key];
}

export function usePersona(): Persona {
  const user = useAuthStore((s) => s.user);
  if (!user) return "day_scholar";

  // 1. Explicit persona field (future: populated by /api/me)
  const explicit = userField(user, "persona");
  if (explicit === "day_scholar" || explicit === "hosteller") return explicit;

  // 2. currentEntryType from student_details
  const entryType = userField(user, "currentEntryType");
  if (entryType === "hosteller" || entryType === "day_scholar") return entryType;

  // 3. Residence evidence
  const hostelBlock = userField(user, "hostelBlock");
  const roomNumber = userField(user, "roomNumber");
  if (hostelBlock || roomNumber) return "hosteller";

  // 4. Default
  return "day_scholar";
}

export default usePersona;
