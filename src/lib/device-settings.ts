/* eslint-disable @typescript-eslint/no-unused-vars */
import { query } from "@/lib/postgres";

export type DeviceStage = "hostel" | "gate";
export type DeviceType = "thumb" | "face" | "barcode" | "qr";

export interface DeviceSetting {
  enabled: boolean;
  scope: string;
  scope_id: string | null;
}

/**
 * Checks whether a specific device verification type is enabled for a gate or globally.
 * Returns true if an active setting allows it.
 */
export async function isDeviceTypeEnabled(
  deviceType: DeviceType,
  gateId?: string | null
): Promise<boolean> {
  try {
    const { rows } = await query<{ enabled: boolean }>(
      `SELECT enabled FROM public.device_verification_settings
        WHERE device_type = $1
          AND (
            (scope = 'gate' AND scope_id = $2)
            OR (scope = 'global')
          )
        ORDER BY CASE WHEN scope = 'gate' THEN 1 ELSE 2 END ASC, updated_at DESC
        LIMIT 1`,
      [deviceType, gateId ?? null]
    );
    return rows[0]?.enabled ?? false;
  } catch (err) {
    console.error("[device-settings] Error querying device setting:", err);
    return false;
  }
}

/**
 * Reads whether device verification is enabled for a stage.
 */
export async function getDeviceSetting(_stage: DeviceStage): Promise<DeviceSetting> {
  try {
    const { rows } = await query<{ enabled: boolean }>(
      `SELECT enabled FROM public.device_verification_settings
        WHERE device_type IN ('thumb', 'face')
          AND scope = 'global'
          AND enabled = true
        LIMIT 1`
    );
    const enabled = rows.length > 0;
    return { enabled, scope: "global", scope_id: null };
  } catch {
    return { enabled: false, scope: "global", scope_id: null };
  }
}

