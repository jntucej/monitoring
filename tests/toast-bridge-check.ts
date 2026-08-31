/* Minimal self-check for toast.tsx changes: run with `npx tsx tests/toast-bridge-check.ts` */

// The bridge requires these zustand actions to exist on useUIStore.
// We verify the store shape statically instead of mounting React.
const src = require("fs").readFileSync("src/components/ui/toast.tsx", "utf8");
const store = require("fs").readFileSync("src/stores/uiStore.ts", "utf8");

const checks: Array<[string, boolean]> = [
  ["toast.tsx imports useUIStore", src.includes('import { useUIStore } from "@/stores/uiStore"')],
  ["ToastProvider subscribes to store queue", /useUIStore\(\(s\) => s\.toasts\)/.test(src)],
  ["context addToast proxies to store", /storeAdd\(toast\)/.test(src)],
  ["store exposes addToast", store.includes("addToast: (toast)")],
  ["store auto-removes after duration", store.includes("setTimeout")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
