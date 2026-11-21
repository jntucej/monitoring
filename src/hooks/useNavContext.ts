// src/hooks/useNavContext.ts
//
// P1: build the NavContext slice the shell sidebar evaluates `when(ctx)`
// against. Reads the trusted auth store's user record (residential signal)
// and the current persona. Pure client-side projection — no DB.
//
// The manifest stays static data; this hook supplies the live slice that
// makes the SAME manifest render different nav for a day scholar vs a
// hosteller. No new component — one hook + one manifest field.

"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePersona } from "@/hooks/usePersona";
import type { NavContext } from "@/components/shell/types";

export function useNavContext(role: string = "student"): NavContext {
  const user = useAuthStore((s) => s.user);
  const roleValue = useAuthStore((s) => s.role) ?? role;
  const persona = usePersona();

  return useMemo<NavContext>(
    () => ({
      roles: [roleValue],
      personType: roleValue,
      // residentialStatus: where the person lives (stable). persona resolves
      // to hosteller | day_scholar; default day_scholar (no hostel features).
      residentialStatus: persona === "hosteller" ? "hosteller" : "day_scholar",
      // campusStatus: where they are NOW. The auth store doesn't carry live
      // gate state, so default "unknown" — the nav gate is fail-open, so
      // unknown never blanks the sidebar. (A deeper integration would read
      // campus_occupancy; out of scope for the nav layer.)
      campusStatus: "unknown",
    }),
    [roleValue, persona],
  );
}
