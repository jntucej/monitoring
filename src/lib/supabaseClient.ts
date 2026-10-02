import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

const env = getEnv();
const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

// Client browser-side usage (anonymous access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Service client server-side usage (admin access)
let serviceClient: SupabaseClient | null = null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseServiceRoleKey;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return serviceClient;
}

// Read-only client for read replicas
let readReplicaClient: SupabaseClient | null = null;
const readUrl = process.env.SUPABASE_READ_REPLICA_URL || supabaseUrl;

export function getReadOnlyClient(): SupabaseClient {
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  if (!readReplicaClient) {
    readReplicaClient = createClient(readUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return readReplicaClient;
}

// Ephemeral client for one-off auth flows (OTP verification) — no session persistence
export function createEphemeralSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Resolve a login identifier (email/roll/id) to an email via RPC
export async function resolveLoginIdentifier(loginId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('resolve_login_identifier', { login_id: loginId })
      .single();

    if (error) {
      console.error('Error resolving login identifier:', error);
      return null;
    }

    return data as string | null;
  } catch (err) {
    console.error('Error in resolveLoginIdentifier:', err);
    return null;
  }
}

// Validate that a user exists and is ACTIVE before allowing authentication
export async function canUserAuthenticate(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('can_user_authenticate', { user_id: userId })
      .single();

    if (error) {
      console.error('Error validating user authentication:', error);
      return false;
    }

    return data as boolean;
  } catch (err) {
    console.error('Error in canUserAuthenticate:', err);
    return false;
  }
}

// Invalidate all user sessions (requires service role): revoke Supabase Auth
// sessions via Admin API and record invalidation through the DB RPC.
export async function invalidateAllUserSessions(userId: string): Promise<boolean> {
  try {
    const client = getSupabaseServiceClient();

    const { error } = await client.auth.admin.signOut(userId);
    if (error) {
      console.error('Error invalidating user sessions:', error);
      return false;
    }

    const { error: dbError } = await client
      .rpc('invalidate_all_user_sessions', { p_user_id: userId });
    if (dbError) {
      console.error('Error logging session invalidation:', dbError);
    }

    return true;
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err);
    return false;
  }
}
