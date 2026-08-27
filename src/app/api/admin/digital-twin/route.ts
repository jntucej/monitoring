import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getCurrentOccupancy } from "@/lib/occupancy";
import { getPredictions } from "@/lib/predictive";

async function handleGet(req: NextRequest) {
  try {
    const occupancy = await getCurrentOccupancy();
    const predictions = await getPredictions("traffic");

    const gates = [
      { id: "gate_main_1", name: "Main Gate Alpha", status: "online", last_scan: new Date().toISOString(), flow_rate: "45 scans/min" },
      { id: "gate_north_2", name: "North Gate Bravo", status: "online", last_scan: new Date().toISOString(), flow_rate: "18 scans/min" },
      { id: "gate_south_1", name: "South Gate Charlie", status: "maintenance", last_scan: new Date(Date.now() - 3600 * 1000).toISOString(), flow_rate: "0 scans/min" },
      { id: "gate_hostel_b", name: "Hostel Gate Boys", status: "online", last_scan: new Date().toISOString(), flow_rate: "22 scans/min" },
    ];

    const alerts = [
      { id: "alt_1", location: "Academic Block North", severity: "high", message: "Capacity threshold exceeded (82%)" },
      { id: "alt_2", location: "South Gate Charlie", severity: "medium", message: "Maintenance required on Turnstile #2" },
    ];

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