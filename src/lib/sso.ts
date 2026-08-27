/**
 * Single Sign-On (SSO) & OIDC Identity Provider Integration Engine
 * Uses `sso_config` database table for persistence with in-memory fallback.
 */
import { getSupabaseServiceClient } from "./supabaseClient";

export interface SSOConfig {
  providerId: "google" | "azure_ad" | "okta";
  enabled: boolean;
  clientId: string;
  issuerUrl: string;
  groupMappings: Record<string, string>; // e.g. { "Security-Admins": "sysadmin" }
}

let inMemorySSOConfig: SSOConfig = {
  providerId: "google",
  enabled: true,
  clientId: "gate-monitor-client-id.apps.googleusercontent.com",
  issuerUrl: "https://accounts.google.com",
  groupMappings: {
    "Campus-Security-Leads": "admin",
    "IT-Administrators": "sysadmin",
    "Faculty-Members": "faculty",
  },
};

export async function getSSOConfig(): Promise<SSOConfig> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase.from("sso_config").select("*").eq("id", "default").single();
    if (data) {
      inMemorySSOConfig = {
        providerId: data.provider_id || "google",
        enabled: Boolean(data.enabled),
        clientId: data.client_id || "",
        issuerUrl: data.issuer_url || "",
        groupMappings: data.group_mappings || {},
      };
    }
  } catch (err) {
    console.error("Error fetching SSO config from DB:", err);
  }
  return inMemorySSOConfig;
}

export async function updateSSOConfig(config: Partial<SSOConfig>): Promise<SSOConfig> {
  inMemorySSOConfig = { ...inMemorySSOConfig, ...config };

  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("sso_config").upsert({
      id: "default",
      provider_id: inMemorySSOConfig.providerId,
      enabled: inMemorySSOConfig.enabled,
      client_id: inMemorySSOConfig.clientId,
      issuer_url: inMemorySSOConfig.issuerUrl,
      group_mappings: inMemorySSOConfig.groupMappings,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error updating SSO config in DB:", err);
  }

  return inMemorySSOConfig;
}

export function mapExternalGroupToRole(groups: string[]): string {
  for (const group of groups) {
    if (inMemorySSOConfig.groupMappings[group]) {
      return inMemorySSOConfig.groupMappings[group];
    }
  }
  return "student";
}

