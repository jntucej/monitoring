import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authContext';
import { startRegistration } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await requireAuthenticatedUser(token);
    const options = await startRegistration(user.userId, user.handle || user.userId);
    return NextResponse.json(options);
  } catch (error: any) {
    console.error('WebAuthn registration start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start registration' },
      { status: 500 }
    );
  }
}