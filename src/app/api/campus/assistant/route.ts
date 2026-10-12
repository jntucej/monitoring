import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/campus/assistant
 *
 * Deterministic, read-only, permission-bound campus assistant.
 *
 * Accepts a plain-language `question`, matches it against a small
 * whitelist of intents, and answers by calling the SAME authorized
 * endpoints the rest of the app uses (in-process), so the assistant
 * can never grant access the caller does not already have:
 *
 *  - "my pending requests" → /api/permissions (role-scoped, server-side)
 *  - "upcoming events"     → /api/campus/events
 *  - "announcements"      → /api/announcements/active
 *  - "my goals"           → /api/campus/goals
 *
 * Unknown intents get an explicit "I can't help with that" — the
 * assistant never invents data and never calls any external AI.
 */

type Intent = "pending_requests" | "upcoming_events" | "announcements" | "my_goals" | "unknown";

function matchIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (s.includes("pending") && (s.includes("request") || s.includes("permission") || s.includes("pass"))) return "pending_requests";
  if (s.includes("goal")) return "my_goals";
  if (s.includes("event") || s.includes("upcoming")) return "upcoming_events";
  if (s.includes("announce") || s.includes("notice") || s.includes("news")) return "announcements";
  if (s.includes("request") || s.includes("permission") || s.includes("pass")) return "pending_requests";
  return "unknown";
}

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "question is required" } },
      { status: 400 }
    );
  }

  // Forward the server-validated identity headers so the in-process
  // sibling routes authenticate exactly as a direct browser call would.
  const authHeaders = new Headers({
    "x-user-id": context.auth.userId,
    "x-user-role": context.auth.role,
    "x-user-email": context.auth.email,
  });

  const intent = matchIntent(question);
  let result: Record<string, unknown> | null = null;
  let text = "";
  let page: string | undefined;

  try {
    switch (intent) {
      case "pending_requests": {
        const res = await fetch("/api/permissions", { method: "GET", headers: authHeaders, cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { data?: Array<{ ticket_number?: string; workflow_type?: string; current_stage?: string; status?: string }>; total?: number } | null;
        const requests = json?.data ?? [];
        result = {
          count: json?.total ?? requests.length,
          requests: requests.slice(0, 5).map((r) => ({
            ticket: r.ticket_number,
            type: r.workflow_type,
            stage: r.current_stage,
            status: r.status,
          })),
        };
        text = requests.length > 0
          ? `You have ${requests.length} pending request${requests.length === 1 ? "" : "s"}.`
          : "You have no pending requests.";
        page = "/permissions";
        break;
      }
      case "upcoming_events": {
        const res = await fetch("/api/campus/events", { method: "GET", headers: authHeaders, cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { data?: { events?: Array<{ id?: string; title?: string; starts_at?: string; location?: string }> } } | null;
        const events = json?.data?.events ?? [];
        result = {
          count: events.length,
          events: events.slice(0, 5).map((e) => ({
            title: e.title,
            startsAt: e.starts_at,
            location: e.location,
          })),
        };
        text = events.length > 0
          ? `There are ${events.length} upcoming event${events.length === 1 ? "" : "s"} on campus.`
          : "No upcoming campus events right now.";
        page = "/events";
        break;
      }
      case "announcements": {
        const res = await fetch("/api/announcements/active", { method: "GET", headers: authHeaders, cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { data?: Array<{ id?: string; title?: string; priority?: string }> } | null;
        const anns = json?.data ?? [];
        result = {
          count: anns.length,
          announcements: anns.slice(0, 5).map((a) => ({
            title: a.title,
            priority: a.priority,
          })),
        };
        text = anns.length > 0
          ? `There are ${anns.length} active announcement${anns.length === 1 ? "" : "s"}.`
          : "No active announcements right now.";
        page = "/announcements";
        break;
      }
      case "my_goals": {
        const res = await fetch("/api/campus/goals", { method: "GET", headers: authHeaders, cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { data?: { goals?: Array<{ title?: string; current_value?: number; target_value?: number; is_completed?: boolean }>; completed?: number; total?: number } } | null;
        const goals = json?.data?.goals ?? [];
        result = {
          count: json?.data?.total ?? goals.length,
          completed: json?.data?.completed ?? 0,
          goals: goals.slice(0, 10).map((g) => ({
            title: g.title,
            progress: `${g.current_value}/${g.target_value}`,
            completed: g.is_completed,
          })),
        };
        text = goals.length > 0
          ? `You have ${goals.length} goal${goals.length === 1 ? "" : "s"} (${result.completed} completed).`
          : "You haven't set any personal goals yet.";
        page = "/goals";
        break;
      }
      default:
        text = "I can help with: your pending requests, upcoming campus events, announcements, or your personal goals. Please rephrase using one of those.";
    }
  } catch (err) {
    // The whitelist only ever queries the caller's own authorized data.
    // If a sibling endpoint fails, say so honestly — never invent data.
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: `Couldn't answer that right now: ${err instanceof Error ? err.message : "upstream request failed"}`,
        },
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      intent,
      text,
      result,
      page,
    },
  });
}

export const POST = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }) => handlePost(req, ctx),
    { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "principal", "staff", "supervisor", "guardian", "worker"] }
  ),
  { keyPrefix: "campus_assistant", maxRequests: 30 }
);
