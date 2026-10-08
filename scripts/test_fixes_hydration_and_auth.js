import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function readFile(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('🧪 Running Validation Tests for Hydration, Theme Cookie, Auth Store & Login Fallback...\n');

// 1. Auth store skipHydration
test('AuthStore configures skipHydration: true to avoid SSR hydration mismatch', () => {
  const storeSource = readFile('src/stores/authStore.ts');
  assert(storeSource.includes('skipHydration: true'), 'authStore persist config must have skipHydration: true');
  assert(storeSource.includes('onRehydrateStorage: () => (state) =>'), 'authStore must have onRehydrateStorage callback');
  assert(storeSource.includes('state?.setHasHydrated(true)'), 'onRehydrateStorage must call setHasHydrated(true)');
});

// 2. ClientProviders rehydration
test('ClientProviders explicitly rehydrates auth store after client mount', () => {
  const clientProv = readFile('src/app/ClientProviders.tsx');
  assert(clientProv.includes('useAuthStore.persist.rehydrate()'), 'ClientProviders must rehydrate authStore in useEffect');
  assert(clientProv.includes('useEffect('), 'rehydration must be called inside useEffect');
});

// 3. Theme Cookie helper & Layout
test('Theme cookie helper and Layout use cookie to eliminate inline script hydration mismatch', () => {
  const cookieSource = readFile('src/lib/theme-cookie.ts');
  assert(cookieSource.includes('getServerTheme'), 'theme-cookie.ts must export getServerTheme');
  assert(cookieSource.includes('gate-monitor-theme'), 'theme-cookie.ts must check gate-monitor-theme cookie');

  const layoutSource = readFile('src/app/layout.tsx');
  assert(layoutSource.includes('getServerTheme()'), 'layout.tsx must await getServerTheme()');
  assert(layoutSource.includes('data-theme={theme}'), 'layout.tsx must set data-theme dynamically from server');
  assert(layoutSource.includes('suppressHydrationWarning'), 'layout.tsx must include suppressHydrationWarning');
  assert(!layoutSource.includes('localStorage.getItem("gate-monitor-theme")'), 'layout.tsx should not contain inline localStorage script');

  const uiStoreSource = readFile('src/stores/uiStore.ts');
  assert(uiStoreSource.includes('gate-monitor-theme=${theme}'), 'uiStore setTheme must write theme cookie');
});

// 4. Auth token production safety check
test('Auth token includes boot check for production secrets', () => {
  const authSource = readFile('src/lib/auth-token.ts');
  assert(authSource.includes('AUTH_JWT_SECRET'), 'auth-token.ts must check AUTH_JWT_SECRET');
  assert(authSource.includes('TOTP_ENCRYPTION_KEY'), 'auth-token.ts must check TOTP_ENCRYPTION_KEY');
});

// 5. Seed data password_hash
test('Seed script sets password_hash for seeded users', () => {
  const seedScript = readFile('scripts/seed-data.js');
  assert(seedScript.includes('password_hash: pinHash'), 'seed-data.js must set password_hash: pinHash');
  assert(seedScript.includes('initial_pin_hash: pinHash'), 'seed-data.js must set initial_pin_hash');
});

// 6. PIN login allows faculty role
test('PIN login allows faculty role', () => {
  const pinRoute = readFile('src/app/api/auth/pin-login/route.ts');
  assert(pinRoute.includes('"faculty"'), 'pin-login route must include faculty in ALLOWED_PIN_ROLES');
});

// 7. LoginForm numeric fallback
test('LoginForm falls back from PIN login to password login on failure', () => {
  const loginForm = readFile('src/components/shared/LoginForm.tsx');
  assert(loginForm.includes('const isPurePin = /^\\d{4,8}$/.test(passwordOrPin);'), 'LoginForm checks for pure numeric credential');
  assert(loginForm.includes('const fallbackResult = await login('), 'LoginForm falls back to standard login if pinLogin is unsuccessful');
});

console.log(`\n🎉 Test Results: ${passed}/${total} passed!`);
if (passed !== total) process.exit(1);

