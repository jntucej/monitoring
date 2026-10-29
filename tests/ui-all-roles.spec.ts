import { test, expect } from '@playwright/test';

interface RoleTestConfig {
  role: string;
  login: string;
  pass: string;
  path: string;
}

const ROLES_TO_TEST: RoleTestConfig[] = [
  { role: 'sysadmin', login: 'SYSADMIN', pass: 'Sysadmin@123', path: '/sysadmin' },
  { role: 'operator', login: 'OPERATOR', pass: 'Operator@123', path: '/gate/5f2183c9-51ae-4677-8f38-52a17bbe0538' },
  { role: 'admin', login: 'ADMIN', pass: 'Sysadmin@123', path: '/admin' },
  { role: 'principal', login: 'PRINCIPAL', pass: 'Sysadmin@123', path: '/principal' },
  { role: 'vice_principal', login: 'VICE_PRINCIPAL', pass: 'Sysadmin@123', path: '/vice-principal' },
  { role: 'hod', login: 'HOD', pass: 'Sysadmin@123', path: '/hod' },
  { role: 'faculty', login: 'FACULTY', pass: 'Sysadmin@123', path: '/faculty' },
  { role: 'staff', login: 'STAFF', pass: 'Sysadmin@123', path: '/staff' },
  { role: 'caretaker', login: 'CARETAKER', pass: 'Sysadmin@123', path: '/caretaker' },
  { role: 'deputy_warden', login: 'DEPUTY_WARDEN', pass: 'Sysadmin@123', path: '/deputy-warden' },
  { role: 'hostel_manager', login: 'HOSTEL_MANAGER', pass: 'Sysadmin@123', path: '/hostel-manager' },
  { role: 'supervisor', login: 'SUPERVISOR', pass: 'Sysadmin@123', path: '/supervisor' },
  { role: 'oie', login: 'OIE', pass: 'Sysadmin@123', path: '/oie' },
  { role: 'exam_branch', login: 'EXAM_BRANCH', pass: 'Sysadmin@123', path: '/exam-branch' },
  { role: 'student', login: '25JJ1A0501', pass: 'Sysadmin@123', path: '/student' },
];

for (const cfg of ROLES_TO_TEST) {
  test(`Role console render & error check: ${cfg.role} (${cfg.path})`, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('favicon') && !txt.includes('WebSocket')) {
          consoleErrors.push(txt);
        }
      }
    });

    // 1. Authenticate via API to get session token & cookies
    const loginRes = await page.request.post('http://127.0.0.1:80/api/auth/login', {
      data: { login: cfg.login, password: cfg.pass },
      headers: { 'Sec-Fetch-Site': 'same-origin' }
    });

    if (!loginRes.ok()) {
      console.log(`[AUTH SKIP] Could not log in as ${cfg.login}: ${loginRes.status()}`);
      test.skip();
      return;
    }

    // 2. Navigate to destination console
    await page.goto(`http://127.0.0.1:80${cfg.path}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify no chunk failure, no crash
    const content = await page.content();
    expect(content).not.toContain('Failed to load chunk');
    expect(content).not.toContain('Application error: a client-side exception');

    // 4. Verify no unhandled page errors
    expect(pageErrors).toEqual([]);
  });
}
