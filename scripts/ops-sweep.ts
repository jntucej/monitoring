#!/usr/bin/env node
/**
 * Full operational sweep — human-style, per role.
 * For every smoke-cred role:
 *   1. Real login via /api/auth/login (cookie + token, like a human form submit)
 *   2. /api/auth/session → confirms role + default route
 *   3. GET the role's 3 main pages → 200 + not a login redirect
 *   4. Exercise the role's OWN write/operational APIs (POST/PATCH where the
 *      role's real workflow allows) — record status
 *   5. RBAC negative: one endpoint belonging to ANOTHER role → expect 403/404
 * Writes scripts/ops-sweep-report.json
 */
import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.SMOKE_BASE ?? "https://monitor.ucej.in";
const CREDS_PATH = process.env.SMOKE_CREDS ?? "/root/monitoring/scripts/smoke-creds.json";
const OUT = path.join(process.cwd(), "scripts", "ops-sweep-report.json");

const creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));

// What a human of each role actually does (page + operational endpoint).
const OPS: Record<
  string,
  { pages: string[]; api: Array<{ m: string; p: string; body?: object; expect?: string[]; label: string }>; negative: Array<{ p: string; m: string; label: string }> }
> = {
  operator: {
    pages: ["/operator", "/operator/lookup", "/operator/stats"],
    api: [
      { m: "GET", p: "/api/operator/last-scan", label: "read last scan" },
      { m: "GET", p: "/api/gate/verify-pass", expect: ["400", "401", "403", "404"], label: "verify-pass guard probe (expect 4xx)" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  admin: {
    pages: ["/admin", "/admin/dashboard", "/admin/alerts"],
    api: [
      { m: "GET", p: "/api/admin/health/full", label: "rich health snapshot" },
      { m: "GET", p: "/api/admin/dashboard", label: "occupancy" },
    ],
    negative: [{ p: "/api/sysadmin/cron", m: "GET", label: "sysadmin cron (must 403)" }],
  },
  principal: {
    pages: ["/principal", "/principal/approvals", "/principal/home"],
    api: [
      { m: "GET", p: "/api/permissions?stage=principal&status=PENDING", label: "pending queue" },
      { m: "GET", p: "/api/permissions?stage=principal&overdue=true", label: "overdue queue" },
    ],
    negative: [{ p: "/api/operator/last-scan", m: "GET", label: "operator last-scan (must 403)" }],
  },
  student: {
    pages: ["/student", "/student/attendance", "/student/passes"],
    api: [
      { m: "GET", p: "/api/student/mess-bill", expect: ["200", "401", "403"], label: "own mess bill" },
      { m: "POST", p: "/api/permissions", body: { workflowType: "leave", reason: "ops-sweep self-test", from: new Date().toISOString().slice(0, 10), to: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }, expect: ["200", "201", "400", "409"], label: "apply leave (own flow)" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  hod: {
    pages: ["/hod", "/hod/approvals", "/hod/faculty"],
    api: [
      { m: "GET", p: "/api/permissions?stage=hod&status=PENDING", label: "HOD queue" },
    ],
    negative: [{ p: "/api/permissions?stage=principal", m: "GET", label: "principal queue (must 403)" }],
  },
  vice_principal: {
    pages: ["/vice-principal", "/vice-principal/pending-approvals", "/vice-principal/examinations"],
    api: [
      { m: "GET", p: "/api/permissions?stage=vice_principal&status=PENDING", label: "VP queue" },
    ],
    negative: [{ p: "/api/permissions?stage=hod", m: "GET", label: "HOD queue (must 403)" }],
  },
  supervisor: {
    pages: ["/supervisor", "/supervisor/gates/live", "/supervisor/shift/live"],
    api: [
      { m: "GET", p: "/api/supervisor/shift", label: "shift status" },
      { m: "GET", p: "/api/gates", label: "gates list" },
    ],
    // Supervisor's own shift endpoint is allowed — the negative target must
    // be an endpoint that requires a role supervisor does NOT hold.
    negative: [{ p: "/api/admin/health/full", m: "GET", label: "admin health (must 403)" }],
  },
  staff: {
    pages: ["/staff", "/staff/my-day", "/staff/requests"],
    api: [
      { m: "GET", p: "/api/staff/my-day", label: "my day" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  worker: {
    pages: ["/worker", "/worker/shifts", "/worker/work-orders"],
    api: [
      { m: "GET", p: "/api/workers", label: "my shifts" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  guardian: {
    pages: ["/guardian", "/guardian/child-status", "/guardian/child-requests"],
    api: [
      { m: "GET", p: "/api/parents/me", label: "guardian view" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  parent: {
    pages: ["/guardian", "/guardian/notifications"],
    api: [
      { m: "GET", p: "/api/parents/me", label: "parent view" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  oie: {
    pages: ["/oie", "/oie/queue", "/oie/records"],
    api: [
      { m: "GET", p: "/api/oie/queue", label: "OIE queue" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  exam_branch: {
    pages: ["/exam-branch", "/exam-branch/verification", "/exam-branch/records"],
    api: [
      { m: "GET", p: "/api/exam/access", label: "exam queue" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  exam_superintendent: {
    pages: ["/exam/superintendent", "/exam/superintendent/schedule", "/exam/superintendent/incidents"],
    api: [
      { m: "GET", p: "/api/exam/superintendent", label: "exam schedule" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  mess_incharge: {
    pages: ["/mess", "/mess/reviews", "/mess/menu-management"],
    api: [
      { m: "GET", p: "/api/mess/days", label: "today's menu" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  deputy_warden: {
    pages: ["/deputy-warden", "/deputy-warden/leave-requests", "/deputy-warden/delegated-approvals"],
    api: [
      { m: "GET", p: "/api/permissions?stage=deputy_warden&status=PENDING", label: "warden queue" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  hostel_manager: {
    pages: ["/hostel-manager", "/hostel-manager/residents", "/hostel-manager/rooms"],
    api: [
      { m: "GET", p: "/api/hostel-manager/summary", label: "hostel summary" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  caretaker: {
    pages: ["/caretaker", "/caretaker/maintenance", "/caretaker/workers"],
    api: [
      { m: "GET", p: "/api/caretaker/summary", label: "caretaker summary" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
  emo: {
    pages: ["/emo", "/emo/complaints"],
    api: [
      { m: "GET", p: "/api/complaints?role=emo", label: "EMO queue" },
    ],
    negative: [{ p: "/api/supervisor/shift", m: "GET", label: "supervisor shift (must 403)" }],
  },
};

interface Row {
  role: string;
  login: string;
  loggedIn: boolean;
  sessionRole: string | null;
  sessionOk: boolean;
  pages: Array<{ path: string; status: number; redirected: boolean; note: string }>;
  apis: Array<{ label: string; method: string; path: string; status: number; ok: boolean; expected?: string; detail: string }>;
  negatives: Array<{ label: string; path: string; status: number; enforced: boolean }>;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const rows: Row[] = [];

  for (const c of creds) {
    const spec = OPS[c.role];
    const row: Row = {
      role: c.role, login: c.login, loggedIn: false,
      sessionRole: null, sessionOk: false, pages: [], apis: [], negatives: [],
    };

    // fresh context per role — human-style login
    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();

    // 1. login via API (sets cookie + gives token)
    const loginRes = await ctx.request.post(`${BASE}/api/auth/login`, {
      data: { login: c.login, password: c.password },
      headers: { "Content-Type": "application/json" },
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    if (loginRes.ok() && loginBody?.data?.token) {
      row.loggedIn = true;
      const token: string = loginBody.data.token;
      const user = loginBody.data.user ?? {};
      await page.addInitScript(([tk, us]) => {
        sessionStorage.setItem("auth.token", tk);
        localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user: us, role: us.role, authenticated: true }, version: 0 }));
      }, [token, user]);

      // 2. session endpoint — response shape: { success, user: { role } }
      const sess = await ctx.request.get(`${BASE}/api/auth/session`);
      if (sess.ok()) {
        const sb = await sess.json().catch(() => ({}));
        const su = sb.data ?? sb;
        // The app returns { success, user: { role, ... } } (no .data envelope).
        // The old test read su.role, which is undefined — hence sessionOk was
        // false for every role even though the endpoint was working.
        const roleVal = su?.user?.role ?? su?.role ?? null;
        row.sessionRole = roleVal;
        row.sessionOk = roleVal !== null && roleVal !== undefined;
      }

      // 3. pages
      if (spec) {
        for (const p of spec.pages) {
          const pr = await ctx.request.get(`${BASE}${p}`);
          const txt = await pr.text().catch(() => "");
          const redirected = pr.headers()["location"]?.includes("/login") || txt.includes('"/login"');
          row.pages.push({ path: p, status: pr.status(), redirected, note: redirected ? "bounced to login" : "" });
        }
      }

      // 4. operational APIs
      if (spec) {
        for (const a of spec.api) {
          let ar;
          try {
            // POST routes are CSRF-gated: the app requires Origin = host +
            // Sec-Fetch-Site: same-origin. Pass both, plus the login token as
            // Bearer (the cookie alone is not read by withAuthorization).
            const authHeaders = {
              "Content-Type": "application/json",
              "Origin": BASE,
              "Sec-Fetch-Site": "same-origin",
              "Sec-Fetch-Mode": "cors",
              Authorization: `Bearer ${loginBody.data.token}`,
            };
            ar = a.m === "GET"
              ? await ctx.request.get(`${BASE}${a.p}`, { headers: { Authorization: `Bearer ${loginBody.data.token}` } })
              : await ctx.request.post(`${BASE}${a.p}`, { data: a.body, headers: authHeaders });
          } catch (e) {
            row.apis.push({ label: a.label, method: a.m, path: a.p, status: 0, ok: false, expected: a.expect?.join(","), detail: `request error: ${String(e).slice(0, 80)}` });
            continue;
          }
          const atxt = await ar.text().catch(() => "");
          const expected = a.expect ? a.expect.includes(String(ar.status())) : ar.status() < 500;
          row.apis.push({
            label: a.label, method: a.m, path: a.p, status: ar.status(),
            ok: expected, expected: a.expect?.join("|") || "<500",
            detail: expected ? "" : atxt.slice(0, 160),
          });
        }
      }

      // 5. RBAC negative
      if (spec) {
        for (const n of spec.negative) {
          const nr = n.m === "GET"
            ? await ctx.request.get(`${BASE}${n.p}`)
            : await ctx.request.post(`${BASE}${n.p}`, { data: {}, headers: { "Content-Type": "application/json" } });
          row.negatives.push({ label: n.label, path: n.p, status: nr.status(), enforced: nr.status() === 401 || nr.status() === 403 || nr.status() === 404 });
        }
      }
    } else {
      row.loggedIn = false;
      row.sessionOk = false;
    }

    rows.push(row);
    const badPages = row.pages.filter((p) => p.status >= 400 || p.redirected).map((p) => p.path).join(",");
    const badApis = row.apis.filter((a) => !a.ok).map((a) => `${a.label}=${a.status}`).join(",");
    const badNeg = row.negatives.filter((n) => !n.enforced).map((n) => `${n.path}=${n.status}`).join(",");
    console.log(
      `[${row.loggedIn ? "IN " : "OUT"}] ${row.role.padEnd(18)} session=${row.sessionRole ?? "-"} ` +
      `pages:${badPages || "ok"} apis:${badApis || "ok"} rbac:${badNeg ? "LEAK: " + badNeg : "enforced"}`
    );
    await ctx.close();
    await sleep(250);
  }

  // Public unauthenticated probes (no context)
  const anon = await browser.newContext();
  const pub = { health: 0, loginPage: 0, anonApi: 0 };
  const h = await anon.request.get(`${BASE}/api/health`);
  pub.health = h.status();
  const lp = await anon.request.get(`${BASE}/login`);
  pub.loginPage = lp.status();
  const na = await anon.request.get(`${BASE}/api/admin/users`);
  pub.anonApi = na.status();
  await anon.close();
  await browser.close();

  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), public: pub, rows }, null, 2));
  const failures = rows.filter((r) => !r.loggedIn || r.pages.some((p) => p.status >= 400 || p.redirected) || r.apis.some((a) => !a.ok) || r.negatives.some((n) => !n.enforced));
  console.log(`\n=== OPS SWEEP: ${rows.length} roles, ${failures.length} with issues → ${OUT}`);
  for (const f of failures) {
    console.log(`  ${f.role}: ${[
      !f.loggedIn ? "LOGIN FAILED" : "",
      ...f.pages.filter((p) => p.status >= 400 || p.redirected).map((p) => `page ${p.path}=${p.status}${p.redirected ? "(redirect)" : ""}`),
      ...f.apis.filter((a) => !a.ok).map((a) => `api ${a.label}=${a.status}`),
      ...f.negatives.filter((n) => !n.enforced).map((n) => `RBAC-LEAK ${n.path}=${n.status}`),
    ].filter(Boolean).join("; ")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });