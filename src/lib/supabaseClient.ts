import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && typeof window !== 'undefined') {
    console.warn(`[SupabaseClient] Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}
validateEnv();

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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

// Function to invalidate all user sessions (requires service role).
// Revokes Supabase Auth sessions (refresh tokens) via the Admin API when token is provided,
// and records the invalidation through the `invalidate_all_user_sessions` RPC.
export const invalidateAllUserSessions = async (userId: string, jwtToken?: string): Promise<boolean> => {
  try {
    const serviceClient = getSupabaseServiceClient();

    // If a JWT token was supplied, revoke it via Auth Admin API
    if (jwtToken && jwtToken.startsWith("eyJ")) {
      const { error } = await serviceClient.auth.admin.signOut(jwtToken).catch((e) => ({ error: e }));
      if (error) {
        console.warn('Notice invalidating user sessions via signOut (token may be expired):', error.message || error);
      }
    }

    // Call the database function to log/process the session invalidation
    const { error: dbError } = await serviceClient
      .rpc('invalidate_all_user_sessions', { p_user_id: userId });

    if (dbError) {
      console.error('Error logging session invalidation:', dbError);
    }

    return true;
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err);
    return false;
  }
};