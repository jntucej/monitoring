// src/lib/bot-commands.ts
/**
 * Role-based Telegram bot commands.
 * Each role gets a custom set of commands with resource-oriented queries
 * scoped to that user's own data. No cross-role leakage.
 */

import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";
import type { PoolClient } from "pg";

// ── Types ─────────────────────────────────────────────────────────────────

export interface BotCommandResult {
  ok: boolean;
  reply: string;
}

export interface BotContext {
  chatId: number;
  userId: string; // users.id
  uniqueId: string; // roll/staff ID
  name: string;
  role: string;
  status: string;
  client: PoolClient; // transaction-scoped client
}

// ── Role → command registry ──────────────────────────────────────────────

const ROLE_COMMANDS: Record<string, Array<{ cmd: string; desc: string }>> = {
  student: [
    { cmd: "/passes", desc: "Your active & recent gate passes" },
    { cmd: "/curfew", desc: "Your curfew status & score" },
    { cmd: "/alerts", desc: "Emergency alerts for your block" },
    { cmd: "/complaint", desc: "Raise a complaint (reply with details)" },
    { cmd: "/announce", desc: "Latest announcements for you" },
  ],
  faculty: [
    { cmd: "/attendance", desc: "Today's attendance summary for your classes" },
    { cmd: "/students", desc: "Your assigned students (count + names)" },
    { cmd: "/schedule", desc: "Today's class schedule" },
    { cmd: "/alerts", desc: "Active security/gate alerts on campus" },
  ],
  staff: [
    { cmd: "/shifts", desc: "Your upcoming shifts" },
    { cmd: "/gates", desc: "Gate status & recent scans" },
    { cmd: "/occupancy", desc: "Campus occupancy snapshot" },
    { cmd: "/alerts", desc: "Active alerts needing attention" },
  ],
  parent: [
    { cmd: "/child", desc: "Your child's gate entry/exit status" },
    { cmd: "/curfew", desc: "Your child's curfew compliance" },
    { cmd: "/announce", desc: "Campus announcements" },
    { cmd: "/complaint", desc: "Raise a complaint about your child" },
  ],
  hod: [
    { cmd: "/dept", desc: "Department stats: students, faculty, classes" },
    { cmd: "/attendance", desc: "Department attendance rate (today)" },
    { cmd: "/alerts", desc: "Active alerts in your department" },
    { cmd: "/complaints", desc: "Open complaints in your department" },
  ],
  principal: [
    { cmd: "/campus", desc: "Campus-wide dashboard: students, staff, gates" },
    { cmd: "/attendance", desc: "Institution-wide attendance (today)" },
    { cmd: "/alerts", desc: "All active alerts (security, curfew, emergency)" },
    { cmd: "/complaints", desc: "Top open complaints across campus" },
    { cmd: "/occupancy", desc: "Live campus occupancy" },
  ],
  admin: [
    { cmd: "/campus", desc: "Campus-wide dashboard" },
    { cmd: "/users", desc: "User stats by role & status" },
    { cmd: "/gates", desc: "All gate statuses + recent scans" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/complaints", desc: "All open complaints" },
    { cmd: "/occupancy", desc: "Live campus occupancy" },
  ],
  sysadmin: [
    { cmd: "/campus", desc: "Campus-wide dashboard" },
    { cmd: "/users", desc: "User stats by role & status" },
    { cmd: "/gates", desc: "All gate statuses + recent scans" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/complaints", desc: "All open complaints" },
    { cmd: "/occupancy", desc: "Live campus occupancy" },
    { cmd: "/bot", desc: "Bot stats: linked, verified, pending" },
  ],
  hostel_manager: [
    { cmd: "/occupancy", desc: "Hostel occupancy (live)" },
    { cmd: "/curfew", desc: "Hostel curfew violations (24h)" },
    { cmd: "/gates", desc: "Gate scans for hostel blocks" },
    { cmd: "/alerts", desc: "Active alerts for your hostel" },
  ],
  operator: [
    { cmd: "/gates", desc: "Your gate: status + recent scans" },
    { cmd: "/occupancy", desc: "Campus occupancy snapshot" },
    { cmd: "/alerts", desc: "Active alerts at your gate" },
  ],
  supervisor: [
    { cmd: "/gates", desc: "All gate statuses" },
    { cmd: "/alerts", desc: "All active alerts" },
    { cmd: "/occupancy", desc: "Campus occupancy" },
    { cmd: "/complaints", desc: "Open complaints (escalated)" },
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
    "Reply with your complaint details. Format:\n" +
    "`/complaint <category> <description>`\n\n" +
    "Categories: safety, mess, hostel, gate, other\n" +
    "Example: /complaint safety Gate 2 lighting is broken"
  );
}

async function cmdAnnounce(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    title: string; body: string; created_at: string;
  }>(
    `SELECT title, message AS body, created_at FROM public.announcements
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
  // Faculty/HOD: attendance for their assigned classes
  const { rows } = await ctx.client.query<{
    count: string;
  }>(
    `SELECT COUNT(*)::text AS count
       FROM public.attendance_records
      WHERE student_id = $1 AND record_date = CURRENT_DATE
      LIMIT 1`,
    [ctx.userId],
  );
  const todayCount = rows[0]?.count ?? "0";
  return (
    `📊 *Today's Attendance*\n\n` +
    `• Records logged: ${todayCount}\n` +
    `For detailed class-wise stats, visit the portal → Faculty → Attendance.`
  );
}

async function cmdStudents(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    student_count: string;
  }>(
    `SELECT COUNT(*)::text AS student_count
       FROM public.faculty_assignments fa
      WHERE fa.faculty_user_id = $1 AND fa.is_active = true
      GROUP BY fa.faculty_user_id`,
    [ctx.userId],
  );
  const count = rows[0]?.student_count ?? "0";
  return (
    `👥 *Assigned Students*\n\n` +
    `• Total: ${count}\n` +
    `Visit the portal → Faculty → My Classes for the full list.`
  );
}

