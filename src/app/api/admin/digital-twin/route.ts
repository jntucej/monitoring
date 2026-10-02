import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getCurrentOccupancy } from "@/lib/occupancy";
import { getPredictions } from "@/lib/predictive";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const occupancy = await getCurrentOccupancy();
    const predictions = await getPredictions("traffic");

    // Query real gates from database
    const { data: dbGates } = await supabase
      .from("gates")
      .select("id, name, is_active, location, gate_code")
      .order("name", { ascending: true });

    // Query recent unhandled security alerts
    const { data: dbAlerts } = await supabase
      .from("alerts")
      .select("id, gates(name), severity, message, timestamp")
      .order("timestamp", { ascending: false })
      .limit(5);

    const gates = (dbGates || []).map((g) => ({
      id: g.id,
      name: g.name || `Gate ${g.gate_code}`,
      status: g.is_active ? "online" : "maintenance",
      last_scan: new Date().toISOString(),
      flow_rate: g.is_active ? "Active" : "Offline",
    }));

    const alerts = (dbAlerts || []).map((a: any) => ({
      id: a.id,
      location: a.gates?.name || "Campus Perimeter",
      severity: (a.severity === "critical" || a.severity === "high") ? "high" : "medium",
      message: a.message || "Security alert logged",
    }));

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        gates,
        zones: occupancy.zones,
        total_occupancy: occupancy.total,
        total_capacity: occupancy.capacity,
        alerts,
        predictions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });