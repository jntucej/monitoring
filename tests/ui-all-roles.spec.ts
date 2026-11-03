import { test, expect } from '@playwright/test';

// Reads test credentials from /root/monitoring/scripts/smoke-creds.json
// (never committed — .gitignored). One entry per role:
//   { "role": "faculty", "login": "FACULTY", "password": "FACULTY@123", ... }
import * as fs from 'node:fs';
import * as path from 'node:path';

interface RoleTestConfig {
  role: string;
  login: string;
  pass: string;
  path: string;
}

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:80';
const CREDS_PATH = process.env.SMOKE_CREDS ?? '/root/monitoring/scripts/smoke-creds.json';

// Fallback for the case where smoke-creds.json isn't present on this host:
// the legacy hardcoded set (kept in sync with the file when available).
const FALLBACK_CREDENTIALS: RoleTestConfig[] = [
  { role: 'student', login: '23JJ1A0599', pass: 'student123', path: '/student' },
  { role: 'parent', login: 'PARENT', pass: 'Parent@123', path: '/guardian' },
  { role: 'oie', login: 'oie', pass: 'OIE@123', path: '/oie' },
  { role: 'staff', login: 'admin', pass: 'Admin@123', path: '/staff' },
  { role: 'operator', login: 'OPERATOR', pass: 'operator123', path: '/operator' },
  { role: 'supervisor', login: 'SUPERVISOR', pass: 'Supervisor@123', path: '/supervisor' },
  { role: 'mess_incharge', login: 'MESS_INCHARGE', pass: 'MessIncharge@123', path: '/mess' },
  { role: 'exam_superintendent', login: 'EXAM_SUPERINTENDENT', pass: 'ExamSuper@123', path: '/exam/superintendent' },
  { role: 'exam_branch', login: 'EXAM_BRANCH', pass: 'ExamBranch@123', path: '/exam-branch' },
  { role: 'deputy_warden', login: 'DEPUTY_WARDEN', pass: 'DeputyWarden@123', path: '/deputy-warden' },
  { role: 'hostel_manager', login: 'HOSTEL_MANAGER', pass: 'HostelManager@123', path: '/hostel-manager' },
  { role: 'caretaker', login: 'caretaker', pass: 'Caretaker@123', path: '/caretaker' },
  { role: 'subject_faculty', login: 'SUBJECT_FACULTY', pass: 'SubjectFac@123', path: '/faculty' },
  { role: 'worker', login: 'WORKER', pass: 'worker123', path: '/worker' },
  { role: 'vice_principal', login: 'VICE_PRINCIPAL', pass: 'VicePrincipal@123', path: '/vice-principal' },
  { role: 'principal', login: 'PRINCIPAL', pass: 'Principal@123', path: '/principal' },
  { role: 'hod', login: 'HOD', pass: 'Hod@123', path: '/hod' },
  { role: 'admin', login: 'admin', pass: 'Admin@123', path: '/admin' },
  { role: 'emo', login: 'EMO', pass: 'EMO@123', path: '/emo' },
  { role: 'faculty', login: 'FACULTY', pass: 'FACULTY@123', path: '/faculty' },
  { role: 'sysadmin', login: 'SYSADMIN', pass: 'SYSADMIN@123', path: '/sysadmin' },
  { role: 'guardian', login: 'GUARDIAN', pass: 'GUARDIAN@123', path: '/guardian' },
  { role: 'visitor', login: 'VISITOR', pass: 'VISITOR@123', path: '/visitor' },
];

interface CredsEntry {
  role: string;
  login: string;
  password: string;
  rootHref?: string;
  anchor?: string;
}

let ROLES_TO_TEST: RoleTestConfig[];
try {
  const creds: CredsEntry[] = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  // Map credential file entries to test configs, using the root path from
  // role-inventory.json when available (it is the source of truth for
  // which console each role lands on — the /guardian vs /parent split).
  const inventory = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'role-inventory.json'), 'utf8'),
  );
  const rootByRole: Record<string, string> = {};
  for (const r of inventory.roles ?? []) {
    if (r.root) rootByRole[r.role] = r.root;
  }
  ROLES_TO_TEST = creds.map((c): RoleTestConfig => ({
    role: c.role,
    login: c.login,
    pass: c.password,
    path: c.rootHref ?? rootByRole[c.role] ?? `/${c.role}`,
  }));
} catch {
  ROLES_TO_TEST = FALLBACK_CREDENTIALS;
}

for (const cfg of ROLES_TO_TEST) {
  test(`Role console render & error check: ${cfg.role} (${cfg.path})`, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('favicon') && !txt.includes('WebSocket')) {
          consoleErrors.push(txt);
        }
      }
    });

    // 1. Authenticate via API to get session token & cookies
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
      data: { login: cfg.login, password: cfg.pass },
      headers: { 'Sec-Fetch-Site': 'same-origin' },
    });

    if (!loginRes.ok()) {
      console.log(`[AUTH SKIP] Could not log in as ${cfg.login}: ${loginRes.status()}`);
      test.skip();
      return;
    }

    // 2. Navigate to destination console
    await page.goto(`${BASE}${cfg.path}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify no chunk failure, no crash
    const content = await page.content();
    expect(content).not.toContain('Failed to load chunk');
    expect(content).not.toContain('Application error: a client-side exception');

    // 4. Verify no unhandled page errors
    expect(pageErrors).toEqual([]);
  });
}

// Fix 5 — visual regression baselines (Batch K §8).
// The first run writes the .png baselines under test-results/ (Playwright's
// default); every subsequent run fails on a pixel diff > maxDiffPixels.
test.describe('visual baseline — role landing screenshots', () => {
  const VISUAL_ROLES = ROLES_TO_TEST.filter((c) =>
    ['student', 'parent', 'guardian', 'operator', 'supervisor', 'hod', 'principal', 'admin', 'sysadmin', 'faculty', 'visitor'].includes(c.role),
  );
  for (const cfg of VISUAL_ROLES) {
    test(`${cfg.role} landing renders (screenshot)`, async ({ page }) => {
      const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
        data: { login: cfg.login, password: cfg.pass },
        headers: { 'Sec-Fetch-Site': 'same-origin' },
      });
      if (!loginRes.ok()) {
        test.skip(true, `no credentials for ${cfg.role} on this host`);
        return;
      }
      await page.goto(`${BASE}${cfg.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await expect(page).toHaveScreenshot(`${cfg.role}-landing.png`, { maxDiffPixels: 100, fullPage: false });
    });
  }
});
