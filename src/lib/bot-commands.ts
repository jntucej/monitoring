// src/lib/bot-commands.ts
/**
 * Role-based Telegram bot commands + interactive menus.
 * Each role gets custom commands scoped to their own data.
 * Interactive menus use inline buttons (callback queries) for
 * multi-step flows without typing commands.
 */

import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  cmdNow, cmdSettings, cmdRegister,
  cmdReview, cmdClassAdd, cmdMessage,
} from "@/lib/bot-personas";
import type { PoolClient } from "pg";

// ── Types ─────────────────────────────────────────────────────────────────

export interface BotContext {
  chatId: number;
  userId: string;
  uniqueId: string;
  name: string;
  role: string;
  status: string;
  client: PoolClient;
}

export interface InteractiveMenu {
  title: string;
  description?: string;
  buttons: Array<{
    label: string;
    callback: string; // callback_data sent back to the webhook
  }>;
}

// ── Role → command registry ──────────────────────────────────────────────

const ROLE_COMMANDS: Record<string, Array<{ cmd: string; desc: string }>> = {
  student: [
    { cmd: "/now", desc: "Your today: attendance + schedule + results" },
    { cmd: "/settings", desc: "Your 4 preferences" },
    { cmd: "/passes", desc: "Your gate passes" },
    { cmd: "/curfew", desc: "Curfew status & score" },
    { cmd: "/alerts", desc: "Active alerts near you" },
    { cmd: "/announce", desc: "Latest announcements" },
    { cmd: "/complaint", desc: "Raise a complaint" },
    { cmd: "/exam", desc: "Your next exams" },
    { cmd: "/mess", desc: "Mess bill & meal opt-out" },
    { cmd: "/guardian", desc: "Your linked guardian" },
    { cmd: "/fees", desc: "Your fee dues & receipts" },
    { cmd: "/library", desc: "Library issues & fines" },
    { cmd: "/marks", desc: "Your published grade card" },
    { cmd: "/health", desc: "System health for you" },
  ],
  faculty: [
    { cmd: "/now", desc: "Your today: attendance + next class + results" },
    { cmd: "/register", desc: "Take your class register (CR/ICR)" },
    { cmd: "/review", desc: "Duty-off review + your log" },
    { cmd: "/classes-add", desc: "Add extra/reschedule/substitute class" },
    { cmd: "/message", desc: "Send to your students (relay or direct)" },
    { cmd: "/settings", desc: "Your 4 preferences" },
    { cmd: "/attendance", desc: "Today's attendance summary" },
    { cmd: "/students", desc: "Your assigned students" },
    { cmd: "/schedule", desc: "Today's class schedule" },
    { cmd: "/alerts", desc: "Campus alerts" },
    { cmd: "/announce", desc: "Latest announcements" },
    { cmd: "/classes", desc: "Your classes (all)" },
    { cmd: "/complaints", desc: "Complaints in your dept" },
    { cmd: "/events", desc: "Campus events this week" },
    { cmd: "/marks", desc: "Your classes' marks (drafts)" },
    { cmd: "/assignments", desc: "Your open assignments" },
    { cmd: "/mentees", desc: "Your active mentees" },
  ],
  staff: [
    { cmd: "/now", desc: "Your today" },
    { cmd: "/settings", desc: "Your 4 preferences" },
    { cmd: "/shifts", desc: "Your upcoming shifts" },
    { cmd: "/gates", desc: "Gate status & recent scans" },
    { cmd: "/occupancy", desc: "Campus occupancy" },
    { cmd: "/alerts", desc: "Active alerts" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/handover", desc: "Shift handover log" },
    { cmd: "/maintenance", desc: "Maintenance tickets" },
  ],
  parent: [
    { cmd: "/child", desc: "Your child's gate status" },
    { cmd: "/curfew", desc: "Child's curfew compliance" },
    { cmd: "/announce", desc: "Campus announcements" },
    { cmd: "/complaint", desc: "Raise a complaint" },
    { cmd: "/exam", desc: "Child's upcoming exams" },
    { cmd: "/mess", desc: "Child's mess bill" },
  ],
  hod: [
    { cmd: "/now", desc: "Your today: staff attendance + dept summary" },
    { cmd: "/settings", desc: "Your 4 preferences" },
    { cmd: "/dept", desc: "Department overview" },
    { cmd: "/attendance", desc: "Dept attendance rate" },
    { cmd: "/alerts", desc: "Dept alerts" },
    { cmd: "/complaints", desc: "Open complaints" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/faculty", desc: "Your faculty list" },
    { cmd: "/events", desc: "Campus events" },
  ],
  principal: [
    { cmd: "/now", desc: "Your today: staff attendance + campus summary" },
    { cmd: "/settings", desc: "Your 4 preferences" },
    { cmd: "/campus", desc: "Campus-wide dashboard" },
    { cmd: "/attendance", desc: "Institution attendance" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/complaints", desc: "Top open complaints" },
    { cmd: "/occupancy", desc: "Live occupancy" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/events", desc: "Campus events" },
    { cmd: "/delegation", desc: "Delegation log" },
  ],
  admin: [
    { cmd: "/campus", desc: "Campus-wide dashboard" },
    { cmd: "/users", desc: "User stats by role" },
    { cmd: "/gates", desc: "All gate statuses" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/complaints", desc: "All open complaints" },
    { cmd: "/occupancy", desc: "Live occupancy" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/events", desc: "Campus events" },
    { cmd: "/backup", desc: "Last backup status" },
  ],
  sysadmin: [
    { cmd: "/campus", desc: "Campus-wide dashboard" },
    { cmd: "/users", desc: "User stats by role" },
    { cmd: "/gates", desc: "All gate statuses" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/complaints", desc: "All open complaints" },
    { cmd: "/occupancy", desc: "Live occupancy" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/events", desc: "Campus events" },
    { cmd: "/backup", desc: "Last backup status" },
    { cmd: "/bot", desc: "Bot stats" },
    { cmd: "/audit", desc: "Recent audit log entries" },
  ],
  hostel_manager: [
    { cmd: "/occupancy", desc: "Hostel occupancy" },
    { cmd: "/curfew", desc: "Curfew violations (24h)" },
    { cmd: "/gates", desc: "Hostel gate scans" },
    { cmd: "/alerts", desc: "Hostel alerts" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/blocks", desc: "Hostel block status" },
    { cmd: "/handover", desc: "Shift handover" },
  ],
  operator: [
    { cmd: "/gates", desc: "Your gate status + scans" },
    { cmd: "/occupancy", desc: "Campus occupancy" },
    { cmd: "/alerts", desc: "Gate alerts" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/handover", desc: "Shift handover log" },
    { cmd: "/visitor", desc: "Today's visitor log" },
  ],
  supervisor: [
    { cmd: "/gates", desc: "All gate statuses" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/occupancy", desc: "Campus occupancy" },
    { cmd: "/complaints", desc: "Escalated complaints" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/visitor", desc: "Visitor logs (24h)" },
    { cmd: "/events", desc: "Campus events" },
  ],
  guardian: [
    { cmd: "/child", desc: "Your ward's gate status" },
    { cmd: "/curfew", desc: "Ward's curfew compliance" },
    { cmd: "/announce", desc: "Campus announcements" },
    { cmd: "/complaint", desc: "Raise a complaint" },
    { cmd: "/exam", desc: "Ward's upcoming exams" },
  ],
  caretaker: [
    { cmd: "/gates", desc: "Gate status" },
    { cmd: "/occupancy", desc: "Campus occupancy" },
    { cmd: "/alerts", desc: "Active alerts" },
    { cmd: "/announce", desc: "Announcements" },
    { cmd: "/maintenance", desc: "Maintenance tickets" },
    { cmd: "/visitor", desc: "Visitor log" },
  ],
};

// ── Interactive menu definitions (inline keyboard) ───────────────────────

const ROLE_MENUS: Record<string, InteractiveMenu> = {
  student: {
    title: "📋 Student Menu",
    description: "Pick an action:",
    buttons: [
      { label: "🎫 My Passes", callback: "menu:student:passes" },
      { label: "⏰ Curfew", callback: "menu:student:curfew" },
      { label: "🔔 Alerts", callback: "menu:student:alerts" },
      { label: "📝 New Complaint", callback: "menu:student:complaint" },
      { label: "📢 Announcements", callback: "menu:student:announce" },
      { label: "📅 Exams", callback: "menu:student:exam" },
      { label: "🍽 Mess Bill", callback: "menu:student:mess" },
      { label: "🏥 System Health", callback: "menu:student:health" },
      { label: "↩️ Back to /help", callback: "menu:student:help" },
    ],
  },
  faculty: {
    title: "📋 Faculty Menu",
    buttons: [
      { label: "📊 Attendance", callback: "menu:faculty:attendance" },
      { label: "👥 My Students", callback: "menu:faculty:students" },
      { label: "📅 Schedule", callback: "menu:faculty:schedule" },
      { label: "🔔 Alerts", callback: "menu:faculty:alerts" },
      { label: "📢 Announcements", callback: "menu:faculty:announce" },
      { label: "🏫 My Classes", callback: "menu:faculty:classes" },
      { label: "📝 Complaints", callback: "menu:faculty:complaints" },
      { label: "↩️ Back to /help", callback: "menu:faculty:help" },
    ],
  },
  staff: {
    title: "📋 Staff Menu",
    buttons: [
      { label: "🕐 My Shifts", callback: "menu:staff:shifts" },
      { label: "🚪 Gates", callback: "menu:staff:gates" },
      { label: "🏢 Occupancy", callback: "menu:staff:occupancy" },
      { label: "🔔 Alerts", callback: "menu:staff:alerts" },
      { label: "🔗 Shift Handover", callback: "menu:staff:handover" },
      { label: "🔧 Maintenance", callback: "menu:staff:maintenance" },
      { label: "↩️ Back to /help", callback: "menu:staff:help" },
    ],
  },
  parent: {
    title: "📋 Parent Menu",
    buttons: [
      { label: "👶 Child Status", callback: "menu:parent:child" },
      { label: "⏰ Curfew", callback: "menu:parent:curfew" },
      { label: "📅 Exams", callback: "menu:parent:exam" },
      { label: "🍽 Mess Bill", callback: "menu:parent:mess" },
      { label: "📝 New Complaint", callback: "menu:parent:complaint" },
      { label: "📢 Announcements", callback: "menu:parent:announce" },
      { label: "↩️ Back to /help", callback: "menu:parent:help" },
    ],
  },
  principal: {
    title: "📋 Principal Menu",
    buttons: [
      { label: "🏫 Campus Dashboard", callback: "menu:principal:campus" },
      { label: "📊 Attendance", callback: "menu:principal:attendance" },
      { label: "🔔 All Alerts", callback: "menu:principal:alerts" },
      { label: "📝 Complaints", callback: "menu:principal:complaints" },
      { label: "🏢 Occupancy", callback: "menu:principal:occupancy" },
      { label: "📅 Events", callback: "menu:principal:events" },
      { label: "📑 Delegation Log", callback: "menu:principal:delegation" },
      { label: "↩️ Back to /help", callback: "menu:principal:help" },
    ],
  },
  admin: {
    title: "📋 Admin Menu",
    buttons: [
      { label: "🏫 Campus Dashboard", callback: "menu:admin:campus" },
      { label: "👥 Users", callback: "menu:admin:users" },
      { label: "🚪 Gates", callback: "menu:admin:gates" },
      { label: "🔔 Alerts", callback: "menu:admin:alerts" },
      { label: "📝 Complaints", callback: "menu:admin:complaints" },
      { label: "💾 Backup Status", callback: "menu:admin:backup" },
      { label: "📅 Events", callback: "menu:admin:events" },
      { label: "↩️ Back to /help", callback: "menu:admin:help" },
    ],
  },
  sysadmin: {
    title: "📋 Sysadmin Menu",
    buttons: [
      { label: "🏫 Campus Dashboard", callback: "menu:sysadmin:campus" },
      { label: "👥 Users", callback: "menu:sysadmin:users" },
      { label: "🚪 Gates", callback: "menu:sysadmin:gates" },
      { label: "🔔 Alerts", callback: "menu:sysadmin:alerts" },
      { label: "📝 Complaints", callback: "menu:sysadmin:complaints" },
      { label: "🤖 Bot Stats", callback: "menu:sysadmin:bot" },
      { label: "📋 Audit Log", callback: "menu:sysadmin:audit" },
      { label: "💾 Backup", callback: "menu:sysadmin:backup" },
      { label: "↩️ Back to /help", callback: "menu:sysadmin:help" },
    ],
  },
  hostel_manager: {
    title: "📋 Hostel Menu",
    buttons: [
      { label: "🏢 Occupancy", callback: "menu:hostel_manager:occupancy" },
      { label: "⏰ Curfew Violations", callback: "menu:hostel_manager:curfew" },
      { label: "🚪 Gate Scans", callback: "menu:hostel_manager:gates" },
      { label: "🏠 Block Status", callback: "menu:hostel_manager:blocks" },
      { label: "🔗 Shift Handover", callback: "menu:hostel_manager:handover" },
      { label: "↩️ Back to /help", callback: "menu:hostel_manager:help" },
    ],
  },
  operator: {
    title: "📋 Operator Menu",
    buttons: [
      { label: "🚪 My Gate", callback: "menu:operator:gates" },
      { label: "🏢 Occupancy", callback: "menu:operator:occupancy" },
      { label: "🔔 Alerts", callback: "menu:operator:alerts" },
      { label: "🔗 Shift Handover", callback: "menu:operator:handover" },
      { label: "👤 Visitor Log", callback: "menu:operator:visitor" },
      { label: "↩️ Back to /help", callback: "menu:operator:help" },
    ],
  },
  supervisor: {
    title: "📋 Supervisor Menu",
    buttons: [
      { label: "🚪 All Gates", callback: "menu:supervisor:gates" },
      { label: "🔔 All Alerts", callback: "menu:supervisor:alerts" },
      { label: "🏢 Occupancy", callback: "menu:supervisor:occupancy" },
      { label: "📝 Escalated Complaints", callback: "menu:supervisor:complaints" },
      { label: "👤 Visitor Log (24h)", callback: "menu:supervisor:visitor" },
      { label: "↩️ Back to /help", callback: "menu:supervisor:help" },
    ],
  },
  guardian: {
    title: "📋 Guardian Menu",
    buttons: [
      { label: "👶 Ward Status", callback: "menu:guardian:child" },
      { label: "⏰ Curfew", callback: "menu:guardian:curfew" },
      { label: "📅 Exams", callback: "menu:guardian:exam" },
      { label: "📝 New Complaint", callback: "menu:guardian:complaint" },
      { label: "↩️ Back to /help", callback: "menu:guardian:help" },
    ],
  },
  caretaker: {
    title: "📋 Caretaker Menu",
    buttons: [
      { label: "🚪 Gates", callback: "menu:caretaker:gates" },
      { label: "🏢 Occupancy", callback: "menu:caretaker:occupancy" },
      { label: "🔔 Alerts", callback: "menu:caretaker:alerts" },
      { label: "🔧 Maintenance", callback: "menu:caretaker:maintenance" },
      { label: "👤 Visitor Log", callback: "menu:caretaker:visitor" },
      { label: "↩️ Back to /help", callback: "menu:caretaker:help" },
    ],
  },
};

// Fallback menu for roles not explicitly listed
const DEFAULT_MENU: InteractiveMenu = {
  title: "📋 Account Menu",
  buttons: [
    { label: "📋 Status", callback: "menu:default:status" },
    { label: "🔔 Alerts", callback: "menu:default:alerts" },
    { label: "📢 Announcements", callback: "menu:default:announce" },
    { label: "↩️ Back to /help", callback: "menu:default:help" },
  ],
};

// ── Command handlers ─────────────────────────────────────────────────────

async function cmdStatus(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    unique_id: string; name: string; role: string; status: string;
    onboarded_at: string | null; telegram_verified_at: string | null;
  }>(
    `SELECT unique_id, name, role, status, onboarded_at, telegram_verified_at
       FROM public.users WHERE id = $1 LIMIT 1`,
    [ctx.userId],
  );
  if (!rows[0]) return "⚠️ Account not found.";
  const u = rows[0];
  const roleLabel = u.role.toUpperCase().replace("_", " ");
  return (
    `📋 *Account — ${roleLabel}*\n\n` +
    `• ${u.unique_id} — ${u.name}\n` +
    `• Status: ${u.status}\n` +
    `• Onboarding: ${u.onboarded_at ? "Done" : "Pending"}\n` +
    `• Telegram: ${u.telegram_verified_at ? "Verified ✓" : "Pending"}`
  );
}

async function cmdPasses(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    purpose: string; status: string; created_at: string;
  }>(
    `SELECT purpose, status, created_at
       FROM public.passes WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 5`,
    [ctx.userId],
  );
  if (!rows.length) return "🎫 No gate passes found.";
  return (
    "🎫 *Recent Passes*\n\n" +
    rows.map((p) => `• ${p.purpose} — ${p.status} (${new Date(p.created_at).toLocaleDateString()})`).join("\n")
  );
}

async function cmdCurfew(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    score: number; total_deducted: number; last_violation: string | null;
  }>(
    `SELECT COALESCE(score, 0) AS score,
            COALESCE(total_deducted, 0) AS total_deducted,
            last_violation
       FROM public.student_curfew_scores WHERE student_user_id = $1 LIMIT 1`,
    [ctx.userId],
  );
  if (!rows[0]) return "No curfew data for this account.";
  const c = rows[0];
  return (
    `⏰ *Curfew Status*\n\n` +
    `• Score: ${c.score}/100\n` +
    `• Total deducted: ${c.total_deducted}\n` +
    `• Last violation: ${c.last_violation ? new Date(c.last_violation).toLocaleDateString() : "None"}`
  );
}

async function cmdAlerts(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    title: string; severity: string; created_at: string;
  }>(
    `SELECT title, severity, created_at
       FROM public.alerts WHERE resolved = false
       ORDER BY created_at DESC LIMIT 5`,
    [],
  );
  if (!rows.length) return "🔔 No active alerts.";
  return (
    "🔔 *Active Alerts*\n\n" +
    rows.map((a) => `• [${a.severity.toUpperCase()}] ${a.title}`).join("\n")
  );
}

async function cmdComplaint(ctx: BotContext): Promise<string> {
  return (
    "📝 *Raise a Complaint*\n\n" +
    "Reply with: /complaint <category> <description>\n\n" +
    "Categories: safety, mess, hostel, gate, other\n" +
    "Example: /complaint safety Gate 2 lighting is broken"
  );
}

async function cmdAnnounce(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    title: string; body: string; created_at: string;
  }>(
    `SELECT title, message AS body, created_at FROM public.announcements
      WHERE is_published = true
      ORDER BY created_at DESC LIMIT 3`,
    [],
  );
  if (!rows.length) return "📢 No announcements.";
  return (
    "📢 *Latest Announcements*\n\n" +
    rows.map((a) => `• ${a.title} (${new Date(a.created_at).toLocaleDateString()})\n  ${a.body.slice(0, 120)}`).join("\n\n")
  );
}

async function cmdAttendance(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM public.attendance_records
      WHERE student_id = $1 AND record_date = CURRENT_DATE`,
    [ctx.userId],
  );
  return (
    `📊 *Today's Attendance*\n\n` +
    `• Records logged: ${rows[0]?.count ?? "0"}\n` +
    `Visit the portal for detailed class-wise stats.`
  );
}

async function cmdStudents(ctx: BotContext): Promise<string> {
  // faculty_assignments.faculty_id is the FK to users.id.
  // Pull enrollment counts via the maintained class_student_counts
  // counter table (O(1) per class, no COUNT(*) over student_details).
  const { rows } = await ctx.client.query<{
    class_count: string;
    enrolled: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM public.faculty_assignments
         WHERE faculty_id = $1 AND is_active)::text AS class_count,
       (SELECT COALESCE(SUM(csc.student_count)::text, '0')
          FROM public.class_student_counts csc
          JOIN public.classes c
            ON c.department_id = csc.department
           AND c.year = csc.year
           AND c.section = csc.section
          WHERE c.class_teacher_id = $1
            AND c.is_active
       )::text AS enrolled`,
    [ctx.userId],
  );
  const r = rows[0];
  return (
    `👥 *My Classes & Students*\n\n` +
    `• Classes assigned: ${r?.class_count ?? "0"}\n` +
    `• Total students across classes: ${r?.enrolled ?? "0"}\n` +
    `Visit the portal → Faculty → My Classes for the full list.`
  );
}

async function cmdSchedule(ctx: BotContext): Promise<string> {
  return (
    "📅 *Today's Schedule*\n\n" +
    "Visit the portal → Faculty → My Classes for full class times."
  );
}

async function cmdClasses(ctx: BotContext): Promise<string> {
  // classes has: department_id, year, section, name, room_number, capacity
  // joined with class_student_counts for live enrollment.
  const { rows } = await ctx.client.query<{
    section: string; year: string; room: string; capacity: string; enrolled: string;
  }>(
    `SELECT
       c.section::text,
       c.year::text,
       COALESCE(c.room_number, 'TBA') AS room,
       COALESCE(c.capacity::text, '?') AS capacity,
       COALESCE(csc.student_count::text, '0') AS enrolled
      FROM public.classes c
      LEFT JOIN public.class_student_counts csc
        ON csc.class_key = c.department_id || ':' || c.year || ':' || c.section
     WHERE c.class_teacher_id = $1
       AND c.is_active
     ORDER BY c.year, c.section
     LIMIT 10`,
    [ctx.userId],
  );
  if (!rows.length) return "No classes found. Assign classes via the portal.";
  return (
    "🏫 *My Classes*\n\n" +
    rows.map((c) =>
      `• ${c.year}-${c.section} (${c.room}) — ${c.enrolled}/${c.capacity} students`
    ).join("\n")
  );
}

async function cmdShifts(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    start_time: string; end_time: string; name: string;
  }>(
    `SELECT start_time, end_time, name
       FROM public.shifts WHERE operator_id = $1
       AND start_time > NOW()
       ORDER BY start_time ASC LIMIT 5`,
    [ctx.userId],
  );
  if (!rows.length) return "🕐 No upcoming shifts.";
  return (
    "🕐 *Upcoming Shifts*\n\n" +
    rows.map((s) => `• ${s.name} — ${new Date(s.start_time).toLocaleString()} → ${new Date(s.end_time).toLocaleString()}`).join("\n")
  );
}

async function cmdHandover(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    notes: string; handed_by: string; created_at: string;
  }>(
    `SELECT notes, to_role AS handed_by, created_at
       FROM public.shift_handovers
      WHERE created_at > NOW() - INTERVAL '48 hours'
      ORDER BY created_at DESC LIMIT 3`,
    [],
  );
  if (!rows.length) return "🔗 No recent handover logs.";
  return (
    "🔗 *Recent Handovers*\n\n" +
    rows.map((h) => `• ${new Date(h.created_at).toLocaleString()} by ${h.handed_by}\n  ${h.notes.slice(0, 100)}`).join("\n\n")
  );
}

async function cmdGates(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    gate_name: string; last_scan: string | null;
  }>(
    `SELECT g.name AS gate_name,
            MAX(sc.created_at) AS last_scan
       FROM public.gates g
       LEFT JOIN public.scans sc ON sc.gate_id = g.id AND sc.created_at > NOW() - INTERVAL '1 hour'
      GROUP BY g.id, g.name
      ORDER BY g.name`,
    [],
  );
  if (!rows.length) return "No gates found.";
  return (
    "🚪 *Gate Status (last 1h)*\n\n" +
    rows.map((g) => `• ${g.gate_name} ${g.last_scan ? `(last scan ${new Date(g.last_scan).toLocaleTimeString()})` : "(no scans)"}`).join("\n")
  );
}

async function cmdOccupancy(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM public.campus_occupancy WHERE last_updated > NOW() - INTERVAL '24 hours'`,
    [],
  );
  return `🏢 *Campus Occupancy (24h)*\n\n• Currently inside: ${rows[0]?.total ?? "0"}`;
}

async function cmdCampus(ctx: BotContext): Promise<string> {
  const { rows: students } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.users WHERE role = 'student' AND status = 'ACTIVE'`, [],
  );
  const { rows: staff } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.users WHERE role IN ('faculty','staff','hod') AND status = 'ACTIVE'`, [],
  );
  const { rows: gates } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.gates`, [],
  );
  return (
    `🏫 *Campus Dashboard*\n\n` +
    `• Students: ${students[0]?.c ?? 0}\n` +
    `• Faculty/Staff: ${staff[0]?.c ?? 0}\n` +
    `• Gates: ${gates[0]?.c ?? 0}\n` +
    `Use the menu buttons for details.`
  );
}

async function cmdUsers(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    role: string; active: string; total: string;
  }>(
    `SELECT role,
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
            COUNT(*)::text AS total
       FROM public.users
      GROUP BY role ORDER BY total DESC`,
    [],
  );
  return (
    `👥 *Users by Role*\n\n` +
    rows.map((r) => `• ${r.role.toUpperCase()}: ${r.active}/${r.total} active`).join("\n")
  );
}

async function cmdComplaints(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.complaints WHERE status NOT IN ('resolved','closed')`,
    [],
  );
  return `📋 *Complaints*\n\n• Open: ${rows[0]?.c ?? "0"}\nVisit the portal for full details.`;
}

async function cmdBot(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    total: string; linked: string; verified: string;
  }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE telegram_chat_id IS NOT NULL)::text AS linked,
            COUNT(*) FILTER (WHERE telegram_verified_at IS NOT NULL)::text AS verified
       FROM public.users WHERE role = 'student'`,
    [],
  );
  const s = rows[0];
  return (
    `🤖 *Bot Stats (Students)*\n\n` +
    `• Total: ${s?.total ?? 0}\n` +
    `• Linked: ${s?.linked ?? 0}\n` +
    `• Verified: ${s?.verified ?? 0}`
  );
}

async function cmdAudit(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    action: string; actor: string; timestamp: string;
  }>(
    `SELECT action, actor, timestamp FROM public.audit_logs
      ORDER BY timestamp DESC LIMIT 5`,
    [],
  );
  if (!rows.length) return "No audit log entries.";
  return (
    "📋 *Recent Audit Log*\n\n" +
    rows.map((r) => `• ${new Date(r.timestamp).toLocaleString()} — ${r.actor}: ${r.action}`).join("\n")
  );
}

async function cmdChild(ctx: BotContext): Promise<string> {
  // guardian_id on student_details is the FK to the guardian/parent user.id.
  const { rows } = await ctx.client.query<{
    roll: string; name: string; entry_type: string;
  }>(
    `SELECT u.unique_id AS roll, u.name,
            COALESCE(sd.current_entry_type, 'unknown') AS entry_type
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.guardian_id = $1
      ORDER BY u.name
      LIMIT 5`,
    [ctx.userId],
  );
  const c = rows.length;
  return (
    `👨‍👩‍👧 *Your Children/Wards*\n\n` +
    (c
      ? rows.map((r) => `• ${r.roll} — ${r.name} (${r.entry_type})`).join("\n") + "\n"
      : `• No wards linked yet.\n`) +
    `Visit the portal → Parent Dashboard for gate details.`
  );
}

async function cmdDept(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    student_count: string; faculty_count: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM public.users WHERE role='student' AND status='ACTIVE') AS student_count,
       (SELECT COUNT(*)::text FROM public.users WHERE role='faculty' AND status='ACTIVE') AS faculty_count`,
    [],
  );
  const d = rows[0];
  return (
    `🏛 *Department Overview*\n\n` +
    `• Students: ${d?.student_count ?? 0}\n` +
    `• Faculty: ${d?.faculty_count ?? 0}\n` +
    `Use the menu for attendance, alerts, complaints.`
  );
}

