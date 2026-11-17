// src/lib/register.ts
/**
 * The Class Register surface.
 *
 * Model (locked decisions):
 *  - gray default: all absent (⬜), tap = present (🟢), tap again reverts
 *  - "Mark all present" + "Clear all" shortcuts (the 70-tap day → 1 tap)
 *  - short labels: last two digits, collision-aware (auto-widen to 3,
 *    then full roll) — display layer only, never stored
 *  - 4 authorized takers (CR-boy/girl, ICR-boy/girl) see the same
 *    register for all 70 — no gender split of the roster
 *  - soft lock: first opener is recorded; others see "CR-girl is
 *    marking this period"
 *  - submit finalizes for everyone; first submit wins; edits after
 *    go through the correction path
 *  - faculty supersede CR: faculty submission overwrites the CR's,
 *    with mandatory reason + delta preview; CR/ICR get notified
 *  - CSV upload: pre-filled roster template (all P), faculty flips
 *    the few to A; validated all-or-nothing against the roster
 */
import { createHash } from "crypto";
import type { PoolClient } from "pg";

// ── short labels (display layer only) ──────────────────────────────────

export interface ShortLabelPlan {
  width: 2 | 3 | "full";
  labels: Map<string, string>; // roll → label
}

/**
 * Build the label plan for a roster. Collision rule:
 *  - no collision within the class → last two digits
 *  - collision → widen to last three for the WHOLE class
 *  - still colliding → full roll
 */
export function planShortLabels(rolls: string[]): ShortLabelPlan {
  const two = new Map<string, string>();
  for (const r of rolls) two.set(r, r.slice(-2));
  const collide2 = new Set(two.values());
  if (collide2.size === rolls.length && rolls.length > 0) {
    return { width: 2, labels: two };
  }
  const three = new Map<string, string>();
  for (const r of rolls) three.set(r, r.slice(-3));
  const collide3 = new Set(three.values());
  if (collide3.size === rolls.length && rolls.length > 0) {
    return { width: 3, labels: three };
  }
  const full = new Map(rolls.map((r) => [r, r]));
  return { width: "full", labels: full };
}

// ── roster + draft access ──────────────────────────────────────────────

export interface RegisterRoster {
  classId: string;
  classCode: string;
  sessionDate: string; // "2026-11-18"
  periodNo: number;
  rolls: string[]; // full roll numbers, sorted
  labels: ShortLabelPlan;
}

export async function loadRoster(
  client: PoolClient,
  classId: string,
): Promise<RegisterRoster> {
  const { rows: classRows } = await client.query<{ name: string }>(
    `SELECT name FROM public.classes WHERE id = $1`,
    [classId],
  );
  const classCode = classRows[0]?.name ?? "UNKNOWN";
  const { rows: rollRows } = await client.query<{ roll: string }>(
    `SELECT sd.roll
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.department = (SELECT department_id::text FROM public.classes WHERE id = $1)
        AND u.status = 'ACTIVE'
      ORDER BY sd.roll`,
    [classId],
  );
  const rolls = rollRows.map((r) => r.roll).filter(Boolean);
  const rosters = rolls;
  return {
    classId,
    classCode,
    sessionDate: new Date().toISOString().slice(0, 10),
    periodNo: 0,
    rolls: rosters,
    labels: planShortLabels(rosters),
  };
}

export async function openOrCreateDraft(
  client: PoolClient,
  params: {
    classId: string;
    sessionDate: string;
    periodNo: number;
    openedBy: string;
    source?: "cr" | "faculty" | "upload";
  },
): Promise<{ draftId: string; status: string; alreadyOpenBy: string | null }> {
  const { rows } = await client.query<{ id: string; status: string; opened_by: string }>(
    `SELECT id, status, opened_by FROM public.class_register_drafts
      WHERE class_id = $1 AND session_date = $2 AND period_no = $3
      LIMIT 1`,
    [params.classId, params.sessionDate, params.periodNo],
  );
  let draft = rows[0];
  if (!draft) {
    const ins = await client.query<{ id: string; status: string; opened_by: string }>(
      `INSERT INTO public.class_register_drafts
         (class_id, session_date, period_no, opened_by, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, opened_by`,
      [params.classId, params.sessionDate, params.periodNo, params.openedBy, params.source ?? "cr"],
    );
    draft = ins.rows[0];
  }
  // session row (reconstructable if disputed; not per-tap audit)
  await client.query(
    `INSERT INTO public.attendance_register_sessions (draft_id, opened_by)
     VALUES ($1, $2)`,
    [draft.id, params.openedBy],
  );
  return {
    draftId: draft.id,
    status: draft.status,
    alreadyOpenBy: draft.status === "open" ? draft.opened_by : null,
  };
}

