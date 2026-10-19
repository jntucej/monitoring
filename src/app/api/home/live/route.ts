import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LivePayload {
  stats: {
    requestsToday: number;
    approvedToday: number;
    scansToday: number;
    onCampusNow: number;
  };
  requests: Array<{ id: string; reason: string; status: string; time: string }>;
  scans: Array<{ id: string; gate: string; direction: string; status: string; time: string }>;
  modules: Array<{ id: string; label: string; active: boolean; count: number }>;
  updatedAt: string;
}

const FALLBACK: LivePayload = {
  stats: { requestsToday: 0, approvedToday: 0, scansToday: 0, onCampusNow: 0 },
  requests: [],
  scans: [],
  modules: [
    { id: "gate", label: "Gate", active: true, count: 0 },
    { id: "hostel", label: "Hostel", active: false, count: 0 },
    { id: "mess", label: "Mess", active: false, count: 0 },
    { id: "exam", label: "Exam", active: false, count: 0 },
    { id: "labs", label: "Labs", active: false, count: 0 },
    { id: "visitors", label: "Visitors", active: false, count: 0 },
    { id: "events", label: "Events", active: false, count: 0 },
    { id: "users", label: "Users", active: false, count: 0 },
  ],
  updatedAt: new Date().toISOString(),
};

function rel(ts: unknown): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : (ts as Date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shortId(prefix: string, full: string): string {
  const tail = String(full).replace(/[^0-9]/g, "").slice(-3) || "000";
  return `${prefix}-${tail}`;
}

async function safe<T>(fn: () => Promise<T>, def: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return def;
  }
}

export async function GET() {
  const [reqRes, appRes, scnRes, onRes, reqsRes, scnsRes, modRes] = await Promise.all([
    safe(() =>
      query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM permissions WHERE created_at::date = CURRENT_DATE`
      ),
      { rows: [{ c: "0" }] } as any
    ),
    safe(() =>
      query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM permissions WHERE status='APPROVED' AND updated_at::date = CURRENT_DATE`
      ),
      { rows: [{ c: "0" }] } as any
    ),
    safe(() =>
      query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM movement_logs WHERE timestamp::date = CURRENT_DATE`
      ),
      { rows: [{ c: "0" }] } as any
    ),
    safe(() =>
      query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM campus_occupancy WHERE current_status='IN'`
      ),
      { rows: [{ c: "0" }] } as any
    ),
    safe(
      () =>
        query<{
          ticket_number: string;
          workflow_type: string;
          status: string;
          created_at: string;
          reason: string | null;
        }>(
          `SELECT ticket_number, workflow_type, status, created_at, reason 
           FROM permissions ORDER BY created_at DESC LIMIT 6`
        ),
      { rows: [] } as any
    ),
    safe(
      () =>
        query<{
          id: string;
          gate_name: string | null;
          direction: string;
          timestamp: string;
          is_correction: boolean | null;
        }>(
          `SELECT id, gate_name, direction, timestamp, is_correction 
           FROM movement_logs ORDER BY timestamp DESC LIMIT 8`
        ),
      { rows: [] } as any
    ),
    safe(
      () =>
        query<{ module: string; c: string }>(
          `SELECT 'students' AS module, COUNT(*)::text AS c FROM users WHERE role='student' AND status='ACTIVE'
           UNION ALL
           SELECT 'hostellers', COUNT(*)::text FROM student_details WHERE hostel_block IS NOT NULL
           UNION ALL
           SELECT 'visitors', COUNT(*)::text FROM visitor_logs WHERE status='active'
           UNION ALL
           SELECT 'gates', COUNT(*)::text FROM gates WHERE is_active=true
           UNION ALL
           SELECT 'events', COUNT(*)::text FROM campus_events WHERE is_published=true`
        ),
      { rows: [] } as any
    ),
  ]);

  const counts = Object.fromEntries(
    (modRes.rows ?? []).map((r: any) => [r.module, Number(r.c)])
  );

  const payload: LivePayload = {
    stats: {
      requestsToday: Number(reqRes.rows?.[0]?.c ?? 0),
      approvedToday: Number(appRes.rows?.[0]?.c ?? 0),
      scansToday: Number(scnRes.rows?.[0]?.c ?? 0),
      onCampusNow: Number(onRes.rows?.[0]?.c ?? 0),
    },
    requests: (reqsRes.rows ?? []).map((r: any) => ({
      id: shortId("PS", r.ticket_number ?? ""),
      reason: r.reason || r.workflow_type || "request",
      status:
        r.status === "APPROVED"
          ? "approved"
          : r.status === "REJECTED"
          ? "rejected"
          : "pending",
      time: rel(r.created_at),
    })),
    scans: (scnsRes.rows ?? []).map((r: any) => ({
      id: shortId("SC", r.id ?? ""),
      gate: r.gate_name || "—",
      direction: r.direction || "IN",
      status: r.is_correction ? "flagged" : "ok",
      time: rel(r.timestamp),
    })),
    modules: [
      { id: "gate", label: "Gate", active: true, count: Number(scnRes.rows?.[0]?.c ?? 0) },
      { id: "hostel", label: "Hostel", active: (counts.hostellers ?? 0) > 0, count: counts.hostellers ?? 0 },
      { id: "mess", label: "Mess", active: true, count: 0 },
      { id: "exam", label: "Exam", active: true, count: 0 },
      { id: "labs", label: "Labs", active: true, count: 0 },
      { id: "visitors", label: "Visitors", active: (counts.visitors ?? 0) > 0, count: counts.visitors ?? 0 },
      { id: "events", label: "Events", active: (counts.events ?? 0) > 0, count: counts.events ?? 0 },
      { id: "users", label: "Users", active: (counts.students ?? 0) > 0, count: counts.students ?? 0 },
    ],
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" },
  });
}
