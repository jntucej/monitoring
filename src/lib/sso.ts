/**
 * Single Sign-On (SSO) & OIDC Identity Provider Integration Engine
 */

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
  return inMemorySSOConfig;
}

export async function updateSSOConfig(config: Partial<SSOConfig>): Promise<SSOConfig> {
  inMemorySSOConfig = { ...inMemorySSOConfig, ...config };
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
