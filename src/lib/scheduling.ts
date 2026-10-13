// src/lib/scheduling.ts
// Types for the AI Smart Scheduling Assistant panel. Extend the interface with your domain
// fields; keep it type-safe (no `any`).

export type SchedulingCategory = "gate_hours" | "operator_shifts" | "curfew_adjustment";

export interface SchedulingItem {
  id: string;
  title: string;
  category: SchedulingCategory;
  recommendation: string;
  reasoning: string;
  impact_score: number;
  suggested_action?: {
    target?: string;
    before?: string;
    after?: string;
  };
}
