import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "crypto";

/**
 * Regression guard: every value in the permissions.status CHECK constraint
 * (permissions_status_check, owned by migration 20270101000015) must be
 * INSERT-able, and a value outside the 8-value set must be rejected.
 *
 * This is a database-level test (not an API round-trip) because the constraint
 * lives on the table and the guard is about the CHECK, not the route.
 *
 * Credentials (env, never guessed):
 *   CLAIM_PG_DSN — Postgres DSN the runner can reach directly (same convention
 *   as gate-claim-codes.spec.ts). Skipped when absent.
 *
 * The test uses a throwaway row (uuid v4) in a transaction that always ROLLs
 * BACK, so no test data persists and no cleanup is required.
 */

const PG_DSN = process.env.CLAIM_PG_DSN;

const VALID_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ESCALATED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
] as const;

const INVALID_STATUS = "NOT_A_REAL_STATUS";

// Minimal required column set — the test only exercises the CHECK constraint,
// not the table's full NOT NULL / FK requirements. The permissions table is a
// view over a base table (renamed in 20261026000001), so we INSERT into the
// base table `permissions` (the view is `permission_requests`).
const baseTableExists = async (pool: Pool): Promise<boolean> => {
  const r = await pool.query(
    `SELECT to_regclass('public.permissions') AS base, to_regclass('public.permission_requests') AS view`
  );
  return Boolean(r.rows[0]?.base || r.rows[0]?.view);
};

test.describe("permissions.status CHECK constraint (single-owner 20270101000015)", () => {
  test("table present", async () => {
    test.skip(!PG_DSN, "CLAIM_PG_DSN not set — skipping DB-level permission status test");
    const pool = new Pool({ connectionString: PG_DSN });
    try {
      const exists = await baseTableExists(pool);
      expect(exists, "public.permissions or public.permission_requests must exist").toBe(true);
    } finally {
      await pool.end();
    }
  });

  test("all 8 canonical status values are INSERT-able", async () => {
    test.skip(!PG_DSN, "CLAIM_PG_DSN not set — skipping DB-level permission status test");
    const pool = new Pool({ connectionString: PG_DSN });
    try {
      for (const status of VALID_STATUSES) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          // uuid v4 to avoid any PK collision; the row is rolled back below.
          const id = randomUUID();
          await client.query(
            `INSERT INTO public.permissions (id, ticket_number, workflow_type, requester_user_id, current_stage, status)
             VALUES ($1, $2, $3, (SELECT id FROM users LIMIT 1), $4, $5)`,
            [id, "TEST-" + id.slice(0, 8), "exam", "REGRESSION_TEST", status]
          );
          await client.query("ROLLBACK");
          // If we get here the INSERT succeeded → the CHECK accepted this value.
          // (We always ROLLBACK so no row persists; if the CHECK rejects the
          // value the INSERT above throws and the test fails, which is the
          // intended "stop and re-check" signal.)
        } catch (err: any) {
          await client.query("ROLLBACK").catch(() => {});
          throw new Error(
            `status '${status}' was rejected by the CHECK constraint: ${err?.message ?? err}`
          );
        } finally {
          client.release();
        }
      }
    } finally {
      await pool.end();
    }
  });

  test("an invalid 9th status value is rejected", async () => {
    test.skip(!PG_DSN, "CLAIM_PG_DSN not set — skipping DB-level permission status test");
    const pool = new Pool({ connectionString: PG_DSN });
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const id = randomUUID();
        let rejected = false;
        try {
          await client.query(
            `INSERT INTO public.permissions (id, ticket_number, workflow_type, requester_user_id, current_stage, status)
             VALUES ($1, $2, $3, (SELECT id FROM users LIMIT 1), $4, $5)`,
            [id, "TEST-" + id.slice(0, 8), "exam", "REGRESSION_TEST", INVALID_STATUS]
          );
        } catch (err: any) {
          // A CHECK violation is expected — pg code 23514 (check_violation).
          rejected = /check_violation|23514|permissions_status_check|CHECK/i.test(
            String(err?.message ?? "")
          );
        }
        await client.query("ROLLBACK");
        expect(
          rejected,
          `status '${INVALID_STATUS}' must be rejected by permissions_status_check`
        ).toBe(true);
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  });
});
