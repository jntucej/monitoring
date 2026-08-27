import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withRateLimit } from '@/lib/rate-limit';
import { withAuthorization } from '@/middleware/authorization';
import { addAudit } from '@/lib/db';
import { Role } from '@/lib/types';

async function handleGet(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('config_exit_reasons')
      .select('*')
      .order('code');

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    const mapped = (data || []).map((item: any) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      applicableTo: item.applicable_to || [],
      requiresApproval: item.requires_approval ?? false,
      approvalBy: item.approval_by || 'none',
      parentNotification: item.parent_notification || 'silent',
      maxDurationHours: item.max_duration_hours,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error('Error fetching exit reasons:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load exit reasons' } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, description, applicableTo, requiresApproval, approvalBy, parentNotification, maxDurationHours } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Code and Name are required.' } }, { status: 400 });
    }

    const payload = {
      code,
      name,
      description: description || '',
      applicable_to: applicableTo || ['student'],
      requires_approval: Boolean(requiresApproval),
      approval_by: approvalBy || 'none',
      parent_notification: parentNotification || 'silent',
      max_duration_hours: maxDurationHours ? Number(maxDurationHours) : null,
    };

    const { data, error } = await supabase
      .from('config_exit_reasons')
      .upsert([payload])
      .select()
      .single();

    if (error) throw error;

    const actorId = req.headers.get('x-user-id') || 'sysadmin';
    const actorRole = (req.headers.get('x-user-role') || 'sysadmin') as Role;

    await addAudit({
      action: 'EXIT_REASON_UPSERT',
      userId: actorId,
      userName: 'SysAdmin',
      role: actorRole,
      details: `Saved exit reason '${code}' (${name}).`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating exit reason:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing reason code' } }, { status: 400 });
    }

    const { error } = await supabase.from('config_exit_reasons').delete().eq('code', code);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Deleted exit reason ${code}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_exit_reasons_get', maxRequests: 100 });
export const POST = withAuthorization(handlePost, { requiredRole: ['sysadmin', 'admin'] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ['sysadmin', 'admin'] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ['sysadmin'] });
