# Release Readiness Gate — Go/No-Go Sign-off

**Release commit:** `985c30db` (main) · **Date:** 2026-11-15 · **App:** JNTUH UCEJ Gate Monitor
**Target:** https://monitor.ucej.in (production; **no staging environment exists**)

This is the aggregated go/no-go from the one-go full-build validation. Tier-1
failures are hard blocks; Tier-2 may pass or carry a documented WARN.

## Per-gate status

| Gate | Dimension | Tier | Status | Evidence |
|---|---|---|---|---|
| G1 | Performance / Load (k6) | 2 | **DEFERRED (prod)** | `load/k6-gate.mjs` written (200 VU peak, thresholds in-script: p95<500ms, err<1%, checks>95%). NOT executed — hitting prod requires human sign-off. No staging to run against. |
| G2a | Security — Secrets (gitleaks) | 1 | **PASS (WARN)** | 21 findings, all benign: Supabase **anon** key (public-by-design) in git history, CI dummy secrets, test fixtures, gitignored `repomix-output*`. **No live secret in the working tree or unrecovered history.** gitleaks exit 1 only because of history artifacts; add an allowlist to make CI clean. |
| G2b | Security — SCA (trivy) | 1 | **PASS** | Was 18 HIGH/CRITICAL (next RCE/DoS, nodemailer SSRF/DoS, source-map-js). Fixed: **next 16.3.8→16.4.1, nodemailer 6→10.5.0, source-map-js override→1.2.2**. `trivy fs package-lock.json` now reports **0 HIGH/CRITICAL, exit 0.** |
| G2c | Security — SAST (semgrep) | 1 | **PENDING** | semgrep installing (large native binary). Will block until it runs clean on `src/`. |
| G2d | Security — DAST (ZAP) | 1 | **DEFERRED (prod)** | `security/zap-gate.md` staged the exact command. NOT run — active attack scanner against prod = WAF/lockout risk. Needs a staging target or explicit prod go-ahead. |
| G3 | UI/UX + a11y (Playwright + axe) | 2 | **PASS (visual-reg inconclusive)** | axe-core: **9/9 public pages, 0 critical/serious violations** (both themes). Visual regression: functional journey tests pass, but the 11 screenshot baselines were captured **pre-change (2026-11-04)** and the spec's `request`-API login doesn't share cookies with the screenshot `page` against prod → captures the login page, not the console. **Not a UI defect; do not regenerate baselines from this.** |
| G4 | Functional + Integration | 1 | **PASS** | vitest **12/12**, Jest gate **150/150**, `test:ci` **19/19** static checks, migration up **PASS**, migration **rollback PASS** (simulated break → guardrail kept old image, site stayed 200, reverted clean), post-deploy smoke **PASS** (health 200/0.27s, root boots, admin login 200). |
| G5 | Release Readiness (aggregated) | 1 | **see below** | Tier-1: G2a PASS, G2b PASS, G4 PASS, G5-ops PASS. G2c (SAST) PENDING. G1+G2d DEFERRED to human. |
| G6 | Human Sign-Off | — | **PENDING** | Evidence package assembled (this doc). A named human must approve commit `985c30db`. |

## Tier-1 blocking items (must be PASS to ship)
- [x] **SCA (trivy)** — 0 HIGH/CRITICAL ✅
- [x] **Secrets (gitleaks)** — no live secrets ✅ (WARN: add allowlist for CI)
- [x] **DB migration up/rollback/idempotency** — green ✅
- [x] **Operational readiness** — rollback procedure exists (`scripts/test-rollback.sh`, auto-heal `deploy.yml`), alerting configured (OpsGenie/PagerDuty no-op documented), monitoring stack live ✅
- [ ] **SAST (semgrep)** — **PENDING** (installer running)
- [x] **Production smoke** — ✅ (health + boot + login all 200)

## Tier-2 documented WARNs
- **G1 Load:** not executed against prod (no staging). Risk: unknown headroom at 200 VU. **Owner:** release engineer. **Mitigation:** run `k6 run load/k6-gate.mjs` in a low-traffic window after sign-off, or stand up a staging clone.
- **G2d DAST:** not executed against prod (active scanner). **Owner:** security. **Mitigation:** point ZAP at a staging clone or approve a scoped prod scan (public surface only, low thread count, per `security/zap-gate.md`).
- **Visual regression:** baseline/spec cookie gap against prod — inconclusive, not a defect. **Owner:** QA. **Mitigation:** run the screenshot suite in CI (where the spec's webServer shares the session), not against prod.
- **nodemailer:** bumped 6→10 (major). Current usage (`createTransport`+`sendMail`, no `raw`) is API-compatible; tsc + build clean. **Owner:** release engineer. **Mitigation:** smoke the email alert path post-deploy.

## Go/No-Go
**Decision: CONDITIONAL GO** — Tier-1 SCA + secrets + migration + ops + smoke are green.
**Two Tier-1 items remain:** (1) semgrep SAST must run clean; (2) the human must approve the
two deferred prod-touching gates (k6 load, ZAP DAST) — either by running them now under
supervision, accepting documented risk, or providing a staging target.

**No deploy / merge / sign-off happens until the human applies the `human-gate: approved`
label to commit `985c30db`.**
