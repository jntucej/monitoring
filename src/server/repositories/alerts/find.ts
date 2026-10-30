import { supabase } from "@/lib/dbClient";
import { Alert } from "@/lib/types";

export async function find(filters: {
  resolved?: boolean;
  severity?: string;
}): Promise<Alert[]> {
  let query = supabase.from("alerts").select("*").order("timestamp", { ascending: false });
  
  if (filters.resolved !== undefined) {
    query = query.eq("resolved", filters.resolved);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  let results = (data || []) as Alert[];
  if (filters.severity) {
    results = results.filter((a) => a.severity?.toLowerCase() === filters.severity?.toLowerCase());
  }
  return results;
}
