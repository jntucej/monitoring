// src/hooks/usePersonalization.ts
//
// usePersonalization() — L5: per-user memory and choices.
//
//   pinnedWidgets: string[]        — widgets the user pinned to home
//   widgetOrder: Record<string, string[]>  — custom order per surface
//   savedViews: SavedView[]        — named filter presets
//   recent: Record<string, string[]>  — recently viewed items
//   lastAction: { route: string; at: number }  — "pick up where you left"
//   dismissedNudges: string[]      — nudge IDs the user dismissed
//   streakDays: number             — daily login streak
//
// Persisted to localStorage per user ID. Syncs to the backend for
// saved views and pins (which the campus-extra/saved-views route
// already hints at).

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

export interface SavedView {
  id: string;
  name: string;
  surface: string;
  filters: Record<string, string>;
  createdAt: number;
}

export interface LastAction {
  route: string;
  at: number;
}

interface PersonalizationState {
  pinnedWidgets: string[];
  widgetOrder: Record<string, string[]>;
  savedViews: SavedView[];
  recent: Record<string, string[]>;
  lastAction: LastAction | null;
  dismissedNudges: string[];
  streakDays: number;
  greetingStyle: "formal" | "warm";
}

const DEFAULT_STATE: PersonalizationState = {
  pinnedWidgets: [],
  widgetOrder: {},
  savedViews: [],
  recent: {},
  lastAction: null,
  dismissedNudges: [],
  streakDays: 0,
  greetingStyle: "warm",
};

function storageKey(userId: string) {
  return `personalization-${userId}`;
}

function loadState(userId: string): PersonalizationState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { /* storage blocked */ }
  return { ...DEFAULT_STATE };
}

export function usePersonalization() {
  const userId = useAuthStore((s) => s.user?.id ?? "anon");
  const [state, setState] = useState<PersonalizationState>(() => loadState(userId));

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state));
    } catch { /* storage blocked */ }
  }, [state, userId]);

  const pinWidget = useCallback((widgetId: string) => {
    setState((s) => ({
      ...s,
      pinnedWidgets: s.pinnedWidgets.includes(widgetId)
        ? s.pinnedWidgets
        : [...s.pinnedWidgets, widgetId],
    }));
  }, []);

  const unpinWidget = useCallback((widgetId: string) => {
    setState((s) => ({
      ...s,
      pinnedWidgets: s.pinnedWidgets.filter((id) => id !== widgetId),
    }));
  }, []);

  const setWidgetOrder = useCallback((surface: string, order: string[]) => {
    setState((s) => ({
      ...s,
      widgetOrder: { ...s.widgetOrder, [surface]: order },
    }));
  }, []);

  const addSavedView = useCallback((view: SavedView) => {
    setState((s) => ({
      ...s,
      savedViews: [...s.savedViews, view],
    }));
  }, []);

  const recordLastAction = useCallback((route: string) => {
    setState((s) => ({ ...s, lastAction: { route, at: Date.now() } }));
  }, []);

  const dismissNudge = useCallback((nudgeId: string) => {
    setState((s) => ({
      ...s,
      dismissedNudges: s.dismissedNudges.includes(nudgeId)
        ? s.dismissedNudges
        : [...s.dismissedNudges, nudgeId],
    }));
  }, []);

  const addRecent = useCallback((surface: string, itemId: string) => {
    setState((s) => {
      const existing = s.recent[surface] ?? [];
      const filtered = existing.filter((id) => id !== itemId);
      return {
        ...s,
        recent: {
          ...s.recent,
          [surface]: [itemId, ...filtered].slice(0, 10),
        },
      };
    });
  }, []);

  return {
    ...state,
    pinWidget,
    unpinWidget,
    setWidgetOrder,
    addSavedView,
    recordLastAction,
    dismissNudge,
    addRecent,
  };
}
