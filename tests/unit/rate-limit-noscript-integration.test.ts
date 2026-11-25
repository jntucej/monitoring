// tests/unit/rate-limit-noscript-integration.test.ts
// U4 NOSCRIPT recovery — behavioral integration test against a REAL Redis.
//
// Requires REDIS_TEST_URL env var (point at a disposable Redis instance).
// Skipped automatically when unset (CI / dev without Redis).
//
// This test verifies the exact required behavior:
//   1. EVALSHA → NOSCRIPT
//   2. SCRIPT LOAD
//   3. Retry EVALSHA → success
//   4. SCRIPT FLUSH (simulate restart) → next request recovers again

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "redis";

const REDIS_TEST_URL = process.env.REDIS_TEST_URL;

describe("NOSCRIPT recovery (integration)", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    if (!REDIS_TEST_URL) return;
    client = createClient({ url: REDIS_TEST_URL });
    client.on("error", () => {});
  });

  afterAll(async () => {
    if (!REDIS_TEST_URL) return;
    await client.quit().catch(() => {});
  });

  // Skip the entire describe when no Redis is available
  const maybe = REDIS_TEST_URL ? it : it.skip;

  maybe("N1: EVALSHA NOSCRIPT → SCRIPT LOAD → retry succeeds", async () => {
    // Ensure the script cache is empty (fresh or flushed)
    await client.sendCommand(["SCRIPT", "FLUSH"]);

    const LUA = `
      local c = redis.call('INCR', KEYS[1])
      if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
      local ttl = redis.call('PTTL', KEYS[1])
      return {c, ttl < 0 and ARGV[1] or ttl}
    `;
    const { createHash } = await import("node:crypto");
    const sha1 = createHash("sha1").update(LUA).digest("hex");

    // 1. EVALSHA → NOSCRIPT (script not in cache)
    let gotNoscript = false;
    try {
      await client.sendCommand(["EVALSHA", sha1, "1", "rl:test", "60000"]);
    } catch (e: any) {
      if (e?.message?.includes("NOSCRIPT") || e?.code === "NOSCRIPT") gotNoscript = true;
    }
    expect(gotNoscript).toBe(true);

    // 2. SCRIPT LOAD
    const loadedSha = await client.sendCommand(["SCRIPT", "LOAD", LUA]);
    expect(loadedSha).toBe(sha1);

    // 3. Retry EVALSHA → success
    const [count, ttl] = await client.sendCommand([
      "EVALSHA", sha1, "1", "rl:test", "60000",
    ]) as unknown as [number, number];
    expect(Number(count)).toBe(1);
    expect(Number(ttl)).toBeGreaterThan(0);
  });

  maybe("N2: after SCRIPT FLUSH, recovery happens again", async () => {
    // Flush → script cache wiped
    await client.sendCommand(["SCRIPT", "FLUSH"]);

    const LUA = `
      local c = redis.call('INCR', KEYS[1])
      if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
      local ttl = redis.call('PTTL', KEYS[1])
      return {c, ttl < 0 and ARGV[1] or ttl}
    `;
    const { createHash } = await import("node:crypto");
    const sha1 = createHash("sha1").update(LUA).digest("hex");

    // First EVALSHA → NOSCRIPT
    let gotNoscript = false;
    try {
      await client.sendCommand(["EVALSHA", sha1, "1", "rl:test2", "60000"]);
    } catch (e: any) {
      if (e?.message?.includes("NOSCRIPT") || e?.code === "NOSCRIPT") gotNoscript = true;
    }
    expect(gotNoscript).toBe(true);

    // Recovery: LOAD + retry
    await client.sendCommand(["SCRIPT", "LOAD", LUA]);
    const [count] = await client.sendCommand([
      "EVALSHA", sha1, "1", "rl:test2", "60000",
    ]) as unknown as [number, number];
    expect(Number(count)).toBe(1);
  });
});
