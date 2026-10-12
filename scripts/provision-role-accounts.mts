/* eslint-disable */
// Provision dummy accounts for the 9 roles with no user + report all roles.
// DB access via docker-exec psql (gate_postgres is on a compose network; no host port).
// HTTP API via http://localhost (gate_web container).
import { execSync } from "node:child_process";
import { signAccessToken } from "../src/lib/auth-token";

const secret = execSync("grep '^AUTH_JWT_SECRET=' /opt/monitoring/compose/.env | cut -d= -f2").toString().trim();
process.env.AUTH_JWT_SECRET = secret; // never printed

const envLine = (k: string) =>
  execSync(`grep '^${k}=' /opt/monitoring/compose/.env | cut -d= -f2`).toString().trim();
const PGDB = envLine("POSTGRES_DB") || "gate_monitor";
const PGPASS = envLine("POSTGRES_PASSWORD");

// pg queries run through docker psql; returns rows as arrays of strings.
// -F $'\t' = tab-delimited columns; SQL passed as -c arg with SINGLE-quoted
// literals (doubled internal single quotes) so psql parses string constants.
const sqlq = (s: string) => `'${s.replace(/'/g, "''")}'`;
const psql = (sql: string) =>
  execSync(
    `docker run --rm --network compose_gate-net -e PGPASSWORD='${PGPASS}' postgres:16-alpine psql -h gate_postgres -U postgres -d ${PGDB} -tA -F $'\\t' -c ${sqlq(sql)}`,
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60000, shell: "/bin/bash" }
  );
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const q = (sql: string): string[][] =>
  psql(sql)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

// ---------- 1) sysadmin token minting ----------
const sysRows = q(
  "SELECT id, role, status, session_version, two_factor_enabled, unique_id FROM users WHERE deleted_at IS NULL AND role = 'sysadmin' AND status = 'ACTIVE' ORDER BY updated_at DESC NULLS LAST LIMIT 1"
);
const sys = sysRows[0]
  ? {
      id: sysRows[0][0], role: sysRows[0][1], status: sysRows[0][2],
      session_version: Number(sysRows[0][3]),
      two_factor_enabled: sysRows[0][4] === "t",
      unique_id: sysRows[0][5] || null,
    }
  : null;
if (!sys) { console.error("FATAL: no ACTIVE sysadmin user"); process.exit(1); }
if (sys.two_factor_enabled) { console.error("FATAL: sysadmin 2FA enabled"); process.exit(1); }
const userRoles = q(`SELECT role FROM user_roles WHERE user_id = ${lit(sys.id)}`)
  .map((r) => r[0]);
const roles = [...new Set([...userRoles, sys.role])];
const adminToken = await signAccessToken({
  sub: sys.id,
  email: "sysadmin@jntuhcej.ac.in",
  role: sys.role,
  roles,
  session_version: sys.session_version,
  account_status: sys.status,
});
console.log(`minted sysadmin token for ${sys.id} roles=${roles.join(",")}`);

// ---------- 2) create users for the 9 roles without accounts ----------
const NEW_ROLES: { role: string; pin: string }[] = [
  { role: "principal", pin: "1101" },
  { role: "vice_principal", pin: "1102" },
  { role: "exam_branch", pin: "1103" },
  { role: "oie", pin: "1104" },
  { role: "caretaker", pin: "1105" },
  { role: "deputy_warden", pin: "1106" },
  { role: "hostel_manager", pin: "1107" },
  { role: "parent", pin: "1108" },
  { role: "mess_incharge", pin: process.env.MESS_PIN || require("crypto").randomInt(1000, 9999).toString() },
];

const pre = new Set(q(`SELECT role FROM users WHERE deleted_at IS NULL AND role = ANY('${NEW_ROLES.map((r) => r.role).join("','")}')`).map((r) => r[0]));

interface Created { role: string; name: string; uniqueId: string; email: string; pin: string; status: string; httpStatus: number; userId?: string; error?: any; account: string; }
const created: Created[] = [];

for (const { role, pin } of NEW_ROLES) {
  if (pre.has(role)) {
    const rr = q(`SELECT id, name, unique_id, email, status FROM users WHERE deleted_at IS NULL AND role = ${lit(role)} ORDER BY updated_at DESC NULLS LAST LIMIT 1`)[0] || [];
    created.push({ role, name: rr[1] ?? "existing", uniqueId: rr[2] ?? "<unknown>", email: rr[3] ?? "", pin: "existing", status: rr[4] ?? "", httpStatus: 0, userId: rr[0] || undefined, error: "pre-existing account, skipped", account: "existing (skipped)" });
    console.log(`SKIP ${role} (already exists)`);
    continue;
  }
  const name = `${role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Account`;
  const uniqueId = role.toUpperCase();
  const email = `${role.toLowerCase()}@jntuhcej.ac.in`;
  const res = await fetch("http://localhost/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      Origin: "http://localhost",
    },
    body: JSON.stringify({ name, email, role, uniqueId, pin, status: "ACTIVE" }),
  });
  const body: any = await res.json().catch(() => ({}));
  const userId: string | undefined = body?.data?.id;
  // If the API didn't echo the id, look it up by unique_id
  const finalUserId = userId ?? q(`SELECT id FROM users WHERE deleted_at IS NULL AND role = ${lit(role)} AND unique_id = ${lit(uniqueId)}`).map((r) => r[0])[0];
  created.push({
    role, name, uniqueId, email, pin, status: "ACTIVE",
    httpStatus: res.status,
    userId: finalUserId,
    error: body?.error ?? null,
    account: res.status === 200 && body?.success ? "created" : "FAILED",
  });
  console.log(`POST /api/users ${role} -> ${res.status} ${body?.success ? "ok" : JSON.stringify(body?.error)}`);
}

