# Gate 2d — DAST (OWASP ZAP baseline scan). STAGED, NOT EXECUTED.
#
# WHY NOT RUN YET: the only reachable app is PRODUCTION (https://monitor.ucej.in);
# there is no staging environment. ZAP is an ACTIVE attack scanner — running it
# against prod risks triggering the WAF, locking accounts (rate-limit / failed-
# login lockout), and disrupting live users. Per the one-go spec, DAST runs
# against the STAGING app. This command is ready to fire the moment you approve
# it (ideally against a staging clone, or with explicit prod go-ahead).
#
# Prereqs:
#   docker pull ghcr.io/zaproxy/zaproxy:stable
#
# Baseline (spider + active scan) against the target. For this session-based
# app, ZAP must log in first to reach the role consoles — either:
#   (a) pass a cookie/headers file with a valid session, or
#   (b) use ZAP's scripted login (zap's "logins" / "authentication" context).
#
# The prompt's reference form:
#   docker run -t --rm ghcr.io/zaproxy/zaproxy:stable \
#     zap-baseline.py -t https://monitor.ucej.in -r /tmp/zap-report.html
#
# Recommended (prod-safe, minimal) — unauth surface only (public /api/health,
# login, 404s), low thread count, short timeout:
#   docker run -t --rm \
#     -e PAGER=cat \
#     ghcr.io/zaproxy/zaproxy:stable \
#     zap-baseline.py \
#       -t https://monitor.ucej.in \
#       -c 2 \
#       --max-alerts 200 \
#       -J /tmp/zap-report.json \
#       -r /tmp/zap-report.html
#
# Gate: ZAP exits non-zero when high-risk alerts are found → blocks the pipeline.
#
# EXECUTE ONLY AFTER HUMAN SIGN-OFF. Do not run against prod without approval.