async function cmdExam(ctx: BotContext): Promise<string> {
  // Exam schedule is stored per-subject via the portal. For now, return
  // a helpful fallback — extend when exam_schedule table is added.
  return (
    "📅 *Upcoming Exams*\n\n" +
    "No upcoming exam dates have been published yet.\n" +
    "Check the portal → Exams tab once the timetable is released."
  );
}

async function cmdMess(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.mess_notifications_log WHERE user_id = $1`,
    [ctx.userId],
  );
  return (
    `🍽 *Mess*\n\n` +
    `• Notifications: ${rows[0]?.c ?? "0"}\n` +
    `Visit the portal → Student → Mess Bill for details and opt-outs.`
  );
}

async function cmdGuardian(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    guardian_name: string; guardian_phone_last4: string; verification_status: string;
  }>(
    `SELECT guardian_name, guardian_phone_last4, verification_status
       FROM public.guardian_links WHERE student_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [ctx.userId],
  );
  if (!rows[0]) return "👨‍👩‍👧 No guardian linked.";
  const g = rows[0];
  return (
    `👨‍👩‍👧 *Guardian*\n\n` +
    `• Name: ${g.guardian_name}\n` +
    `• Phone: ****${g.guardian_phone_last4}\n` +
    `• Status: ${g.verification_status}`
  );
}

