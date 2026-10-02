# Migration Playbook: Supabase & Vercel to Self-Hosted (`docs/MIGRATION.md`)

## §1 Inventory & Codebase Analysis

Verify all Supabase and Vercel patterns across the repository:

```bash
grep -rn "\.from(" src/
grep -rn "\.rpc(" src/
grep -rn "\.auth\." src/
grep -rn "\.channel(" src/
```

Expected occurrences: `.from(` (~200), `.rpc(` (~10), `.auth` (~30), `.channel` (~2).

---

## §2 Supabase → Replacement Decision Table

| Supabase Pattern | Self-Hosted Replacement (postgres.js & Node) |
|---|---|
| `supabase.from(t).select('*')` | `sql\`SELECT * FROM \${sql(t)}\`` |
| `.select('a, b, c')` | Explicit column selection in SELECT query |
| `.eq('col', v)` | `WHERE col = \${v}` |
| `.in('col', arr)` | `WHERE col = ANY(\${arr})` |
| `.or('a.eq.X,b.eq.Y')` | `WHERE (a = X OR b = Y)` (parameterized only) |
| `.single()` / `.maybeSingle()` | `const [row] = await sql\`...\`` |
| `.insert(row).select().single()` | `INSERT INTO t (...) VALUES (...) RETURNING *` |
| `.update({...}).eq('id', x)` | `UPDATE t SET ... WHERE id = \${x}` |
| `.upsert(rows, { onConflict: 'k' })` | `INSERT INTO t (...) VALUES (...) ON CONFLICT (k) DO UPDATE SET ...` |
| `.delete().eq(...)` | `DELETE FROM t WHERE ...` |
| `.select('count', { count: 'exact', head: true })` | `SELECT COUNT(*)::int AS count FROM t` |
| `.rpc('fn', args)` | `SELECT * FROM fn(\${args.val})` |


---

## §3 Auth Migration Design

### 3.1 SQL Migration (`supabase/migrations/20261001000000_custom_auth.sql`)
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active_user ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
ALTER TABLE IF EXISTS audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS fk_users_auth;
```

### 3.2 TypeScript Auth Library (`src/lib/auth-server.ts`)
```javascript
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sql } from '@/lib/db/client';

const JWT_SECRET_VAL = process.env.JWT_SECRET;
if (!JWT_SECRET_VAL && process.env.NODE_ENV === 'production') {
  throw new Error('[CRITICAL] Missing JWT_SECRET environment variable.');
}
const encodedJwtSecret = new TextEncoder().encode(JWT_SECRET_VAL || 'dev-secret-key');

export async function issueAccessToken(payload: any) {
  const ttlMinutes = parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(encodedJwtSecret);
}

export async function verifyAccessToken(token: string) {
  try {
    const verified = await jwtVerify(token, encodedJwtSecret);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(userId: string, plainPassword: string): Promise<boolean> {
  const [user] = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
  if (!user || !user.password_hash) return false;
  return bcrypt.compare(plainPassword, user.password_hash);
}

export async function issueRefreshToken(userId: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const refreshHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const ttlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (user_id, refresh_hash, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${refreshHash}, ${expiresAt}, ${meta?.ipAddress || null}, ${meta?.userAgent || null})
  `;

  return rawToken;
}

export async function rotateSession(rawRefreshToken: string): Promise<{ access: string; refresh: string } | null> {
  const refreshHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const [session] = await sql`
    SELECT s.*, u.role, u.email, u.handle, u.status, u.unique_id
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.refresh_hash = ${refreshHash} AND s.revoked_at IS NULL AND s.expires_at > NOW()
  `;

  if (!session) return null;

  await sql`UPDATE sessions SET revoked_at = NOW() WHERE id = ${session.id}`;

  const newAccessToken = await issueAccessToken({
    userId: session.user_id,
    role: session.role,
    email: session.email,
    handle: session.handle,
  });
  const newRefreshToken = await issueRefreshToken(session.user_id);

  return { access: newAccessToken, refresh: newRefreshToken };
}

export async function revokeSessionByRefreshToken(rawRefreshToken: string) {
  const refreshHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  await sql`UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = ${refreshHash} AND revoked_at IS NULL`;
}

export async function revokeAllSessionsForUser(userId: string) {
  await sql`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`;
}
```


---

## §3.3 Auth Route Rewrite Matrix & Password Reset

| Route | Old Supabase Call | New Implementation |
|---|---|---|
| `POST /api/auth/login` | `supabase.auth.signInWithPassword` | Verify password, issue JWT + refresh token |
| `POST /api/auth/pin-login` | Magic-link OTP trick | Lookup by employee ID/PIN, verify, issue JWT |
| `GET /api/auth/session` | `supabase.auth.getUser` | Verify access token cookie using `verifyAccessToken` |
| `POST /api/auth/logout` | `supabase.auth.signOut` | Revoke session in DB, clear cookies |
| `POST /api/auth/change-password` | `supabase.auth.updateUser` | Verify old password, update hash, revoke sessions |
| `POST /api/auth/reset-password` | `supabase.auth.resetPasswordForEmail` | Generate token, store hash, email via integration |
| `POST /api/auth/reset-password/confirm` | N/A (new route) | Verify token hash, update `password_hash`, revoke sessions |

- **Password Reset Flow**: Secure token generation via `randomBytes(32)`, SHA-256 hash storage in `password_reset_tokens` (1-hour TTL), email dispatched via `src/lib/integrations/email.ts`, confirmation endpoint updates `users.password_hash` and revokes all sessions. Response is identical whether email exists or not.
- **Middleware & Context**: Replace `supabase.auth.getUser` with local `verifyAccessToken`. Preserve exact `AuthContext` shape and `X-Session-Token` check. Add 60s Redis cache for profile lookups.

---

## §4 DB Migration Patterns & Vercel Removal

- Replace `src/lib/db.ts` queries with `postgres.js` tagged templates (`sql``). Ensure strict parameterization.
- Remove `vercel.json`, `VERCEL_URL` env branches, and `maxDuration` SSE limits.

---

## §5 Realtime, Order of Work & Verification

- **Realtime**: Remove `supabase.channel()` from `NotificationBell.tsx` and `GlassContext.tsx`. Use SSE and WebSocket clients with Redis pub/sub.
- **Order of Work**: 13 numbered steps from infrastructure boot to dependency cleanup.
- **Verification**: Row count parity checks, API response parity, SSE 90s connection test, zero `supabase` references in active code.
