import { NextRequest, NextResponse } from "next/server";
import os from "os";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { promQuery } from "@/lib/monitoring";
import { createClient } from "redis";

/**
 * GET /api/sysadmin/redis
 *
 * Redis diagnostics: availability, latency, memory usage, connected clients,
 * keyspace stats, and queue depths. Falls back to Prometheus redis exporter
 * metrics when direct connection is unavailable.
 *
 * Read-only, sysadmin + admin only.
 */
async function handleGet(_req: NextRequest) {
  let out: Record<string, unknown> = {
    reachable: false,
    source: "direct",
    latency_ms: null,
    memory: null,
    clients: null,
    keyspace: null,
    queues: null,
    cache_hit_ratio: null,
  };

  // 1) Direct Redis connection
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redis = createClient({ url: redisUrl });
    redis.on("error", () => {});
    await redis.connect();

    const t0 = Date.now();
    const pingMs = Date.now() - t0;

    const info = await redis.info("all");
    const infoMap: Record<string, string> = {};
    info.split("\r\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) infoMap[line.slice(0, idx)] = line.slice(idx + 1);
    });

    const usedMem = parseInt(infoMap["used_memory"] || "0", 10);
    const maxMem = parseInt(infoMap["maxmemory"] || "0", 10);
    const connectedClients = parseInt(infoMap["connected_clients"] || "0", 10);
    const totalKeys = parseInt(infoMap["total_keys"] || "0", 10);
    const keyspaceHits = parseInt(infoMap["keyspace_hits"] || "0", 10);
    const keyspaceMisses = parseInt(infoMap["keyspace_misses"] || "0", 10);

    // Queue depths
    let queueDepth = 0;
    try {
      const q1 = await redis.lLen("notification_email_queue");
      const q2 = await redis.zCard("email_queue");
      const q3 = await redis.sCard("email_queue_set");
      queueDepth = q1 + q2 + q3;
    } catch {
      // queue keys may not exist
    }

    out = {
      reachable: true,
      source: "direct",
      latency_ms: pingMs,
      memory: {
        used_bytes: usedMem,
        max_bytes: maxMem,
        used_percent: maxMem > 0 ? Math.round((usedMem / maxMem) * 1000) / 10 : null,
      },
      clients: {
        connected: connectedClients,
      },
      keyspace: {
        total_keys: totalKeys,
        hits: keyspaceHits,
        misses: keyspaceMisses,
        hit_ratio:
          keyspaceHits + keyspaceMisses > 0
            ? Math.round((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 1000) / 10
            : null,
      },
      queues: {
        total_depth: queueDepth,
      },
      cache_hit_ratio:
        keyspaceHits + keyspaceMisses > 0
          ? Math.round((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 1000) / 10
          : null,
    };

    await redis.quit();
  } catch (err) {
    out.reachable = false;
    out.source = "prometheus-fallback";
    out.error = err instanceof Error ? err.message : "redis connection failed";

    // 2) Prometheus fallback
    try {
      const [clients, memBytes, hits, misses] = await Promise.all([
        promQuery("redis_connected_clients"),
        promQuery("redis_used_memory_bytes"),
        promQuery("redis_keyspace_hits_total"),
        promQuery("redis_keyspace_misses_total"),
      ]);
      const first = (r: unknown) => {
        const arr = (r as { data?: { result?: Array<{ value?: [number, string] }> } }).data?.result ?? [];
        return arr.length > 0 ? Number(arr[0]?.value?.[1] ?? 0) : null;
      };
      out.reachable = true;
      out.memory = { used_bytes: first(memBytes), max_bytes: null, used_percent: null };
      out.clients = { connected: first(clients) };
      out.keyspace = {
        total_keys: null,
        hits: first(hits),
        misses: first(misses),
        hit_ratio: null,
      };
      out.cache_hit_ratio = null;
    } catch {
      out.reachable = false;
      out.error = "redis unreachable (direct + prometheus)";
    }
  }

  return NextResponse.json({ success: true, data: out });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_redis", maxRequests: 60 }
);
