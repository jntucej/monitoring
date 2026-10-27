import { query } from "@/lib/postgres";

export interface UserEngagementMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  engagement_score: number; // 0 - 100
  login_frequency: number; // logins per week
  scan_frequency: number; // scans per week
  pass_requests_count: number;
  last_active_at: string;
}

export async function getUserEngagementMetrics(): Promise<UserEngagementMetric[]> {
  try {
    const res = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role,
        COALESCE(scans.scan_count, 0)::int as scan_frequency,
        COALESCE(passes.pass_count, 0)::int as pass_requests_count,
        COALESCE(scans.last_scan, u.created_at) as last_active_at
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as scan_count, MAX(timestamp) as last_scan
        FROM movement_logs
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
      ) scans ON scans.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as pass_count
        FROM gate_passes
        WHERE requested_at >= NOW() - INTERVAL '30 days'
        GROUP BY user_id
      ) passes ON passes.user_id = u.id
      WHERE u.status = 'ACTIVE'
      LIMIT 50
    `);

    const metrics: UserEngagementMetric[] = res.rows.map((u: any) => {
      const scanFreq = u.scan_frequency || 0;
      const passReqs = u.pass_requests_count || 0;
      const loginFreq = Math.max(1, Math.round(scanFreq / 2));
      const score = Math.min(100, Math.round(loginFreq * 10 + scanFreq * 5 + passReqs * 5));

      return {
        id: u.id,
        name: u.name || `User ${u.id.substring(0, 5)}`,
        email: u.email || `user@campus.edu`,
        role: u.role || "student",
        engagement_score: score,
        login_frequency: loginFreq,
        scan_frequency: scanFreq,
        pass_requests_count: passReqs,
        last_active_at: u.last_active_at ? new Date(u.last_active_at).toISOString() : new Date().toISOString(),
      };
    });

    return metrics.sort((a, b) => b.engagement_score - a.engagement_score);
  } catch (err) {
    console.error("Error loading user engagement metrics:", err);
    return [];
  }
}

export async function getUserAdoptionTrends(): Promise<{ dau: number; mau: number; adoptionByRole: Record<string, number> }> {
  try {
    const dauRes = await query("SELECT COUNT(DISTINCT user_id)::int as count FROM movement_logs WHERE timestamp >= NOW() - INTERVAL '24 hours'");
    const mauRes = await query("SELECT COUNT(DISTINCT user_id)::int as count FROM movement_logs WHERE timestamp >= NOW() - INTERVAL '30 days'");

    // Compute per-role adoption: share of each role that had ≥1 movement in the last 30 days.
    const roleRes = await query(`
      SELECT
        u.role,
        COUNT(DISTINCT u.id)::int AS total_users,
        COUNT(DISTINCT m.user_id)::int AS active_users
      FROM public.users u
      LEFT JOIN public.movement_logs m
        ON m.user_id = u.id
        AND m.timestamp >= NOW() - INTERVAL '30 days'
      WHERE u.status = 'ACTIVE'
      GROUP BY u.role
      HAVING COUNT(DISTINCT u.id) > 0
      ORDER BY u.role
    `);

    const adoptionByRole: Record<string, number> = {};
    for (const row of roleRes.rows as Array<{ role: string; total_users: number; active_users: number }>) {
      if (row.total_users > 0) {
        adoptionByRole[row.role.toUpperCase()] = Math.round((row.active_users / row.total_users) * 100);
      }
    }

    return {
      dau: dauRes.rows[0]?.count ?? 0,
      mau: mauRes.rows[0]?.count ?? 0,
      adoptionByRole,
    };
  } catch {
    return {
      dau: 0,
      mau: 0,
      adoptionByRole: {},
    };
  }
}

export async function getInactiveUsers(): Promise<UserEngagementMetric[]> {
  const metrics = await getUserEngagementMetrics();
  return metrics.filter((m) => m.engagement_score < 40);
}
