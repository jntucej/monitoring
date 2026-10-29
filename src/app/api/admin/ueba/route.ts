import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const [spikes, offHours, impossibleTravel] = await Promise.all([
      query("SELECT * FROM public.v_ueba_volume_spikes LIMIT 50").catch(() => ({ rows: [] })),
      query("SELECT * FROM public.v_ueba_off_hours_privileged LIMIT 50").catch(() => ({ rows: [] })),
      query("SELECT * FROM public.v_ueba_impossible_travel LIMIT 50").catch(() => ({ rows: [] })),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        volumeSpikes: spikes.rows,
        offHoursPrivileged: offHours.rows,
        impossibleTravel: impossibleTravel.rows,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    await query("REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_user_baseline");
    return NextResponse.json({ success: true, message: "Baseline refreshed successfully" });
  } catch {
    // If concurrent refresh fails (e.g. first run), try standard refresh
    try {
      await query("REFRESH MATERIALIZED VIEW public.v_user_baseline");
      return NextResponse.json({ success: true, message: "Baseline refreshed successfully" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
    }
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
