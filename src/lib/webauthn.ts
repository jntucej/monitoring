// WebAuthn / Passkey authentication utilities
// FIDO2 / W3C Web Authentication standard compliance helper
import { randomBytes, createHash, createVerify } from "crypto";

export interface WebAuthnOptions {
  rpName: string;
  rpId: string;
  origin: string;
}

export interface CredentialCreationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ alg: number; type: "public-key" }>;
  timeout: number;
  attestation: "none" | "direct" | "indirect";
  authenticatorSelection: {
    authenticatorAttachment?: "platform" | "cross-platform";
    userVerification: "required" | "preferred" | "discouraged";
    residentKey?: "required" | "preferred" | "discouraged";
  };
}

export function generateChallenge(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function createWebAuthnCredentialCreationOptions(
  userId: string,
  userName: string,
  displayName: string,
  options?: Partial<WebAuthnOptions>
): CredentialCreationOptions {
  const challenge = generateChallenge();
  const rpName = options?.rpName || process.env.RP_NAME || "Campus Access Management";
  const rpId = options?.rpId || process.env.RP_ID || "localhost";

  return {
    challenge,
    rp: { name: rpName, id: rpId },
    user: {
      id: Buffer.from(userId, "utf8").toString("base64url"),
      name: userName,
      displayName: displayName || userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256
      { alg: -257, type: "public-key" }, // RS256
      { alg: -8, type: "public-key" },  // EdDSA
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  };
}

export function createWebAuthnAuthenticationOptions(
  allowCredentialIds?: string[],
  options?: Partial<WebAuthnOptions>
) {
  const challenge = generateChallenge();
  const rpId = options?.rpId || process.env.RP_ID || "localhost";

  return {
    challenge,
    rpId,
    timeout: 60000,
    userVerification: "required",
    allowCredentials: allowCredentialIds?.map((id) => ({
      id,
      type: "public-key",
      transports: ["internal", "hybrid", "usb", "ble", "nfc"],
    })),
  };
}

export function validateWebAuthnRegistrationResponse(
  response: { id: string; rawId?: string; response: { clientDataJSON: string; attestationObject: string } },
  expectedChallenge: string,
  expectedOrigin: string
): { valid: boolean; credentialId?: string; error?: string } {
  try {
    if (!response?.response?.clientDataJSON) return { valid: false, error: "Missing payload" };
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8"));
    if (clientData.type !== "webauthn.create") return { valid: false, error: `Invalid type: ${clientData.type}` };
    if (expectedChallenge && clientData.challenge !== expectedChallenge) return { valid: false, error: "Challenge mismatch" };
    if (expectedOrigin && clientData.origin !== expectedOrigin && !clientData.origin.includes("localhost")) {
      return { valid: false, error: `Origin mismatch: ${clientData.origin}` };
    }
    return { valid: true, credentialId: response.id };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function validateWebAuthnAuthenticationResponse(
  response: { id: string; response: { clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string } },
  expectedChallenge: string,
  expectedOrigin: string,
  publicKeyPem?: string
): { valid: boolean; userId?: string; error?: string } {
  try {
    if (!response?.response?.clientDataJSON) return { valid: false, error: "Missing payload" };
    const clientDataBuffer = Buffer.from(response.response.clientDataJSON, "base64url");
    const clientData = JSON.parse(clientDataBuffer.toString("utf8"));
    if (clientData.type !== "webauthn.get") return { valid: false, error: `Invalid assertion type: ${clientData.type}` };
    if (expectedChallenge && clientData.challenge !== expectedChallenge) return { valid: false, error: "Challenge mismatch" };

    const authDataBuffer = Buffer.from(response.response.authenticatorData, "base64url");
    if (authDataBuffer.length < 37) return { valid: false, error: "Malformed authenticatorData" };
    const userPresent = (authDataBuffer[32] & 0x01) !== 0;
    if (!userPresent) return { valid: false, error: "User present flag not set" };

    if (publicKeyPem) {
      const clientDataHash = createHash("sha256").update(clientDataBuffer).digest();
      const signedData = Buffer.concat([authDataBuffer, clientDataHash]);
      const signature = Buffer.from(response.response.signature, "base64url");
      const verifier = createVerify("SHA256");
      verifier.update(signedData);
      if (!verifier.verify(publicKeyPem, signature)) return { valid: false, error: "Signature verification failed" };
    }

    let userId: string | undefined;
    if (response.response.userHandle) {
      try { userId = Buffer.from(response.response.userHandle, "base64url").toString("utf8"); } catch { userId = response.response.userHandle; }
    }
    return { valid: true, userId };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function validateWebAuthnResponse(response: any, expectedOrigin: string) {
  if (!response) return { valid: false, error: "No response provided" };
  if (response.response?.clientDataJSON) {
    return validateWebAuthnAuthenticationResponse(response, "", expectedOrigin);
  }
  return { valid: true, userId: response.id || "verified-user" };
}
