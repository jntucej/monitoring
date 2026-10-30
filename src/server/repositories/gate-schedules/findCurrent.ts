import { supabase } from "@/lib/dbClient";

export interface CurrentGateScheduleRow {
  id: string;
  gate_id: string;
  rule_name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  action: string;
  priority: number;
  is_active: boolean;
}

export async function findCurrent(now: Date = new Date()): Promise<CurrentGateScheduleRow[]> {
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("gate_access_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (error || !data) return [];

  // Filter in memory to maintain exact original behavior
  return data.filter((rule: any) => {
    const days = Array.isArray(rule.days_of_week) ? rule.days_of_week : JSON.parse(rule.days_of_week || "[]");
    return days.includes(dayOfWeek) && currentTime >= rule.start_time && currentTime <= rule.end_time;
  });
}