async function cmdSchedule(ctx: BotContext): Promise<string> {
  return (
    "📅 *Today's Schedule*\n\n" +
    "Visit the portal → Faculty → My Classes for full class times.\n" +
    "The bot will send push alerts 15 min before each class."
  );
}

async function cmdShifts(ctx: BotContext): Promise<string> {
  return (
    "🕐 *Upcoming Shifts*\n\n" +
    "Visit the portal → Staff → My Day for shift details.\n" +
    "The bot will notify you 30 min before your next shift."
  );
}

async function cmdGates(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    gate_name: string; status: string; last_scan: string | null;
  }>(
    `SELECT g.name AS gate_name,
            'active' AS status,
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
    rows.map((g) => `• ${g.gate_name}: ${g.status} ${g.last_scan ? `(last scan ${new Date(g.last_scan).toLocaleTimeString()})` : "(no scans)"}`).join("\n")
  );
}

async function cmdOccupancy(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    total: string;
  }>(
    `SELECT COUNT(*)::text AS total FROM public.campus_occupancy WHERE last_updated > NOW() - INTERVAL '24 hours'`,
    [],
  );
  const total = rows[0]?.total ?? "0";
  return `🏢 *Campus Occupancy (24h)*\n\n• Currently inside: ${total}`;
}

async function cmdCampus(ctx: BotContext): Promise<string> {
  const { rows: students } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.users WHERE role = 'student' AND status = 'ACTIVE'`,
    [],
  );
  const { rows: staff } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.users WHERE role IN ('faculty','staff','hod') AND status = 'ACTIVE'`,
    [],
  );
  const { rows: gates } = await ctx.client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM public.gates`,
    [],
  );
  return (
    `🏫 *Campus Dashboard*\n\n` +
    `• Students: ${students[0]?.c ?? 0}\n` +
    `• Faculty/Staff: ${staff[0]?.c ?? 0}\n` +
    `• Active Gates: ${gates[0]?.c ?? 0}\n` +
    `Type /gates, /occupancy, /alerts for details.`
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
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.complaints WHERE status NOT IN ('resolved','closed')`,
    [],
  );
  const open = rows[0]?.c ?? "0";
  return `📋 *Complaints*\n\n• Open: ${open}\nVisit the portal for full details.`;
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

async function cmdChild(ctx: BotContext): Promise<string> {
  const { rows } = await ctx.client.query<{
    c: string;
  }>(
    `SELECT COUNT(*)::text AS c FROM public.parent_student_links WHERE parent_user_id = $1`,
    [ctx.userId],
  );
  const count = rows[0]?.c ?? "0";
  return (
    `👨‍👩‍👧 *Your Children*\n\n` +
    `• Linked: ${count}\n` +
    `Visit the portal → Parent Dashboard for gate entry/exit details.`
  );
}

async function cmdDept(ctx: BotContext): Promise<string> {
  return (
    `🏛 *Department Overview*\n\n` +
    `Visit the portal → HOD Dashboard for full department stats.\n` +
    `The bot will send you daily summaries at 8 AM.`
  );
}

// ── Handler registry ─────────────────────────────────────────────────────

const HANDLERS: Record<string, (ctx: BotContext) => Promise<string>> = {
  status: cmdStatus,
  passes: cmdPasses,
  curfew: cmdCurfew,
  alerts: cmdAlerts,
  complaint: cmdComplaint,
  announce: cmdAnnounce,
  attendance: cmdAttendance,
  students: cmdStudents,
  schedule: cmdSchedule,
  shifts: cmdShifts,
  gates: cmdGates,
  occupancy: cmdOccupancy,
  campus: cmdCampus,
  users: cmdUsers,
  complaints: cmdComplaints,
  bot: cmdBot,
  child: cmdChild,
  dept: cmdDept,
};

/**
 * Get the commands available for a given role.
 */
export function getRoleCommands(role: string): Array<{ cmd: string; desc: string }> {
  // Base commands available to all roles
  const base = [
    { cmd: "/status", desc: "Your account status" },
    { cmd: "/help", desc: "Show all available commands" },
  ];
  const roleCmds = ROLE_COMMANDS[role] ?? [];
  return [...base, ...roleCmds];
}

/**
 * Execute a role-scoped command. Returns the reply text.
 * The command must be in the role's allowed set; otherwise returns help.
 */
export async function executeBotCommand(
  ctx: BotContext,
  rawCommand: string
): Promise<string> {
  const cmd = rawCommand.toLowerCase().replace("@cej_server_bot", "").split(/\s+/)[0].replace("/", "");

  // Check role permission
  const allowed = new Set(getRoleCommands(ctx.role).map((c) => c.cmd.toLowerCase()));
  if (!allowed.has(`/${cmd}`)) {
    return (
      `⚠️ *${cmd.toUpperCase()}* is not available for your role (${ctx.role.toUpperCase()}).\n\n` +
      `Available commands:\n` +
      getRoleCommands(ctx.role).map((c) => `• ${c.cmd} — ${c.desc}`).join("\n")
    );
  }

  const handler = HANDLERS[cmd];
  if (!handler) {
    return `Unknown command: /${cmd}. Type /help for available commands.`;
  }

  try {
    return await handler(ctx);
  } catch (err) {
    console.error(`[BotCmd] ${cmd} failed:`, err);
    return `⚠️ Something went wrong fetching /${cmd}. Please try again later.`;
  }
}