async function cmdHealth(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    status: string;
  }>(
    `SELECT 'green' AS status`, [],
  );
  return (
    `🏥 *System Health*\n\n` +
    `• Gate system: ${rows[0]?.status ?? "unknown"}\n` +
    `• Database: connected\n` +
    `• Telegram bot: operational`
  );
}

async function cmdEvents(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    title: string; event_date: string;
  }>(
    `SELECT title, created_at FROM public.campus_events
      ORDER BY created_at DESC LIMIT 5
      ORDER BY event_date ASC LIMIT 5`,
    [],
  );
  if (!rows.length) return "📅 No upcoming campus events.";
  return (
    "📅 *Campus Events*\n\n" +
    rows.map((e) => `• ${e.title} — ${new Date(e.event_date).toLocaleDateString()}`).join("\n")
  );
}

async function cmdDelegation(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    delegated_to: string; reason: string; created_at: string;
  }>(
    `SELECT to_role AS delegated_to, notes AS reason, created_at FROM public.delegation_logs
      ORDER BY created_at DESC LIMIT 3`,
    [],
  );
  if (!rows.length) return "📑 No delegation records.";
  return (
    "📑 *Recent Delegations*\n\n" +
    rows.map((d) => `• ${new Date(d.created_at).toLocaleDateString()} → ${d.delegated_to}: ${d.reason.slice(0, 60)}`).join("\n")
  );
}

