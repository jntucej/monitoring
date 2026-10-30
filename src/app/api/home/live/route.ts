import { NextResponse } from "next/server";
import { poolQuery } from "@/lib/postgres";

/**
 * /api/home/live — public live counters for the campus portal home page.
 *
 * Returns ONLY the four aggregate counters the home page displays
 * (requests/approved/scans today + on-campus now). The previous shape
 * leaked `requests` (with reason + ticket id), `scans` (with gate name +
 * direction + scan id), and `modules` (with user counts) — an operator
 * could enumerate who's on campus, which gates are active, and request
 * reasons from an anonymous curl. The home page's `useLiveData` hook
 * reads only `stats`; the `LiveGateFeed` centrepiece uses labeled sample
 * rows, so the richer payload was never consumed by the public UI.
 */
/** Ten-second in-memory cache for /api/home/live so a bot flood cannot
 *  saturate Postgres. Single-process scope is enough; the header already
 *  advertises max-age=15. */
let homeLiveCache: { at: number; data: unknown } | null = null;

export async function GET() {
  if (homeLiveCache && Date.now() - homeLiveCache.at < 10_000) {
    return NextResponse.json(homeLiveCache.data);
  }
  const { rows } = await poolQuery<{
    requests_today: string;
    approved_today: string;
    scans_today: string;
    on_campus_now: string;
  }>(`
    WITH today AS (
      SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
             AT TIME ZONE 'Asia/Kolkata' AS d
    )
    SELECT
      (SELECT count(*) FROM public.permissions p, today t
        WHERE p.created_at >= t.d)::text AS requests_today,
      (SELECT count(*) FROM public.permissions p, today t
        WHERE p.status = 'APPROVED' AND p.updated_at >= t.d)::text AS approved_today,
      (SELECT count(*) FROM public.movement_logs m, today t
        WHERE m.timestamp >= t.d)::text AS scans_today,
      (SELECT count(*) FROM public.campus_occupancy
        WHERE current_status = 'IN')::text AS on_campus_now
  `);
  const r = rows[0];
  const payload = {
    stats: {
      requestsToday: Number(r.requests_today),
      approvedToday: Number(r.approved_today),
      scansToday: Number(r.scans_today),
      onCampusNow: Number(r.on_campus_now),
    },
    updatedAt: new Date().toISOString(),
  };
  homeLiveCache = { at: Date.now(), data: payload };
  return NextResponse.json(
    payload,
    { headers: { "cache-control": "public, max-age=15, s-maxage=15" } }
  );
}
