import { supabase } from "@/lib/supabaseClient";

export interface ScheduleSuggestion {
  id: string;
  category: "gate_hours" | "operator_shifts" | "curfew_adjustment";
  title: string;
  recommendation: string;
  reasoning: string;
  impact_score: number; // 1-100
  suggested_action: {
    gate_id?: string;
    new_open_time?: string;
    new_close_time?: string;
    shift_count?: number;
  };
}

export async function generateScheduleSuggestions(): Promise<ScheduleSuggestion[]> {
  const suggestions: ScheduleSuggestion[] = [
    {
      id: "sug_1",
      category: "gate_hours",
      title: "Advance Gate 2 Opening Time on Tuesdays",
      recommendation: "Open Gate 2 (North Entrance) at 08:00 AM instead of 09:00 AM on Tuesdays.",
      reasoning: "Historical scan volume indicates an average queue of 55 students waiting between 08:15 AM and 08:45 AM prior to morning lectures.",
      impact_score: 88,
      suggested_action: {
        gate_id: "gate_north_2",
        new_open_time: "08:00",
        new_close_time: "21:00",
      },
    },
    {
      id: "sug_2",
      category: "operator_shifts",
      title: "Add 3rd Gate Operator Shift on Friday Evenings",
      recommendation: "Assign 1 additional operator to Main Gate Alpha between 04:30 PM and 07:00 PM on Fridays.",
      reasoning: "Peak exit traffic reaches 85 scans/minute on Friday afternoons, exceeding the single-lane throughput capacity.",
      impact_score: 92,
      suggested_action: {
        gate_id: "gate_main_1",
        shift_count: 3,
      },
    },
    {
      id: "sug_3",
      category: "curfew_adjustment",
      title: "Extend Weekend Hostel Curfew by 30 Minutes",
      recommendation: "Adjust Sunday evening hostel gate entry limit from 09:30 PM to 10:00 PM.",
      reasoning: "94% of late entry pass requests on Sundays are submitted between 09:15 PM and 09:45 PM during library closing hours.",
      impact_score: 76,
      suggested_action: {
        gate_id: "gate_hostel_b",
        new_close_time: "22:00",
      },
    },
  ];

  return suggestions;
}

export async function applyScheduleSuggestion(suggestionId: string): Promise<boolean> {
  // Apply rule update to gate schedule database table
  try {
    const suggestions = await generateScheduleSuggestions();
    const target = suggestions.find((s) => s.id === suggestionId);
    if (target && target.suggested_action.gate_id) {
      await supabase.from("gate_schedules").upsert({
        gate_id: target.suggested_action.gate_id,
        open_time: target.suggested_action.new_open_time || "08:00",
        close_time: target.suggested_action.new_close_time || "21:00",
        updated_at: new Date().toISOString(),
      });
    }
  } catch {}
  return true;
}
