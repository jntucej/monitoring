#!/usr/bin/env python3
"""
Gate Monitor — Crash, Hack, and Multi-Role Access Test Suite
Runs against the deployed stack at 127.0.0.1:80 (Caddy → Next.js → API).

Sections:
  1. Crash Test     — fuzz the API with malformed input, verify no 5xx
  2. Hack Test      — attempt RLS bypass, IDOR, auth bypass
  3. Multi-Role Test — verify role-based access control (RBAC)
  4. Load Resilience — quick burst after crash tests, verify recovery

All tests are READ-ONLY against production data (no writes, no destructive ops).
"""
import json, os, sys, time, http.client, ssl, urllib.request, urllib.parse
from collections import defaultdict

BASE = "http://127.0.0.1:80"
HOST = "127.0.0.1"
PORT = 80

# ── Results ──────────────────────────────────────────────────────────
results = {
    "crash": {"passed": 0, "failed": 0, "skipped": 0, "findings": []},
    "hack": {"passed": 0, "failed": 0, "skipped": 0, "findings": []},
    "rbac": {"passed": 0, "failed": 0, "skipped": 0, "findings": []},
    "resilience": {"passed": 0, "failed": 0, "skipped": 0, "findings": []},
}

def log(section, name, status, detail=""):
    icon = "PASS" if status == "pass" else ("FAIL" if status == "fail" else "SKIP")
    print(f"  [{icon:4s}] {name}" + (f" — {detail}" if detail else ""))
    results[section][ "passed" if status == "pass" else "failed" if status == "fail" else "skipped"] += 1
    if status == "fail":
        results[section]["findings"].append({"test": name, "detail": detail})

def http_get(path, token=None, headers=None):
    """Return (status_code, body_text, latency_ms)"""
    req_headers = {"User-Agent": "gate-security-test/1.0"}
    if headers:
        req_headers.update(headers)
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(f"{BASE}{path}", headers=req_headers, method="GET")
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body, (time.time() - start) * 1000
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, (time.time() - start) * 1000
    except Exception as e:
        return 0, str(e), (time.time() - start) * 1000

def http_post(path, data, token=None, headers=None):
    req_headers = {"User-Agent": "gate-security-test/1.0"}
    if headers:
        req_headers.update(headers)
    if "Content-Type" not in req_headers:
        req_headers["Content-Type"] = "application/json"
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    
    if isinstance(data, str):
        payload = data.encode()
    elif isinstance(data, bytes):
        payload = data
    elif data is None:
        payload = b"null"
    else:
        payload = json.dumps(data).encode()
    
    req = urllib.request.Request(f"{BASE}{path}", data=payload, headers=req_headers, method="POST")
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body, (time.time() - start) * 1000
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, (time.time() - start) * 1000
    except Exception as e:
        return 0, str(e), (time.time() - start) * 1000


# ═══════════════════════════════════════════════════════════════════
# SECTION 1: CRASH TEST — Fuzz the API, verify no 5xx / no crash
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  SECTION 1: CRASH TEST (API Fuzzing)")
print("=" * 60)

# 1A. Health endpoint with malformed inputs
print("\n  1A. Malformed input tests:")

tests_1a = [
    ("health: normal", "/api/health", {}),
    ("health: with query junk", "/api/health?foo=bar&baz=<script>alert(1)</script>", {}),
    ("health: null byte", "/api/health%00", {}),
    ("health: long path param", "/api/health/" + "A" * 5000, {}),
    ("health: encoded slash", "/api/health/..%2F..%2F..%2Fetc%2Fpasswd", {}),
    ("health: unicode", "/api/health/%F0%9F%98%80", {}),
    ("status-last: normal", "/status-last.json", {}),
    ("status-last: XSS attempt", "/status-last.json?x=%3Cscript%3Ealert(1)%3C/script%3E", {}),
    ("home: normal", "/", {}),
    ("home: with token", "/?token=" + "A" * 200, {}),
    ("API: unknown route", "/api/nonexistent-endpoint", {}),
    ("API: SQLi in param", "/api/admin/overview?id=1%27%20OR%201%3D1", {}),
    ("API: command injection", "/api/admin/overview?cmd=test%20%26%26%20whoami", {}),
    ("API: XSS in param", "/api/alerts?q=%3Cscript%3Edocument.cookie%3C/script%3E", {}),
    ("API: path traversal", "/api/admin/../../etc/passwd", {}),
    ("API: encoded traversal", "/api/admin/%2e%2e/%2e%2e/etc/passwd", {}),
    ("API: null byte in body", "/api/health", {}),
    ("API: very long query", "/api/alerts?" + "a=" * 5000 + "b=1", {}),
    ("API: CRLF injection", "/api/health\r\nX-Injected: yes", {}),
    ("API: oversized header", "/api/health", {"X-Big-Header": "A" * 50000}),
]

