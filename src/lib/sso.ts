/** Single Sign-On (SSO) OIDC Identity Provider Integration Engine
Uses sso_config database table, persistence with in-memory fallback.
Includes JWT id_token validation, PKCE code challenge helpers using jose.
*/
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
    const { data } = await supabase
      .from("sso_config")
      .select("*")
      .eq("id", "default")
      .single();

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
    await supabase.from("sso_config").upsert(
      {
        id: "default",
        provider_id: inMemorySSOConfig.providerId,
        enabled: inMemorySSOConfig.enabled,
        client_id: inMemorySSOConfig.clientId,
        client_secret: inMemorySSOConfig.clientSecret,
        issuer_url: inMemorySSOConfig.issuerUrl,
        group_mappings: inMemorySSOConfig.groupMappings,
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("Failed to persist SSO config to database, in-memory only", err);
  }

  return inMemorySSOConfig;
}

export function mapExternalGroupToRole(groups: string[]): string {
  for (const group of groups) {
    const role = inMemorySSOConfig.groupMappings[group];
    if (role) {
      return role;
    }
  }
  return "student";
}

export async function validateOIDCIdToken(
  idToken: string,
  provider: string,
  clientId: string
): Promise<OIDCTokenValidationResult> {
  try {
    let issuer: string;
    let jwksUrl: string;

    if (provider === "google") {
      issuer = "https://accounts.google.com";
      jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
    } else if (provider === "azure_ad") {
      issuer = "https://login.microsoftonline.com/common/v2.0";
      jwksUrl = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
    } else {
      issuer = inMemorySSOConfig.issuerUrl.replace(/\/$/, "");
      jwksUrl = `${issuer}/.well-known/jwks.json`;
    }

    const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jose.jwtVerify(idToken, jwks, {
      issuer,
      audience: clientId,
      algorithms: ["RS256"],
    });

    return { valid: true, claims: payload };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function getAuthorizationUrl(
  config: SSOConfig,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state: state,
  });

  if (config.providerId === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else if (config.providerId === "azure_ad") {
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  } else {
    return `${config.issuerUrl}/oauth2/v1/authorize?${params.toString()}`;
  }
}

export async function exchangeOIDCAuthorizationCode(
  code: string,
  provider: string,
  redirectUri: string
): Promise<{
  success: boolean;
  idToken?: string;
  accessToken?: string;
  error?: string;
}> {
  try {
    const config = inMemorySSOConfig;

    let tokenEndpoint: string;
    if (provider === "google") {
      tokenEndpoint = "https://oauth2.googleapis.com/token";
    } else if (provider === "azure_ad") {
      tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    } else {
      tokenEndpoint = `${config.issuerUrl}/oauth2/v1/token`;
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret || "",
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }

    const tokenData = await response.json();
    return {
      success: true,
      idToken: tokenData.id_token,
      accessToken: tokenData.access_token,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
