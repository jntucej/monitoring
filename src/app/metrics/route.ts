import { NextRequest, NextResponse } from "next/server";
import { metricsRegistry } from "@/metrics";
import { timingSafeEqual } from "crypto";

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const expectedToken = process.env.METRICS_SCRAPE_TOKEN ?? '';
  const expected = `Bearer ${expectedToken}`;

  // Constant-time comparison to prevent token oracle
  if (
    !expectedToken ||
    auth.length !== expected.length ||
    !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return new NextResponse(metricsRegistry.generatePrometheusText(), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
}
