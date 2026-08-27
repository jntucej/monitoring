import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/authContext';
import { finishRegistration } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await requireAuthenticatedUser(token);
    const response = await req.json();
    const result = await finishRegistration(user.userId, response);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('WebAuthn registration finish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete registration' },
      { status: 500 }
    );
  }
}
