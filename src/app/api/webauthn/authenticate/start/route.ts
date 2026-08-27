import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authContext';
import { startAuthentication } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await requireAuthenticatedUser(token);
    const options = await startAuthentication(user.userId);
    return NextResponse.json(options);
  } catch (error: any) {
    console.error('WebAuthn auth start error:', error);
    if (error.message?.includes('No registered biometric credentials')) {
      return NextResponse.json(
        { error: 'NO_CREDENTIALS', message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to start authentication' },
      { status: 500 }
    );
  }
}