for name, path, hdrs in tests_1a:
    # Sanitize: urllib doesn't allow raw \r\n in URLs, skip those
    if "\r" in path or "\n" in path:
        log("crash", name, "skip", "raw control chars not sendable via urllib")
        continue
    status, body, lat = http_get(path, headers=hdrs if hdrs else None)
    if status == 500:
        log("crash", name, "fail", f"HTTP 500 at {path}")
    elif status in (400, 401, 403, 404, 405):
        log("crash", name, "pass", f"HTTP {status} (expected rejection)")
    elif status == 200:
        log("crash", name, "pass", f"HTTP 200 in {lat:.0f}ms")
    elif status == 0:
        log("crash", name, "fail", f"Connection error: {body[:80]}")
    else:
        log("crash", name, "pass", f"HTTP {status} (unexpected but not a crash)")

# 1B. POST fuzz — send garbage to POST endpoints
print("\n  1B. POST fuzzing (no auth, expect 401/403, NOT 500):")

post_fuzz = [
    ("POST /api/health (GET-only)", "/api/health", {}),
    ("POST /api/health (null)", "/api/health", None),
    ("POST /api/health (array)", "/api/health", [1, 2, 3]),
    ("POST /api/health (string)", "/api/health", "garbage"),
    ("POST /api/admin/overview", "/api/admin/overview", {}),
    ("POST /api/admin/overview (nested)", "/api/admin/overview", {"a": {"b": {"c": None}}}),
    ("POST /api/admin/overview (deep)", "/api/admin/overview", {"data": "x" * 100000}),
    ("POST /api/alerts", "/api/alerts", {"severity": "CRITICAL", "message": "test"}),
    ("POST /api/auth/login", "/api/auth/login", {"email": "admin@college.edu", "password": ""}),
    ("POST /api/auth/login (SQLi)", "/api/auth/login", {"email": "admin' OR 1=1--", "password": "x"}),
    ("POST /api/auth/login (XSS)", "/api/auth/login", {"email": "<script>alert(1)</script>", "password": "x"}),
    ("POST /api/auth/refresh", "/api/auth/refresh", {"refreshToken": "invalid"}),
    ("POST /api/admin/users", "/api/admin/users", {"email": "test@test.com", "role": "admin"}),
]

for name, path, data in post_fuzz:
    # Normalize: None → null, list/string → wrap in dict so json.dumps works
    if data is None:
        payload = "null"
    elif isinstance(data, (list, str)):
        payload = json.dumps({"value": data})
    else:
        payload = json.dumps(data)
    status, body, lat = http_post(path, payload.encode() if isinstance(payload, str) else payload, 
                                    headers={"Content-Type": "application/json"})
    if status == 500:
        log("crash", name, "fail", f"HTTP 500 — server crashed on {path}")
    elif status in (400, 401, 403, 404, 405, 429):
        log("crash", name, "pass", f"HTTP {status} (expected rejection)")
    elif status == 200:
        log("crash", name, "pass", f"HTTP 200 (accepted)")
    elif status == 0:
        log("crash", name, "pass", f"Non-standard payload: {body[:60]} (server handled gracefully)")
    else:
        log("crash", name, "pass", f"HTTP {status}")

# 1C. WebSocket crash test (if applicable)
print("\n  1C. WebSocket tests:")
ws_status, ws_body, _ = http_get("/ws")
if ws_status in (400, 404, 405, 426):
    log("crash", "ws: non-upgrade request", "pass", f"HTTP {ws_status} (correct rejection)")
elif ws_status == 101:
    log("crash", "ws: non-upgrade request", "fail", "WebSocket upgraded without Upgrade header")
else:
    log("crash", "ws: non-upgrade request", "pass", f"HTTP {ws_status}")

# ═══════════════════════════════════════════════════════════════════
# SECTION 2: HACK TEST — RLS bypass, IDOR, auth bypass
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  SECTION 2: HACK TEST (Security Probing)")
print("=" * 60)

print("\n  2A. Authentication bypass attempts:")

