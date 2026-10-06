import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/dbClient';
import { withAuthorization } from '@/middleware/authorization';
import { withRateLimit } from '@/lib/rate-limit';

const DEFAULT_PASS_TYPES = [
  { code: "day_pass", name: "Day Pass", description: "Full day out (returns by evening curfew)", defaultDurationHours: 12, requiresApproval: true, approvalFlow: "warden" },
  { code: "home_out", name: "Home Out", description: "Weekend or overnight home leave", defaultDurationHours: 48, requiresApproval: true, approvalFlow: "warden" },
];

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from('config_pass_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, data: DEFAULT_PASS_TYPES });
    }

    const mapped = data.map((item: any) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      defaultDurationHours: item.default_duration_hours,
      requiresApproval: item.requires_approval,
      approvalFlow: item.approval_flow,
    }));

    return NextResponse.json({ success: true, data: mapped.length > 0 ? mapped : DEFAULT_PASS_TYPES });
  } catch (error: any) {
    console.error('Error fetching pass types, using defaults:', error);
    return NextResponse.json({ success: true, data: DEFAULT_PASS_TYPES });
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: { message: 'Expected an array of pass types' } }, { status: 400 });
    }
    
    const upserts = body.map((item: any) => ({
      code: item.code,
      name: item.name,
      description: item.description || '',
      default_duration_hours: item.defaultDurationHours || 24,
      requires_approval: item.requiresApproval ?? true,
      approval_flow: item.approvalFlow || 'warden',
      is_active: true,
      updated_at: new Date().toISOString()
    }));

    const service = getSupabaseServiceClient();
    const { error: deactivateError } = await service
      .from('config_pass_types')
      .update({ is_active: false })
      .neq('code', 'temp_never_match'); 
      
    if (deactivateError && deactivateError.code !== '42P01') throw deactivateError;

    const { error: upsertError } = await service
      .from('config_pass_types')
      .upsert(upserts, { onConflict: 'code' });
      
    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, data: body });
  } catch (error: any) {
    console.error('Error updating pass types:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update pass types' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet as any, { requiredRole: ['student', 'parent', 'admin', 'sysadmin', 'faculty', 'warden'] }),
  { keyPrefix: 'config_pass_types_get', maxRequests: 100 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch as any, { requiredRole: ['admin', 'sysadmin'] }),
  { keyPrefix: 'config_pass_types_patch', maxRequests: 20 }
);