import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleCode = searchParams.get('role');

    let query = supabase
      .from('config_navigation')
      .select('*')
      .eq('is_active', true)
      .order('"order"', { ascending: true });

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
        href: item.href,
        label: item.label,
        icon: item.icon_name,
        badge: item.badge,
      });
    });

    const grouped = Object.entries(groups).map(([groupLabel, items]) => ({
      groupLabel,
      items,
    }));

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching navigation:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load navigation' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_navigation', maxRequests: 50 });