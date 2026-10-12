import { NextResponse } from "next/server";

/**
 * WebSocket endpoint for real-time gate monitoring.
 *
 * The real WebSocket is proxied by Caddy to a separate service.
 * This route exists only so Next.js doesn't 404 on the path.
 */
export async function GET() {
  return new NextResponse("WebSocket upgrade not handled by this route", {
    status: 501,
  });
}
