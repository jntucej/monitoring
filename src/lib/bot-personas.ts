// src/lib/bot-personas.ts
/**
 * The personalization layer: /now, /settings, /register, /review.
 *
 * The "made for me" feeling lives here — not in a skin:
 *  - attendance-first ordering (attendance is always block #1)
 *  - fact-first messaging (first line is a fact, not "a greeting")
 *  - continuity memory ((same as yesterday, nothing else due))
 *  - role-context headers for warden and delegation contexts (audit
 *    guarantee made visible when acting under a context)
 *  - 4 settings, explicit-only (quiet hours asked, never inferred)
 *
 * All commands reuse the existing BotContext (the webhook already
 * builds it with SET ROLE gate_app + a pooled client).
 */
import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";
import type { BotContext } from "@/lib/bot-commands";
import {
  getPrefs, setPrefs, setReviewConsent, inQuietHours, markBlockSeen,
} from "@/lib/personalization/prefs";
import {
  buildRegisterKeyboard, openOrCreateDraft, csvTemplate, validateCsv,
  submitRegister, type RegisterRoster,
} from "@/lib/register";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

// ── /now — the one resource: attendance first, then schedule, results, P2 ──

export async function cmdNow(ctx: BotContext): Promise<string> {
  const prefs = await getPrefs(ctx.userId);
  const lines: string[] = [];

  // 1. Attendance (self) — always block #1, never empty
  const { rows: attRows } = await ctx.client.query<{
    subject: string; pct: string; at_risk: boolean;
  }>(
    `SELECT sd.course AS subject,
            ROUND(100.0 * COUNT(*) FILTER (WHERE ar.status = 'present')
                  / NULLIF(COUNT(*), 0), 1) AS pct,
            (COUNT(*) FILTER (WHERE ar.status = 'present')::numeric
             / NULLIF(COUNT(*), 0)) < 0.75 AS at_risk
       FROM public.student_details sd
       LEFT JOIN public.attendance_records ar
              ON ar.person_id = sd.user_id AND ar.date >= DATE_TRUNC('month', now())
      WHERE sd.user_id = $1
      GROUP BY sd.course
      ORDER BY at_risk DESC, sd.course`,
    [ctx.userId],
  );
  const attBlock = attRows.length
    ? "📊 *Your attendance — this month*\n" +
      attRows
        .map((r) =>
          `• ${r.subject} ${r.pct}%${r.at_risk ? " ⚠️ below 75%" : ""}`,
        )
        .join("\n")
    : "📊 *Your attendance — this month*\nNo sessions marked yet.";
  lines.push(attBlock);

  // 2. Schedule (next exam / class / shift)
  const { rows: nextRows } = await ctx.client.query<{ label: string; when: string }>(
    `SELECT label, when FROM public.notifications
      WHERE recipient_id = $1 AND type IN ('exam_upcoming','class_upcoming','shift_upcoming')
        AND delivered_at IS NULL
      ORDER BY created_at LIMIT 3`,
    [ctx.userId],
  );
  if (nextRows.length) {
    lines.push(
      "🗓 *Next up*\n" +
        nextRows.map((r) => `• ${r.label} — ${r.when}`).join("\n"),
    );
  }

  // 3. Results
  const { rows: resultRows } = await ctx.client.query<{ course: string; grade: string; published_at: string }>(
    `SELECT m.course, m.grade, m.published_at
       FROM public.marks m WHERE m.student_id = $1 AND m.published_at IS NOT NULL
      ORDER BY m.published_at DESC LIMIT 3`,
    [ctx.userId],
  );
  if (resultRows.length) {
    lines.push(
      "📈 *Latest results*\n" +
        resultRows.map((r) => `• ${r.course} — ${r.grade} (${new Date(r.published_at).toLocaleDateString("en-GB")})`).join("\n"),
    );
  }

  // 4. Reviews / complaint updates (P2, /now only)
  const { rows: complaintRows } = await ctx.client.query<{ id: string; status: string; category: string }>(
    `SELECT id, status, category FROM public.complaints
      WHERE reporter_id = $1 ORDER BY updated_at DESC LIMIT 3`,
    [ctx.userId],
  );
  if (complaintRows.length) {
    lines.push(
      "📮 *Your complaints*\n" +
        complaintRows.map((c) => `• #${c.id.slice(0, 8)} ${c.category} — ${c.status}`).join("\n"),
    );
  }

  // 5. P2 info (collapsed)
  const { rows: p2Rows } = await ctx.client.query<{ title: string }>(
    `SELECT title FROM public.notifications
      WHERE recipient_id = $1 AND priority = 'P2' AND read_at IS NULL
      ORDER BY created_at DESC LIMIT 5`,
    [ctx.userId],
  );
  if (p2Rows.length) {
    lines.push(
      "ℹ️ *Other (P2)*\n" + p2Rows.map((r) => `• ${r.title}`).join("\n"),
    );
  }

  const joined = lines.join("\n\n");
  // continuity memory: mark the /now envelope as seen
  void markBlockSeen(ctx.userId, "now_envelope", joined).catch(() => undefined);

  return (
    (prefs.density === "detailed" ? joined : joined.split("\n\n").slice(0, 3).join("\n\n")) +
    "\n\n— /settings · /register · /review"
  );
}

