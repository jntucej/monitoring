import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { withRateLimit } from '@/lib/rate-limit';
import { getSupabaseServiceClient } from '@/lib/supabaseClient';
import { getEnv } from '@/lib/env';

async function findPinUser(identifier: string) {
  const service = getSupabaseServiceClient();
  const columns = 'id, email, name, role, unique_id, initial_pin_hash, gate_id';

  const byUniqueId = await service
    .from('users')
    .select(columns)
    .eq('unique_id', identifier)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (byUniqueId.data) return byUniqueId.data;

  const byEmail = await service
    .from('users')
    .select(columns)
    .eq('email', identifier)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  return byEmail.data ?? null;
}

async function handlePinLogin(req: NextRequest) {
  try {
    const originUrl = new URL(req.headers.get('origin') || '');
    const host = req.headers.get('host');
    
    // Basic CSRF check - in production should be more robust
    if (originUrl.host && host && originUrl.host !== host) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'CSRF verification failed: Cross-Origin request blocked.' } },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const { employeeId, pin, verifyOnly } = body || {};

    if (
      typeof employeeId !== 'string' || !employeeId.trim() ||
      typeof pin !== 'string' || !pin
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Employee/User ID and PIN are required.' } },
        { status: 400 }
      );
    }

    const cleanEmployeeId = employeeId.trim().toUpperCase();
    const user = await findPinUser(cleanEmployeeId);

    if (!user?.initial_pin_hash) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Invalid PIN or user not found.' } },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(pin, user.initial_pin_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Invalid PIN or user not found.' } },
        { status: 401 }
      );
    }

    if (verifyOnly !== true) {
      const sessionToken = randomUUID();
      const service = getSupabaseServiceClient();
      const { error: sessionUpdateError } = await service
        .from('users')
        .update({ handle: sessionToken })
        .eq('id', user.id);

      if (sessionUpdateError) {
        console.error('Failed to update user session token during PIN login:', sessionUpdateError);
      }

      return NextResponse.json({
        success: true,
        data: {
          token: 'mock_access_token_' + Date.now(), // TODO: Replace with real JWT
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
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal PIN authentication error.' } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePinLogin, {
  keyPrefix: 'auth_pin_login',
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});