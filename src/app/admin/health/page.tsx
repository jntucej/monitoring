"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, AlertCircle, AlertTriangle, XCircle,
  Database, Server, Wifi, Activity, Clock, Users,
  RefreshCw, Download, Bell, BellOff
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { SystemHealth, checkSystemHealth } from "@/lib/health";

const STATUS_COLORS = {
  healthy: "text-emerald-500",
  degraded: "text-amber-500",
  unhealthy: "text-rose-500",
};

export default function SystemHealthPage() {
  const { addToast } = useUIStore();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await checkSystemHealth();
      setHealth(data);
    } catch (error) {
      console.error('Error loading system health:', error);
      addToast({
        title: "Error",
        message: "Failed to load system health data",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadHealth, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className={`w-6 h-6 ${STATUS_COLORS.healthy}`} />;
      case 'degraded':
        return <AlertTriangle className={`w-6 h-6 ${STATUS_COLORS.degraded}`} />;
      case 'unhealthy':
        return <XCircle className={`w-6 h-6 ${STATUS_COLORS.unhealthy}`} />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || 'Just started';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground">
            Monitor system status and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
              autoRefresh 
                ? 'bg-[var(--action-primary)] text-white' 
                : 'bg-[var(--bg-surface)] border border-[var(--border)] text-muted-foreground'
            }`}
          >
            {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button
            onClick={loadHealth}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-sm font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--action-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : health ? (
        <>
          {/* Overall Status */}
          <div className={`p-6 rounded-xl border ${
            health.status === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/5' :
            health.status === 'degraded' ? 'border-amber-500/30 bg-amber-500/5' :
            'border-rose-500/30 bg-rose-500/5'
          }`}>
            <div className="flex items-center gap-4">
              {getStatusIcon(health.status)}
              <div>
                <h2 className="text-xl font-bold capitalize">{health.status}</h2>
                <p className="text-sm text-muted-foreground">
                  System is {health.status === 'healthy' ? 'operating normally' : 
                    health.status === 'degraded' ? 'experiencing issues' : 
                    'experiencing critical issues'}
                </p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Uptime: {formatUptime(health.uptime)}</span>
                  <span>Last checked: {new Date(health.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Database */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Database</h3>
                </div>
                {getStatusIcon(health.components.database.status)}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${STATUS_COLORS[health.components.database.status]}`}>
                    {health.components.database.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency</span>
                  <span>{health.components.database.latency}ms</span>
                </div>
                {health.components.database.error && (
                  <div className="text-rose-500 text-xs mt-1">
                    {health.components.database.error}
                  </div>
                )}
              </div>
            </div>

            {/* Gateways */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Gateways</h3>
                </div>
                {getStatusIcon(health.components.gateways.status)}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Online</span>
                  <span className="text-emerald-500 font-medium">{health.components.gateways.online}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Offline</span>
                  <span className="text-rose-500 font-medium">{health.components.gateways.offline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span>{health.components.gateways.total}</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Services</h3>
                </div>
                {getStatusIcon(health.components.services.status)}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {Object.entries(health.components.services)
                  .filter(([key]) => key !== 'status')
                  .map(([name, service]: [string, any]) => (
                    <div key={name} className="flex justify-between">
                      <span className="text-muted-foreground">{name}</span>
                      <span className={`font-medium ${STATUS_COLORS[service.status as keyof typeof STATUS_COLORS] || 'text-gray-400'}`}>
                        {service.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Users</span>
              </div>
              <p className="text-2xl font-bold mt-1">{health.metrics.activeUsers}</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Requests / min</span>
              </div>
              <p className="text-2xl font-bold mt-1">{health.metrics.requestsPerMinute}</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Response</span>
              </div>
              <p className="text-2xl font-bold mt-1">{health.metrics.avgResponseTime.toFixed(0)}ms</p>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Error Rate</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${
                health.metrics.errorRate > 0.05 ? 'text-rose-500' : 
                health.metrics.errorRate > 0.01 ? 'text-amber-500' : 
                'text-emerald-500'
              }`}>
                {(health.metrics.errorRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">Recent Alerts</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {health.recentAlerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p>No recent alerts</p>
                </div>
              ) : (
                health.recentAlerts.map((alert) => {
                  const severityColors = {
                    info: 'text-blue-500 bg-blue-500/10',
                    warning: 'text-amber-500 bg-amber-500/10',
                    critical: 'text-rose-500 bg-rose-500/10',
                  };
                  return (
                    <div key={alert.id} className="p-4 flex items-start gap-3">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${severityColors[alert.severity]}`} />
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${severityColors[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load system health data
        </div>
      )}
    </div>
  );
}
