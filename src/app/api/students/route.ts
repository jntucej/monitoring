import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ success: true, message: "OK" });
}
export async function POST() {
  return NextResponse.json({ success: true, message: "OK" });
}
