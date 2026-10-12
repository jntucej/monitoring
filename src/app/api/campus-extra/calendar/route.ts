import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus-extra/calendar?month=2026-10&categories=examination,event
 * POST /api/campus-extra/calendar?follow=<category>&reminder=<bool>
 *
 * Unified campus calendar: aggregates examination dates, workshops/events,
 * department activities, hostel events, staff duties, maintenance windows,
 * and administrative deadlines. Each event has category, date, title, owner,
 * and a follow/opt-in-reminder flag.
 */

const DEFAULT_MONTH = (): string => new Date().toISOString().slice(0, 7);

interface CalendarEventRow {
  id: string;
  category: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  owner: string | null;
}

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const month = req.nextUrl.searchParams.get("month") || DEFAULT_MONTH();
  const followedParam = req.nextUrl.searchParams.get("categories");
  const followedCategories = followedParam
    ? followedParam.split(",").filter(Boolean)
    : [];

  const monthStart = `${month}-01T00:00:00.000Z`;
  const monthEnd = new Date(new Date(monthStart).setMonth(new Date(monthStart).getMonth() + 1));
  const monthEndIso = monthEnd.toISOString();

  const events: CalendarEventRow[] = [];

  // 1. Campus events (workshops, events)
  const { data: evRows, error: evErr } = await supabase
    .from("campus_events")
    .select("id, title, description, category, location, starts_at, ends_at, published_by")
    .eq("is_published", true)
    .eq("is_public", true)
    .gte("starts_at", monthStart)
    .lte("starts_at", monthEndIso)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (evErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: evErr.message } },
      { status: 500 }
    );
  }

  for (const ev of evRows || []) {
    events.push({
      id: `evt_${ev.id}`,
      category: ev.category || "event",
      title: ev.title,
      date: ev.starts_at,
      time: ev.ends_at ? `${ev.starts_at.slice(11, 16)}–${ev.ends_at.slice(11, 16)}` : null,
      location: ev.location || null,
      owner: ev.published_by || null,
    });
  }

  // 2. Announcements (administrative deadlines)
  const { data: annRows, error: annErr } = await supabase
    .from("announcements")
    .select("id, title, message, priority, audience, updated_at, expires_at, created_by")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (annErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: annErr.message } },
      { status: 500 }
    );
  }

  for (const ann of annRows || []) {
    if (ann.expires_at && new Date(ann.expires_at) < new Date(monthStart)) continue;
    events.push({
      id: `ann_${ann.id}`,
      category: "admin_deadline",
      title: ann.title,
      date: ann.updated_at || monthStart,
      time: null,
      location: null,
      owner: "Campus Administration",
    });
  }

  // 3. Followed categories filter
  const filteredEvents =
    followedCategories.length > 0
      ? events.filter((e) => followedCategories.includes(e.category))
      : events;

  // 4. User's followed categories
  const { data: followRows, error: followErr } = await supabase
    .from("calendar_follows")
    .select("category_code, reminder_optin")
    .eq("user_id", userId);
  if (followErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: followErr.message } },
      { status: 500 }
    );
  }

  // 5. Calendar categories
  const { data: catRows, error: catErr } = await supabase
    .from("calendar_categories")
    .select("id, code, label, color, icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (catErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: catErr.message } },
      { status: 500 }
    );
  }

  const followedSet = new Set((followRows || []).map((f) => f.category_code));

  return NextResponse.json({
    success: true,
    data: {
      events: filteredEvents,
      categories: catRows || [],
      followedCategories: Array.from(followedSet),
    },
  });
}

async function handlePost(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const category = req.nextUrl.searchParams.get("follow");
  const reminder = req.nextUrl.searchParams.get("reminder") === "true";

  if (!category) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing 'follow' category param" } },
      { status: 400 }
    );
  }

  const { data: existing, error: findErr } = await supabase
    .from("calendar_follows")
    .select("id, reminder_optin")
    .eq("user_id", userId)
    .eq("category_code", category)
    .maybeSingle();
  if (findErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: findErr.message } },
      { status: 500 }
    );
  }

  if (existing) {
    const { error: upErr } = await supabase
      .from("calendar_follows")
      .update({ reminder_optin: reminder })
      .eq("id", existing.id);
    if (upErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: upErr.message } },
        { status: 500 }
      );
    }
  } else {
    const { error: insErr } = await supabase
      .from("calendar_follows")
      .insert({ user_id: userId, category_code: category, reminder_optin: reminder });
    if (insErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insErr.message } },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: { category, followed: true },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_calendar",
  maxRequests: 60,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "campus_extra_calendar",
  maxRequests: 30,
});
