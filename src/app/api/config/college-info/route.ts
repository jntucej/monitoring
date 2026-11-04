import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/dbClient';
import { withRateLimit } from '@/lib/rate-limit';
import { withAdminMutation } from '@/server/http/mutation-guard';
import type { AuthContext } from '@/lib/authContext';
import type { Role } from '@/lib/types';
import { addAudit } from '@/lib/db';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

const ALLOWED_FIELDS = ['name', 'shortName', 'address', 'phone', 'email', 'logo', 'accreditation', 'website', 'principal'] as const;

function toDbKey(key: string): string {
  return key === 'shortName' ? 'short_name' : key;
}

function mapRow(row: any) {
  if (!row) return null;
  return {
    name: row.name,
    shortName: row.short_name,
    address: row.address,
    phone: row.phone ?? '',
    email: row.email ?? '',
    logo: row.logo,
    accreditation: row.accreditation,
    website: row.website,
    principal: row.principal,
    updatedAt: row.updated_at,
  };
}

async function handleGet(req: NextRequest) {
  try {
    const cacheKey = "config:college-info";
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const service = getSupabaseServiceClient();
    const { data, error } = await service
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
          phone: '',
          email: '',
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

    const mapped = mapRow(data);

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

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }) {
  try {
    const body = await req.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updates[toDbKey(key)] = body[key];
      }
    }

    const service = getSupabaseServiceClient();
    const { data: existing } = await service
      .from('config_college_info')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      result = await service
        .from('config_college_info')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await service
        .from('config_college_info')
        .insert({ ...updates, id: crypto.randomUUID() })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    const mapped = mapRow(result.data);

    await invalidateCache("config:college-info");

    try {
      await addAudit({
        action: 'SYSTEM_CONFIG_CHANGED',
        userId: ctx.auth.userId,
        role: ctx.auth.role as Role,
        details: { resource: 'college-info', fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
      });
    } catch {
      // audit failure is non-fatal
    }

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error updating college info:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update college info' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, { keyPrefix: 'college_info_get', maxRequests: 300 });
export const PATCH = withAdminMutation(handlePatch, { rateLimit: { windowMs: 60_000, maxRequests: 10 } });
