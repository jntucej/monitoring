import createClient, { SupabaseClient } from '@supabase/supabase-js';
import getEnv from './env';

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
let serviceClient: SupabaseClient = null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseServiceRoleKey;

export const getSupabaseServiceClient (): SupabaseClient {
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
let readReplicaClient: SupabaseClient = null;
const readUrl = process.env.SUPABASE_READ_REPLICA_URL || supabaseUrl;

export const getReadOnlyClient (): SupabaseClient {
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
