// Authentication layer for self-hosted PostgreSQL
// Replaces Supabase Auth with direct PostgreSQL user management + JWT

import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from './env';
import { query, withTransaction, getPool } from './db';

/**
 * Auth context for managing user sessions
 */
export interface AuthContext {
  user?: {
    id: string;
    name: string;
    role: string;
    email: string;
    isActive: boolean;
  };
  token?: string;
  refreshToken?: string;
}

/**
 * Get signing key from environment
 */
function getSigningKey(): Uint8Array {
  const secret = getEnv().jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Get a PostgreSQL pool client for queries
 */
async function getClient(): Promise<PoolClient> {
  return (getPool() as any).connect();
}

/**
 * Get current authenticated user from JWT token
 */
export async function getCurrentUser(token: string): Promise<AuthContext | null> {
  try {
    const signingKey = getSigningKey();
    const { payload } = await jwtVerify(token, signingKey, {
      algorithms: ['HS256'],
    });

    const userId = payload?.id as string;
    if (!userId) return null;

    const client = await getClient();
    try {
      const { rows } = await client.query(
        'SELECT id, name, role, email, status FROM users WHERE id = $1',
        [userId]
      );
      if (!rows[0]) return null;

      return {
        id: rows[0].id,
        name: rows[0].name,
        role: rows[0].role,
        email: rows[0].email,
        isActive: rows[0].status === 'ACTIVE',
      };
    } finally {
      client.release();
    }
  } catch {
    return null;
  }
}

/**
 * Logout user (revoke session)
 */
export async function logout(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('UPDATE users SET handle = NULL WHERE id = $1', [userId]);
  } finally {
    client.release();
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string, role: string): Promise<AuthContext> {
  const client = await getClient();
  try {
    const { rows: users } = await client.query(
      'SELECT id, name, email, status FROM users WHERE id = $1',
      [userId]
    );
    if (!users[0]) throw new Error('User not found');

    const sessionToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000); // 1 hour

    await client.query(
      'INSERT INTO sessions (id, user_id, role, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [sessionToken, userId, role, now, expiresAt]
    );

    await client.query('UPDATE users SET handle = $1 WHERE id = $2', [sessionToken, userId]);

    const signingKey = getSigningKey();
    const token = await new SignJWT({ id: userId, role, purpose: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(signingKey);

    return {
      id: sessionToken,
      user: {
        id: userId,
        name: users[0].name,
        role,
        email: users[0].email,
        isActive: true,
      },
      token,
    };
  } finally {
    client.release();
  }
}

/**
 * Verify a QR token and create a session
 */
export async function verifyQR(token: string): Promise<AuthContext | null> {
  try {
    const signingKey = getSigningKey();
    const { payload } = await jwtVerify(token, signingKey, {
      algorithms: ['HS256'],
    });

    const userId = payload?.id as string;
    if (!userId) return null;

    const client = await getClient();
    try {
      const { rows } = await client.query(
        'SELECT id, name, role, email, status FROM users WHERE id = $1',
        [userId]
      );
      if (!rows[0]) return null;

      return {
        id: rows[0].id,
        name: rows[0].name,
        role: rows[0].role,
        email: rows[0].email,
        isActive: rows[0].status === 'ACTIVE',
      };
    } finally {
      client.release();
    }
  } catch {
    return null;
  }
}

/**
 * Check if user is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const client = await getClient();
  try {
    const { rows } = await client.query(
      'SELECT status FROM users WHERE id = $1',
      [userId]
    );
    return !!rows[0]?.status === 'ACTIVE';
  } finally {
    client.release();
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AuthContext | null> {
  const client = await getClient();
  try {
    const { rows } = await client.query(
      'SELECT id, name, role, email, status FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) return null;

    return {
      id: rows[0].id,
      name: rows[0].name,
      role: rows[0].role,
      email: rows[0].email,
      isActive: rows[0].status === 'ACTIVE',
    };
  } finally {
    client.release();
  }
}

/**
 * Generate JWT token for user
 */
export async function generateToken(userId: string, role: string): Promise<string> {
  const signingKey = getSigningKey();
  return await new SignJWT({ id: userId, role, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(signingKey);
}

/**
 * Revoke user session
 */
export async function revokeSession(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  } finally {
    client.release();
  }
}