// ── /settings — the 4 toggles ─────────────────────────────────────────

export async function cmdSettings(ctx: BotContext): Promise<string> {
  const prefs = await getPrefs(ctx.userId);
  return (
    "⚙️ *Your settings*\n" +
    `Quiet hours: ${prefs.quiet_start} – ${prefs.quiet_end}\n` +
    `Density: ${prefs.density}\n` +
    `Digest: ${prefs.digest_time}\n` +
    `Review consent: ${prefs.consent_given ? "given " + (prefs.consent_at ?? "") : "not yet"}\n\n` +
    "Change:\n" +
    "/settings quiet 22:00-07:00\n" +
    "/settings density detailed\n" +
    "/settings digest 08:30\n" +
    "/settings consent  (accepts raw-review visibility once)"
  );
}

export async function cmdSettingsApply(ctx: BotContext, text: string): Promise<string> {
  const parts = text.split(/\s+/);
  const cmd = (parts[1] ?? "").toLowerCase();
  const prefs = await getPrefs(ctx.userId);

  if (cmd === "quiet") {
    const m = (parts[2] ?? "").match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
    if (!m) return "Usage: /settings quiet 23:00-08:00";
    await setPrefs(ctx.userId, { quiet_start: m[1], quiet_end: m[2] });
    return `Quiet hours: ${m[1]} – ${m[2]} ✓`;
  }
  if (cmd === "density") {
    const d = (parts[2] ?? "").toLowerCase();
    if (d !== "short" && d !== "detailed") return "Density is 'short' or 'detailed'.";
    await setPrefs(ctx.userId, { density: d });
    return `Density: ${d} ✓`;
  }
  if (cmd === "digest") {
    const m = (parts[2] ?? "").match(/^(\d{1,2}:\d{2})$/);
    if (!m) return "Usage: /settings digest 08:00";
    await setPrefs(ctx.userId, { digest_time: m[1] });
    return `Daily digest: ${m[1]} ✓`;
  }
  if (cmd === "consent") {
    await setReviewConsent(ctx.userId);
    return (
      "Your daily review goes to your HOD, and to the Dean and Principal. " +
      "They see your name and your words. You keep your own copy. " +
      "Nothing is scored automatically. Consent recorded ✓"
    );
  }
  return "Unknown setting. Try: /settings · /settings quiet · /settings density · /settings digest · /settings consent";
}

// ── /register — the CR/ICR gray→green register ───────────────────────

