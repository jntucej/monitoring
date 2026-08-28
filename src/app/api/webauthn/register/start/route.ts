import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authContext';
import { startRegistration } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Biometric registration is restricted to sysadmin only.
    const user = await requireRole(token, 'sysadmin');
    const options = await startRegistration(user.userId, user.handle || user.userId);
    return NextResponse.json(options);
  } catch (error: any) {
    console.error('WebAuthn registration start error:', error);
    const status = error.message?.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to start registration' },
      { status }
    );
  }
}