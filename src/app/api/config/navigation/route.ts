import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/dbClient';
import { withRateLimit } from '@/lib/rate-limit';
import { withAuthorization } from '@/middleware/authorization';
import { addAudit } from '@/lib/db';
import { Role } from '@/lib/types';

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const { searchParams } = new URL(req.url);
    const roleCode = searchParams.get('role');

    let query = service
      .from('config_navigation')
      .select('*')
      .eq('is_active', true)
      .order('order_num', { ascending: true });

    if (roleCode) {
      query = query.eq('role_code', roleCode);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return NextResponse.json({ success: true, data: [] });
      throw error;
    }

    // Group by group_label
    const groups: Record<string, any[]> = {};
    (data || []).forEach((item: any) => {
      if (!groups[item.group_label]) groups[item.group_label] = [];
      groups[item.group_label].push({
        id: item.id,
        roleCode: item.role_code,
        href: item.href,
        label: item.label,
        icon: item.icon_name,
        badge: item.badge,
        order: item.order_num ?? item.order,
      });
    });

    const grouped = Object.entries(groups).map(([groupLabel, items]) => ({
      groupLabel,
      items,
    }));

    return NextResponse.json({ success: true, data: grouped, raw: data || [] });
  } catch (error) {
    console.error('Error fetching navigation:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load navigation' } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { roleCode, groupLabel, href, label, icon, badge, order } = body;

    if (!roleCode || !href || !label) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Role, Href, and Label are required' } }, { status: 400 });
    }

    const payload = {
      role_code: roleCode,
      group_label: groupLabel || 'General',
      href,
      label,
      icon_name: icon || 'Link',
      badge: badge || null,
      order_num: Number(order || 1),
      is_active: true,
    };

    const service = getSupabaseServiceClient();
    const { data, error } = await service.from('config_navigation').upsert([payload]).select().single();
    if (error) throw error;

    const actorId = req.headers.get('x-user-id') || 'sysadmin';
    const actorRole = (req.headers.get('x-user-role') || 'sysadmin') as Role;

    /* await addAudit({
      action: 'NAV_CONFIG_UPSERT',
      userId: actorId,
      userName: 'SysAdmin',
      role: actorRole,
      details: `Saved navigation item '${label}' (${href}) for role '${roleCode}'.`,
    }); */

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing nav item ID' } }, { status: 400 });
    }

    const service = getSupabaseServiceClient();
    const { error } = await service.from('config_navigation').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Deleted navigation item ${id}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_navigation', maxRequests: 50 });
export const POST = withAuthorization(handlePost, { requiredRole: ['sysadmin'] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ['sysadmin'] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ['sysadmin'] });