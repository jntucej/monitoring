/**
 * Authentication middleware for Gate Monitoring System
 * Updated to use Supabase Auth as the sole authentication authority
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase, canUserAuthenticate, getSupabaseServiceClient } from '@/lib/supabaseClient';

/**
 * Authentication middleware that validates:
 * - Token presence and format
 * - Token validity using Supabase Auth
 * - User existence in public.users
 * - Account status
 * - Role authorization
 *
 * @param req - The incoming request
 * @returns NextResponse with appropriate error or continues with user information
 */
export async function authMiddleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  // Validate token with Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }

  // Check if user can authenticate (exists in public.users and has ACTIVE status)
  const canAuthenticate = await canUserAuthenticate(user.id);

  if (!canAuthenticate) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_USER', message: 'User not found or account inactive' } },
      { status: 401 }
    );
  }

  // Get user profile from public.users using the service client to bypass RLS on server-side lookups
  const service = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: { code: 'USER_NOT_FOUND', message: 'User profile not found' } },
      { status: 404 }
    );
  }

  // Validate account status
  if (profile.status !== 'ACTIVE') {
    return NextResponse.json(
      { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
      { status: 403 }
    );
  }

  // Strict check: verify match with X-Session-Token header.
  const sessionToken = req.headers.get('x-session-token');
  if (!profile.handle || !sessionToken || sessionToken !== profile.handle) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired or you have logged in from another device.',
        },
      },
      { status: 401 }
    );
  }

  // Attach user information to headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', profile.id);
  requestHeaders.set('x-user-role', profile.role);
  requestHeaders.set('x-user-email', profile.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Higher-order function to add authentication to API routes
 * @param handler - The API route handler
 * @returns Wrapped handler with authentication
 */
export function withAuth(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Validate token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    // Check if user can authenticate
    const canAuthenticate = await canUserAuthenticate(user.id);

    if (!canAuthenticate) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_USER', message: 'User not found or account inactive' } },
        { status: 401 }
      );
    }

    // Get user profile from public.users using the service client to bypass RLS on server-side lookups
    const service = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await service
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User profile not found' } },
        { status: 404 }
      );
    }

    // Validate account status
    if (profile.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
        { status: 403 }
      );
    }

    // Strict check: verify match with X-Session-Token header.
    const sessionToken = req.headers.get('x-session-token');
    if (!profile.handle || !sessionToken || sessionToken !== profile.handle) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired or you have logged in from another device.',
          },
        },
        { status: 401 }
      );
    }

    // Attach user information to request headers
    req.headers.set('x-user-id', profile.id);
    req.headers.set('x-user-role', profile.role);
    req.headers.set('x-user-email', profile.email);

    return handler(req);
  };
}

/**
 * Higher-order function to combine authentication and account status validation
 * @param handler - The API route handler
 * @returns Wrapped handler with authentication and account status validation
 */
export function withAuthAndStatus(handler: (req: NextRequest) => Promise<Response>) {
  return withAuth(handler); // Account status is already validated in withAuth
}