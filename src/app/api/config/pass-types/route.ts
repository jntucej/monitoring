import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withAuthorization } from '@/middleware/authorization';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('config_pass_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

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
      defaultDurationHours: item.default_duration_hours,
      requiresApproval: item.requires_approval,
      approvalFlow: item.approval_flow,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error('Error fetching pass types:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load pass types' } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: { message: 'Expected an array of pass types' } }, { status: 400 });
    }
    
    // Instead of completely wiping flags in a generic fetch which might break things if schema doesn't match perfectly,
    // we'll update everything sent and assume others are either kept or marked inactive.
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

    // Optionally mark all currently active ones to inactive if they aren't in upserts array: 
    // Just run update to deactivate everything safely, then upsert
    const { error: deactivateError } = await supabase
      .from('config_pass_types')
      .update({ is_active: false })
      .neq('code', 'temp_never_match'); 
      
    if (deactivateError && deactivateError.code !== '42P01') throw deactivateError;

    const { error: upsertError } = await supabase
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