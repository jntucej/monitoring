import { readFile } from "fs/promises";
import { gzipSync } from "zlib";

// REQUIRED files — the budget only means something if every one of these is
// accounted for. A missing required file is a FAIL, not a silent skip:
// skipping undercounts the total and can let a real over-budget pass.
const FILES = [
  "src/app/(home)/page.tsx",
  "src/app/(home)/components/webgl/ParticleField.tsx",
  "src/app/(home)/components/webgl/HeroScene.tsx",
  "src/app/(home)/components/ui/KineticTypography.tsx",
];

let total = 0;
const missing = [];
for (const f of FILES) {
  try {
    const buf = await readFile(f);
    const gz = gzipSync(buf).length;
    total += gz;
    console.log(`${gz.toString().padStart(6)} B  ${f}`);
  } catch {
    console.log(`[FAIL] ${f} not found — required for the budget check`);
    missing.push(f);
  }
}

if (missing.length > 0) {
  console.error(`\nBUDGET INCONCLUSIVE: missing files: ${missing.join(", ")}`);
  console.error("✗ A required home source file is missing — treat as FAIL and review before deploying.");
  process.exit(1);
}

console.log(`\nTOTAL (gzipped source): ${total} B`);
if (total > 400_000) {
  console.error("✗ Home source over 400KB gzipped — trim.");
  process.exit(1);
}
console.log("✓ Home source within budget.");
