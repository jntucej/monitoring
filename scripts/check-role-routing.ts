import { getDefaultRouteForRole, ALL_ROLES } from "../src/server/policy/routes";

console.log("====================================================");
console.log("🧪 RUNNING ROLE ROUTING SNAPSHOT TEST");
console.log("====================================================");

const EXPECTED_20_ROLES = [
  "admin",
  "sysadmin",
  "operator",
  "supervisor",
  "warden",
  "faculty",
  "staff",
  "worker",
  "visitor",
  "student",
  "parent",
  "guardian",
  "hod",
  "principal",
  "vice_principal",
  "exam_branch",
  "oie",
  "hostel_manager",
  "deputy_warden",
  "caretaker",
];

let errors: string[] = [];

for (const role of EXPECTED_20_ROLES) {
  if (!ALL_ROLES.includes(role as any)) {
    errors.push(`Role '${role}' is missing from ALL_ROLES definition`);
  }
  const defaultRoute = getDefaultRouteForRole(role);
  if (defaultRoute === "/login") {
    errors.push(`Role '${role}' resolves to unmapped fallback route '/login'`);
  } else {
    console.log(`  ✅ Role [${role.padEnd(16)}] -> ${defaultRoute}`);
  }
}

if (errors.length > 0) {
  console.error("\n❌ Role Routing Snapshot Test FAILED:");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
} else {
  console.log("\n====================================================");
  console.log("📊 ALL 20 ROLES PROPERLY WIRED AND MAPPED!");
  console.log("====================================================");
  process.exit(0);
}
