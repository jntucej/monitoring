# SECURITY AUDIT — Gate Monitor (authn / authz / secrets / injection)

- Repo: /root/monitoring · Live: http://localhost · Docker compose: /opt/monitoring/compose
- Scope: read-only inspection + non-destructive live tests. No secrets printed (file:line only).
- Status: IN PROGRESS — this file is written incrementally; each section marked as completed.

## Roles reference (for RBAC tests)
- PRINCIPAL / Principal@123
- OIE / OIE@123
- VICE_PRINCIPAL / VicePrinc@123
- STUDENT 20JJ5A1201 / Student@123
- PARENT / Parent@123

## Findings log
| # | Severity | Area | Finding |
|---|----------|------|---------|
_(filled as work progresses)_

## 1. Auth endpoints + JWT/cookie security
_PENDING_

## 2. RBAC negative tests (live)
_PENDING_

## 3. TOTP/MFA
_PENDING_

## 4. Secrets hygiene (git-tracked files)
_PENDING_

## 5. Injection / SQL / CORS / rate limiting
_PENDING_

## 6. npm audit
_PENDING_
