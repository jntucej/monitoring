# Password / PIN Change Mechanism — End-to-End

Reference note for the credential flows in this repo. Last verified against
`src/app/api/users/[id]/route.ts`, `src/app/api/auth/*`, and
`src/lib/authContext.ts` on 2026-10-12.

## 1. Where credentials live

The `users` table (Postgres, Supabase) stores two independent credential
columns:

| Column           | Hashing        | Used for                              |
| ---------------- | -------------- | ------------------------------------- |
| `password_hash`  | bcrypt (cost 10) via `hashPassword` in `src/lib/auth-token.ts` (bcryptjs) | `/api/auth/login` (identifier + password) |
| `pin_hash`       | bcrypt (cost 10) — **NOT PBKDF2** in current code | Kiosk PIN entry (`/api/auth/pin-login`, `/api/auth/verify-pin`) |
| `initial_pin_hash` | bcrypt      | Kiosk fallback PIN (set at enrollment / bootstrap) |
| `session_version`| int, default 0 | **Session invalidation primitive** — embedded in every issued JWT |

The hashing helpers all live in `src/server/lib/crypto.ts` (bcryptjs wrappers)
and `src/lib/auth-token.ts` (`hashPassword` / `verifyPassword`, bcrypt cost 10).

> Note: earlier documentation described scrypt for passwords and PBKDF2 for
> PINs; the repo has no scrypt or PBKDF2 usage anywhere. All credential
> hashing is bcrypt.

## 2. Web login (password)

`POST /api/auth/login` (`src/app/api/auth/login/route.ts`):

1. Look up user by `unique_id` / `email` / `login_identifier` / `handle`.
2. Global + per-user lockout checks (`login-lockout.ts`, `locked_until`).
3. Verify `password_hash` with constant-time bcrypt compare; unknown users pay
   a dummy-hash verify to prevent timing-based enumeration.
4. MFA branch: if 2FA is enabled (or mandatory for privileged roles), a short
  -lived TOTP challenge is issued and must be verified (or a recovery code
   consumed) before tokens are issued.
5. On success: signs **access token (1 h)** and **refresh token (7 d)** with
   HS256 (`jose`, key ring from `AUTH_JWT_SECRETS`), both embedding the
   user's current `session_version` in the JWT payload. Cookies are
   `httpOnly`, `SameSite=Lax` (`secure` in production).

## 3. Kiosk PIN login

`POST /api/auth/pin-login` (`src/app/api/auth/pin-login/route.ts`):

- Restricted to non-privileged roles (`operator`, `staff`, `worker`,
  `faculty`) — privileged roles can **never** authenticate via PIN.
- Verifies the presented PIN against `pin_hash` first, then
  `initial_pin_hash` (kiosk bootstrap fallback). Never against
  `password_hash`.
- Same lockout bookkeeping, same MFA gate, same JWT issuance with
  `session_version` embedded.

`/api/auth/verify-pin` is the authorized "check this user's PIN" variant
used by operators on the dashboard; kiosk hardware typically hits
`pin-login`.

## 4. Enrollment / bootstrap flow (one-time codes)

`POST /api/admin/users/[id]/enrollment-code`
(`src/app/api/admin/users/[id]/enrollment-code/route.ts`):

- Sysadmin/admin issues a one-time 8-char code (`web_bootstrap` / `mobile` /
  `pin_reset`; TTL 24 h except `mobile` = 15 min).
- The code is **bcrypt-hashed** and stored in `enrollment_codes`
  (`code_hash`, `expires_at`, `purpose`, `used_at`); issuing a new code
  burns any unused previous code with the same purpose.

`/bootstrap` page (`src/app/bootstrap/page.tsx`) →
`POST /api/auth/bootstrap` (`src/app/api/auth/bootstrap/route.ts`):

- Student enters their `unique_id` + code + new password (≥ 8 chars) + PIN
  (4–8 digits).