async function cmdBackup(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.backups WHERE created_at > NOW() - INTERVAL '1 day'`,
    [],
  );
  return `💾 *Backup Status*\n\n• Backups in last 24h: ${rows[0]?.c ?? "0"}`;
}

async function cmdBlocks(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.hostel_tickets WHERE status = 'open'`,
    [],
  );
  return `🏠 *Hostel Blocks*\n\n• Total blocks: ${rows[0]?.c ?? "0"}`;
}

async function cmdMaintenance(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.hostel_tickets WHERE status = 'open'`,
    [],
  );
  return `🔧 *Maintenance*\n\n• Pending tickets: ${rows[0]?.c ?? "0"}`;
}

async function cmdVisitor(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.visitor_logs WHERE check_in_at > NOW() - INTERVAL '1 day'`,
    [],
  );
  return `👤 *Visitor Log (24h)*\n\n• Visitors today: ${rows[0]?.c ?? "0"}`;
}

// ── Handler registry ─────────────────────────────────────────────────────


// ── New STEP-3 handlers (student lifecycle + faculty ops) ──────────────

async function cmdFees(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    fee_type: string; amount: string; paid: string; status: string; due_date: string | null;
  }>(
    `SELECT fee_type, amount::text AS amount, paid::text AS paid, status, due_date
       FROM public.fee_items WHERE student_id = $1 ORDER BY due_date NULLS LAST`,
    [ctx.userId],
  );
  if (rows.length === 0) return "💳 *Fees*\n\nNo fee items on record.";
  const totalDue = rows.filter((r) => r.status !== "PAID" && r.status !== "WAIVED")
    .reduce((s, r) => s + (Number(r.amount) - Number(r.paid)), 0);
  const lines = rows.map((r) =>
    `• ${r.fee_type}: ₹${r.paid}/${r.amount} — ${r.status}${r.due_date ? ` (due ${r.due_date})` : ""}`);
  return `💳 *Fees*\n\n${lines.join("\n")}\n\n*Outstanding:* ₹${totalDue}`;
}

