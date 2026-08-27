import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withRateLimit } from '@/lib/rate-limit';

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

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_exit_reasons_get', maxRequests: 100 });
