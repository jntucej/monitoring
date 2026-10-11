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
*Maintained by: SecOps / Gate Monitor Technical Lead*