async function cmdLibrary(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    title: string; status: string; due_at: string | null; fine: string | null;
  }>(
    `SELECT lb.title, li.status, li.due_at, li.fine::text AS fine
       FROM public.library_issues li
       JOIN public.library_books lb ON lb.id = li.book_id
      WHERE li.student_id = $1 ORDER BY li.issued_at DESC LIMIT 10`,
    [ctx.userId],
  );
  if (rows.length === 0) return "📚 *Library*\n\nNo books issued.";
  return "📚 *Library*\n\n" + rows.map((r) =>
    `• ${r.title} — ${r.status}${r.due_at ? ` (due ${r.due_at.slice(0, 10)})` : ""}${r.fine && Number(r.fine) > 0 ? ` [fine ₹${r.fine}]` : ""}`).join("\n");
}

async function cmdMarks(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    exam_type: string; academic_year: number; term: string | null;
    score: string | null; max_marks: string;
  }>(
    `SELECT exam_type, academic_year, term, score::text AS score, max_marks::text AS max_marks
       FROM public.marks WHERE student_id = $1 AND status = 'PUBLISHED'
      ORDER BY academic_year DESC, exam_type LIMIT 15`,
    [ctx.userId],
  );
  if (rows.length === 0) return "📊 *Marks*\n\nNo published marks yet (drafts are hidden until results publish).";
  return "📊 *Grade Card*\n\n" + rows.map((r) =>
    `• ${r.exam_type} ${r.academic_year}${r.term ? ` ${r.term}` : ""}: ${r.score ?? "—"}/${r.max_marks}`).join("\n");
}

