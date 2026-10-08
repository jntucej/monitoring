/**
 * Single Sign-On (SSO) OIDC Identity Provider Integration Engine
 * Uses sso_config database table, with persistence and in-memory fallback.
 * Includes JWT id_token validation, PKCE code challenge helpers using jose.
 */
import { query } from "./postgres";
import * as jose from "jose";

export type SSOProvider = "google" | "azure_ad" | "okta" | (string & {});

export interface SSOConfig {
  providerId: "google" | "azure_ad" | "okta";
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  issuerUrl: string;
  groupMappings: Record<string, string>;
  autoApproveSsoUsers?: boolean;
}

export interface OIDCValidationOptions {
  provider: SSOProvider;
  clientId: string;
  nonce: string;
  issuerUrl?: string;
}

export type OIDCClaims = jose.JWTPayload & {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  groups?: string[];
  azp?: string;
};

export interface OIDCValidationResult {
  valid: boolean;
  claims?: OIDCClaims;
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
  autoApproveSsoUsers: false,
};

export async function getSSOConfig(): Promise<SSOConfig> {
  try {
    const res = await query(
      `SELECT * FROM sso_config WHERE id = $1`,
      ["default"]
    );

    if (res.rows && res.rows[0]) {
      const data = res.rows[0];
      const parsedGroups = typeof data.group_mappings === 'string'
        ? JSON.parse(data.group_mappings)
        : (data.group_mappings || {});
      inMemorySSOConfig = {
        ...inMemorySSOConfig,
        providerId: data.provider_id || "google",
        enabled: Boolean(data.enabled),
        clientId: data.client_id || "",
        issuerUrl: data.issuer_url || "",
        groupMappings: parsedGroups,
        clientSecret: process.env.SSO_CLIENT_SECRET || inMemorySSOConfig.clientSecret || "",
      };
    }
  } catch (err) {
    console.warn("Failed to load SSO config from database, using memory fallback", err);
  }

  return inMemorySSOConfig;
}

export async function assertSsoEnabled(): Promise<SSOConfig> {
  const c = await getSSOConfig();
  if (!c.enabled) {
    throw new Error("SSO_DISABLED");
  }
  return c;
}

export async function updateSSOConfig(config: Partial<SSOConfig>): Promise<SSOConfig> {
  inMemorySSOConfig = { ...inMemorySSOConfig, ...config };

  try {
    await query(
      `INSERT INTO sso_config (id, provider_id, enabled, client_id, issuer_url, group_mappings, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         provider_id = $2,
         enabled = $3,
         client_id = $4,
         issuer_url = $5,
         group_mappings = $6,
         updated_at = NOW()`,
      [
        "default",
        inMemorySSOConfig.providerId,
        inMemorySSOConfig.enabled,
        inMemorySSOConfig.clientId,
        inMemorySSOConfig.issuerUrl,
        typeof inMemorySSOConfig.groupMappings === 'object' ? JSON.stringify(inMemorySSOConfig.groupMappings) : (inMemorySSOConfig.groupMappings || '{}'),
      ]
    );
  } catch (err) {
    console.warn("Failed to persist SSO config to database, in-memory only", err);
  }

  return inMemorySSOConfig;
}
export function mapExternalGroupToRole(groups: string[]): string | null {
  const config = inMemorySSOConfig;
  const mappings = config.groupMappings ?? {};

  // Highest-privilege match wins, but only if the group is explicitly mapped.
  const priority = ["sysadmin", "admin", "warden", "faculty", "staff", "operator", "student"];
  const granted = new Set<string>();
  for (const g of groups) {
    const role = mappings[g];
    if (role) granted.add(role);
  }
  for (const p of priority) {
    if (granted.has(p)) return p;
  }
  return null; // Default DENY, not "student"
}

export async function validateOIDCIdToken(
  idToken: string,
  opts: OIDCValidationOptions
): Promise<OIDCValidationResult> {
  const { provider, clientId, nonce } = opts;

  let issuer: string;
  let jwksUrl: string;

  switch (provider) {
    case "google":
      issuer = "https://accounts.google.com";
      jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
      break;
    case "azure_ad":
      issuer = "https://login.microsoftonline.com/common/v2.0";
      jwksUrl = "https://login.microsoftonline.com/common/discovery/v2.0/keys";
      break;
    case "okta":
    default:
      if (!opts.issuerUrl) {
        return { valid: false, error: "issuerUrl required for okta/custom provider" };
      }
      issuer = opts.issuerUrl.replace(/\/$/, "");
      jwksUrl = `${issuer}/.well-known/jwks.json`;
      break;
  }

  try {
    const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jose.jwtVerify(idToken, jwks, {
      issuer,
      audience: clientId,
      algorithms: ["RS256"], // pin algorithm — no "none", no HS256 downgrade
    });

    // Nonce must match exactly
    if (payload.nonce !== nonce) {
      return { valid: false, error: "nonce mismatch" };
    }

    // azp check: Google requires azp === clientId when aud is an array
    if (Array.isArray(payload.aud) && (payload as Record<string, unknown>).azp && (payload as Record<string, unknown>).azp !== clientId) {
      return { valid: false, error: "authorized party mismatch" };
    }

    if (typeof payload.sub !== "string" || !payload.sub) {
      return { valid: false, error: "missing sub" };
    }

    return { valid: true, claims: payload as unknown as OIDCClaims };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function getAuthorizationUrl(
  config: SSOConfig,
  redirectUri: string,
  state: string,
  nonce?: string,
  codeChallenge?: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email groups",
    state: state,
    ...(nonce ? { nonce } : {}),
    ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: "S256" } : {}),
  });

  if (config.providerId === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else if (config.providerId === "azure_ad") {
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  } else {
    return `${config.issuerUrl.replace(/\/$/, "")}/oauth2/v1/authorize?${params.toString()}`;
  }
}

export async function exchangeOIDCAuthorizationCode(
  code: string,
  provider: string,
  redirectUri: string,
  codeVerifier?: string
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
      tokenEndpoint = `${config.issuerUrl.replace(/\/$/, "")}/oauth2/v1/token`;
    }

    const bodyParams: Record<string, string> = {
      grant_type: "authorization_code",
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret || "",
      redirect_uri: redirectUri,
    };
    if (codeVerifier) {
      bodyParams.code_verifier = codeVerifier;
    }

    const body = new URLSearchParams(bodyParams);

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Token exchange failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      idToken: data.id_token,
      accessToken: data.access_token,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Network or token exchange exception: ${message}`,
    };
  }
}

