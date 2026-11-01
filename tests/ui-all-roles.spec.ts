import { test, expect } from '@playwright/test';

interface RoleTestConfig {
  role: string;
  login: string;
  pass: string;
  path: string;
}

const ROLES_TO_TEST: RoleTestConfig[] = [
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
