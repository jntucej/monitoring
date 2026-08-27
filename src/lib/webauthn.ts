import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { createClient } from '@supabase/supabase-js';

const RP_NAME = process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'Gate Monitor';
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3000';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function startRegistration(userId: string, userName: string, userDisplayName?: string) {
  const { data: userCreds } = await supabase
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', userId);

  const excludeCredentials = (userCreds || []).map((c) => ({
    id: c.credential_id,
    transports: ['internal' as const],
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName,
    userDisplayName: userDisplayName || userName,
    excludeCredentials,
    supportedAlgorithmIDs: [-7, -257],
  });

  await supabase.from('webauthn_challenges').upsert({
    user_id: userId,
    challenge: options.challenge,
    type: 'registration',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return options;
}

export async function finishRegistration(userId: string, response: any) {
  const { data: challengeRow } = await supabase
    .from('webauthn_challenges')
    .select('challenge')
    .eq('user_id', userId)
    .eq('type', 'registration')
    .single();

  if (!challengeRow) throw new Error('Challenge expired or not found');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const info = verification.registrationInfo;
  const credIdB64 = typeof info.credential.id === 'string' ? info.credential.id : isoBase64URL.fromBuffer(info.credential.id);

  const { error: insertError } = await supabase.from('webauthn_credentials').insert({
    user_id: userId,
    credential_id: credIdB64,
    public_key: isoBase64URL.fromBuffer(info.credential.publicKey),
    counter: info.credential.counter,
    transports: info.credential.transports || [],
  });

  if (insertError) throw insertError;

  await supabase.from('webauthn_challenges').delete().eq('user_id', userId).eq('type', 'registration');

  return { verified: true, credentialID: credIdB64 };
}

export async function startAuthentication(userId: string) {
  const { data: creds, error } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', userId);

  if (error || !creds || creds.length === 0) {
    throw new Error('No registered biometric credentials found');
  }

  const allowCredentials = creds.map((c) => ({
    id: c.credential_id,
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'preferred',
  });

  await supabase.from('webauthn_challenges').upsert({
    user_id: userId,
    challenge: options.challenge,
    type: 'authentication',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return options;
}

export async function finishAuthentication(userId: string, response: any) {
  const { data: challengeRow } = await supabase
    .from('webauthn_challenges')
    .select('challenge')
    .eq('user_id', userId)
    .eq('type', 'authentication')
    .single();

  if (!challengeRow) throw new Error('Challenge expired or not found');

  const { data: cred } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('credential_id', response.id)
    .single();

  if (!cred) throw new Error('Credential not found');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: cred.credential_id,
      publicKey: isoBase64URL.toBuffer(cred.public_key),
      counter: cred.counter,
    },
  });

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  await supabase
    .from('webauthn_credentials')
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', cred.id);

  await supabase
    .from('webauthn_challenges')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'authentication');

  return { verified: true };
}
