/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/dbClient';
import { withRateLimit } from '@/lib/rate-limit';
import { withAuthorization } from '@/middleware/authorization';
import { addAudit } from '@/lib/db';
import { Role } from '@/lib/types';

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from('config_roles_registry')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.warn('[config/roles] config_roles table missing, returning empty');
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load roles' } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, display_name, description, icon_name, default_redirect } = body;

    if (!code || !display_name) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Role code and display name are required' } }, { status: 400 });
    }

    const payload = {
      code,
      display_name,
      description: description || '',
      icon_name: icon_name || 'User',
      default_redirect: default_redirect || '/profile',
      is_active: true,
    };

    const service = getSupabaseServiceClient();
    const { data, error } = await service.from('config_roles_registry').upsert([payload]).select().single();
    if (error) throw error;

    const actorId = req.headers.get('x-user-id') || 'sysadmin';
    const actorRole = (req.headers.get('x-user-role') || 'sysadmin') as Role;

    await addAudit({
      action: 'ROLE_CONFIG_UPSERT',
      userId: actorId,
      userName: 'SysAdmin',
      role: actorRole,
      details: `Saved role configuration '${code}' (${display_name}).`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing role code' } }, { status: 400 });
    }

    const service = getSupabaseServiceClient();
    const { error } = await service.from('config_roles_registry').update({ is_active: false }).eq('code', code);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Deactivated role ${code}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_roles', maxRequests: 300 });
export const POST = withAuthorization(handlePost, { requiredRole: ['sysadmin'] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ['sysadmin'] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ['sysadmin'] });