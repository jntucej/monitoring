/**
 * End-to-end role/workflow verification.
 *
 * Run with: npx tsx scripts/check-role-workflow.ts
 */
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORKFLOW_STAGES,
  resolveInitialStage,
  resolveNextStage,
  canApproveAtStage,
} from "../src/lib/permission-workflow";
import { getDefaultRouteForRole } from "../src/server/policy/routes";
import { ROLES } from "../src/lib/roles";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${label}`);
  } else {
    failed++;
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function routeExists(path: string): Promise<boolean> {
  if (path === "/") return true;
  const cleaned = path.replace(/^\/+/, "");
  const candidates = [
    join(ROOT, "src", "app", cleaned, "page.tsx"),
    join(ROOT, "src", "app", `(${(cleaned.split("/")[0] ?? "").replace(/-/g, "_")})`, cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(admin)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(sysadmin)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(approver)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(student)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(parent)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(operator)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(supervisor)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(mess)", cleaned, "page.tsx"),
    join(ROOT, "src", "app", "(person)", cleaned, "page.tsx"),
  ];
  for (const c of candidates) {
    try {
      await stat(c);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function main() {
  console.log("── 1. Default routes exist ────────────────────────────────────────");
  for (const role of Object.values(ROLES)) {
    const route = getDefaultRouteForRole(role);
    const exists = await routeExists(route);
    check(`route for ${role} → ${route}`, exists);
  }

  console.log("\n── 2. Workflow chains are self-consistent ────────────────────────");
  for (const [workflow, chain] of Object.entries(WORKFLOW_STAGES)) {
    check(
      `${workflow} chain has no "warden"`,
      !chain.includes("warden"),
      chain.join(" → "),
    );
    check(
      `${workflow} initial stage is chain[0]`,
      resolveInitialStage(workflow as any) === chain[0],
    );
    for (let i = 0; i < chain.length - 1; i++) {
      const next = resolveNextStage(workflow as any, chain[i]);
      check(
        `${workflow}: ${chain[i]} → ${chain[i + 1]}`,
        next === chain[i + 1],
        `got ${next}`,
      );
    }
    const last = chain[chain.length - 1];
    check(`${workflow}: terminal stage returns null`, resolveNextStage(workflow as any, last) === null);
  }

  console.log("\n── 3. canApproveAtStage is exact-match ───────────────────────────");
  for (const [workflow, chain] of Object.entries(WORKFLOW_STAGES)) {
    for (const stage of chain) {
      for (const role of chain) {
        const expected = stage === role || (stage === "hostel_manager" && role === "warden");
        const actual = canApproveAtStage(role, workflow as any, stage);
        check(
          `${workflow} stage=${stage} role=${role} → ${expected}`,
          actual === expected,
        );
      }
    }
  }

  console.log("\n── 4. Legacy \"warden\" alias ──────────────────────────────────────");
  check(
    "warden can approve hostel_manager stage",
    canApproveAtStage("warden", "hostel", "hostel_manager"),
  );
  check(
    "warden cannot approve a non-matching stage",
    !canApproveAtStage("warden", "hostel", "caretaker"),
  );

  console.log(`\n${failed === 0 ? "DONE" : `FAILED ${failed} checks`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
