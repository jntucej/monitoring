const fs = require("fs");
const path = require("path");

const RULES = [
  { dir: "src/app/api",        forbid: ["server/repositories", "lib/postgres", "bcryptjs"] },
  { dir: "src/server/services",forbid: ["next/server", "next/navigation", "react", "fs"] },
  { dir: "src/server/repositories", forbid: ["server/services", "next/server"] },
  { dir: "src/server/policy", forbid: ["server/repositories", "lib/postgres", "next/server"] },
];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
});

let failures = 0;

for (const { dir, forbid } of RULES) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, "utf8");
    for (const pattern of forbid) {
      if (src.includes(`from "${pattern}`) || src.includes(`from '${pattern}`)) {
        console.error(`LAYER VIOLATION: ${file} imports "${pattern}"`);
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} layering violation(s). See above.`);
  process.exit(1);
}
console.log("OK: no layering violations.");
