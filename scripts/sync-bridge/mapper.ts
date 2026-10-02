import { RawDeviceLog, ResolvedDeviceEvent, SyncRunSnapshot } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MapperConfig {
  deviceSerial: string;
  timestampLayout?: string;
  deviceTimezone?: string;
}

export interface Mapper {
  resolve(rawLogs: RawDeviceLog[], supabase: SupabaseClient): Promise<ResolvedDeviceEvent[]>;
}

export function createMapper(cfg: MapperConfig): Mapper {
  return {
    async resolve(rawLogs, supabase) {
      if (rawLogs.length === 0) return [];

      const { data, error } = await supabase
        .from('device_user_mappings')
        .select('device_user_id, user_id, is_active')
        .eq('device_serial', cfg.deviceSerial)
        .eq('is_active', true);

      if (error) {
        throw new Error(`[mapper] failed to load device mappings: ${error.message}`);
      }

      const map = new Map<string, string>();
      for (const row of (data || [])) {
        map.set(String(row.device_user_id), String(row.user_id));
      }

      const resolved: ResolvedDeviceEvent[] = [];
      const seen = new Set<string>();

      for (const log of rawLogs) {
        const userId = map.get(log.deviceUserId);
        if (!userId) {
          console.warn(
            `[mapper] skipping unmapped device_user_id="${log.deviceUserId}" on device ${cfg.deviceSerial}`
          );
          continue;
        }

        const tsUtc = normalizeTimestamp(log.localTimestamp, cfg);
        const direction = inferDirection(log);

        const dedupeToken = `${cfg.deviceSerial}::${userId}::${tsUtc}::${direction}`;
        if (seen.has(dedupeToken)) {
          continue;
        }
        seen.add(dedupeToken);

        resolved.push({
          deviceSerial: cfg.deviceSerial,
          deviceUserId: log.deviceUserId,
          userId,
          localTimestamp: log.localTimestamp,
          timestampUtc: tsUtc,
          direction,
          verifyMode: log.verifyMode,
          meta: log.meta,
        });
      }

      return resolved;
    },
  };
}

function normalizeTimestamp(local: string, cfg: MapperConfig): string {
  const date = parseDeviceTimestamp(local, cfg.deviceTimezone);
  if (!date) {
    throw new Error(`[mapper] cannot parse device timestamp: "${local}"`);
  }
  return date.toISOString();
}

function parseDeviceTimestamp(raw: string, timezone?: string): Date | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const iso = trimmed.replace(' ', 'T');
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    if (timezone) {
      return convertFromTimeZone(date, timezone);
    }
    return date;
  }

  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback;
}

function convertFromTimeZone(date: Date, timezone: string): Date {
  const t = timezone.trim().toLowerCase();
  if (t === 'ist' || t === 'asia/kolkata' || t === '+05:30') {
    return new Date(date.getTime() - 5.5 * 3600_000);
  }
  return date;
}

export function inferDirection(log: RawDeviceLog): 'IN' | 'OUT' {
  if (log.state === 0) return 'IN';
  if (log.state === 1) return 'OUT';

  const mode = (log.verifyMode || '').toLowerCase();
  if (mode.includes('in')) return 'IN';
  if (mode.includes('out')) return 'OUT';

  return 'IN';
}
