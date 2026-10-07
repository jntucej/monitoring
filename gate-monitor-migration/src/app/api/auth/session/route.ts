import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { getSupabaseServiceClient } from '@/lib/supabaseClient';
import { getEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  return withRateLimit(async () => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    
    try {
      // For now, fallback to Supabase for token verification during migration
      // TODO: Replace with JWT verification once fully migrated
      const supabase = getSupabaseServiceClient();
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authData?.user) {
        return NextResponse.json({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
        }, { status: 401 });
      }
      
      const userId = authData.user.id;
      
      // Fetch user profile
      const service = getSupabaseServiceClient();
      const { data: profile, error: profileErr } = await service
        .from('users')
        .select('id, name, role, unique_id, login_identifier, email, status, handle, gate_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileErr || !profile || profile.status !== 'ACTIVE') {
        return NextResponse.json({
          success: false,
          error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
        }, { status: 403 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          token,
          refreshToken: null,
          user: {
            id: profile.id,
            name: profile.name,
            role: profile.role,
            employeeId: profile.unique_id || profile.login_identifier || null,
            uniqueId: profile.unique_id,
            email: profile.email,
            status: profile.status,
            currentSessionToken: profile.handle,
            gateId: profile.gate_id,
          },
        },
      });
    } catch (error: any) {
      console.error('Session check API route error:', error);
      return NextResponse.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate session' },
      }, { status: 500 });
    }
  })();
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const { employeeId, pin, verifyOnly } = await req.json();
    
    if (
      typeof employeeId !== 'string' || !employeeId.trim() ||
      typeof pin !== 'string' || !pin
    ) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Employee/User ID and PIN are required.' },
      }, { status: 400 });
    }
    
    const cleanEmployeeId = employeeId.trim().toUpperCase();
    
    // Find user by unique_id or email
    const service = getSupabaseServiceClient();
    const { data: user, error } = await service
      .from('users')
      .select('id, email, name, role, unique_id, initial_pin_hash, gate_id')
      .eq('unique_id', cleanEmployeeId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    
    if (!user?.initial_pin_hash) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid PIN or user not found.' },
      }, { status: 401 });
    }
    
    // Verify PIN
    const isValid = await bcrypt.compare(pin, user.initial_pin_hash);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid PIN or user not found.' },
      }, { status: 401 });
    }
    
    if (verifyOnly !== true) {
      // Create session token
      const sessionToken = crypto.randomUUID();
      await service
        .from('users')
        .update({ handle: sessionToken })
        .eq('id', user.id);
      
      return NextResponse.json({
        success: true,
        data: {
          token: 'mock_jwt_token_' + Date.now(), // TODO: Replace with real JWT
          refreshToken: null,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            employeeId: user.unique_id,
            uniqueId: user.unique_id,
            email: user.email,
            status: 'ACTIVE',
            currentSessionToken: sessionToken,
            gateId: user.gate_id,
          },
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          userId: user.id,
        },
      });
    }
  } catch (error: any) {
    console.error('PIN Login API route error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal PIN authentication error.' },
    }, { status: 500 });
  }
});