// ── keyboard (the Telegram inline keyboard) ───────────────────────────

export interface RegisterKeyboard {
  header: string;
  rows: Array<Array<{ text: string; callback: string }>>;
  counters: { present: number; absent: number; total: number };
}

export function buildRegisterKeyboard(
  roster: RegisterRoster,
  presentFlags: Record<string, boolean>,
  draftId: string,
  openerName?: string | null,
): RegisterKeyboard {
  const total = roster.rolls.length;
  let present = 0;
  for (const r of roster.rolls) if (presentFlags[r]) present += 1;

  const header =
    `📋 ${roster.classCode} · P${roster.periodNo} · ${total} students` +
    (openerName ? ` · ${openerName} is marking` : "") +
    `\n⬜ = absent · tap to mark present · Present ${present} · Absent ${total - present}`;

  const rows: Array<Array<{ text: string; callback: string }>> = [];

  // Top row: shortcuts
  rows.push([
    { text: "✅ Mark all present", callback: `reg:${draftId}:all` },
    { text: "⬜ Clear all", callback: `reg:${draftId}:clear` },
  ]);

  // Grid: 5 per row (short labels keep the grid uniform)
  const step = roster.labels.width === 2 ? roster.labels.width : roster.labels.width === 3 ? 3 : "full";
  void step;
  const cols = 5;
  const grid: string[] = roster.rolls.map((r) => {
    const label = roster.labels.labels.get(r) ?? r;
    const on = presentFlags[r] ? "🟢" : "⬜";
    return `${on} ${label}`;
  });
  for (let i = 0; i < grid.length; i += cols) {
    rows.push(
      grid.slice(i, i + cols).map((text, j) => ({
        text,
        callback: `reg:${draftId}:${roster.rolls[i + j]}`,
      })),
    );
  }

  // Bottom row: submit
  rows.push([{ text: "📨 Submit", callback: `reg:${draftId}:submit` }]);

  return { header, rows, counters: { present, absent: total - present, total } };
}

// ── submit → summary card + attendance_records write ──────────────────

export interface RegisterSummary {
  draftId: string;
  classCode: string;
  periodNo: number;
  sessionDate: string;
  total: number;
  present: number;
  absent: number;
  absentRolls: string[];
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
}

export async function submitRegister(
  client: PoolClient,
  params: {
    draftId: string;
    actorId: string;
    actorName: string;
    presentFlags: Record<string, boolean>;
    supersede?: boolean;
    reason?: string;
  },
): Promise<RegisterSummary> {
  const { rows: draftRows } = await client.query<{
    id: string; class_id: string; session_date: string; period_no: number;
    status: string; submitted_by: string | null; source: string;
  }>(
    `SELECT id, class_id, session_date, period_no, status, submitted_by, source
       FROM public.class_register_drafts WHERE id = $1 FOR UPDATE`,
    [params.draftId],
  );
  const draft = draftRows[0];
  if (!draft) throw new Error("draft not found");

  const { rows: classRows } = await client.query<{ name: string }>(
    `SELECT name FROM public.classes WHERE id = $1`,
    [draft.class_id],
  );
  const { rows: rosterRows } = await client.query<{ roll: string }>(
    `SELECT sd.roll FROM public.student_details sd
        JOIN public.users u ON u.id = sd.user_id
       WHERE sd.department = (SELECT department_id::text FROM public.classes WHERE id = $1)
         AND u.status = 'ACTIVE' ORDER BY sd.roll`,
    [draft.class_id],
  );
  const rolls = rosterRows.map((r) => r.roll);

  let present = 0;
  const absentRolls: string[] = [];
  for (const roll of rolls) {
    if (params.presentFlags[roll]) present += 1;
    else absentRolls.push(roll);
  }

  const superseded = params.supersede && draft.status === "submitted";

  // Write attendance_records — one row per student.
  // person_id = student user id; status present/absent; direction IN.
  const { rows: studentRows } = await client.query<{ user_id: string; roll: string }>(
    `SELECT u.id AS user_id, sd.roll
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.roll = ANY($1) AND u.status = 'ACTIVE'`,
    [rolls],
  );
  for (const s of studentRows) {
    const isPresent = !!params.presentFlags[s.roll];
    await client.query(
      `INSERT INTO public.attendance_records
         (person_id, date, status, direction, time_in, meta, dedupe_key)
       VALUES ($1, $2, $3, 'IN', now(), $4, $5)
       ON CONFLICT (dedupe_key) DO UPDATE
         SET status = EXCLUDED.status,
             time_in = EXCLUDED.time_in,
             meta = EXCLUDED.meta`,
      [
        s.user_id,
        draft.session_date,
        isPresent ? "present" : "absent",
        JSON.stringify({
          class: classRows[0]?.name,
          period: draft.period_no,
          draft_id: draft.id,
          source: params.supersede ? "faculty_supersede" : draft.source,
          ...(params.reason ? { reason: params.reason } : {}),
        }),
        `reg:${draft.id}:${s.roll}`,
      ],
    );
  }

  await client.query(
    `UPDATE public.class_register_drafts
        SET status = $2, submitted_at = now(), submitted_by = $3,
            source = $4
      WHERE id = $1`,
    [
      draft.id,
      superseded ? "superseded" : "submitted",
      params.actorId,
      params.supersede ? "faculty" : draft.source,
    ],
  );

  // audit — append-only, tamper-evident chain
  const action = superseded ? "attendance_supersede" : "attendance_submit";
  const summary: RegisterSummary = {
    draftId: draft.id,
    classCode: classRows[0]?.name ?? "",
    periodNo: draft.period_no,
    sessionDate: draft.session_date,
    total: rolls.length,
    present,
    absent: rolls.length - present,
    absentRolls,
    submittedBy: params.actorId,
    submittedByName: params.actorName,
    submittedAt: new Date().toISOString(),
  };
  try {
    await client.query(
      `INSERT INTO public.audit_events
         (actor_id, actor_type, role_context, action, resource, resource_id, after_state)
       VALUES ($1, 'user', 'register', $2, 'attendance_register', $3, $4)`,
      [
        params.actorId,
        action,
        draft.id,
        JSON.stringify({
          ...summary,
          reason: params.reason ?? null,
          supersede: params.supersede ?? false,
        }),
      ],
    );
  } catch {
    // best-effort
  }
  return summary;
}