export interface RegisterSession {
  draftId: string;
  roster: RegisterRoster;
  presentFlags: Record<string, boolean>;
  actorId: string;
  actorName: string;
  supersede?: boolean;
  reason?: string;
}

const registerSessions = new Map<string, RegisterSession>();

export async function cmdRegister(ctx: BotContext): Promise<string> {
  const { rows: userRows } = await ctx.client.query<{ is_cr: boolean; is_icr: boolean }>(
    `SELECT is_cr, is_icr FROM public.users WHERE id = $1`,
    [ctx.userId],
  );
  const u = userRows[0];
  if (!u || (!u.is_cr && !u.is_icr)) {
    return "📋 /register is for CR/ICR takers. Ask your HOD to mark you as CR/ICR.";
  }

  const { rows: classRows } = await ctx.client.query<{ id: string; name: string }>(
    `SELECT DISTINCT fa.class_id AS id, c.name
       FROM public.faculty_assignments fa
       JOIN public.classes c ON c.id = fa.class_id
      WHERE fa.role IN ('cr','icr') AND fa.is_active
        AND fa.faculty_id = (SELECT id FROM public.users WHERE role IN ('student') AND is_cr)
      LIMIT 1`,
    [],
  );
  // Simpler: the CR sees their assigned class via a direct column
  const { rows: myClass } = await ctx.client.query<{ class_id: string; name: string; day_of_week: number; period_no: number }>(
    `SELECT c.id AS class_id, c.name, cp.day_of_week, cp.period_no
       FROM public.classes c
       JOIN public.class_periods cp ON cp.class_id = c.id
      WHERE c.class_teacher_id = $1
        AND cp.day_of_week = EXTRACT(DOW FROM now())::int + 1
      ORDER BY cp.start_time DESC LIMIT 1`,
    [ctx.userId],
  );
  if (!myClass.length) {
    return "No class period for today is assigned to you yet. Check with your HOD.";
  }
  const classRow = myClass[0];

  const roster = (await loadRosterForClass(ctx.client, classRow.class_id)) ?? {
    classId: classRow.class_id,
    classCode: classRow.name,
    sessionDate: new Date().toISOString().slice(0, 10),
    periodNo: classRow.period_no,
    rolls: [],
    labels: { width: 2 as const, labels: new Map() },
  };
  const { draftId, status, alreadyOpenBy } = await openOrCreateDraft(ctx.client, {
    classId: roster.classId,
    sessionDate: roster.sessionDate,
    periodNo: roster.periodNo,
    openedBy: ctx.userId,
    source: "cr",
  });

  const session: RegisterSession = {
    draftId,
    roster,
    presentFlags: {}, // gray default — all absent
    actorId: ctx.userId,
    actorName: ctx.name,
  };
  registerSessions.set(draftId, session);

  const kb = buildRegisterKeyboard(roster, session.presentFlags, draftId, alreadyOpenBy ?? undefined);
  const replyMarkup = {
    inline_keyboard: kb.rows.map((row) => row.map((b) => ({ text: b.text, callback_data: b.callback }))),
  };
  await sendTelegramMessage(
    ctx.chatId,
    kb.header,
    { replyMarkup, parseMode: "Markdown" },
  ).catch(() => undefined);

  return (
    `📋 *${roster.classCode} · P${roster.periodNo}* — ${roster.rolls.length} students · gray = absent, tap = present` +
    (alreadyOpenBy ? `\nℹ️ ${status === "open" ? "Another taker already opened this period — first submit wins." : ""}` : "")
  );
}

