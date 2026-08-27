import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authContext';
import { finishAuthentication } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await requireAuthenticatedUser(token);
    const response = await req.json();
    const result = await finishAuthentication(user.userId, response);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('WebAuthn auth finish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete authentication' },
      { status: 500 }
    );
  }
}