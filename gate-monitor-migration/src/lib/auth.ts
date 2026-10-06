// Authentication layer for self-hosted PostgreSQL
// Replaces Supabase Auth with direct PostgreSQL user management

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

/**
 * Auth context for managing user sessions
 */
interface AuthContext {
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

export class AuthManager {
  private db: SupabaseClient;
  
  constructor() {
    this.db = createClient(getEnv().supabaseUrl, getEnv().supabaseAnonKey);
  }
  
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthContext | null> {
    const user = await this.db.from('users').select('id', 'name', 'role', 'email', 'is_active').eq('id', getEnv().supabaseUser?.id || '');
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      isActive: user.is_active || user.status === 'ACTIVE',
    };
  }
  
  /**
   * Logout user (revoke session)
   */
  async logout(userId: string): Promise<void> {
    await this.db.from('users').update({
      handle: null,
      is_active: false,
    }).eq('id', userId);
  }
  
  /**
   * Create a new session for a user
   */
  async createSession(userId: string, role: string): Promise<AuthContext> {
    const { data } = await this.db.from('users').eq('id', userId).first();
    if (!data) throw new Error('User not found');
    
    const session = {
      id: 'session_' + Date.now(),
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
    };
    
    await this.db.from('sessions').insert(session).onConflict('user_id').ignore();
    
    return {
      id: session.id,
      user: {
        id: userId,
        name: data.name,
        role: data.role,
        email: data.email,
        is_active: true,
      },
      token: this._generateAccessToken(session.id),
    };
  }
  
  /**
   * Verify a QR token and create a session
   */
  async verifyQR(token: string): Promise<AuthContext | null> {
    const decoded = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });
    
    if (!decoded?.payload?.roll) return null;
    
    const user = await this.db.from('users').eq('id', decoded.payload.roll).first();
    if (!user) return null;
    
    return {
      id: decoded.payload.roll,
      name: user.name,
      role: user.role,
      email: user.email,
      is_active: user.is_active || user.status === 'ACTIVE',
    };
  }
  
  /**
   * Check if user is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.db.from('users').eq('id', userId).first();
    return !!user?.is_active || !!user?.status;
  }
  
  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<AuthContext | null> {
    const user = await this.db.from('users').eq('id', id).first();
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      is_active: user.is_active || user.status === 'ACTIVE',
    };
  }
  
  /**
   * Generate JWT token for user
   */
  async generateToken(userId: string, role: string): Promise<string> {
    const signingKey = getSigningKey();
    return await new SignJWT({
      payload: {
        id: userId,
        role,
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
      k: signingKey,
    }).sign(signingKey);
  }
  
  /**
   * Revoke user session
   */
  async revokeSession(userId: string): Promise<void> {
    await this.db.from('sessions').delete().eq('user_id', userId).where('expires_at', '>=', new Date());
  }
  
  /**
   * Helper: generate JWT for testing
   */
  private _generateAccessToken(userId: string, role: string): string {
    const signingKey = getSigningKey();
    return await new SignJWT({
      payload: {
        id: userId,
        role,
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      k: signingKey,
    }).sign(signingKey);
  }
}

// Export simplified versions for individual modules
export function getCurrentUser(): Promise<AuthContext | null>;
export function logout(userId: string): Promise<void>;
export function createSession(userId: string, role: string): Promise<AuthContext>;
export function verifyQR(token: string): Promise<AuthContext | null>;
export function isUserActive(userId: string): Promise<boolean>;
export function generateToken(userId: string, role: string): string;
export function revokeSession(userId: string): Promise<void>;
export function getSigningKey(): Uint8Array;