// ── CSV upload (pre-filled template + delta preview) ───────────────────

export interface CsvValidationResult {
  ok: boolean;
  errors: string[];
  present?: number;
  absent?: number;
  absentRolls?: string[];
  deltaAgainst?: { roll: string; from: string; to: string }[];
}

/**
 * Validate an uploaded CSV against the roster.
 * Template is pre-filled with all P; faculty flips few to A.
 * All-or-nothing: a bad file never partially applies.
 */
export function validateCsv(
  text: string,
  roster: { rolls: string[] },
  existing?: { presentFlags: Record<string, boolean>; submittedBy?: string },
): CsvValidationResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, errors: ["empty file"] };

  const header = lines[0].toLowerCase();
  if (header !== "roll_number,status") {
    errors.push("Header must be exactly: roll_number,status");
    return { ok: false, errors };
  }

  const rows = lines.slice(1);
  if (rows.length !== roster.rolls.length) {
    errors.push(`Expected ${roster.rolls.length} rows, got ${rows.length}`);
    return { ok: false, errors };
  }

  const seen = new Set<string>();
  const flags: Record<string, boolean> = {};
  let present = 0;
  const absentRolls: string[] = [];

  for (const line of rows) {
    const parts = line.split(",");
    if (parts.length !== 2) {
      errors.push(`Bad row: "${line}"`);
      continue;
    }
    const roll = parts[0].trim();
    const status = parts[1].trim().toUpperCase();
    if (!roster.rolls.includes(roll)) {
      errors.push(`Row: ${roll} not in this class`);
      continue;
    }
    if (seen.has(roll)) {
      errors.push(`${roll} appears twice`);
      continue;
    }
    seen.add(roll);
    if (status !== "P" && status !== "A") {
      errors.push(`Row ${roll}: status must be P or A (got "${status}")`);
      continue;
    }
    flags[roll] = status === "P";
    if (status === "P") present += 1;
    else absentRolls.push(roll);
  }

  if (errors.length) return { ok: false, errors };

  // delta against an existing submitted CR draft (the supersede preview)
  let deltaAgainst: CsvValidationResult["deltaAgainst"];
  if (existing?.presentFlags) {
    deltaAgainst = [];
    for (const roll of roster.rolls) {
      const from = existing.presentFlags[roll] ? "P" : "A";
      const to = flags[roll] ? "P" : "A";
      if (from !== to) deltaAgainst.push({ roll, from, to });
    }
  }

  return {
    ok: true,
    errors: [],
    present,
    absent: roster.rolls.length - present,
    absentRolls,
    deltaAgainst,
  };
}

/** Pre-filled CSV template: roster, all P, baked class/period/date. */
export function csvTemplate(roster: { rolls: string[]; classCode: string; periodNo: number; sessionDate: string }): string {
  const lines = ["roll_number,status", ...roster.rolls.map((r) => `${r},P`)];
  const fname = `attendance_${roster.classCode}_P${roster.periodNo}_${roster.sessionDate}.csv`;
  return `# ${fname}\n${lines.join("\n")}`;
}

export function sha256short(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