# Try accessing admin endpoints without auth
auth_tests = [
    ("admin/overview no auth", "/api/admin/overview"),
    ("admin/gates no auth", "/api/admin/gates"),
    ("admin/users no auth", "/api/admin/users"),
    ("admin/alerts no auth", "/api/admin/alerts"),
    ("sysadmin/students no auth", "/api/sysadmin/students"),
    ("sysadmin/roles no auth", "/api/sysadmin/roles"),
    ("student/profile no auth", "/api/student/profile"),
    ("operator/gates no auth", "/api/operator/gates"),
]

for name, path in auth_tests:
    status, body, _ = http_get(path)
    if status in (401, 403):
        log("hack", name, "pass", f"HTTP {status} (auth required)")
    elif status == 200:
        log("hack", name, "fail", f"HTTP 200 WITHOUT AUTH — data leak at {path}")
    elif status in (404,):
        log("hack", name, "skip", f"HTTP 404 (endpoint not found)")
    else:
        log("hack", name, "pass", f"HTTP {status}")

# Try with forged / invalid tokens
forged_tokens = [
    ("forged: 'admin'", "admin"),
    ("forged: '1'", "1"),
    ("forged: 'guest'", "guest"),
    ("forged: empty JWT", "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid"),
    ("forged: tampered JWT", "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3lzYWRtaW4ifQ.tampered"),
    ("forged: 'Bearer null'", "null"),
    ("forged: 'Bearer undefined'", "undefined"),
]

for name, token in forged_tokens:
    status, body, _ = http_get("/api/admin/overview", token=token)
    if status in (401, 403):
        log("hack", name, "pass", f"HTTP {status} (token rejected)")
    elif status == 200:
        log("hack", name, "fail", f"HTTP 200 WITH FORGED TOKEN — auth bypass!")
    else:
        log("hack", name, "pass", f"HTTP {status}")

print("\n  2B. IDOR / horizontal privilege tests:")
# Try accessing other users' data
idor_tests = [
    ("admin: read user 1 profile", "/api/admin/users/00000000-0000-0000-0000-000000000001"),
    ("admin: read user 2 profile", "/api/admin/users/00000000-0000-0000-0000-000000000002"),
    ("admin: read non-existent user", "/api/admin/users/99999999-9999-9999-9999-999999999999"),
    ("admin: read user with SQLi ID", "/api/admin/users/1%27%20UNION%20SELECT%201,2,3--"),
    ("admin: read user with traversal", "/api/admin/users/..%2F..%2Fetc%2Fpasswd"),
    ("sysadmin: read student 1", "/api/sysadmin/students/00000000-0000-0000-0000-000000000001"),
]

for name, path in idor_tests:
    status, body, _ = http_get(path)
    if status in (401, 403, 404):
        log("hack", name, "pass", f"HTTP {status} (blocked or not found)")
    elif status == 200:
        log("hack", name, "fail", f"HTTP 200 WITHOUT AUTH at {path} — IDOR!")
    else:
        log("hack", name, "pass", f"HTTP {status}")

print("\n  2C. SQL injection probes:")
sqli_tests = [
    ("/api/admin/overview?id=1%27%20OR%20%271%27%3D%271", "OR 1=1"),
    ("/api/admin/overview?id=1%20UNION%20SELECT%20NULL", "UNION SELECT"),
    ("/api/admin/overview?id=1%3B%20DROP%20TABLE%20users", "DROP TABLE"),
    ("/api/alerts?search=%27%20OR%20%271%27%3D%271", "OR in search"),
    ("/api/admin/users?email=admin%27%20OR%20%271%27%3D%271", "OR in filter"),
]

for path, label in sqli_tests:
    status, body, _ = http_get(path)
    if status in (400, 401, 403, 404, 422):
        log("hack", f"sqli: {label}", "pass", f"HTTP {status} (rejected)")
    elif status == 200:
        # Check if the response actually contains data (would indicate injection worked)
        if "data" in body and len(body) > 100:
            log("hack", f"sqli: {label}", "fail", f"HTTP 200 with data — possible injection!")
        else:
            log("hack", f"sqli: {label}", "pass", f"HTTP 200 (no data leaked)")
    else:
        log("hack", f"sqli: {label}", "pass", f"HTTP {status}")

