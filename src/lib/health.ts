import { supabase, getSupabaseServiceClient } from './dbClient';
import { getAuthSigningKey } from './auth-token';
import { encryptSecret, decryptSecret } from './mfa-secret';
import { query } from './postgres';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  components: {
    database: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; error?: string };
    redis?: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; error?: string };
    gateways: { status: 'healthy' | 'degraded' | 'unhealthy'; online: number; offline: number; total: number };
    services: { status: 'healthy' | 'degraded' | 'unhealthy'; [key: string]: any };
    env?: { status: 'healthy' | 'degraded' | 'unhealthy'; error?: string };
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
  };
  recentAlerts: Array<{ id: string; severity: 'info' | 'warning' | 'critical'; message: string; timestamp: string }>;
}

function getClient() {
  try { return getSupabaseServiceClient(); } catch { return supabase; }
}

export async function checkSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now();
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: typeof process !== 'undefined' && process.uptime ? process.uptime() : 3600,
    components: {
      database: { status: 'healthy', latency: 0 },
      gateways: { status: 'healthy', online: 0, offline: 0, total: 0 },
      services: { status: 'healthy' },
      env: { status: 'healthy' },
    },
    metrics: { activeUsers: 0, activeSessions: 0, requestsPerMinute: 0, errorRate: 0, avgResponseTime: 0 },
    recentAlerts: [],
  };

  // Check database
  try {
    const dbStart = Date.now();
    const dbClient = getClient();
    const { data, error } = await dbClient.from('users').select('id', { count: 'exact', head: true }).limit(1);
    health.components.database.latency = Date.now() - dbStart;
    if (error) {
      health.components.database.status = 'unhealthy';
      health.components.database.error = error.message;
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.components.database.status = 'unhealthy';
    health.components.database.error = String(error);
    health.status = 'unhealthy';
  }

  // Check gateways
  try {
    const dbClient = getClient();
    const { data: gates } = await dbClient.from('gates').select('is_active');
    const gateStatuses = gates || [];
    health.components.gateways.total = gateStatuses.length;
    health.components.gateways.online = gateStatuses.filter((g: any) => g.is_active).length;
    health.components.gateways.offline = gateStatuses.filter((g: any) => !g.is_active).length;
    if (health.components.gateways.offline > 0) {
      health.components.gateways.status = 'degraded';
      if (health.status === 'healthy') health.status = 'degraded';
    }
  } catch (error) {
    health.components.gateways.status = 'unhealthy';
    health.status = 'unhealthy';
  }

  // Active session and user count
  try {
    const dbClient = getClient();
    const { data: sessionData } = await dbClient.from("sessions").select("user_id").is("revoked_at", null).gt("expires_at", new Date().toISOString());
    if (sessionData) {
      health.metrics.activeSessions = sessionData.length;
      const uniqueUsers = new Set(sessionData.map((s: any) => s.user_id).filter(Boolean));
      health.metrics.activeUsers = uniqueUsers.size;
    }
  } catch (error) {
    console.error('Error getting active sessions:', error);
  }

  // Get recent alerts
  try {
    const { data: alerts } = await getClient().from('alerts').select('*').order('timestamp', { ascending: false }).limit(10);
    health.recentAlerts = (alerts || []).map((a: any) => ({ id: a.id, severity: a.severity, message: a.message, timestamp: a.timestamp || a.created_at }));
  } catch (error) {
    console.error('Error getting recent alerts:', error);
  }

  // Performance metrics using direct SQL
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    // Count all requests in last minute
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM api_metrics WHERE timestamp >= $1`,
      [oneMinuteAgo]
    );
    health.metrics.requestsPerMinute = parseInt(totalResult.rows?.[0]?.count || '0', 10);

    // Calculate average response time from non-zero entries only
    const avgResult = await query(
      `SELECT AVG(response_time) as avg_time, COUNT(*) as cnt
       FROM api_metrics
       WHERE timestamp >= $1 AND response_time > 0`,
      [oneMinuteAgo]
    );
    const avgRow = avgResult.rows?.[0];
    if (avgRow && parseInt(avgRow.cnt) > 0) {
      health.metrics.avgResponseTime = Math.round(parseFloat(avgRow.avg_time || '0'));
      console.log(`[health] avgResponseTime from DB: ${health.metrics.avgResponseTime}ms (${avgRow.cnt} records)`);
    } else {
      console.log('[health] No non-zero response time records found in last minute');
    }

    // Error rate
    const errorResult = await query(
      `SELECT COUNT(*) as count FROM api_metrics WHERE timestamp >= $1 AND status_code >= 500`,
      [oneMinuteAgo]
    );
    const errors = parseInt(errorResult.rows?.[0]?.count || '0', 10);
    const errorRate = health.metrics.requestsPerMinute > 0 ? errors / health.metrics.requestsPerMinute : 0;
    health.metrics.errorRate = errorRate;
    if (errorRate > 0.05) health.status = 'degraded';
  } catch (error) {
    console.error('Error getting performance metrics:', error);
  }

  // Auth-path readiness
  try {
    const svc = getClient();
    let jwtOk = true, jwtErr: string | undefined;
    try { getAuthSigningKey(); } catch (e) { jwtOk = false; jwtErr = (e as Error).message; }
    let totpOk = true, totpErr: string | undefined;
    try { totpOk = decryptSecret(encryptSecret('HEALTHCHECK')) === 'HEALTHCHECK'; } catch (e) { totpOk = false; totpErr = String(e); }
    let cfgOk = true, cfgErr: string | undefined;
    try { const { error } = await svc.from('system_config').select('data').eq('key', 'global_settings').maybeSingle(); if (error) { cfgOk = false; cfgErr = error.message; } } catch (e) { cfgOk = false; cfgErr = String(e); }
    let usersOk = false;
    try { const { count } = await svc.from('users').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'); usersOk = (count ?? 0) > 0; } catch { /* leave false */ }
    const authOk = jwtOk && totpOk && cfgOk && usersOk;
    (health.components.services as any).auth = { status: authOk ? 'healthy' : 'degraded', jwt_secret: { ok: jwtOk, error: jwtErr }, totp_encryption: { ok: totpOk, error: totpErr }, system_config_readable: { ok: cfgOk, error: cfgErr }, has_active_users: { ok: usersOk } };
    if (!authOk && health.status === 'healthy') health.status = 'degraded';
  } catch (e) {
    (health.components.services as any).auth = { status: 'unhealthy', error: String(e) };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  return health;
}
