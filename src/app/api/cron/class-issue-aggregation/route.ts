// src/app/api/cron/class-issue-aggregation/route.ts
// /api/cron/class-issue-aggregation — */15
// Collective lane: when N≥3 students raise the same (class, category) within
// 72h, promote to ONE class_level_issue and link the contributing requests.
//
// Bounds (same shape as complaint-triage):
//   - The agent CREATES issues and links requests; it never resolves/closes.
//   - One open issue per (class, topic) — the partial unique index is the
//     no-duplicate guarantee even under race.
//   - Writes actor_type='agent' audit events.
//
// Threshold N + window hours are config (config_class_comm), not constants,
// so HOD can tune without a deploy (D2).
//
// Bounded to operator scope. Requires the cron secret.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { findAggregatableIssues, createClassLevelIssue } from "@/lib/class-requests";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Load tunables (D2). Defaults: 3 students / 72h.
    const { rows: cfg } = await query<{ key: string; value: number }>(
      `SELECT key, value FROM public.config_class_comm WHERE key IN ('agg_n','agg_hours')`,
    );
    const n = cfg.find(c => c.key === "agg_n")?.value ?? 3;
    const hours = cfg.find(c => c.key === "agg_hours")?.value ?? 72;

    const groups = await findAggregatableIssues(hours, n);
    let created = 0;
    for (const g of groups) {
      const issueId = await createClassLevelIssue(
        g.class_id,
        g.category_code,
        g.request_ids,
        "system-cron",
      );
      if (issueId) {
        // Notify HOD + class teacher of the class (with the issue, not N rows).
        await notifyClassOfIssue(g.class_id, g.category_code, g.count, issueId);
        created += 1;
      }
    }

    return Response.json({
      success: true,
      scanned: groups.length,
      created,
      threshold: { n, hours },
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}

async function notifyClassOfIssue(classId: string, topic: string, count: number, issueId: string) {
  try {
    const { rows: cls } = await query<{ name: string; department_id: string; class_teacher_id: string | null }>(
      `SELECT name, department_id, class_teacher_id FROM public.classes WHERE id = $1::uuid LIMIT 1`,
      [classId],
    );
    if (cls.length === 0) return;
    const classRow = cls[0];
    const targets: string[] = [];
    if (classRow.class_teacher_id) targets.push(classRow.class_teacher_id);
    const { rows: hods } = await query<{ id: string }>(
      `SELECT u.id FROM public.users u
         JOIN public.user_roles ur ON ur.user_id = u.id
        WHERE ur.role = 'hod' AND ur.scope_type = 'department' AND ur.scope_id = $1
          AND u.status = 'ACTIVE'`,
      [classRow.department_id],
    );
    targets.push(...hods.map(h => h.id));
    for (const uid of [...new Set(targets)]) {
      await query(
        `INSERT INTO public.notifications
           (id, type, priority, title, message, recipient_id, recipient_type, channels, data)
         VALUES (gen_random_uuid(), 'class_level_issue', 'high',
                  $1, $2, $3, 'user', ARRAY['in_app'], $4)`,
        [
          `Class-level issue: ${topic} (${classRow.name})`,
          `${count} students raised this in the last 72h. Treated as one ticket.`,
          uid,
          JSON.stringify({ class_id: classId, issue_id: issueId, topic, count }),
        ],
      ).catch(() => undefined);
    }
  } catch {
    // best-effort
  }
}
