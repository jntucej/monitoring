import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/dbClient';
import { withAuthorization } from '@/middleware/authorization';
import { withRateLimit } from '@/lib/rate-limit';
import { withAdminMutation } from '@/server/http/mutation-guard';
import type { AuthContext } from '@/lib/authContext';
import { addAudit } from '@/lib/db';

const DEFAULT_PASS_TYPES = [
  { code: "day_pass", name: "Day Pass", description: "Full day out (returns by evening curfew)", defaultDurationHours: 12, requiresApproval: true, approvalFlow: "principal" },
  { code: "home_out", name: "Home Out", description: "Weekend or overnight home leave", defaultDurationHours: 48, requiresApproval: true, approvalFlow: "principal" },
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
      description: item.description ?? '',
      defaultDurationHours: item.default_duration_hours ?? null,
      requiresApproval: item.requires_approval,
      approvalFlow: item.approval_flow,
      isActive: item.is_active,
    }));

    return NextResponse.json({ success: true, data: mapped.length > 0 ? mapped : DEFAULT_PASS_TYPES });
  } catch (error: any) {
    console.error('Error fetching pass types, using defaults:', error);
    return NextResponse.json({ success: true, data: DEFAULT_PASS_TYPES });
  }
}

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: { message: 'Expected an array of pass types' } }, { status: 400 });
    }

    const upserts = body.map((item: any) => ({
      code: item.code,
      name: item.name,
      requires_approval: item.requiresApproval ?? true,
      approval_flow: item.approvalFlow || 'principal',
      is_active: true,
      updated_at: new Date().toISOString(),
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

    try {
      await addAudit({
        action: 'PASS_TYPE_UPDATED',
        userId: ctx.auth.userId,
        role: ctx.auth.role,
        details: { codes: upserts.map((u) => u.code) },
      });
    } catch {
      // audit failure is non-fatal
    }

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
  withAuthorization(handleGet as any, { requiredRole: ['student', 'parent', 'admin', 'sysadmin', 'faculty', 'principal'] }),
  { keyPrefix: 'config_pass_types_get', maxRequests: 100 }
);

export const PATCH = withAdminMutation(handlePatch, { rateLimit: { windowMs: 60_000, maxRequests: 20 } });