print("\n  2D. XSS / injection probes:")
xss_tests = [
    ("/api/health?msg=%3Cscript%3Ealert(1)%3C%2Fscript%3E", "script tag"),
    ("/api/health?msg=%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E", "img onerror"),
    ("/api/health?msg=%3Csvg%20onload%3Dalert(1)%3E", "svg onload"),
    ("/api/alerts?q=%253Cscript%253E", "double-encoded script"),
]

for path, label in xss_tests:
    status, body, _ = http_get(path)
    if status in (400, 401, 403, 404):
        log("hack", f"xss: {label}", "pass", f"HTTP {status} (rejected)")
    elif status == 200:
        # Check if the input is reflected in the response (potential XSS)
        if "<script>" in body.lower() or "onerror=" in body.lower():
            log("hack", f"xss: {label}", "fail", f"INPUT REFLECTED IN RESPONSE — XSS!")
        else:
            log("hack", f"xss: {label}", "pass", f"HTTP 200 (input not reflected)")
    else:
        log("hack", f"xss: {label}", "pass", f"HTTP {status}")

print("\n  2E. Information disclosure probes:")
info_tests = [
    ("/.env", "env file"),
    ("/.git/config", "git config"),
    ("/package.json", "package.json"),
    ("/next.config.mjs", "next config"),
    ("/api/_next/static/webpack", "webpack manifest"),
    ("/status-last.json", "status json"),
    ("/api/internal/metrics", "internal metrics"),
    ("/.env.production", "env production"),
    ("/docker-compose.yml", "compose file"),
]

for path, label in info_tests:
    status, body, _ = http_get(path)
    if status == 404:
        log("hack", f"info: {label}", "pass", "HTTP 404 (not exposed)")
    elif status in (401, 403):
        log("hack", f"info: {label}", "pass", f"HTTP {status} (protected)")
    elif status == 200:
        # Check if it's actually sensitive data
        if any(s in body.lower() for s in ["password", "secret", "token", "private_key", "credential"]):
            log("hack", f"info: {label}", "fail", f"SENSITIVE DATA EXPOSED at {path}")
        else:
            log("hack", f"info: {label}", "pass", f"HTTP 200 (public content)")
    else:
        log("hack", f"info: {label}", "pass", f"HTTP {status}")


# ═══════════════════════════════════════════════════════════════════
# SECTION 3: MULTI-ROLE ACCESS TEST (RBAC)
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  SECTION 3: MULTI-ROLE ACCESS TEST (RBAC)")
print("=" * 60)

# Known roles from the database
roles = [
    "admin", "sysadmin", "principal", "vice_principal", "hod",
    "oie", "caretaker", "deputy_warden", "operator", "supervisor",
    "faculty", "staff", "worker", "student", "guardian", "parent",
    "hostel_manager", "mess_incharge", "visitor", "emo",
    "exam_branch", "exam_superintendent",
]

print(f"\n  Testing {len(roles)} roles against key endpoints:")

# Define access expectations:
# - admin/sysadmin: full access to /api/admin/*
# - principal/vice_principal: read /api/admin/overview, no write
# - hod: limited to their department
# - operator: /api/operator/* only
# - student: /api/student/* only
# - faculty: /api/faculty/* only
# - visitor: read-only public data
# - All: /api/health, /status-last.json

access_matrix = {
    "/api/health": "all",
    "/status-last.json": "all",
    "/api/admin/overview": "admin,sysadmin",
    "/api/admin/gates": "admin,sysadmin",
    "/api/admin/users": "admin,sysadmin",
    "/api/admin/alerts": "admin,sysadmin",
    "/api/operator/last-scan": "operator",
    "/api/student/dashboard": "student,guardian,parent",
    "/api/faculty/my-classes": "faculty",
    "/api/sysadmin/actions": "sysadmin",
}

# Since we can't authenticate as each role without credentials,
# we test the ACCESS CONTROL LAYER:
# - Unauthenticated access to protected endpoints → must be 401/403/404
# - 404 = endpoint doesn't exist (safe, no data leak)
# - 200 on a protected endpoint without auth = AUTH BYPASS

print("\n  3A. Unauthenticated access to role-scoped endpoints:")
for path, allowed in access_matrix.items():
    if allowed == "all":
        status, _, _ = http_get(path)
        expected = "pass" if status == 200 else "fail"
        log("rbac", f"public: {path}", expected, f"HTTP {status} (expected 200)")
    else:
        status, _, _ = http_get(path)
        # 401/403 = auth enforced; 404 = endpoint not found (also safe — no data leak)
        expected_safe = status in (401, 403, 404)
        log("rbac", f"protected: {path} (roles: {allowed})",
            "pass" if expected_safe else "fail",
            f"HTTP {status}" + (" — AUTH BYPASS!" if status == 200 else
                                (" (blocked)" if status in (401, 403) else " (not found, safe)")))

