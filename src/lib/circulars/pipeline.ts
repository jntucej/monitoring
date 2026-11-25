import { randomBytes } from "crypto";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { publishNotification } from "@/lib/notifications/bus";

export const ALLOWED_ROLES = [
  "student",
  "faculty",
  "hod",
  "guardian",
  "staff",
  "operator",
  "worker",
] as const;

export const ALLOWED_PERSONAS = ["hosteller", "day_scholar"] as const;

export const ALLOWED_DEPARTMENTS = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "AIML",
] as const;

export interface ClassifiedTargets {
  roles: string[];
  personas: string[];
  departments: string[];
  hostel_blocks: string[];
  confidence: number;
  rationale: string[];
  estimated_headcount: number;
}

export interface ExtractedCircularFields {
  title: string;
  circular_no: string | null;
  issued_by: string | null;
  effective_date: string | null;
  deadline: string | null;
  summary: string;
  action_required: boolean;
}

function parseIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : `${trimmed} UTC`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Stage 1: Deterministic OCR/text field extraction.
 */
export function extractCircularFields(
  rawText: string,
  titleOverride?: string,
): ExtractedCircularFields {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const title =
    titleOverride?.trim() ||
    lines.find((l) => l.length > 6 && !/^circular\s*no/i.test(l)) ||
    "Campus Circular";

  const circMatch = rawText.match(/(?:circular\s*(?:no\.?|#)|ref\.?\s*no\.?)\s*[:\-]?\s*([A-Z0-9\/\-]+)/i);
  const issuedMatch = rawText.match(/(?:issued\s*by|from)\s*[:\-]?\s*([A-Za-z0-9 .,&\-]{3,60})/i);
  const effMatch = rawText.match(
    /(?:effective\s*(?:from|date)|dated?)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const deadMatch = rawText.match(
    /(?:deadline|last\s*date|due\s*(?:by|on)|valid\s*until)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );

  const actionRequired = /\b(mandatory|required|must\s+submit|compulsory|action\s+required|acknowledge)\b/i.test(
    rawText,
  );

  const summary = lines.slice(0, 4).join(" ").slice(0, 320);

  return {
    title: title.slice(0, 160),
    circular_no: circMatch?.[1] ?? null,
    issued_by: issuedMatch?.[1]?.trim() ?? null,
    effective_date: parseIsoDate(effMatch?.[1]),
    deadline: parseIsoDate(deadMatch?.[1]),
    summary,
    action_required: actionRequired,
  };
}

/**
 * Stage 2: Strict schema-constrained target classifier.
 */
export async function classifyCircularTargets(
  rawText: string,
): Promise<ClassifiedTargets> {
  const roles = new Set<string>();
  const personas = new Set<string>();
  const departments = new Set<string>();
  const hostelBlocks = new Set<string>();
  const rationale: string[] = [];

  if (/\b(students?|b\.?tech|m\.?tech|year|semester|exam|hostel)\b/i.test(rawText)) {
    roles.add("student");
    rationale.push("Matched student/academic/hostel keywords");
  }
  if (/\b(faculty|professors?|lecturers?|teaching\s+staff)\b/i.test(rawText)) {
    roles.add("faculty");
    rationale.push("Matched faculty keywords");
  }
  if (/\b(hods?|heads?\s+of\s+department)\b/i.test(rawText)) {
    roles.add("hod");
    rationale.push("Matched HOD keywords");
  }
  if (/\b(parents?|guardians?)\b/i.test(rawText)) {
    roles.add("guardian");
    rationale.push("Matched parent/guardian keywords");
  }
  if (/\b(staff|non-teaching|office)\b/i.test(rawText)) {
    roles.add("staff");
    rationale.push("Matched staff keywords");
  }
  if (/\b(workers?|housekeeping|kitchen|maintenance)\b/i.test(rawText)) {
    roles.add("worker");
    rationale.push("Matched worker keywords");
  }
  if (roles.size === 0) {
    roles.add("student");
    roles.add("faculty");
    rationale.push("Defaulted to campus-wide student + faculty");
  }

  if (/\b(hostellers?|hostel\s+residents?|mess|curfew)\b/i.test(rawText)) {
    personas.add("hosteller");
    rationale.push("Matched hosteller persona");
  }
  if (/\b(day\s*scholars?|bus|transport)\b/i.test(rawText)) {
    personas.add("day_scholar");
    rationale.push("Matched day_scholar persona");
  }

  for (const dept of ALLOWED_DEPARTMENTS) {
    if (new RegExp(`\\b${dept}\\b`, "i").test(rawText)) {
      departments.add(dept);
    }
  }
  if (departments.size > 0) {
    rationale.push(`Detected departments: ${[...departments].join(", ")}`);
  }

  const blockMatches = rawText.match(/\b(?:Block\s*[A-Z0-9]+|Boys[\s\-]*\d+|Girls[\s\-]*\d+)\b/gi) ?? [];
  for (const b of blockMatches) {
    hostelBlocks.add(b.trim());
  }

  const targets: ClassifiedTargets = {
    roles: [...roles],
    personas: [...personas],
    departments: [...departments],
    hostel_blocks: [...hostelBlocks],
    confidence: rationale.length >= 2 ? 0.9 : 0.75,
    rationale,
    estimated_headcount: 0,
  };

  const userIds = await resolveTargetUserIds(targets);
  targets.estimated_headcount = userIds.length;
  return targets;
}

export async function resolveTargetUserIds(targets: {
  roles?: string[];
  personas?: string[];
  departments?: string[];
  hostel_blocks?: string[];
}): Promise<string[]> {
  const roles = targets.roles?.length ? targets.roles : ["student"];
  const personas = targets.personas ?? [];
  const departments = targets.departments ?? [];
  const blocks = targets.hostel_blocks ?? [];

  const { rows } = await query<{ id: string }>(
    `SELECT DISTINCT u.id
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND u.role = ANY($1::text[])
        AND ($2::int = 0 OR u.role <> 'student' OR sd.student_type = ANY($3::text[]))
        AND ($4::int = 0 OR u.role <> 'student' OR UPPER(COALESCE(sd.department, '')) = ANY($5::text[]))
        AND ($6::int = 0 OR u.role <> 'student' OR COALESCE(sd.hostel_block, u.hostel_block, '') = ANY($7::text[]))`,
    [
      roles,
      personas.length,
      personas,
      departments.length,
      departments.map((d) => d.toUpperCase()),
      blocks.length,
      blocks,
    ],
  );
  return rows.map((r) => r.id);
}

/**
 * Stage 4: Publish approved circular → campus_feed_items + receipts + notification bus + audit.
 */
export async function publishApprovedCircular(
  circularId: string,
  actorId: string,
  actorRole: string,
) {
  const { rows: cRows } = await query<{
    id: string;
    title: string;
    summary: string | null;
    raw_ocr_text: string | null;
    attachment_url: string | null;
    deadline: string | null;
    classified_targets: ClassifiedTargets;
    action_required: boolean;
    requested_by: string;
    requested_by_role: string;
  }>(
    `SELECT * FROM public.circular_requests WHERE id = $1::uuid LIMIT 1`,
    [circularId],
  );
  const circ = cRows[0];
  if (!circ) return null;

  const shareToken = randomBytes(12).toString("hex");
  const attachments = circ.attachment_url
    ? [{ type: "pdf", url: circ.attachment_url, title: circ.title }]
    : [];

  // Derive target_scope from classified targets: if a specific dept or hostel
  // block was identified, use it; otherwise fall back to 'global'.
  const targets = circ.classified_targets;
  let targetScope = "global";
  if (targets.hostel_blocks?.length === 1) {
    targetScope = `hostel:${targets.hostel_blocks[0]}`;
  } else if (targets.departments?.length === 1) {
    targetScope = `dept:${targets.departments[0]}`;
  }
  // Multiple depts or multiple hostel blocks → keep global and rely on
  // the receipt fan-out (per-user) for delivery.

  const { rows: feedRows } = await query<{ id: string }>(
    `INSERT INTO public.campus_feed_items
       (kind, title, body_md, attachments, target_scope, priority, posted_by, posted_by_role, expires_at, status)
     VALUES ('circular', $1, $2, $3::jsonb, $4, $5, $6::uuid, $7, $8::timestamptz, 'active')
     RETURNING id`,
    [
      circ.title,
      circ.summary || circ.raw_ocr_text?.slice(0, 1000) || circ.title,
      JSON.stringify(attachments),
      targetScope,
      circ.action_required ? "urgent" : "normal",
      circ.requested_by,
      circ.requested_by_role,
      circ.deadline ? `${circ.deadline}T23:59:59Z` : null,
    ],
  );
  const feedId = feedRows[0].id;

  const recipientIds = await resolveTargetUserIds(circ.classified_targets);
  if (recipientIds.length > 0) {
    await query(
      `INSERT INTO public.campus_feed_receipts (feed_id, user_id)
       SELECT $1::uuid, unnest($2::uuid[])
       ON CONFLICT (feed_id, user_id) DO NOTHING`,
      [feedId, recipientIds],
    );
  }

  await query(
    `UPDATE public.circular_requests
        SET status = 'published',
            approved_by = $2::uuid,
            approved_at = NOW(),
            feed_item_id = $3::uuid,
            share_token = $4,
            updated_at = NOW()
      WHERE id = $1::uuid`,
    [circularId, actorId, feedId, shareToken],
  );

  await addAudit({
    action: "CIRCULAR_APPROVED_AND_PUBLISHED",
    userId: actorId,
    role: actorRole as never,
    details: {
      circularId,
      feedId,
      recipientCount: recipientIds.length,
      targets: circ.classified_targets,
    },
  });

  await publishNotification({
    eventType: "circular.published",
    actorId,
    actorRole,
    scope: "global",
    title: `Circular: ${circ.title}`,
    message: circ.summary || circ.title,
    payload: { circular_id: circularId, feed_id: feedId, share_token: shareToken },
    priority: circ.action_required ? "high" : "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return { feed_id: feedId, share_token: shareToken, recipient_count: recipientIds.length };
}
