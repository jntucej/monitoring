# Security Checklist - Harbor System

A mandatory checklist for incoming PRs and architecture reviews to ensure Gate Monitor compliance and security hardening.

## 1. Authentication & Session Security
- [ ] **MFA Hardening:** Is `MFA_REQUIRED_FOR_ADMIN` enforced? Are recovery codes stored correctly (hashed, single-use)?
- [ ] **Token Management:** Are `refreshToken` and `accessToken` handled atomically? No reuse detection false positives?
- [ ] **PIN Security:** Is rate limiting/lockout enforced consistently? No timing attacks?
- [ ] **Session Versioning:** Does `logout-all` update `session_version` AND revoke DB sessions?

## 2. API Security
- [ ] **Data Scoping:** Do all GET/POST requests validate ownership/RBAC? (Check for IDOR).
- [ ] **Mass Assignment:** Are `Req.body` structures whitelisted? No implicit `Object.assign`?
- [ ] **SQL Injection:** Are all inputs parameterized? No `${templateLiteral}` SQL?
- [ ] **Rate Limiting:** Is the endpoint rate-limited according to its load? Are limits distributed (Redis)?

## 3. Database & Migration Integrity
- [ ] **Migration Idempotency:** Are all migrations prefixed with unique, chronological timestamps? Are they wrapped in BEGIN/COMMIT?
- [ ] **Unique Constraints:** Are identifiers (email, handle, roll) case-insensitive protected (`UNIQUE LOWER(field)`)?
- [ ] **PII Inventory:** Is all PII identified, documented, and properly handled?

## 4. Front-End / Infrastructure
- [ ] **State Storage:** Is `localStorage` holding sensitive tokens/challenges? (Exclude from `persist`).
- [ ] **CSP/Headers:** Are security headers (CSP, COOP, COEP, CORP) enabled and configured for path-specific needs?
- [ ] **Performance:** Are debouncing/throttling used for API-calling inputs? Are stats/charts paginated/capped?
- [ ] **CI/CD:** Are `npm ci` and `--frozen-lockfile` enforced? Are traces/artifacts enabled for e2e tests?

## 5. Compliance
- [ ] **Audit Logs:** Does every state-changing route log the actor, action, and outcome (including failures)?
- [ ] **Data Export:** Are exports filtered for the caller's scope? Are formulas in CSVs escaped?

---

## 6. Entity & Agent Controls (added 2026-11)
- [ ] **Entity scope:** Does every new route filter by `auth.departmentId` / `hostel_block` / entity scope, or by `public.delegations` TTL where a role is delegated?
- [ ] **Two-person rule:** Do high-impact flags (DEBARRED/SUSPENDED, sysadmin grants, mess contractor escalation) park in `pending_approvals` with the maker ≠ checker constraint (DB `maker_ne_checker` CHECK)?
- [ ] **Agent audit:** Do agent actions write `audit_events` with `actor_type='agent'` and the role context of the boundary they run inside?
- [ ] **Delegation TTL:** Does every delegation carry `starts_at`/`expires_at`/`revoked_at`, no-self-delegation, and does `withAuthorization` fall back to it only when the native role is absent?
- [ ] **Leave chain:** Are hostel gate passes gated on `leave_requests.status = 'GATE_ISSUED'` (warden + parent both done)?
- [ ] **RLS drift:** Is the nightly `pg_policies` diff (`/api/sysadmin/rls/drift`) checked, and do new tables that `gate_app` can read have RLS enabled with no `USING (true)` policies?
- [ ] **Bot surface:** Do OPERATOR/APPROVER-tier mutations via the Telegram bot require step-up (device-bound) confirmation, and are anomalous-velocity sessions auto-suspended (`/api/sysadmin/bot/anomaly`)?

## 7. Hardening Chain Controls (U3–U8.1, deployed 2026-11-26)
- [x] **Middleware order (`withApiChain`):** Authenticated routes run `withAuthorization` before `withRateLimit` (user-scoped buckets); 0 inverted `withRateLimit(withAuthorization)` sites across 798 API route files.
- [x] **Error normalization (U3):** `src/lib/api-error-handler.ts` maps pg SQLSTATEs and never leaks raw SQL/stack/secrets in 500 responses.
- [x] **Rate limiting (U4):** Atomic Redis Lua `INCR+PEXPIRE` via `EVALSHA` with `NOSCRIPT` recovery and `src/lib/rate-limit-policies.ts`.
- [x] **Body validation & size limits (U5/U8/U8.1):** `validateBody` (Zod) + Edge `Content-Length` fast-reject + `setupBodyCaching` streamed byte limits (`1 MB` JSON / `25 MB` multipart → `413 PAYLOAD_TOO_LARGE`).
- [x] **Structured logging & correlation (U6/U8):** Single `http.request` JSON line per request, `sanitizeEdgeRequestId`, internal `x-auth-*`/`x-u6-*` headers stripped before response.

*Cross-references: `docs/ROLE_OPERATIONS.md` (the full route→role map),
`docs/IMPLEMENTATION_BLUEPRINT.md` (build status), `docs/AUTONOMOUS_OPERATIONS.md` (threat model + control loops).*

*Maintained by: SecOps / Gate Monitor Technical Lead*