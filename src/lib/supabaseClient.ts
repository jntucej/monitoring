import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from './env';

const env = getEnv();
const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

// Client for browser-side usage (anonymous access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Service client for server-side usage (admin access)
let serviceClient: SupabaseClient | null = null

export const getSupabaseServiceClient = (): SupabaseClient => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseServiceRoleKey;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return serviceClient
}

// Read-replica client for read-heavy operations
let readReplicaClient: SupabaseClient | null = null;

export const getReadOnlyClient = (): SupabaseClient => {
  const readUrl = process.env.SUPABASE_READ_REPLICA_URL || supabaseUrl;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  if (!readReplicaClient) {
    readReplicaClient = createClient(readUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return readReplicaClient;
};

// Function to resolve login identifier to email
export const resolveLoginIdentifier = async (loginId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .rpc('resolve_login_identifier', { login_id: loginId })
      .single()

    if (error) {
      console.error('Error resolving login identifier:', error)
      return null
    }

    return data as string | null
  } catch (err) {
    console.error('Error in resolveLoginIdentifier:', err)
    return null
  }
}

// Function to validate user authentication status
export const canUserAuthenticate = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('can_user_authenticate', { p_user_id: userId })
      .single()

    if (error) {
      console.error('Error validating user authentication:', error)
      return false
    }

    return data as boolean
  } catch (err) {
    console.error('Error in canUserAuthenticate:', err)
    return false
  }
}

// Ephemeral client for one-off server-side token exchanges (e.g., OTP verify
// during PIN login). No session persistence, so no state leaks across requests.
export const createEphemeralSupabaseClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

/**
 * Function to invalidate all user sessions.
 * 1. Clears the active session token (`handle`) in the users table.
 * 2. Revokes Supabase Auth session via Admin API if JWT token is provided.
 */
export const invalidateAllUserSessions = async (userId: string, jwtToken?: string): Promise<boolean> => {
  try {
    const client = getSupabaseServiceClient();

    // 1. Clear active session handle in DB
    const { error: dbError } = await client
      .from('users')
      .update({ handle: null })
      .eq('id', userId);

    if (dbError) {
      console.error('Error clearing session handle in users table:', dbError);
    }

    // 2. Revoke JWT token via Auth Admin API if provided
    if (jwtToken && jwtToken.startsWith("eyJ")) {
      const { error: signOutErr } = await client.auth.admin.signOut(jwtToken).catch((e) => ({ error: e }));
      if (signOutErr) {
        console.warn('Notice revoking session via signOut:', signOutErr.message || signOutErr);
      }
    }

    return !dbError;
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err);
    return false;
  }
};
