import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db, query, authAdmin } from './postgres';

let serviceClient: any = null;

/**
 * ⚠️ TRUST MODEL — read before relying on RLS.
 *
 * This "service client" is NOT a Supabase client. `db` is a PostgresQueryBuilder
 * (see ./postgres.ts) that runs every query on the app's raw pg pool, which
 * connects as `postgres` — a role with `BYPASSRLS = TRUE` (granted by
 * 20261014000004_ensure_bypass_rls_for_app_role.sql). RLS policies therefore
 * are NOT enforced for any query issued through this client or through
 * query()/withTransaction() in ./postgres.ts.
 *
 * Role isolation in this codebase is enforced entirely in application code —
 * the `auth.userId` / `auth.role` WHERE clauses in each route handler — not
 * by the 200+ RLS policies defined in the migrations (those exist for a
 * future `gate_app` role that nothing currently connects as).
 *
 * Consequence: a new API route that forgets its scoping WHERE clause leaks
 * cross-role data. The database will not catch it. Review the scoping in
 * every route you add (and run scripts/check-role-scoping.sh when it lands).
 */
export const supabase: any = db;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = db;
  }
  return serviceClient as unknown as SupabaseClient;
}

export function getReadOnlyClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key-read-only';
  return createClient(url, anonKey);
}

export function createEphemeralSupabaseClient(): SupabaseClient {
  return getSupabaseServiceClient();
}

export async function resolveLoginIdentifier(identifier: string): Promise<string | null> {
  try {
    const res = await query(
      `SELECT email FROM users 
       WHERE LOWER(email) = LOWER($1) 
          OR UPPER(unique_id) = UPPER($1) 
          OR LOWER(login_identifier) = LOWER($1) 
          OR LOWER(handle) = LOWER($1) 
       LIMIT 1`,
      [identifier.trim()]
    );
    return res.rows.length > 0 ? res.rows[0].email : null;
  } catch (err) {
    console.error('Error in resolveLoginIdentifier:', err);
    return null;
  }
}

export async function canUserAuthenticate(userId: string): Promise<boolean> {
  try {
    const res = await query('SELECT status FROM users WHERE id::text = $1 LIMIT 1', [userId]);
    if (res.rows.length === 0) return false;
    return res.rows[0].status === 'ACTIVE';
  } catch (err) {
    console.error('Error validating user authentication:', err);
    return false;
  }
}

export async function invalidateAllUserSessions(userId: string): Promise<boolean> {
  try {
    await query("UPDATE users SET session_version = session_version + 1, handle = gen_random_uuid()::text WHERE id::text = $1", [userId]);
    await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id::text = $1 OR refresh_hash = $1", [userId]);
    // P1-11: evict the short-TTL user-row cache so the bumped session_version
    // takes effect on the next request instead of after up to USER_ROW_TTL_MS.
    const { invalidateAuthCache } = await import("./authContext");
    invalidateAuthCache(userId);
    return true;
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err);
    return false;
  }
}

export default db;
