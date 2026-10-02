/**
 * Primary sink writer for the sync bridge.
 *
 * Writes resolved device events to:
 *   1. public.movement_logs (primary) - triggers occupancy/daily stats/audit
 *   2. public.attendance_records (mirror) - HR sync continuity
 *
 * Requires the Supabase service-role client so RLS does not block writes.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResolvedDeviceEvent } from './types';

export interface SinkConfig {
  /** Stable name for this source in audit/metadata columns. */
  sourceLabel: string;
  /** Optional device serial attached to every row for traceability. */
  deviceSerial?: string;
}

export interface SinkResult {
  movementLogInserted: number;
  movementLogErrors: string[];
  attendanceRecordUpserted: number;
  attendanceRecordConflicts: number;
  attendanceRecordErrors: string[];
}

export interface Sink {
  write(resolved: ResolvedDeviceEvent[], supabase: SupabaseClient): Promise<SinkResult>;
}

export function createSink(cfg: SinkConfig): Sink {
  return {
    async write(resolved, supabase) {
      const movementLogInserted: string[] = [];
      const movementLogErrors: string[] = [];
      const attendanceRecordUpserted: string[] = [];
      const attendanceRecordConflicts: string[] = [];
      const attendanceRecordErrors: string[] = [];

      if (resolved.length === 0) {
        return {
          movementLogInserted: 0,
          movementLogErrors: [],
          attendanceRecordUpserted: 0,
          attendanceRecordConflicts: 0,
          attendanceRecordErrors: [],
        };
      }

      // 1. Write to public.movement_logs
      //    The schema triggers handle campus_occupancy, daily_stats, audit_logs.
      const movementRows = resolved.map((event) => ({
        user_id: event.userId,
        direction: event.direction,
        reason: 'Regular',
        gate_id: event.meta?.gateId ?? null,
        gate_name: event.meta?.gateName ?? 'H0201',
        operator_id: null,
        operator_name: null,
        timestamp: new Date(event.timestampUtc),
        is_manual: false,
        is_correction: false,
        // Extra context preserved where the schema supports JSON/extra columns.
        ...(event.meta && { meta: event.meta }),
      }));

      // If movement_logs does not accept a free `meta` column in your schema,
      // strip it before inserting.
      const movementPayload = movementRows.map((row) => {
        const { meta, ...rest } = row as Record<string, unknown>;
        return rest as Parameters<ReturnType<typeof supabase.from>['insert']>[0];
      });

      try {
        const { error: movementError } = await supabase
          .from('movement_logs')
          .insert(movementPayload);

        if (movementError) {
          movementLogErrors.push(`movement_logs batch write failed: ${movementError.message}`);
        } else {
          movementLogInserted.push(...movementRows.map((r) => r.user_id));
        }
      } catch (err) {
        movementLogErrors.push(String(err));
      }

      // 2. Mirror into public.attendance_records
      //    Idempotent dedupe key: device_serial:user_id:timestamp_utc:direction
      const attendanceRows: Record<string, unknown>[] = resolved.map((event) => ({
        dedupe_key: `${cfg.deviceSerial || 'unknown'}::${event.userId}::${event.timestampUtc}::${event.direction}`,
        person_id: event.userId,
        device_serial: cfg.deviceSerial || event.deviceSerial,
        direction: event.direction,
        timestamp_utc: event.timestampUtc,
        timestamp_local: event.localTimestamp,
        verify_mode_details: {
          device_user_id: event.deviceUserId,
          verifyMode: event.verifyMode,
          source: cfg.sourceLabel,
        },
        meta: event.meta,
      }));

      try {
        const { data, error: attendanceError } = await supabase
          .from('attendance_records')
          .upsert(attendanceRows, {
            onConflict: 'dedupe_key',
            ignoreDuplicates: true,
          });

        if (attendanceError) {
          attendanceRecordErrors.push(`attendance_records upsert failed: ${attendanceError.message}`);
        } else if (data) {
          attendanceRecordUpserted.push(...attendanceRows.map((r) => String(r.person_id)));
          // If Supabase returns fewer rows than sent, treat the delta as conflicts.
          if (Array.isArray(data)) {
            const returned = data as unknown[];
            const conflictCount = attendanceRows.length - returned.length;
            if (conflictCount > 0) {
              attendanceRecordConflicts.push(
                `attendance_records ignored ${conflictCount} duplicate dedupe_key(s)`,
              );
            }
          }
        }
      } catch (err) {
        attendanceRecordErrors.push(String(err));
      }

      return {
        movementLogInserted: movementLogInserted.length,
        movementLogErrors,
        attendanceRecordUpserted: attendanceRecordUpserted.length,
        attendanceRecordConflicts: attendanceRecordConflicts.length,
        attendanceRecordErrors,
      };
    },
  };
}
