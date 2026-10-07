/* eslint-disable */
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let pool: Pool | null = null;

// Connection pool configuration
function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not configured');
        }
        pool = new Pool({
            connectionString,
            max: process.env.NODE_ENV === 'production' ? 20 : 10,
            min: process.env.NODE_ENV === 'production' ? 2 : 0,
            idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 30000 : 10000,
            connectionTimeoutMillis: process.env.NODE_ENV === 'production' ? 10000 : 2000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        pool.on('acquire', () => {
            // No-op: connection acquired successfully
        });
        pool.on('error', (err) => {
            console.error('[db-postgres] Pool error:', err);
        });
    }
    return pool;
}

// User operations
export async function findUserById(userId: string): Promise<any | null> {
    const result = await queryMany(`
        SELECT u.*, ed.*, sd.* 
        FROM users u
        LEFT JOIN employee_details ed ON u.id = ed.user_id
        LEFT JOIN student_details sd ON u.id = sd.user_id
        WHERE u.id = $1
    `, [userId]);
    return result[0] || null;
}

export async function findUserByEmail(email: string): Promise<any | null> {
    const result = await queryMany(`
        SELECT u.*, ed.*, sd.* 
        FROM users u
        LEFT JOIN employee_details ed ON u.id = ed.user_id
        LEFT JOIN student_details sd ON u.id = sd.user_id
        WHERE u.email = $1 AND u.status = 'ACTIVE'
    `, [email]);
    return result[0] || null;
}

export async function findUserByLoginIdentifier(loginId: string): Promise<any | null> {
    const result = await queryMany(`
        SELECT u.*, ed.*, sd.* 
        FROM users u
        LEFT JOIN employee_details ed ON u.id = ed.user_id
        LEFT JOIN student_details sd ON u.id = sd.user_id
        WHERE u.login_identifier = $1 AND u.status = 'ACTIVE'
    `, [loginId]);
    return result[0] || null;
}

export async function createUser(userData: any): Promise<any> {
    const result = await query(`
        INSERT INTO users (
            id, unique_id, name, role, email, phone, gate_id, 
            supervised_gates, assigned_hostel, can_view_gender, 
            status, auth_provider, login_identifier, pin_hash, 
            password_hash, initial_pin_hash, flag_status, created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *
    `, [
        userData.id,
        userData.uniqueId || userData.employeeId || userData.loginIdentifier || userData.email,
        userData.name,
        userData.role,
        userData.email,
        userData.phone,
        userData.gateId,
        userData.supervisedGates,
        userData.assignedHostel,
        userData.canViewGender,
        userData.status || 'ACTIVE',
        userData.authProvider || 'email',
        userData.loginIdentifier,
        userData.initialPinHash,
        userData.passwordHash,
        userData.initialPinHash,
        userData.flagStatus,
        new Date(userData.createdAt || Date.now())
    ]);
    return result;
}

// PIN verification
export async function verifyPin(employeeId: string, pin: string): Promise<boolean> {
    const user = await findUserByLoginIdentifier(employeeId);
    if (!user || !user.initial_pin_hash) return false;
    return await bcrypt.compare(pin, user.initial_pin_hash);
}

// Password operations
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await findUserById(userId);
    if (!user || !user.password_hash) return false;
    return await bcrypt.compare(password, user.password_hash);
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
}

export async function updatePasswordHash(userId: string, hashedPassword: string): Promise<void> {
    await query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [hashedPassword, userId]
    );
}

// Session management - application-owned
export interface SessionRecord {
    user_id: string;
    session_token: string;
    refresh_token: string | null;
    expires_at: Date;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export async function createSession(session: SessionRecord): Promise<void> {
    await query(`
        INSERT INTO sessions (user_id, session_token, refresh_token, expires_at, created_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
        session.user_id,
        session.session_token,
        session.refresh_token,
        session.expires_at,
        session.created_at,
        session.ip_address,
        session.user_agent
    ]);
}

export async function invalidateSessionByToken(sessionToken: string): Promise<void> {
    await query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [sessionToken]
    );
}

export async function invalidateSessions(userId: string): Promise<void> {
    await query(`
        DELETE FROM sessions WHERE user_id = $1
    `, [userId]);
}

export async function getSessionByRefreshToken(refreshToken: string): Promise<any | null> {
    const { rows } = await query(
        `SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()`,
        [refreshToken]
    );
    return rows[0] || null;
}

export async function invalidateSessionByToken(sessionToken: string): Promise<void> {
    await query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [sessionToken]
    );
}

// Rate limiting with Redis fallback
export async function checkRateLimitRedis(key: string, maxRequests: number, windowMs: number): Promise<{ limited: boolean; remaining: number; resetTime: Date }> {
    // This will be implemented with Redis later - for now fallback to in-memory
    return checkRateLimitFallback(key, maxRequests, windowMs);
}

function checkRateLimitFallback(key: string, maxRequests: number, windowMs: number): { limited: boolean; remaining: number; resetTime: Date } {
    // Simple in-memory store as fallback
    const store: { [key: string]: { count: number; resetTime: number } } = {};
    const storeKey = `rate_limit_${key}`;
    const now = Date.now();
    
    // Clean expired entries
    Object.keys(store).forEach(k => {
        if (store[k].resetTime < now) {
            delete store[k];
        }
    });
    
    if (!store[storeKey]) {
        store[storeKey] = { count: 1, resetTime: now + windowMs };
        return { limited: false, remaining: maxRequests - 1, resetTime: new Date(now + windowMs) };
    }
    
    store[storeKey].count++;
    
    if (store[storeKey].count > maxRequests) {
        return {
            limited: true,
            remaining: 0,
            resetTime: new Date(store[storeKey].resetTime)
        };
    }
    
    return {
        limited: false,
        remaining: maxRequests - store[storeKey].count,
        resetTime: new Date(store[storeKey].resetTime)
    };
}

// Close pool on shutdown
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
