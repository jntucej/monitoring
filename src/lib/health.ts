import { supabase } from './supabaseClient';

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
    const { data, error } = await supabase
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

  // Check gateways
  try {
    const { data: gates } = await supabase
      .from('gates')
      .select('status');

    const gateStatuses = gates || [];
    health.components.gateways.total = gateStatuses.length;
    health.components.gateways.online = gateStatuses.filter(g => g.status === 'active').length;
    health.components.gateways.offline = gateStatuses.filter(g => g.status !== 'active').length;

    if (health.components.gateways.offline > 0) {
      health.components.gateways.status = 'degraded';
      if (health.status === 'healthy') health.status = 'degraded';
    }
  } catch (error) {
    health.components.gateways.status = 'unhealthy';
    health.status = 'unhealthy';
  }

  // Get active users (checking active sessions via users handle)
  try {
    const { count: activeCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('handle', 'is', null);

    health.metrics.activeSessions = activeCount || 0;
    health.metrics.activeUsers = activeCount || 0;
  } catch (error) {
    console.error('Error getting active users:', error);
  }

  // Get recent alerts
  try {
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    health.recentAlerts = (alerts || []).map(a => ({
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
    const { count: requests } = await supabase
      .from('api_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneMinuteAgo);

    health.metrics.requestsPerMinute = requests || 0;

    const { data: metrics } = await supabase
      .from('api_metrics')
      .select('response_time')
      .gte('timestamp', oneMinuteAgo);

    if (metrics && metrics.length > 0) {
      const avg = metrics.reduce((sum, m) => sum + m.response_time, 0) / metrics.length;
      health.metrics.avgResponseTime = avg;
    }

    const { count: errors } = await supabase
      .from('api_metrics')
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

  return health;
}

// Create system alert
export async function createSystemAlert(
  severity: 'info' | 'warning' | 'critical',
  message: string,
  details?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_alerts')
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
    const { error } = await supabase
      .from('system_alerts')
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