export function handleRegisterCallback(draftId: string, action: string, ctx: BotContext): string | null {
  const session = registerSessions.get(draftId);
  if (!session) return "Register session expired — re-run /register.";

  switch (action) {
    case "all":
      for (const r of session.roster.rolls) session.presentFlags[r] = true;
      break;
    case "clear":
      for (const r of session.roster.rolls) session.presentFlags[r] = false;
      break;
    case "submit":
      break;
    default:
      // roll-number toggle
      session.presentFlags[action] = !session.presentFlags[action];
  }

  if (action !== "submit") {
    const kb = buildRegisterKeyboard(session.roster, session.presentFlags, draftId);
    const replyMarkup = {
      inline_keyboard: kb.rows.map((row) => row.map((b) => ({ text: b.text, callback_data: b.callback }))),
    };
    void sendTelegramMessage(ctx.chatId, kb.header, { replyMarkup, parseMode: "Markdown" }).catch(() => undefined);
    return null;
  }

  // submit
  void submitRegister(ctx.client, {
    draftId,
    actorId: session.actorId,
    actorName: session.actorName,
    presentFlags: session.presentFlags,
  }).then((s) => {
    const kb = buildRegisterKeyboard(session.roster, session.presentFlags, draftId);
    return sendTelegramMessage(
      ctx.chatId,
      `✅ *${s.classCode} · P${s.periodNo} — Submitted ${new Date(s.submittedAt).toLocaleTimeString("en-GB")} by ${s.submittedByName}*\n` +
        `Total ${s.total} · Present ${s.present} · Absent ${s.absent}\n` +
        (s.absentRolls.length ? `Absent: ${s.absentRolls.join(", ")}` : "All present") +
        (kb.counters.present === s.present ? "" : "\n[ ✏️ Edit ] — via /register again"),
      { parseMode: "Markdown" },
    );
  }).catch(() => undefined);
  registerSessions.delete(draftId);
  return "Submitted.";
}

async function loadRosterForClass(client: BotContext["client"], classId: string): Promise<RegisterRoster | null> {
  try {
    const { planShortLabels } = await import("@/lib/register");
    const { rows: cRows } = await client.query<{ name: string }>(
      `SELECT name FROM public.classes WHERE id = $1`,
      [classId],
    );
    const { rows: rollRows } = await client.query<{ roll: string }>(
      `SELECT sd.roll FROM public.student_details sd
          JOIN public.users u ON u.id = sd.user_id
         WHERE u.status = 'ACTIVE' AND sd.roll IS NOT NULL
           AND u.department_id = (SELECT department_id FROM public.classes WHERE id = $1)
         ORDER BY sd.roll`,
      [classId],
    );
    const rolls = rollRows.map((r) => r.roll);
    return {
      classId,
      classCode: cRows[0]?.name ?? "UNKNOWN",
      sessionDate: new Date().toISOString().slice(0, 10),
      periodNo: 0,
      rolls,
      labels: planShortLabels(rolls),
    };
  } catch {
    return null;
  }
}

// ── /review — the duty-off one-tap review (the v1 write exception) ────

export async function cmdReview(ctx: BotContext): Promise<string> {
  const { rows: roleRows } = await ctx.client.query<{ role: string }>(
    `SELECT role FROM public.users WHERE id = $1`,
    [ctx.userId],
  );
  const role = roleRows[0]?.role;
  if (role !== "faculty" && role !== "staff" && role !== "hod") {
    return "/review is for faculty, staff, and HODs.";
  }

  const prefs = await getPrefs(ctx.userId);
  if (!prefs.consent_given) {
    return (
      "Your daily review goes to your HOD, and to the Dean and Principal. " +
      "They see your name and your words. You keep your own copy. " +
      "Nothing is scored automatically.\n\n" +
      "Reply with /review consent to accept, then /review good · /review attention · /review note"
    );
  }

  const { rows: todayRows } = await ctx.client.query<{ pct: string; count: string }>(
    `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ar.status = 'present') / NULLIF(COUNT(*),0),1) AS pct,
            COUNT(*)::text AS count
       FROM public.attendance_records ar
      WHERE ar.date = CURRENT_DATE AND ar.person_id = $1`,
    [ctx.userId],
  );
  const context = todayRows[0]
    ? `Today: ${todayRows[0].count} sessions · overall ${todayRows[0].pct}% present\n`
    : "Today: no sessions recorded\n";

  return (
    context +
    "*Overall, how did today go?*\n" +
    "/review good — all well\n" +
    "/review attention — something to flag\n" +
    "/review note <≤200 chars> — add a note\n" +
    "/review log — your past reviews"
  );
}

