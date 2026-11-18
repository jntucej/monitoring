"use client";
// src/hooks/usePersistentQuery.ts
//
// Persists a filter/search query to sessionStorage so it survives
// offline reloads. The user types "attendance" in a filter, goes
// offline, the page reloads from cache — the filter is still there.
//
// Usage:
//   const [query, setQuery] = usePersistentQuery("gate-admin-students-query");

import { useEffect, useState } from "react";

export function usePersistentQuery(storageKey: string): [string, (v: string) => void] {
  const [query, setQuery] = useState("");
  const [restored, setRestored] = useState(false);

  // Restore on mount (first render only)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setQuery(saved);
      setRestored(true);
    } catch {
      setRestored(true);
    }
  }, [storageKey]);

  // Save on change (skip the initial empty value to avoid clobbering)
  useEffect(() => {
    if (!restored) return;
    try {
      if (query) {
        sessionStorage.setItem(storageKey, query);
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, [query, restored, storageKey]);

  return [query, setQuery];
}
