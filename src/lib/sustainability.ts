import { getDbClient } from "@/lib/db";
import { query } from "@/lib/postgres";

export interface SustainabilityMetrics {
  digital_passes_count: number;
  paper_saved_sheets: number;
  carbon_saved_kg: number;
  energy_kwh: number;
  trees_equivalent: number;
}

export async function getSustainabilityMetrics(): Promise<SustainabilityMetrics> {
  try {
    const { count: passCount } = await getDbClient().from("gate_passes").select("*", { count: "exact", head: true });
    const digitalPasses = passCount || 0;
    const paperSaved = digitalPasses * 2; // 2 sheets per physical pass
    const carbonSaved = Math.round(paperSaved * 0.005 * 100) / 100; // ~5g CO2 per sheet of paper
    const energy = Math.round(digitalPasses * 0.012 * 100) / 100; // estimated low-power turnstile energy
    const trees = Math.round((paperSaved / 8333) * 100) / 100; // 1 tree = ~8333 sheets of standard paper

    return {
      digital_passes_count: digitalPasses,
      paper_saved_sheets: paperSaved,
      carbon_saved_kg: carbonSaved,
      energy_kwh: energy,
      trees_equivalent: trees,
    };
  } catch {
    return {
      digital_passes_count: 0,
      paper_saved_sheets: 0,
      carbon_saved_kg: 0,
      energy_kwh: 0,
      trees_equivalent: 0,
    };
  }
}

export async function getSustainabilityHistory(): Promise<Array<{ month: string; paper_saved: number; carbon_saved: number }>> {
  try {
    const res = await query(`
      SELECT 
        TO_CHAR(requested_at, 'Mon') as month,
        COUNT(*)::int * 2 as paper_saved,
        ROUND((COUNT(*)::numeric * 2 * 0.005), 2) as carbon_saved
      FROM gate_passes
      WHERE requested_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(requested_at, 'Mon'), DATE_TRUNC('month', requested_at)
      ORDER BY DATE_TRUNC('month', requested_at) ASC
    `);
    if (res.rows.length > 0) {
      return res.rows.map((r: any) => ({
        month: r.month,
        paper_saved: Number(r.paper_saved) || 0,
        carbon_saved: Number(r.carbon_saved) || 0,
      }));
    }
  } catch {}

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((m) => ({
    month: m,
    paper_saved: 0,
    carbon_saved: 0,
  }));
}
