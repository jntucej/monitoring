import { NextRequest, NextResponse } from "next/server";
import { metricsRegistry } from "@/metrics";

export async function GET(req: NextRequest) {
  const secret = process.env.METRICS_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const text = metricsRegistry.generatePrometheusText();
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}
