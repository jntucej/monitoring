// src/hooks/useWorkspace.ts
//
// Client-side PROJECTION of the server-resolved capability set. This hook is
// the UX layer ONLY — it never computes capabilities itself (guardrail #1).
// It fetches /api/me/workspace and exposes { capabilities, has, ready,
// residentialStatus, campusStatus }. Components gate their visibility on
// `has(capId)` rather than on a raw role check.
//
// Fail-open for the home page: if the fetch fails we return an empty set and
// `ready=false`; callers that gate a *security* surface should hide on
// !ready OR !has, callers that gate *cosmetic* surfaces may show on !ready.

"use client";

import { useEffect, useMemo, useState } from "react";

export interface WorkspaceProjection {
  capabilities: string[];
  residentialStatus: "day_scholar" | "hosteller" | "n_a";
  campusStatus: "in_campus" | "out_campus" | "unknown";
  registryVersion: number;
  ready: boolean;
  has: (id: string) => boolean;
}

export function useWorkspace(): WorkspaceProjection {
  const [caps, setCaps] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<{
    residentialStatus: "day_scholar" | "hosteller" | "n_a";
    campusStatus: "in_campus" | "out_campus" | "unknown";
    registryVersion: number;
  }>({ residentialStatus: "day_scholar", campusStatus: "unknown", registryVersion: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/workspace", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        const ctx = json.context ?? {};
        const capList: string[] = json.capabilities ?? [];
        setCaps(new Set(capList));
        setMeta({
          residentialStatus: ctx.residentialStatus ?? "day_scholar",
          campusStatus: ctx.campusStatus ?? "unknown",
          registryVersion: json.registryVersion ?? 0,
        });
        setReady(true);
      } catch {
        // Fail-open: leave ready=false so cosmetic surfaces still render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo<WorkspaceProjection>(
    () => ({
      capabilities: [...caps],
      has: (id: string) => caps.has(id),
      residentialStatus: meta.residentialStatus,
      campusStatus: meta.campusStatus,
      registryVersion: meta.registryVersion,
      ready,
    }),
    [caps, meta, ready],
  );
}