export async function cmdReviewApply(ctx: BotContext, text: string): Promise<string> {
  const parts = text.split(/\s+/);
  const cmd = (parts[1] ?? "").toLowerCase();
  const prefs = await getPrefs(ctx.userId);
  if (cmd === "consent") {
    if (prefs.consent_given) return "Consent already recorded. ✓";
    await setReviewConsent(ctx.userId);
    return "Consent recorded ✓ — your reviews go to HOD → Dean → Principal. Nothing is scored automatically.";
  }

  if (cmd === "log") {
    const { rows } = await ctx.client.query<{ session_date: string; rating: string; note: string; created_at: string }>(
      `SELECT session_date, rating, note, created_at FROM public.class_reviews
        WHERE faculty_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [ctx.userId],
    );
    if (!rows.length) return "No reviews yet. Your log will build here.";
    return (
      "📜 *Your review log*\n" +
      rows.map((r) =>
        `• ${new Date(r.created_at).toLocaleDateString("en-GB")} — ${r.rating.toUpperCase()}` +
        (r.note ? ` · "${r.note}"` : ""),
      ).join("\n")
    );
  }

  const rating = cmd === "good" ? "good" : cmd === "attention" ? "needs_attention" : cmd === "note" ? "note" : null;
  if (!rating) return "Use /review good · /review attention · /review note <text>";
  if (rating === "note" && !parts[2]) return "Add a note: /review note <≤200 chars>";
  const note = rating === "note" ? parts.slice(2).join(" ").slice(0, 200) : null;

  // aggregate today's class context
  const { rows: clsRows } = await ctx.client.query<{ subject: string; present: string; total: string }>(
    `SELECT fa.subject_code AS subject,
            COUNT(*) FILTER (WHERE ar.status = 'present')::text AS present,
            COUNT(*)::text AS total
       FROM public.faculty_assignments fa
       LEFT JOIN public.student_details sd
          ON sd.department = (SELECT c.department_id::text FROM public.classes c WHERE c.id = fa.class_id)
       LEFT JOIN public.attendance_records ar
          ON ar.person_id = sd.user_id AND ar.date = CURRENT_DATE
      WHERE fa.faculty_id = $1 AND fa.is_active
      GROUP BY fa.subject_code ORDER BY fa.subject_code`,
    [ctx.userId],
  );

  await ctx.client.query(
    `INSERT INTO public.class_reviews
       (faculty_id, session_date, class_ids, present_counts, rating, note)
     VALUES ($1, CURRENT_DATE, '{}', $2, $3, $4)
     ON CONFLICT (faculty_id, session_date) DO NOTHING`,
    [
      ctx.userId,
      JSON.stringify(Object.fromEntries(clsRows.map((c) => [c.subject, `${c.present}/${c.total}`]))),
      rating,
      note,
    ],
  );
  void recordMutationAudit({
    actorId: ctx.userId,
    roleContext: "faculty",
    action: "review_submit",
    resource: "class_reviews",
    afterState: { rating, note },
  }).catch(() => undefined);

  return (
    `✅ Review recorded — ${rating.toUpperCase()}` +
    (note ? ` · "${note}"` : "") +
    `\nGoes to your HOD → Dean → Principal. You keep a copy. /review log to see it.`
  );
}

// ── /classes-add, /classes-reschedule, /classes-substitute (flexible) ─

export async function cmdClassAdd(ctx: BotContext, text?: string): Promise<string> {
  const textStr = text ?? "";
  const parts = textStr.split(/\s+/);
  const type = (parts[1] ?? "extra").toLowerCase();
  if (!["extra", "reschedule", "substitute"].includes(type)) {
    return "Type: extra · reschedule · substitute — /classes-add <type> <class> <day> <period> [hall] [note]";
  }
  const classCode = parts[2];
  const day = parts[3];
  const period = parseInt(parts[4] ?? "0", 10);
  const hall = parts[5] ?? "";
  const note = parts.slice(6).join(" ") || null;

  const { rows: cRows } = await ctx.client.query<{ id: string }>(
    `SELECT id FROM public.classes WHERE name = $1 LIMIT 1`,
    [classCode ?? ""],
  );
  if (!cRows.length) return `Class "${classCode}" not found. /classes to see your classes.`;

  const state = type === "extra" ? "auto_approved" : "pending";
  const { rows: insRows } = await ctx.client.query<{ id: string }>(
    `INSERT INTO public.class_flexible
       (type, class_id, session_date, period_no, start_time, end_time, hall, created_by, approval_state, note)
     VALUES ($1, $2, CURRENT_DATE, $3, '10:00', '10:50', $4, $5, $6, $7)
     RETURNING id`,
    [type, cRows[0].id, period, hall, ctx.userId, state, note],
  );
  void recordMutationAudit({
    actorId: ctx.userId,
    roleContext: "faculty",
    action: "class_flexible",
    resource: "class_flexible",
    resourceId: insRows[0]?.id,
    afterState: { type, class: classCode, period, approval: state },
  }).catch(() => undefined);

  return state === "auto_approved"
    ? `✅ Extra class ${classCode} P${period} added for today. Register will open at period start.`
    : `🕓 ${type} for ${classCode} P${period} is pending HOD approval. You'll be notified when it's decided.`;
}

// ── /message — class messages (relay + direct) ─────────────────────────

export async function cmdMessage(ctx: BotContext, text?: string): Promise<string> {
  const textStr = text ?? "";
  const parts = textStr.split(/\s+/);
  const mode = (parts[1] ?? "relay").toLowerCase();
  const body = parts.slice(2).join(" ").trim();
  if (!body) return "Usage: /message [relay|direct] <your message>";
  if (!["relay", "direct"].includes(mode)) return "Mode must be 'relay' or 'direct'.";

  const { rows: cRows } = await ctx.client.query<{ id: string }>(
    `SELECT c.id FROM public.classes c
       JOIN public.faculty_assignments fa ON fa.class_id = c.id
      WHERE fa.faculty_id = $1 AND fa.is_active LIMIT 3`,
    [ctx.userId],
  );
  if (!cRows.length) return "No assigned classes found — your HOD hasn't set up your classes yet.";

  const urgency = mode === "direct" ? "urgent" : "normal";
  const autoReleaseAt = new Date(Date.now() + (mode === "relay" ? 30 : 5) * 60_000).toISOString();
  const { rows: insRows } = await ctx.client.query<{ id: string }>(
    `INSERT INTO public.class_messages
       (author_id, class_ids, mode, urgency, body, body_hash, auto_release_at, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING id`,
    [
      ctx.userId,
      cRows.map((c) => c.id),
      mode,
      urgency,
      body,
      require("crypto").createHash("sha256").update(body).digest("hex").slice(0, 16),
      autoReleaseAt,
    ],
  );
  const msgId = insRows[0].id;
  void recordMutationAudit({
    actorId: ctx.userId,
    roleContext: "faculty",
    action: "class_message",
    resource: "class_messages",
    resourceId: msgId,
    afterState: { mode, urgency, classes: cRows.map((c) => c.id) },
  }).catch(() => undefined);

  return mode === "direct"
    ? `📢 *Direct to students* — sent now to ${cRows.length} class(es).\n"from you · ${new Date().toLocaleTimeString("en-GB")}"`
    : `📨 *Relay queued* — ${cRows.length} CR/ICR group(s) will get a release card.\nAuto-releases in 30 min if no one taps.\n"from you · awaiting release"`;
}

// small helper used above
export { inQuietHours };
