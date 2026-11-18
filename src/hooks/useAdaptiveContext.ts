// src/hooks/useAdaptiveContext.ts
//
// useAdaptiveContext() — returns the adaptive context object that
// L4 widgets and RoleHomeComposer consult.
//
//   timeOfDay:   morning | afternoon | evening | night
//   shiftPhase:  pre-shift | on-shift | handover | off
//   examDay:     boolean
//   campusStatus: normal | alert | lockdown

import { useMemo } from "react";

export interface AdaptiveContext {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  shiftPhase: "pre-shift" | "on-shift" | "handover" | "off";
  examDay: boolean;
  campusStatus: "normal" | "alert" | "lockdown";
  greeting: string;
}

function getTimeOfDay(): AdaptiveContext["timeOfDay"] {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function getGreeting(timeOfDay: AdaptiveContext["timeOfDay"]): string {
  switch (timeOfDay) {
    case "morning": return "morning";
    case "afternoon": return "afternoon";
    case "evening": return "evening";
    case "night": return "night";
  }
}

export function useAdaptiveContext(): AdaptiveContext {
  return useMemo<AdaptiveContext>(() => {
    const timeOfDay = getTimeOfDay();
    return {
      timeOfDay,
      shiftPhase: "on-shift",
      examDay: false,
      campusStatus: "normal",
      greeting: getGreeting(timeOfDay),
    };
  }, []);
}
