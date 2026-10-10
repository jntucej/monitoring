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
          { code: 'sysadmin', display_name: 'System Admin', description: 'IT Infrastructure & Security', icon_name: 'Settings', default_redirect: '/sysadmin' },
          { code: "caretaker", display_name: "Caretaker", description: "Hostel caretaker", icon_name: "Home", default_redirect: "/hostel/permissions" },
          { code: "deputy_warden", display_name: "Deputy Warden", description: "Hostel deputy warden", icon_name: "ShieldCheck", default_redirect: "/hostel/permissions" },
          { code: "hostel_manager", display_name: "Hostel Manager", description: "Hostel manager", icon_name: "Building", default_redirect: "/hostel/permissions" },
          { code: "principal", display_name: "Principal", description: "College principal", icon_name: "Award", default_redirect: "/principal/permissions" },
          { code: "vice_principal", display_name: "Vice Principal", description: "Vice principal", icon_name: "Award", default_redirect: "/exam/permissions" },
          { code: "oie", display_name: "OIE", description: "Officer Incharge Examinations", icon_name: "FileText", default_redirect: "/exam/permissions" },
          { code: "exam_branch", display_name: "Exam Branch", description: "Exam branch staff", icon_name: "ClipboardList", default_redirect: "/exam/permissions" }
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
    const { data, error } = await service.from('config_roles').upsert([payload]).select().single();
    if (error) throw error;

    const actorId = req.headers.get('x-user-id') || 'sysadmin';
    const actorRole = (req.headers.get('x-user-role') || 'sysadmin') as Role;

    // await addAudit({
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
    const { error } = await service.from('config_roles').update({ is_active: false }).eq('code', code);
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