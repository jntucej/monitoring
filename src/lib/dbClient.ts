import type { SupabaseClient } from '@supabase/supabase-js';
import { db, query, authAdmin } from './postgres';

let serviceClient: any = null;

export const supabase: any = db;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = db;
  }
  return serviceClient as unknown as SupabaseClient;
}

export function getReadOnlyClient(): SupabaseClient {
  return getSupabaseServiceClient();
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
    return true;
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err);
    return false;
  }
}