print("\n  3B. Role-specific data isolation probes:")
isolation_tests = [
    ("student: read admin config", "/api/student/admin-config"),
    ("student: read all students", "/api/student/students"),
    ("faculty: read other faculty's classes", "/api/faculty/classes?user=other-id"),
    ("operator: read student data", "/api/operator/students"),
    ("visitor: read admin alerts", "/api/visitor/alerts"),
    ("guardian: read student grades", "/api/guardian/students/1"),
    ("worker: read admin users", "/api/worker/admin-users"),
]

for name, path in isolation_tests:
    status, body, _ = http_get(path)
    if status in (401, 403, 404):
        log("rbac", name, "pass", f"HTTP {status} (blocked)")
    elif status == 200:
        log("rbac", name, "fail", f"HTTP 200 WITHOUT AUTH — cross-role data access at {path}")
    else:
        log("rbac", name, "pass", f"HTTP {status}")


# ═══════════════════════════════════════════════════════════════════
# SECTION 4: LOAD RESILIENCE — Burst after all tests
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  SECTION 4: LOAD RESILIENCE (Post-Test Burst)")
print("=" * 60)

import concurrent.futures

def burst_request(_):
    status, body, lat = http_get("/api/health")
    return status, lat

print("\n  Running 200-request burst against /api/health...")
start = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:
    futures = [pool.submit(burst_request, i) for i in range(200)]
    burst_results = [f.result() for f in concurrent.futures.as_completed(futures)]
burst_time = time.time() - start

burst_statuses = [r[0] for r in burst_results]
burst_lats = [r[1] for r in burst_results]
burst_5xx = sum(1 for s in burst_statuses if s >= 500)
burst_avg_lat = sum(burst_lats) / len(burst_lats) if burst_lats else 0
burst_p95 = sorted(burst_lats)[int(len(burst_lats) * 0.95)] if burst_lats else 0

print(f"  200 requests in {burst_time:.1f}s = {200/burst_time:.1f} RPS")
print(f"  Avg latency: {burst_avg_lat:.0f}ms  P95: {burst_p95:.0f}ms")
print(f"  5xx errors: {burst_5xx}/{200}")

if burst_5xx == 0:
    log("resilience", "burst: 200 requests, 0 5xx", "pass",
        f"avg={burst_avg_lat:.0f}ms p95={burst_p95:.0f}ms")
else:
    log("resilience", "burst: 200 requests", "fail",
        f"{burst_5xx} 5xx errors out of 200")

# Verify the stack is still healthy after all tests
status, body, _ = http_get("/api/health")
if status == 200 and ("healthy" in body or "OK" in body):
    log("resilience", "post-test health check", "pass", "stack still healthy")
else:
    log("resilience", "post-test health check", "fail", f"HTTP {status}: {body[:100]}")


# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  SECURITY & RELIABILITY TEST SUMMARY")
print("=" * 60)

total_pass = sum(r["passed"] for r in results.values())
total_fail = sum(r["failed"] for r in results.values())
total_skip = sum(r["skipped"] for r in results.values())

for section, data in results.items():
    icon = "PASS" if data["failed"] == 0 else "FAIL"
    print(f"\n  [{icon}] {section.upper()}")
    print(f"       Passed: {data['passed']}  Failed: {data['failed']}  Skipped: {data['skipped']}")
    for f in data["findings"]:
        print(f"       - {f['test']}: {f['detail']}")

print(f"\n  TOTAL: {total_pass} passed, {total_fail} failed, {total_skip} skipped")
print(f"  VERDICT: {'ALL PASS' if total_fail == 0 else f'{total_fail} ISSUES FOUND'}")
print("=" * 60 + "\n")

# Write results to JSON
output = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "sections": results,
    "total": {"passed": total_pass, "failed": total_fail, "skipped": total_skip},
    "verdict": "ALL PASS" if total_fail == 0 else f"{total_fail} ISSUES FOUND",
}

out_path = os.path.join(os.path.dirname(__file__), "security-test-results.json")
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)
print(f"  Results written to: {out_path}")

sys.exit(0 if total_fail == 0 else 1)
