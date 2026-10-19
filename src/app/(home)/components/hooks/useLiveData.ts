"use client";

import { useEffect, useState } from "react";

export interface LivePayload {
  stats: {
    requestsToday: number;
    approvedToday: number;
    scansToday: number;
    onCampusNow: number;
  };
  requests: Array<{ id: string; reason: string; status: string; time: string }>;
  scans: Array<{ id: string; gate: string; direction: string; status: string; time: string }>;
  modules: Array<{ id: string; label: string; active: boolean; count: number }>;
  updatedAt: string;
}

let cached: LivePayload | null = null;
let fetching = false;
const subscribers = new Set<(d: LivePayload) => void>();

async function runFetch(pollMs: number) {
  if (fetching) return;
  fetching = true;
  try {
    const res = await fetch("/api/home/live", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as LivePayload;
      cached = json;
      subscribers.forEach((s) => s(json));
    }
  } catch {
    /* silent — fallback lives in consumers */
  } finally {
    fetching = false;
  }
  setTimeout(() => runFetch(pollMs), pollMs);
}

export function useLiveData(pollMs = 25_000): LivePayload | null {
  const [data, setData] = useState<LivePayload | null>(cached);

  useEffect(() => {
    if (cached) setData(cached);
    const sub = (d: LivePayload) => setData(d);
    subscribers.add(sub);
    if (!cached && !fetching) {
      runFetch(pollMs);
    }
    return () => {
      subscribers.delete(sub);
    };
  }, [pollMs]);

  return data;
}