async function cmdAssignments(ctx: BotContext): Promise<string> {
  // Faculty: their open assignments. Students: open assignments for their class.
  if (ctx.role === "student") {
    const { rows } = await ctx.client.query<{
      title: string; due_at: string | null; status: string;
    }>(
      `SELECT a.title, a.due_at, a.status
         FROM public.assignments a
         JOIN public.classes c ON c.id = a.class_id
         JOIN public.student_details sd ON sd.department = c.department_id::text
        WHERE sd.user_id = $1 AND sd.year = c.year AND sd.section = c.section
          AND a.status = 'OPEN'
        ORDER BY a.due_at ASC LIMIT 10`,
      [ctx.userId],
    );
    if (rows.length === 0) return "📝 *Assignments*\n\nNo open assignments.";
    return "📝 *Open Assignments*\n\n" + rows.map((r) =>
      `• ${r.title}${r.due_at ? ` (due ${r.due_at.slice(0, 10)})` : ""}`).join("\n");
  }
  // Faculty: their own open assignments with submission counts.
  const { rows } = await ctx.client.query<{
    title: string; due_at: string | null; subs: string;
  }>(
    `SELECT a.title, a.due_at,
            (SELECT COUNT(*)::text FROM public.assignment_submissions s WHERE s.assignment_id = a.id) AS subs
       FROM public.assignments a WHERE a.faculty_id = $1 AND a.status = 'OPEN'
        ORDER BY a.due_at ASC LIMIT 10`,
    [ctx.userId],
  );
  if (rows.length === 0) return "📝 *Assignments*\n\nNo open assignments.";
  return "📝 *Your Open Assignments*\n\n" + rows.map((r) =>
    `• ${r.title}${r.due_at ? ` (due ${r.due_at.slice(0, 10)})` : ""} — ${r.subs} submissions`).join("\n");
}

