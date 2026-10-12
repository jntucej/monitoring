# SECURITY AUDIT — Gate Monitor (authn / authz / secrets / injection)

- Repo: /root/monitoring · Live: http://localhost · Docker compose: /opt/monitoring/compose
- Date: 2026-10-12 · Read-only inspection + non-destructive live tests. No secret values printed (file:line only).
- Roles used: PRINCIPAL / OIE / VICE_PRINCIPAL / STUDENT(20JJ5A1201) / PARENT (see task brief)

## Findings log

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| F1 | **HIGH** | Secrets | `README_CREDENTIALS.md` (git-tracked) contains all 13 role passwords in plain text | Open |
| F2 | **HIGH** | Secrets | `AUTH_JWT_SECRET` == `JWT_SECRET` (same 64-hex value in both `.env` lines 37 & 41); rotation not enforced | Open |
| F3 | **MED** | Secrets | `.env` holds `SUPABASE_SERVICE_ROLE_KEY` (full JWT) on disk; not git-tracked but on the deploy host | Open |
| F4 | **HIGH** | Deps | `next@16.0.0` pinned; npm audit: 1 critical (RCE in next/og & image-opt) + 2 high | Open |
| F5 | **MED** | Deps | `sharp` (libheif/librsvg vulns) + `source-map-js` DoS — both `npm audit fix` upgradable | Open |
| F6 | **MED** | Auth | Access token is mirrored into a 2nd cookie (`session-token`, 30-day) in refresh flow — widens XSS token-theft window | Open |
| F7 | **LOW** | Injection | `src/lib/postgres.ts` `PostgresQueryBuilder` interpolates raw clauses (line 367, 494) — values still parameterised; table/column names come from internal callers, low but worth review | Open |
| F8 | **LOW** | RBAC | OIE role is in `TIER.APPROVER` yet cannot access `/api/principal/*` — verified 403 (correct); no bypass found | Verified OK |
| F9 | **LOW** | MFA | MFA gate (`MFA_REQUIRED` 403) exists in `withAuthorization`; `enforceMfa:false` only on pre-MFA enrollment endpoints — correct design | Verified OK |
| F10 | **INFO** | Auth | Login 400 (not 401) when password wrong on live app — enumeration-safe generic failure returns 401 only when user not found; check intent | Open |

---

## 1. Auth endpoints + JWT / cookie security

### Endpoints present (src/app/api/auth/)
| Endpoint | Rate-limited? | Notes |
|----------|---------------|-------|
| `login` (POST) | ✅ 100 req/15min | `withRateLimit` wraps handler (line 368) |
| `pin-login` (POST) | ✅ 10 req/15min | `src/app/api/auth/pin-login/route.ts:367` |
| `change-password` (POST) | ✅ 10 req/15min | `route.ts:138` |
| `reset-password` (POST) | ✅ 5 req/15min | `route.ts:172` |
| `verify-pin` (POST) | ✅ 15 req/15min | `route.ts:118` |
| `refresh` (POST) | ✅ 30 req/15min | `route.ts:180` |
| `logout`, `logout-all`, `session` | ✅ | all wrapped |
| `2fa/setup`, `2fa/verify`, `2fa/disable`, `2fa/disable-self`, `2fa/authenticate` | ✅ 5–10 req/min | all use `withAuthorizationPreMfa` + rate limit |
| `sso` (OIDC) | checked | see below |
| `bootstrap` | — | internal |

### JWT / cookie security (`src/lib/auth-token.ts`)
- **Signing**: HS256, `jose` SignJWT. Keyring supports rotation via `AUTH_JWT_SECRETS=kid1:secret1,kid2:secret2` (line 15–45).
- **Access token**: 1-hour expiry (line 96). **Refresh token**: 7-day in token payload, 30-day in cookie (inconsistency noted below).
- **Refresh rotation**: atomic insert-new + revoke-old in one transaction (refresh/route.ts line 114–132). Stolen refresh reuse → revokes all sessions (line 93–98).
- **bcrypt** password hashing (salt rounds = 10, line 217).
- **Cookie flags** (login/route.ts:325–338, verified live):
  - `httpOnly: true` ✅
  - `secure: process.env.NODE_ENV === "production"` — correct in prod; dev/localhost will be non-secure (expected)
  - `sameSite: "lax"` — correct for anti-CSRF cookie flow
  - **Inconsistency**: refresh flow sets `session-token` cookie with `maxAge: 30*24*3600` (refresh/route.ts:165) but also `refresh_token` with same 30-day TTL. Access token cookie is 3600 s. Refresh token *payload* expires at 7 days (auth-token.ts:122) while cookie lives 30 days — the 7-day server-side expiry is the real gate; 30-day cookie is longer than the payload TTL, meaning the client retries with a dead token for 23 extra days. Low risk but flag it.

### OIDC / SSO (`src/lib/sso.ts`, 287 lines)
- Uses `jose` for id_token verification. PKCE code challenge supported (line 249–252). Nonce validation present (line 176–177: mismatch → reject). `state` param required (line 198–208).
- **No critical gap found** in the token-verification path.
- `ALLOWED_ORIGIN` env var gates CORS (`src/lib/csrf.ts:50`, `src/lib/env.ts:69`). Confirm it is set to the exact origin in prod; an empty/misconfigured value silently falls through.

