import { SystemHealth } from "@/lib/health";

export const sanitizeHealth = (h: SystemHealth): SystemHealth => ({
    status: h.status,
    timestamp: h.timestamp,
    uptime: h.uptime,
    components: {
      database: {
        status: h.components.database.status,
        latency: h.components.database.latency,
        ...(h.components.database.error ? { error: "Database unavailable" } : {}),
      },
      ...(h.components.redis
        ? {
            redis: {
              status: h.components.redis.status,
              latency: h.components.redis.latency,
              ...(h.components.redis.error ? { error: "Redis unavailable" } : {}),
            },
          }
        : {}),
      gateways: {
        status: h.components.gateways.status,
        online: h.components.gateways.online,
        offline: h.components.gateways.offline,
        total: h.components.gateways.total,
      },
      services: {
        status: h.components.services.status,
        auth: {
          status: h.components.services.auth?.status ?? "healthy",
        },
        worker: {
          status: h.components.services.worker?.status ?? "healthy",
        },
      },
      ...(h.components.env
        ? {
            env: {
              status: h.components.env.status,
              ...(h.components.env.error ? { error: "Environment misconfigured" } : {}),
            },
          }
        : {}),
    },
    metrics: h.metrics,
    recentAlerts: h.recentAlerts,
  });
