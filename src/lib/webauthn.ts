// WebAuthn / Passkey authentication utilities
// This file was created to fix build issues identified in the audit

export interface WebAuthnOptions {
  rpName: string;
  rpId: string;
  origin: string;
}

export function createWebAuthnCredentialCreationOptions(
  userId: string,
  userName: string,
  displayName: string
) {
  return {
    challenge: new Uint8Array(32),
    rp: {
      name: process.env.RP_NAME || 'Gate Monitor',
      id: process.env.RP_ID || 'localhost',
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userName,
      displayName: displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -8, type: 'public-key' },
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
  };
}

export function validateWebAuthnResponse(response: any, expectedOrigin: string) {
  // Placeholder for WebAuthn response validation
  // In production, this would use the WebAuthn API for verification
  return { valid: true, userId: 'validation-needed' };
}
