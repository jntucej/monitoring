import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('config_roles')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        const fallbacks = [
          { code: 'admin', display_name: 'Administrator', description: 'College Administration', icon_name: 'LayoutDashboard', default_redirect: '/admin' },
          { code: 'guardian', display_name: 'Guardian', description: 'Guardians & Wards', icon_name: 'Users', default_redirect: '/parent' },
          { code: 'operator', display_name: 'Gate Operator', description: 'Security Gate Officers', icon_name: 'ScanLine', default_redirect: '/gate/1' },
          { code: 'student', display_name: 'Student', description: 'Campus Members', icon_name: 'GraduationCap', default_redirect: '/student' },
          { code: 'sysadmin', display_name: 'System Admin', description: 'IT Infrastructure & Security', icon_name: 'Settings', default_redirect: '/sysadmin' }
        ];
        return NextResponse.json({ success: true, data: fallbacks });
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

export const GET = withRateLimit(handleGet as any, { keyPrefix: 'config_roles', maxRequests: 50 });