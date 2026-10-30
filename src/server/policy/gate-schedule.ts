import { query } from "@/lib/postgres";
import { getIstDateString } from "@/server/policy/dates";

export interface GateScheduleCheckResult {
  allowed: boolean;
  code?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface CheckGateScheduleInput {
  gateId: string;
  at?: Date;
  role?: string;
  direction?: "IN" | "OUT";
  overrideReason?: string;
}

/**
 * Evaluates whether a gate scan is permitted according to:
 * 1. gate_holidays (date in Asia/Kolkata matches active holiday → closed unless emergency override)
 * 2. gate_schedules (day_of_week and open_time..close_time window in Asia/Kolkata)
 * 3. gate_access_rules (rule priority, action allow/restrict/deny)
 */
export async function checkGateSchedule(
  input: CheckGateScheduleInput
): Promise<GateScheduleCheckResult> {
  const at = input.at ?? new Date();

  // 1. Calculate IST day, date, and time
  const istDateStr = getIstDateString(at); // YYYY-MM-DD
  const istDayOfWeek = getIstDayOfWeek(at); // 0 (Sunday) to 6 (Saturday)
  const istTimeStr = getIstTimeString(at); // HH:MM

  // Allow emergency override to bypass schedule restrictions
  if (input.overrideReason === "emergency") {
    return { allowed: true };
  }

  // 2. Check gate_holidays for today
  try {
    const holidays = await query<{ id: string; name: string | null; description: string | null }>(
      `SELECT id, name, description FROM public.gate_holidays WHERE date = $1 LIMIT 1`,
      [istDateStr]
    );

    if (holidays.rows.length > 0) {
      const h = holidays.rows[0];
      return {
        allowed: false,
        code: "GATE_CLOSED_HOLIDAY",
        reason: `Gate closed for holiday: ${h.name || h.description || "Campus Holiday"}`,
        details: { holiday: h, date: istDateStr },
      };
    }
  } catch (err) {
    console.error("[checkGateSchedule] Holiday check failed:", err);
  }

  // 3. Check gate_schedules (per-gate time windows by day-of-week)
  try {
    const schedules = await query<{
      id: string;
      open_time: string;
      close_time: string;
      is_active: boolean;
    }>(
      `SELECT id, open_time, close_time, is_active
         FROM public.gate_schedules
        WHERE gate_id = $1
          AND day_of_week = $2
          AND is_active = true
        ORDER BY open_time ASC`,
      [input.gateId, istDayOfWeek]
    );

    if (schedules.rows.length > 0) {
      // If there are schedules defined for this day, current time MUST fall within at least one open window
      const withinAnyWindow = schedules.rows.some((s) => {
        const open = s.open_time.slice(0, 5);
        const close = s.close_time.slice(0, 5);
        return istTimeStr >= open && istTimeStr <= close;
      });

      if (!withinAnyWindow) {
        const windows = schedules.rows.map((s) => `${s.open_time.slice(0, 5)}-${s.close_time.slice(0, 5)}`).join(", ");
        return {
          allowed: false,
          code: "GATE_SCHEDULE_CLOSED",
          reason: `Gate is closed outside operating hours (${windows} IST). Current time: ${istTimeStr} IST.`,
          details: { schedules: schedules.rows, currentTime: istTimeStr, dayOfWeek: istDayOfWeek },
        };
      }
    }
  } catch (err) {
    console.error("[checkGateSchedule] Gate schedule query failed:", err);
  }

  // 4. Check gate_access_rules (priority-based allow/deny/restrict rules)
  try {
    const rules = await query<{
      id: string;
      rule_name: string;
      days_of_week: any;
      start_time: string;
      end_time: string;
      action: string;
      priority: number;
    }>(
      `SELECT id, rule_name, days_of_week, start_time, end_time, action, priority
         FROM public.gate_access_rules
        WHERE (gate_id = $1 OR gate_id = 'ALL')
          AND is_active = true
        ORDER BY priority DESC`,
      [input.gateId]
    );

    for (const rule of rules.rows) {
      let days: number[] = [];
      if (Array.isArray(rule.days_of_week)) {
        days = rule.days_of_week;
      } else if (typeof rule.days_of_week === "string") {
        try {
          days = JSON.parse(rule.days_of_week);
        } catch {
          days = [];
        }
      }

      if (days.includes(istDayOfWeek)) {
        const start = rule.start_time.slice(0, 5);
        const end = rule.end_time.slice(0, 5);
        if (istTimeStr >= start && istTimeStr <= end) {
          const act = (rule.action || "allow").toLowerCase();
          if (act === "deny" || act === "restrict") {
            return {
              allowed: false,
              code: "GATE_ACCESS_RULE_RESTRICTED",
              reason: `Gate access restricted by rule: ${rule.rule_name}`,
              details: { ruleId: rule.id, ruleName: rule.rule_name, action: rule.action },
            };
          }
          if (act === "allow") {
            // Explicit allow matched with high priority
            return { allowed: true };
          }
        }
      }
    }
  } catch (err) {
    console.error("[checkGateSchedule] Access rule check failed:", err);
  }

  return { allowed: true };
}

/**
 * Returns 0 (Sunday) .. 6 (Saturday) in Asia/Kolkata timezone.
 */
export function getIstDayOfWeek(at: Date = new Date()): number {
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(at);

  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return days[weekdayStr] ?? at.getUTCDay();
}

/**
 * Returns HH:MM in Asia/Kolkata timezone (24-hour format).
 */
export function getIstTimeString(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}
