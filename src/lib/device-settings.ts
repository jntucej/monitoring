/* eslint-disable @typescript-eslint/no-unused-vars */
import { getSupabaseServiceClient } from "@/lib/dbClient";

export type DeviceStage = "hostel" | "gate";
export type DeviceType = "thumb" | "face" | "barcode" | "qr";

export interface DeviceSetting {
  enabled: boolean;
  scope: string;
  scope_id: string | null;
}

/**
 * Reads whether device verification is enabled for a stage.
 */
export async function getDeviceSetting(_stage: DeviceStage): Promise<DeviceSetting> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("device_verification_settings")
    .select("device_type, enabled, scope, scope_id")
    .in("device_type", ["thumb", "face"])
    .eq("scope", "global");

  if (error || !data) return { enabled: false, scope: "global", scope_id: null };

  const enabled = data.some((row) => row.enabled === true);
  return { enabled, scope: "global", scope_id: null };
}

