/** Single Sign-On (SSO) and OIDC identity provider integration. */
import { getSupabaseServiceClient } from "./supabaseClient";
import * as jose from "jose";

export interface SSOConfig {
  providerId: "google" | "azure_ad" | "okta";
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  issuerUrl: string;
  groupMappings: Record<string, string>;
}

export interface OIDCTokenValidationResult {
  valid: boolean;
  claims?: jose.JWTPayload;
  error?: string;
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
        clientSecret: data.client_secret || "",
        issuerUrl: data.issuer_url || "",
        groupMappings: data.group_mappings || {},
      };
    }
  } catch (err) {
    console.warn("Failed to load SSO config from database, using memory fallback", err);
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
      client_secret: inMemorySSOConfig.clientSecret,
      issuer_url: inMemorySSOConfig.issuerUrl,
      group_mappings: inMemorySSOConfig.groupMappings,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to persist SSO config", err);
  }
  return inMemorySSOConfig;
}

export function mapExternalGroupToRole(groups: string[]): string {
  for (const group of groups) {
    const role = inMemorySSOConfig.groupMappings[group];
    if (role) return role;
  }
  return "student";
}

/**
 * Verifies signature and required OpenID Connect claims before exposing an ID token.
 * Providers must expose their JWKS at the standard OIDC discovery-compatible path.
 */
export async function validateOIDCIdToken(
  idToken: string,
  expectedClientId?: string,
  issuerUrl?: string,
): Promise<OIDCTokenValidationResult> {
  try {
    if (!expectedClientId || !issuerUrl) {
      return { valid: false, error: "OIDC client ID and issuer are required" };
    }
    const normalizedIssuer = issuerUrl.replace(/\/$/, "");
    const jwks = jose.createRemoteJWKSet(new URL(`${normalizedIssuer}/.well-known/jwks.json`));
    const { payload } = await jose.jwtVerify(idToken, jwks, {
      issuer: normalizedIssuer,
      audience: expectedClientId,
      algorithms: ["RS256", "ES256"],
    });
    return { valid: true, claims: payload };
  } catch {
    return { valid: false, error: "OIDC ID token signature or claims are invalid" };
  }
}

export function getAuthorizationUrl(config: SSOConfig, redirectUri: string, state: string): string {
  const providerUrls: Record<SSOConfig["providerId"], string> = {
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    azure_ad: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    okta: `${config.issuerUrl.replace(/\/$/, "")}/v1/authorize`,
  };
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
  });
  return `${providerUrls[config.providerId]}?${params}`;
}

export async function exchangeOIDCAuthorizationCode(
  config: SSOConfig,
  code: string,
  redirectUri: string,
): Promise<{ id_token?: string; access_token?: string }> {
  const tokenUrl = config.providerId === "google"
    ? "https://oauth2.googleapis.com/token"
    : config.providerId === "azure_ad"
      ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
      : `${config.issuerUrl.replace(/\/$/, "")}/v1/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret || "",
    }),
  });
  if (!response.ok) throw new Error("OIDC authorization-code exchange failed");
  return response.json();
}
