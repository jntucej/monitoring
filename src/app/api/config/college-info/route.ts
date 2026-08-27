import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withAuthorization } from '@/middleware/authorization';
import { withRateLimit } from '@/lib/rate-limit';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

async function handleGet(req: NextRequest) {
  try {
    const cacheKey = "config:college-info";
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const { data, error } = await supabase
      .from('config_college_info')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        const defaultData = {
          name: '',
          shortName: '',
          address: '',
          logo: '',
          accreditation: '',
          website: '',
          principal: '',
        };
        await setCached(cacheKey, defaultData, 3600);
        return NextResponse.json({ success: true, data: defaultData });
      }
      throw error;
    }

    const mapped = data ? {
      name: data.name,
      shortName: data.short_name,
      address: data.address,
      logo: data.logo,
      accreditation: data.accreditation,
      website: data.website,
      principal: data.principal,
      updatedAt: data.updated_at,
    } : null;

    if (mapped) {
      await setCached(cacheKey, mapped, 3600);
    }

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error fetching college info:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load college info' } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    const allowed = ['name', 'shortName', 'address', 'logo', 'accreditation', 'website', 'principal'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        const dbKey = key === 'shortName' ? 'short_name' : key;
        updates[dbKey] = body[key];
      }
    }

    const { data: existing } = await supabase
      .from('config_college_info')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('config_college_info')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('config_college_info')
        .insert({ ...updates, id: crypto.randomUUID() })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    const mapped = result.data ? {
      name: result.data.name,
      shortName: result.data.short_name,
      address: result.data.address,
      logo: result.data.logo,
      accreditation: result.data.accreditation,
      website: result.data.website,
      principal: result.data.principal,
      updatedAt: result.data.updated_at,
    } : null;

    await invalidateCache("config:college-info");

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error updating college info:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update college info' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, { keyPrefix: 'college_info_get', maxRequests: 100 });
export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ['admin', 'sysadmin'] }),
  { keyPrefix: 'college_info_patch', maxRequests: 10 }
);