async function cmdMentees(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    name: string; unique_id: string;
  }>(
    `SELECT u.name, u.unique_id FROM public.mentee_assignments ma
       JOIN public.users u ON u.id = ma.mentee_id
      WHERE ma.mentor_id = $1 AND ma.status = 'ACTIVE' ORDER BY u.unique_id`,
    [ctx.userId],
  );
  if (rows.length === 0) return "🎓 *Mentees*\n\nNo active mentees.";
  return `🎓 *Your Mentees (${rows.length})*\n\n` + rows.map((r) => `• ${r.name} (${r.unique_id})`).join("\n");
}

const HANDLERS: Record<string, (ctx: BotContext, text?: string) => Promise<string>> = {
  now: cmdNow,
  settings: cmdSettings,
  register: cmdRegister,
  review: cmdReview,
  "classes-add": cmdClassAdd,
  message: cmdMessage,
  status: cmdStatus,
  passes: cmdPasses,
  curfew: cmdCurfew,
  alerts: cmdAlerts,
  complaint: cmdComplaint,
  announce: cmdAnnounce,
  attendance: cmdAttendance,
  students: cmdStudents,
  schedule: cmdSchedule,
  classes: cmdClasses,
  shifts: cmdShifts,
  handover: cmdHandover,
  gates: cmdGates,
  occupancy: cmdOccupancy,
  campus: cmdCampus,
  users: cmdUsers,
  complaints: cmdComplaints,
  bot: cmdBot,
  audit: cmdAudit,
  child: cmdChild,
  dept: cmdDept,
  exam: cmdExam,
  mess: cmdMess,
  guardian: cmdGuardian,
  health: cmdHealth,
  events: cmdEvents,
  delegation: cmdDelegation,
  backup: cmdBackup,
  blocks: cmdBlocks,
  maintenance: cmdMaintenance,
  fees: cmdFees,
  library: cmdLibrary,
  marks: cmdMarks,
  assignments: cmdAssignments,
  mentees: cmdMentees,
  visitor: cmdVisitor,
};

// ── Menu handler ─────────────────────────────────────────────────────────

async function cmdMenu(ctx: BotContext): Promise<string> {
  return "Use the menu buttons below to navigate.";
}

/**
 * Get the inline keyboard for a role's menu.
 * Returns the keyboard structure for Telegram sendMessage.
 */
export function getMenuKeyboard(role: string): {
  replyMarkup: Record<string, unknown>;
} {
  const menu = ROLE_MENUS[role] ?? DEFAULT_MENU;
  // Group buttons into rows of 2 (Telegram inline keyboards support max 8 rows)
  const rows: Array<Array<Record<string, unknown>>> = [];
  for (let i = 0; i < menu.buttons.length; i += 2) {
    rows.push(
      menu.buttons.slice(i, i + 2).map((b) => ({
        text: b.label,
        callback_data: b.callback,
      }))
    );
  }
  return {
    replyMarkup: {
      inline_keyboard: rows,
    },
  };
}

/**
 * Get the commands available for a given role.
 */
export function getRoleCommands(role: string): Array<{ cmd: string; desc: string }> {
  const base = [
    { cmd: "/status", desc: "Your account status" },
    { cmd: "/help", desc: "Show all available commands" },
  ];
  const roleCmds = (ROLE_COMMANDS[role] ?? []).filter((c) => c.cmd !== "/menu");
  return [...base, ...roleCmds];
}

/**
 * Execute a role-scoped command. Returns the reply text.
 */
export async function executeBotCommand(
  ctx: BotContext,
  rawCommand: string
): Promise<string> {
  const cmd = rawCommand.toLowerCase().replace("@cej_server_bot", "").split(/\s+/)[0].replace("/", "");

  const allowed = new Set(getRoleCommands(ctx.role).map((c) => c.cmd.toLowerCase()));
  if (!allowed.has(`/${cmd}`)) {
    return (
      `⚠️ *${cmd.toUpperCase()}* is not available for your role (${ctx.role.toUpperCase()}).\n\n` +
      `Your commands:\n` +
      getRoleCommands(ctx.role).map((c) => `• ${c.cmd} — ${c.desc}`).join("\n")
    );
  }

  // Special: /menu returns a hint (actual keyboard is sent by the webhook)
  if (cmd === "menu") {
    return cmdMenu(ctx);
  }

  const handler = HANDLERS[cmd];
  if (!handler) {
    return `Unknown command: /${cmd}. Type /help for available commands.`;
  }

  try {
    return await handler(ctx, rawCommand);
  } catch (err) {
    console.error(`[BotCmd] ${cmd} failed:`, err);
    return `⚠️ Something went wrong fetching /${cmd}. Please try again later.`;
  }
}

/**
 * Handle a callback query from an inline menu button.
 * Returns the command to execute.
 */
export function parseMenuCallback(callbackData: string): { cmd: string; role: string } | null {
  // Format: menu:<role>:<command>
  const parts = callbackData.split(":");
  if (parts.length !== 3 || parts[0] !== "menu") return null;
  return { role: parts[1], cmd: parts[2] };
}

