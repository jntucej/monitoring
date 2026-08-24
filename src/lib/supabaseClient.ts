import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgdlaghzerrrgkhqpdvz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZGxhZ2h6ZXJycmdraHFwZHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTUwNDIsImV4cCI6MjEwMjM3MTA0Mn0.RVXUdKQJXF5KSHdBKfinx3FhLGCauCxc7uuYsjx5sew'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZGxhZ2h6ZXJycmdraHFwZHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NTA0MiwiZXhwIjoyMTAyMzcxMDQyfQ.U6OPFP84AmFIb2MgKHdCRAQo2cXRC5OAheVIm7OOkvk'

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
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }

  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return serviceClient
}

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
// Revokes Supabase Auth sessions (refresh tokens) via the Admin API and
// records the invalidation through the `invalidate_all_user_sessions` RPC.
export const invalidateAllUserSessions = async (userId: string): Promise<boolean> => {
  try {
    const serviceClient = getSupabaseServiceClient()

    // Call the Supabase Auth Admin API to sign out the user
    const { error } = await serviceClient.auth.admin.signOut(userId)

    if (error) {
      console.error('Error invalidating user sessions:', error)
      return false
    }

    // Call the database function to log the session invalidation
    const { error: dbError } = await serviceClient
      .rpc('invalidate_all_user_sessions', { p_user_id: userId })

    if (dbError) {
      console.error('Error logging session invalidation:', dbError)
    }

    return true
  } catch (err) {
    console.error('Error in invalidateAllUserSessions:', err)
    return false
  }
}