### Env secret presence (no values printed)
- `JWT_SECRET` and `AUTH_JWT_SECRET` both **present** in `/opt/monitoring/compose/.env` lines 37 & 41.
- ⚠️ **F2**: Both env vars hold the *identical* 64-hex string. If the app only uses `AUTH_JWT_SECRET` (auth-token.ts:21–22), the `JWT_SECRET` duplicate is a rotation-trap: rotating one without the other leaves a stale key silently in use. Flag: decouple or document.

---

## 2. RBAC negative tests (live, actual HTTP codes)

### Test method
```
Login (POST /api/auth/login) → extract access_token → Bearer-call endpoint
```
All tests run against http://localhost at time of audit.

| Test | Requester role | Endpoint | Expected | Actual |
|------|---------------|----------|----------|--------|
| 2a | OIE | GET `/api/principal/dashboard` | 403 | **403** ✅ |
| 2b | OIE | GET `/api/operator/stats` | 403 | **403** ✅ |
| 2c | STUDENT (20JJ5A1201) | GET `/api/principal/dashboard` | 403 | **403** ✅ |
| 2d | STUDENT | GET `/api/permissions/bulk` (POST-only) | 405/403 | **405** ✅ (method not allowed, not 403 — POST required) |
| 2e | PARENT | GET `/api/principal/dashboard` | 403 | **403** ✅ |
| 2f | PARENT | GET `/api/parents` | 403 | **403** ✅ |
| 2g | PARENT | GET `/api/students/20JJ5A1201` | 403 | **403** ✅ |
| 2h | PARENT | GET `/api/attendance_records?student_roll=20JJ5A1201` | 403 | **403** ✅ |
| 2i | No token | GET `/api/principal/dashboard` | 401 | **401** ✅ |
| 2j | PRINCIPAL | GET `/api/admin/alerts/rules` | 403 (role admin/sysadmin only) | **403** ✅ |
| 2k | OIE | GET `/api/admin/alerts/rules` | 403 | **403** ✅ |

### Role map (src/server/policy/roles.ts)
```
TIER.APPROVER  = principal, vice_principal, exam_branch, oie, hostel_manager,
                 deputy_warden, caretaker, hod, staff, supervisor
TIER.OPERATOR  = operator, principal, admin, sysadmin
TIER.ADMIN     = admin, sysadmin
TIER.SYSADMIN  = sysadmin
```
**Key check**: `oie` is in APPROVER tier but NOT in OPERATOR tier, so OIE correctly gets 403 on `/api/operator/*` and `/api/principal/*`. No bypass found.

**No-403-found-on-target-approver-endpoint**: OIE's own approver endpoint (`/api/permissions/bulk` POST) was not triggered with a POST body to keep tests non-destructive; the role list in `src/app/api/permissions/bulk/route.ts:290` confirms OIE is included there.

### Verdict
All negative RBAC tests returned the expected 401/403/405. **No privilege-escalation path found** in the tested surface.

---

## 3. TOTP / MFA

- TOTP implementation: `src/lib/totp.ts` — 6-digit, SHA1-HMAC, ±1 window (line 58), `timingSafeEqual` with length guard (line 60). Correct.
- MFA gate in `withAuthorization` (middleware/authorization.ts:125–139): if `isMfaRequiredForPrivileged()` returns true AND `isPrivileged(role)` AND `!authContext.twoFactorEnabled` → **403 MFA_REQUIRED**.
- `isPrivileged()` defined in `src/lib/roles.ts:40` — covers admin/sysadmin/operator/principal (confirm exact list before relying on it in a policy decision).
- Pre-MFA endpoints (`2fa/setup`, `2fa/verify`, `2fa/disable`, `2fa/disable-self`, `2fa/authenticate`) all use `withAuthorizationPreMfa` (enforceMfa:false) + rate limit. Enrollment stays reachable without MFA — correct.
- **Bypass check**: `enforceMfa:false` is only exposed via `withAuthorizationPreMfa`. No route in `src/app/api` calls it other than the 2fa/ and mfa/ self-service endpoints. **No bypass found.**
- Live MFA test: principal without TOTP enrolled got 403 on `/api/system/config` (FORBIDDEN, role gate — MFA gate may not be enabled in this deployment; the `MFA_REQUIRED` code was not triggered, so the DB `mfaRequiredForAdmin` flag may be false). Verify the flag value in `system_config` before claiming MFA is actively enforced.

---

## 4. Secrets hygiene (git-tracked files)

Commands: `git ls-files | xargs grep -nE …` + targeted scans.

