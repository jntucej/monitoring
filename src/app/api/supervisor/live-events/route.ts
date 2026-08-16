import { NextRequest, NextResponse } from "next/server";
import { scansToday } from "@/lib/db";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const today = await scansToday();
    const events = today.slice(0, 50).map((s) => ({
      id: s.id,
      student: {
        name: s.name,
        rollNumber: s.roll,
        avatarUrl: null,
      },
      eventType: s.direction === "IN" ? "entry" : "exit",
      timestamp: s.timestamp,
      gate: {
        id: s.gateId,
        name: s.gateName,
      },
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("live-events error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthAndStatus(withAuthorization(handleGet, { requiredRole: ['supervisor', 'admin', 'sysadmin'] })),
  { keyPrefix: 'live_events', maxRequests: 120 }
);
