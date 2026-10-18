import { NextResponse } from "next/server";
import type { ChapterId } from "@/app/(home)/components/story/data";

export const runtime = "nodejs";
export const revalidate = 3600;

interface Payload {
  chapterOrder: ChapterId[];
  tone: "warm" | "urgent" | "calm";
}

const DEFAULT: Payload = {
  chapterOrder: ["leave", "wait", "scan", "alert", "quiet"],
  tone: "calm",
};

const cache = new Map<string, { payload: Payload; expires: number }>();
const rateWindow = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateWindow.get(ip) ?? { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60_000;
  }
  entry.count++;
  rateWindow.set(ip, entry);
  return entry.count > 30;
}

function timeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getUTCHours() + 5;
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

async function tryLLM(): Promise<Payload | null> {
  const endpoint = process.env.HOME_LLM_ENDPOINT;
  if (!endpoint) return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "homepage_chapter_order",
        timeOfDay: timeOfDay(),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<Payload>;
    if (
      !Array.isArray(json.chapterOrder) ||
      json.chapterOrder.length !== 5
    ) {
      return null;
    }
    return {
      chapterOrder: json.chapterOrder as ChapterId[],
      tone: json.tone ?? "calm",
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(DEFAULT);
  }

  const cacheKey = `${ip}|${timeOfDay()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.payload);
  }

  const llm = await tryLLM();
  const payload = llm ?? DEFAULT;

  cache.set(cacheKey, { payload, expires: Date.now() + 3_600_000 });
  return NextResponse.json(payload);
}
