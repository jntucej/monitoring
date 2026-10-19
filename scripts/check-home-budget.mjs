import { readFile } from "fs/promises";
import { gzipSync } from "zlib";

const FILES = [
  "src/app/(home)/page.tsx",
  "src/app/(home)/components/webgl/ParticleField.tsx",
  "src/app/(home)/components/webgl/HeroScene.tsx",
  "src/app/(home)/components/ui/KineticTypography.tsx",
];

let total = 0;
for (const f of FILES) {
  try {
    const buf = await readFile(f);
    const gz = gzipSync(buf).length;
    total += gz;
    console.log(`${gz.toString().padStart(6)} B  ${f}`);
  } catch {
    console.log(`[skip] ${f} not found`);
  }
}
console.log(`\nTOTAL (gzipped source): ${total} B`);
if (total > 400_000) {
  console.error("✗ Home source over 400KB gzipped — trim.");
  process.exit(1);
}
console.log("✓ Home source within budget.");