| File | Line(s) | Issue | Severity |
|------|---------|-------|----------|
| `README_CREDENTIALS.md` | 21–33 | All 13 role passwords in plain text, tracked in git (commit 2af74e4) | **HIGH** |
| `/opt/monitoring/compose/.env` (deploy host, not in repo) | 37, 41 | `JWT_SECRET` = `AUTH_JWT_SECRET` (same value) — rotation trap | **MED** |
| `/opt/monitoring/compose/.env` | 14 | `SUPABASE_SERVICE_ROLE_KEY` (full service JWT on disk) | **MED** |
| `/opt/monitoring/compose/.env.backup` | same as .env | Backup of .env also on disk — same secrets duplicated | **MED** |
| `.env` in repo working dir | 13–14 | Supabase keys in local dev .env (not git-tracked, `.env` is gitignored) | LOW (acceptable) |
| `.env.example` | all | Correctly has empty placeholder values + comments "Do NOT use placeholder" | ✅ OK |
| `supabase/migrations/*.sql` | — | No hardcoded credentials found | ✅ OK |
| `scripts/master-backup.sh` | 57 | `password_hash IS NOT NULL` check in SQL — no plaintext password | ✅ OK |
| `README_CREDENTIALS.md` | — | **F1 — top risk: delete from git history or mark dev-only** | HIGH |

**No JWT secret, DB password, or service-role key was found in any git-tracked source file.** The only tracked plaintext credentials are the role passwords in `README_CREDENTIALS.md`.

---

## 5. Injection / CORS / rate limiting

### SQL injection — `src/lib/postgres.ts` (PostgresQueryBuilder)
- Values are parameterised throughout (`$1`, `$2`, …) in generated SQL.
- **F7 (LOW)**: Line 367 and line 494 interpolate `rawClause` strings (e.g. `${column} NOT IN (…)`) directly into SQL. These come from internal API callers passing column names — not user input directly. If any route passes a user-supplied table/column name into the builder without allowlisting it, that's a real injection vector. The admin export route (line 77) correctly allowlists tables via `ALLOWED_TABLES`. **Review**: grep for `PostgresQueryBuilder` usages that pass user-controlled identifiers.
- `src/app/api/admin/export/route.ts:96` — table name is interpolated into SQL string but is validated against `ALLOWED_TABLES` first (line 77) and column names come from `information_schema` query (parameterised). **Safe.**

### CORS
- `src/lib/csrf.ts:50` reads `ALLOWED_ORIGIN` / `ALLOWED_ORIGINS` env vars. **Confirm the value is set and matches the production origin exactly** in `/opt/monitoring/compose/.env`. An empty or wildcard value is a real risk.
- No `Access-Control-Allow-Origin: *` found in any route handler.

### Rate limiting on auth + permission endpoints
- All auth endpoints covered in §1 table. **All rate-limited.** ✅
- Permission endpoints (`/api/permissions/*`): upload (30 req), document (100 req), sign (30 req), biometric (60 req), bulk — all wrapped in `withRateLimit`. ✅
- No unrate-limited privileged POST endpoint found.

---

## 6. npm audit (prod deps, `npm audit --omit=dev`)

| Package | Version range | Severity | Count | Key advisories |
|---------|--------------|----------|-------|----------------|
| `next` | 16.0.0–16.3.7 (currently 16.0.0) | **CRITICAL** | 1 | RCE in `next/og` ImageResponse; RCE in Image Optimization (AVIF); cache poisoning SSG/ISR; SSRF in image-opt |
| `sharp` | ≤0.35.5-rc.1 | **HIGH** | 1 | libheif vulns (GHSA-g89c, GHSA-2jg2); librsvg CVE-2026-96889 |
| `source-map-js` | 1.0.0–1.2.1 | **HIGH** | 1 | Event-loop DoS via section offsets |

**Total: 3 vulnerabilities (1 critical, 2 high).**

Fix path: `npm audit fix` covers sharp + source-map-js. Next.js fix requires `npm audit fix --force` (jumps to 16.4.0, outside the lockfile range) — **test before upgrading**. No changes made in this audit.

---

## Summary — top risks (ranked)

1. **F1 (HIGH)**: `README_CREDENTIALS.md` in git history has all 13 role passwords. **Action**: remove from repo + rotate all credentials; use `git filter-repo` if history matters.
2. **F4 (HIGH)**: `next@16.0.0` has critical RCE advisories (next/og, image-opt AVIF). **Action**: upgrade to ≥16.4.0 in staging, test, then deploy.
3. **F2 (MED)**: `JWT_SECRET` and `AUTH_JWT_SECRET` are the same 64-hex value in the compose `.env`. **Action**: confirm which one the app actually reads (`AUTH_JWT_SECRET` per auth-token.ts:21), retire the duplicate, and document rotation for both.
4. **F5 (MED)**: `sharp` + `source-map-js` high-severity — one `npm audit fix` away.
5. **F6 (MED)**: Refresh cookie 30-day vs 7-day payload TTL mismatch (refresh/route.ts:165). **Action**: align cookie `maxAge` to the payload TTL (7 days) or document the intent.
6. **F3 (MED)**: Service-role JWT on the deploy host's `.env` and `.env.backup` — restrict file permissions (`chmod 600`) and remove the backup file after rotation.

## Trivial-safe fixes applied in this audit
None — all findings above require code/config changes + rebuild. No security controls were disabled.

---
*Audit complete. All live tests recorded above. Files: /root/monitoring/docs/quality/SECURITY_AUDIT.md*
