import db from "@/lib/dbClient";

export interface GateScheduleRow {
  id: string;
  gateId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export async function findAll(): Promise<GateScheduleRow[]> {
  const { data, error } = await db
    .from("gate_access_rules")
    .select("*")
    .order("priority", { ascending: false });

  if (error || !data) return [];
  
  // Mapping rules to schedule rows for the unified GET response
  return data.map((rule: any) => ({
    id: rule.id,
    gateId: rule.gate_id,
    // Note: The original schedule view seems to use `days_of_week`.
    // Adjusting based on `gate_access_rules` structure.
    dayOfWeek: Array.isArray(rule.days_of_week) ? rule.days_of_week[0] : 0,
    openTime: rule.start_time,
    closeTime: rule.end_time,
    isActive: rule.is_active,
  }));
}