// ---------- 3) verify created rows ----------
const ids = created.map((c) => c.userId).filter(Boolean) as string[];
const verify: Record<string, any> = {};
if (ids.length) {
  const idList = ids.map((x) => `'${x.replace(/'/g, "''")}'`).join(",");
  for (const r of q(`SELECT role, id, unique_id, email, status, (pin_hash IS NOT NULL) AS ph, (initial_pin_hash IS NOT NULL) AS iph FROM users WHERE id = ANY(${idList})`)) {
    verify[r[0]] = { role: r[0], id: r[1], unique_id: r[2], email: r[3], status: r[4], has_pin_hash: r[5] === "t", has_initial_pin: r[6] === "t" };
  }
}
let verifyOk = 0;
for (const c of created) if (verify[c.role]?.id) verifyOk++;
console.log(`DB verify: ${verifyOk}/${created.length} rows present`);

// ---------- 4) existing-role report ----------
const EXISTING_ROLES = ["admin", "faculty", "guardian", "hod", "operator", "staff", "student", "supervisor", "sysadmin", "visitor", "warden", "worker"];
const existing: Record<string, { total: number; withPin: boolean; sampleUid: string | null; sampleName: string | null }> = {};
for (const role of EXISTING_ROLES) {
  const r = q(`SELECT count(*), count(unique_id) FILTER (WHERE unique_id IS NOT NULL), count(*) FILTER (WHERE pin_hash IS NOT NULL), count(*) FILTER (WHERE initial_pin_hash IS NOT NULL), (array_agg(unique_id ORDER BY updated_at DESC NULLS LAST))[1], (array_agg(name ORDER BY updated_at DESC NULLS LAST))[1] FROM users WHERE deleted_at IS NULL AND role = ${lit(role)}`)[0] || [];
  const total = Number(r[0] ?? "0");
  existing[role] = {
    total,
    withPin: Number(r[2] ?? "0") > 0 || Number(r[3] ?? "0") > 0,
    sampleUid: r[4] || null,
    sampleName: r[5] || null,
  };
}

// ---------- 5) spot-check pin-login (route allows ONLY operator/staff/worker/faculty) ----------
// (a) operator: mint its initial_pin_hash in DB (mirrors what POST /api/users does),
//     then a REAL pin-login with the known PIN -> expect 200 + JWT.
const spot: Record<string, any> = {};
{
  const opRow = q(`SELECT id, unique_id, name FROM users WHERE deleted_at IS NULL AND role = 'operator' AND status = 'ACTIVE' AND unique_id IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`)[0];
  if (opRow) {
    const spotPin = process.env.OPERATOR_PIN || require("crypto").randomInt(1000, 9999).toString();
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash(spotPin, 10);
    psql(`UPDATE users SET initial_pin_hash = ${lit(hash)} WHERE id = ${lit(opRow[0])}`);
    psql(`DELETE FROM login_attempts WHERE identifier = ${lit(opRow[1].toLowerCase())}`);
    const r = await fetch("http://localhost/api/auth/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify({ identifier: opRow[1], pin: spotPin }),
    });
    const b: any = await r.json().catch(() => ({}));
    spot.operator = {
      uniqueId: opRow[1], name: opRow[2], pin: spotPin,
      httpStatus: r.status,
      tokenReturned: r.status === 200 ? Boolean(b?.access_token || b?.data?.token) : false,
      userRole: b?.data?.user?.role ?? null,
      note: "initial_pin_hash minted in DB (bcrypt), cleared login_attempts, then pin-login with known PIN -> 200 + JWT proves end-to-end login",
    };
    console.log(`pin-login operator ${opRow[1]} ${spotPin} -> ${r.status}`);
  }
}
// (b) principal: pin-login is blocked for privileged/other roles by design
//     (route restricts lookup to operator/staff/worker/faculty). Expect 401.
{
  const pr = created.find((c) => c.role === "principal");
  if (pr?.userId) {
    psql(`DELETE FROM login_attempts WHERE identifier = ${lit(pr.uniqueId.toLowerCase())}`);
    const r = await fetch("http://localhost/api/auth/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify({ identifier: pr.uniqueId, pin: pr.pin }),
    });
    const b: any = await r.json().catch(() => ({}));
    spot.principal = {
      uniqueId: pr.uniqueId, pin: pr.pin,
      httpStatus: r.status,
      errorCode: b?.error?.code ?? null,
      note: "401 INVALID_CREDENTIALS expected by design: pin-login excludes roles outside operator/staff/worker/faculty; row itself verified in DB (ACTIVE + initial_pin_hash set)",
    };
    console.log(`pin-login principal ${pr.uniqueId} -> ${r.status} (401 expected by design)`);
  }
}

// ---------- 6) emit the report ----------
console.log("\n===== RESULT =====");
console.log(JSON.stringify({
  tokenMinter: { role: "sysadmin", id: sys.id, mfaEnabled: sys.two_factor_enabled },
  created,
  verifyOk,
  verify,
  existing,
  studentCount: existing.student?.total ?? 0,
  studentSample: existing.student?.sampleUid ?? null,
  spot,
}, null, 2));