- Server finds the user, requires `status = ACTIVE` and
  `onboarded_at = NULL`, loads the newest unused unexpired
  `web_bootstrap` code, bcrypt-compares, and atomically burns it
  (`used_at` set only while still NULL).
- Persists `password_hash`, `pin_hash`, `initial_pin_hash`,
  `pin_must_change = false`, `onboarded_at = NOW()`, and **bumps
  `session_version`**. Then redirects to `/login`.
- Rate-limited: 5 attempts / 15 min per user.

## 5. Password / PIN change & reset paths

| Path | Who | What happens to sessions |
| ---- | --- | ------------------------ |
| `POST /api/auth/change-password` | self | Bumps `session_version` **in the same UPDATE** as the new hash, revokes `sessions` rows, evicts the auth cache, audits `PASSWORD_CHANGED`. Self is asked to re-login. |
| `POST /api/auth/pin-change` | self | Analogous PIN rotation. |
| `POST /api/auth/reset-password` | email token flow | 1 h JWT `password_reset` token + single-use row in `password_reset_tokens`; on apply: new hash + `session_version` bump + `sessions` revocation. |
| `PATCH /api/users/[id]` (admin/sysadmin reset) | sysadmin/admin | **Before this fix: did NOT bump `session_version` and did NOT revoke `sessions`** — the target's existing JWTs stayed valid until natural expiry. Now fixed (see §6). |
| `POST /api/auth/logout-all` | self | Bumps `session_version`, revokes all `sessions` rows, evicts cache, clears cookies. |

## 6. How session invalidation actually works

- Every issued access/refresh token carries the user's `session_version` at
  login time (`src/lib/auth-token.ts`).
- `createAuthContext` (`src/lib/authContext.ts`) re-loads the user row on
  every request (30 s in-memory cache) and **compares the token's
  `session_version` against the live DB value** — a mismatch throws
  `UNAUTHORIZED: Session invalidated`.
- So the universal "kill all sessions for user X" primitive is:
  1. `UPDATE users SET session_version = session_version + 1 WHERE id = X`
  2. `UPDATE sessions SET revoked_at = NOW() WHERE user_id = X AND revoked_at IS NULL`
  3. `invalidateAuthCache(X)` (so the 30 s row cache doesn't delay enforcement)

### The PATCH /api/users/[id] fix (applied)

When `body.password` and/or `body.pin` are present, the route now:

1. Sets `profileUpdates.session_version = (target.session_version ?? 0) + 1`
   in the same `users` update that writes the new hashes — atomic, so there
   is no window where the new password is set but old sessions survive.
2. After the update: revokes `sessions` rows for that user (`revoked_at`
   stamp; best-effort with `.catch()` since some deployments have no rows
   there — `session_version` alone already invalidates all JWTs) and evicts
   the auth cache.
3. Audit entry now carries `sessions_revoked: true` for credential changes.

Net effect: when a sysadmin resets a student's password or kiosk PIN from
the Students page (lock icon → `handleResetPassword` → `PATCH
/api/users/[id] { password }`, or the Edit modal's optional
*Reset Password* / *Reset Kiosk PIN* fields → `{ password, pin }`), every
pre-existing web session and kiosk session for that student is revoked
immediately; the next authenticated request from that user fails with
`UNAUTHORIZED: Session invalidated` and they must log in again with the new
credentials. The failed kiosk-PIN rate-limit counters
(`pin_login_attempts`) are cleared alongside, so a reset doesn't inherit a
stale lockout.

## 7. Related state touched on credential change

- `failed_login_count` / `locked_until` — zeroed/cleared on any password
  update (so a reset also unlocks).
- `pin_must_change` / `pin_set_at` / `pin_set_by` — set when an admin
  assigns a PIN.
- `pin_login_attempts` — rows deleted for all known identifiers
  (unique_id, email, login_identifier) on password/PIN/unlock writes.
- `sessions` — rows revoked (`revoked_at`) on any credential change.
