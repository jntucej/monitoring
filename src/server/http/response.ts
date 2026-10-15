import { NextResponse } from "next/server";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });

export const fail = (code: string, message: string, status = 400, details?: Record<string, unknown>) =>
  NextResponse.json({ error: code, message, ...(details ? { details } : {}) }, { status });
