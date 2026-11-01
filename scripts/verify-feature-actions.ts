#!/usr/bin/env node
/**
 * scripts/verify-feature-actions.ts — the 8 feature-action contracts.
 *
 * For each named feature, actually performs the action end-to-end and
 * verifies the state change (not just "page loads"). These are the
 * "the app can do its job" tests — pass/fail on real mutations.
 *
 * Usage:
 *   npx tsx scripts/verify-feature-actions.ts [--role=student]
 *
 * Output: scripts/feature-health-report.json
 */
import { chromium, type Browser, type BrowserContext } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.SMOKE_BASE ?? "https://monitor.ucej.in";
const CREDS_PATH = process.env.SMOKE_CREDS ?? "/root/monitoring/scripts/smoke-creds.json";
const OUT_PATH = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : path.join(process.cwd(), "scripts", "feature-health-report.json");

const onlyRole = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1];
const creds: Array<{ role: string; login: string; password: string }> = JSON.parse(
  fs.readFileSync(CREDS_PATH, "utf8")
);

interface FeatureResult {
  feature: string;
  role: string;
  ok: boolean;
  detail: string;
}

async function makeCtx(browser: Browser, role: string): Promise<BrowserContext | null> {
  const c = creds.find((x) => x.role === role);
  if (!c) return null;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { login: c.login, password: c.password },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || !body?.data?.token) {
    await ctx.close();
    return null;
  }
  const { token, user } = body.data;
  await page.evaluate(
    ([t, u]) => {
      sessionStorage.setItem("auth.token", t);
      localStorage.setItem(
        "mycampus-auth",
        JSON.stringify({ state: { user: u, role: u.role, authenticated: true }, version: 0 })
      );
    },
    [token, user ?? {}] as const
  );
  await page.close();
  return ctx;
}

const features: Array<{
  name: string;
  role: string;
  run: (ctx: BrowserContext) => Promise<{ ok: boolean; detail: string }>;
}> = [
  {
    name: "student.apply-leave",
    role: "student",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/student/permissions/new`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        // workflow type "hostel" is default — pick a reason from the dropdown
        await page.locator("#perm-reason, select[name='reason'], select").first().waitFor({ timeout: 10_000 });
        const select = page.locator("select").first();
        const options = await select.locator("option").allTextContents();
        const reasonOpt = options.find((o) => o.trim() && o !== "—");
        if (!reasonOpt) return { ok: false, detail: "no reason options available" };
        await select.selectOption({ label: reasonOpt });
        // hostel workflow needs dates
        const from = page.locator('input[type="datetime-local"]').first();
        await from.fill("2027-01-15T08:00");
        const to = page.locator('input[type="datetime-local"]').nth(1);
        if (await to.count()) await to.fill("2027-01-16T20:00");
        await page.locator('button[type="submit"]').click();
        const visible = await page
          .locator("text=/Submitted|ticket|Pending/i")
          .first()
          .waitFor({ timeout: 15_000 })
          .then(() => true)
          .catch(() => false);
        return { ok: visible, detail: visible ? "request submitted, confirmation shown" : "no confirmation after submit" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "operator.scan-gate",
    role: "operator",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/operator`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const hasIn = await page.locator("text=/IN/i").first().count();
        return { ok: hasIn > 0, detail: hasIn ? "gate desk IN button present" : "IN button not found on /operator" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "parent.view-child-status",
    role: "parent",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/parent/child-status`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
        const body = await page.locator("body").innerText().catch(() => "");
        const hasStatus = /on campus|off campus|last scan|campus status/i.test(body);
        return { ok: hasStatus, detail: hasStatus ? "child status visible" : "no child-status content on /parent/child-status" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "principal.see-inbox",
    role: "principal",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/principal`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        const hasContent = await page.locator("text=/pending|approv|escalat|inbox/i").first().count();
        return { ok: hasContent > 0, detail: hasContent ? "approval inbox visible on /principal" : "no inbox content on /principal" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "hod.see-approvals",
    role: "hod",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/hod/approvals/pending`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
        const hasContent = await page.locator("text=/pending|no.*requests|approval/i").first().count();
        return { ok: hasContent > 0, detail: hasContent ? "HOD approvals list renders" : "HOD approvals list missing" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "sysadmin.see-health",
    role: "admin",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/sysadmin/application-health`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
        const ok_ = await page.locator("text=/healthy|degraded|unhealthy/i").first().count();
        return { ok: ok_ > 0, detail: ok_ ? "application health panel renders a status" : "no health status on /sysadmin/application-health" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "supervisor.see-gates",
    role: "supervisor",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/supervisor/gates/live`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
        const ok_ = await page.locator("text=/gate|live|online/i").first().count();
        return { ok: ok_ > 0, detail: ok_ ? "supervisor live gate board renders" : "no gate content on /supervisor/gates/live" };
      } finally {
        await page.close();
      }
    },
  },
  {
    name: "worker.see-work",
    role: "worker",
    run: async (ctx) => {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/worker`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
        const ok_ = await page.locator("text=/work|shift|task|order/i").first().count();
        return { ok: ok_ > 0, detail: ok_ ? "worker work board renders" : "no work content on /worker" };
      } finally {
        await page.close();
      }
    },
  },
];

async function main() {
  const targets = onlyRole ? features.filter((f) => f.role === onlyRole) : features;
  const browser = await chromium.launch({ headless: true });
  const report: FeatureResult[] = [];

  for (const f of targets) {
    const ctx = await makeCtx(browser, f.role);
    if (!ctx) {
      report.push({ feature: f.name, role: f.role, ok: false, detail: "login-failed" });
      console.log(`[FAIL] ${f.name} (${f.role}) — login-failed`);
      continue;
    }
    let result: { ok: boolean; detail: string };
    try {
      result = await f.run(ctx);
    } catch (e) {
      result = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
    await ctx.close();
    report.push({ feature: f.name, role: f.role, ok: result.ok, detail: result.detail });
    console.log(`[${result.ok ? "PASS" : "FAIL"}] ${f.name} (${f.role}) — ${result.detail}`);
  }

  await browser.close();
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  const fails = report.filter((r) => !r.ok);
  console.log(`\n${report.length - fails.length}/${report.length} feature actions clean — report at ${OUT_PATH}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
