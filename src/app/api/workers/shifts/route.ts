import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [workersRes, logsRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'worker'),
      supabase.from('movement_logs').select('*').gte('timestamp', todayStart.toISOString())
    ]);

    const workers = workersRes.data || [];
    const logs = logsRes.data || [];

    const shifts = workers.map((w: any) => {
      const wLogs = logs.filter((l: any) => l.user_id === w.id);
      const firstIn = wLogs.find((l: any) => l.direction === "IN");
      const lastOut = [...wLogs].reverse().find((l: any) => l.direction === "OUT");

      const isOnShift = !!firstIn && !lastOut;
      const isLate = !!firstIn && new Date(firstIn.timestamp).getHours() > 8; // Assuming 8 AM start

      let hoursLogged = 0;
      if (firstIn) {
        const outTime = lastOut ? new Date(lastOut.timestamp).getTime() : new Date().getTime();
        hoursLogged = (outTime - new Date(firstIn.timestamp).getTime()) / (1000 * 60 * 60);
      }

      return {
        id: `shift-${w.id}`,
        workerName: w.name || w.full_name || "Unknown Worker",
        workerId: w.unique_id,
        contractor: w.department_id || "Internal", // Fallback to department or internal
        scheduledShift: "08:00 - 16:00",
        checkIn: firstIn ? new Date(firstIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        checkOut: lastOut ? new Date(lastOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        status: isOnShift ? "on_shift" : "off_shift",
        gate: firstIn?.gate_id || "Main Gate",
        shiftAdherence: isLate ? "late" : "on_time",
        hoursLogged: parseFloat(hoursLogged.toFixed(1)),
      };
    });

    const totalActive = shifts.length;
    const onShift = shifts.filter((s: any) => s.status === "on_shift").length;
    let lateArrivals = 0;
    shifts.forEach((s: any) => {
      if (s.checkIn && s.shiftAdherence === "late") lateArrivals++;
    });
    
    const offShift = totalActive - onShift;
    const shiftAdherenceRate = totalActive > 0 ? Math.round(((totalActive - lateArrivals) / totalActive) * 100) : 100;

    return NextResponse.json({
      success: true,
      shifts,
      summary: {
        totalActive,
        onShift,
        lateArrivals,
        offShift,
        shiftAdherenceRate,
      },
    });
  } catch (error) {
    console.error("Error in worker shifts route:", error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load worker shifts' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "worker_shifts", maxRequests: 60 }
);