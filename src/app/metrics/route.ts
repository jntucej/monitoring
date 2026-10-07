import { NextResponse } from "next/server";
import { metricsRegistry } from "@/metrics";

export async function GET() {
  const text = metricsRegistry.generatePrometheusText();
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}
