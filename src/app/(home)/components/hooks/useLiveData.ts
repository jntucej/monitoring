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

async function runFetch(signal?: AbortSignal) {
  try {
    const res = await fetch("/api/home/live", { cache: "no-store", signal });
    if (res.ok) {
      const json = (await res.json()) as LivePayload;
      cached = json;
      subscribers.forEach((s) => s(json));
    }
  } catch {
    /* silent — fallback lives in consumers */
  }
}

export function useLiveData(pollMs = 25_000): LivePayload | null {
  const [data, setData] = useState<LivePayload | null>(cached);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    if (cached) setData(cached);
    const sub = (d: LivePayload) => {
      if (!cancelled) setData(d);
    };
    subscribers.add(sub);

    const tick = async () => {
      if (cancelled) return;
      const controller = new AbortController();
      await runFetch(controller.signal);
      if (cancelled) return;
      timer = setTimeout(tick, pollMs);
    };

    if (!cached && !fetching) {
      tick();
    } else {
      timer = setTimeout(tick, pollMs);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscribers.delete(sub);
    };
  }, [pollMs]);

  return data;
}
