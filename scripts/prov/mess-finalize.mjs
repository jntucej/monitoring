import { execSync } from "node:child_process";
import * as fs from "node:fs";
const secret = execSync("grep '^AUTH_JWT_SECRET=' /opt/monitoring/compose/.env | cut -d= -f2").toString().trim();
process.env.AUTH_JWT_SECRET = secret;
const { signAccessToken } = await import("../../src/lib/auth-token.ts");
const sysadminId = "80eb29e3-7e71-48cb-a44c-6e0caa7f83f5";
const envLine = (k) => execSync(`grep '^${k}=' /opt/monitoring/compose/.env | cut -d= -f2`).toString().trim();
const PGDB = envLine("POSTGRES_DB") || "gate_monitor";
const PGPASS = envLine("POSTGRES_PASSWORD");
const psql = (sql) => {
  const tmp = `/tmp/psql-fz-${process.pid}.sql`;
  fs.writeFileSync(tmp, sql);
  try {
    return execSync(`docker cp ${tmp} gate_postgres:/tmp/psql-fz.sql && docker exec gate_postgres psql -U postgres -d ${PGDB} -tA -f /tmp/psql-fz.sql`, { encoding: "utf8", shell: "/bin/bash", timeout: 60000 });
  } finally { fs.unlinkSync(tmp); }
};
const row = psql("SELECT session_version, two_factor_enabled FROM users WHERE id = '" + sysadminId + "' LIMIT 1").trim().split("\t");
console.log("sysadmin session_version:", row[0], "mfa:", row[1]);
const token = await signAccessToken({
  sub: sysadminId,
  email: "sysadmin@jntuhcej.ac.in",
  role: "sysadmin",
  roles: ["sysadmin"],
  session_version: Number(row[0] || 0),
  account_status: "ACTIVE",
});
const res = await fetch("http://localhost/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Origin: "http://localhost" },
  body: JSON.stringify({
    name: "Mess Incharge Account",
    email: "mess_incharge@jntuhcej.ac.in",
    role: "mess_incharge",
    uniqueId: "MESS_INCHARGE",
    pin: process.env.MESS_PIN || require("crypto").randomInt(1000, 9999).toString(),
    status: "ACTIVE",
  }),
});
const body = await res.json().catch(() => ({}));
console.log("POST /api/users mess_incharge ->", res.status, JSON.stringify(body.success ? { ok: true, id: body.data?.id, uniqueId: body.data?.unique_id } : body.error));

// verify the row
if (res.status === 200) {
  const v = psql("SELECT role, unique_id, status, (initial_pin_hash IS NOT NULL) FROM users WHERE role = 'mess_incharge' AND deleted_at IS NULL").trim().split("\t");
  console.log("DB verify:", v.join(" | "));
}
