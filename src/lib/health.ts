import { supabase, getSupabaseServiceClient } from './dbClient';
import { getAuthSigningKey } from './auth-token';
import { encryptSecret, decryptSecret } from './mfa-secret';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number; // seconds
  components: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number; // milliseconds
      error?: string;
    };
    redis?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number;
      error?: string;
    };
    gateways: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      online: number;
      offline: number;
      total: number;
    };
    services: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      [key: string]: any;
    };
    env?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      error?: string;
    };
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
  };
  recentAlerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

function getClient() {
  try {
    return getSupabaseServiceClient();
  } catch {
    return supabase;
  }
}

// Check system health
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
    metrics: {
      activeUsers: 0,
      activeSessions: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      avgResponseTime: 0,
    },
    recentAlerts: [],
  };

  // Check database
  try {
    const dbStart = Date.now();
    const dbClient = getClient();
    const { data, error } = await dbClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);

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

  // Check environment variables health
  try {
    const isSelfHosted = !!(
      process.env.DATABASE_URL ||
      (process.env.POSTGRES_DB && process.env.POSTGRES_PASSWORD) ||
      process.env.POSTGRES_HOST
    );
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!isSelfHosted && (!supabaseUrl || !anonKey)) {
      health.components.env = {
        status: 'unhealthy',
        error: 'Missing required environment variables',
      };
      if ((health.status as string) === 'healthy') {
        health.status = 'degraded';
      }
    }
  } catch (envErr) {
    console.error('Error checking env health:', envErr);
  }

  // Check gateways
  try {
    const dbClient = getClient();
    const { data: gates } = await dbClient
      .from('gates')
      .select('is_active');

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
    const { data: sessionData } = await getClient()
      .from("sessions")
      .select("user_id")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());

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
    const { data: alerts } = await getClient().from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    health.recentAlerts = (alerts || []).map((a: any) => ({
      id: a.id,
      severity: a.severity,
      message: a.message,
      timestamp: a.timestamp || a.created_at,
    }));
  } catch (error) {
    console.error('Error getting recent alerts:', error);
  }

  // Performance metrics
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: requests } = await getClient().from('api_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneMinuteAgo);

    health.metrics.requestsPerMinute = requests || 0;

    const { data: metrics } = await getClient().from('api_metrics')
      .select('response_time')
      .gte('timestamp', oneMinuteAgo);

    if (metrics && metrics.length > 0) {
      const avg = metrics.reduce((sum: number, m: any) => sum + (m.response_time || 0), 0) / metrics.length;
      health.metrics.avgResponseTime = avg;
    }

    const { count: errors } = await getClient().from('api_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneMinuteAgo)
      .eq('status_code', '500');

    const errorRate = health.metrics.requestsPerMinute > 0 
      ? (errors || 0) / health.metrics.requestsPerMinute 
      : 0;
    health.metrics.errorRate = errorRate;

    if (errorRate > 0.05) {
      health.status = 'degraded';
    }
  } catch (error) {
    console.error('Error getting performance metrics:', error);
  }

  // Auth-path readiness: catches the failures that make login 500 before any user does.
  // ponytail: 2 extra lightweight queries per health check; fine at monitor cadence.
  try {
    const svc = getClient();

    let jwtOk = true;
    let jwtErr: string | undefined;
    try { getAuthSigningKey(); } catch (e) { jwtOk = false; jwtErr = (e as Error).message; }

    let totpOk = true;
    let totpErr: string | undefined;
    try { totpOk = decryptSecret(encryptSecret('HEALTHCHECK')) === 'HEALTHCHECK'; } catch (e) { totpOk = false; totpErr = String(e); }

    let cfgOk = true;
    let cfgErr: string | undefined;
    try {
      const { error } = await svc.from('system_config').select('data').eq('key', 'global_settings').maybeSingle();
      if (error) { cfgOk = false; cfgErr = error.message; }
    } catch (e) { cfgOk = false; cfgErr = String(e); }

    let usersOk = false;
    try {
      const { count } = await svc.from('users').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE');
      usersOk = (count ?? 0) > 0;
    } catch { /* leave false */ }

    const authOk = jwtOk && totpOk && cfgOk && usersOk;
    (health.components.services as any).auth = {
      status: authOk ? 'healthy' : 'degraded',
      jwt_secret: { ok: jwtOk, error: jwtErr },
      totp_encryption: { ok: totpOk, error: totpErr },
      system_config_readable: { ok: cfgOk, error: cfgErr },
      has_active_users: { ok: usersOk },
    };
    if (!authOk && health.status === 'healthy') health.status = 'degraded';
  } catch (e) {
    (health.components.services as any).auth = { status: 'unhealthy', error: String(e) };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  return health;
}

// Create system alert
export async function createSystemAlert(
  severity: 'info' | 'warning' | 'critical',
  message: string,
  details?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await getClient().from('system_alerts')
      .insert({
        severity,
        message,
        details: details || {},
        resolved: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating system alert:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in createSystemAlert:', error);
    return false;
  }
}

// Resolve system alert
export async function resolveSystemAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await getClient().from('system_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving system alert:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in resolveSystemAlert:', error);
    return false;
  }
}
