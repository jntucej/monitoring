# 🔑 Role Credentials (dev / testing)

> **Test-only credentials** provisioned for the campus monitoring stack.
> These accounts exist so every role dashboard can be exercised end-to-end.
> They live in the dev DB (`gate_monitor`) and should **not** be used in a
> hardened production deployment. Rotate or delete before going live.

## Login

- **PIN login** (`/login` → PIN tab): works only for the *device-facing* roles —
  `operator`, `staff`, `worker`, `faculty`, and students (bulk-imported).
- **Password login** (`/login` → password tab): use the identifier + password below
  for privileged roles. (Privileged roles are intentionally excluded from PIN login
  by design.)
- The **operator kiosk** (`/gate`) auto-signs-in the designated default operator
  (Main Campus Gate) without a manual login.

## Provisioned role accounts (13)

| # | Role | Login identifier | Credential | Dashboard |
|---|------|------------------|------------|-----------|
| 1 | `operator`       | `OPERATOR`       | PIN **`9001`** ✓ (kiosk auto-login also works) | `/gate` |
| 2 | `principal`      | `PRINCIPAL`      | pw `Principal@123` | `/principal` |
| 3 | `vice_principal` | `VICE_PRINCIPAL` | pw `VicePrinc@123` | `/principal` |
| 4 | `exam_branch`    | `EXAM_BRANCH`    | pw `ExamBranch@123` | `/exam/permissions` |
| 5 | `oie`            | `OIE`            | pw `OIE@123` | `/exam/permissions` |
| 6 | `caretaker`      | `CARETAKER`      | pw `Caretaker@123` | `/hostel/permissions` |
| 7 | `deputy_warden`  | `DEPUTY_WARDEN`  | pw `DepWarden@123` | `/hostel/permissions` |
| 8 | `hostel_manager` | `HOSTEL_MANAGER` | pw `HostelMgr@123` | `/hostel/permissions` |
| 9 | `parent`         | `PARENT`         | pw `Parent@123` | `/parent` |
| 10| `mess_incharge`  | `MESS_INCHARGE`  | PIN **`1109`** ✓ | `/mess` |
| 11| `warden`         | `WARDEN`         | pw `Warden@123` | `/principal` (principal desk) |
| 12| `supervisor`     | `SUPERVISOR`     | pw `Supervisor@123` | `/supervisor` |
| 13| `student`        | e.g. `23JJ1A0210` | bulk-import PIN | `/student` |

### Supporting roles (pre-existing, not part of the 13)

| Role | Login identifier | Note |
|------|------------------|------|
| `admin`     | `ADMIN`     | `Admin@123` (initial PIN set) |
| `sysadmin`  | `SYSADMIN`  | your existing sysadmin password |
| `guardian`  | `GUARDIAN`  | `Guardian@123` |
| `hod`       | `HOD`       | `HOD@123` |
| `staff`     | `STAFF`     | `Staff@123` |
| `worker`    | `WORKER`    | PIN (if set) |
| `faculty`   | `FACULTY`   | `Faculty@123` |
| `visitor`   | `VISITOR`   | `Visitor@123` |

## How these were provisioned

- Role accounts are created by `scripts/prov/index.mts` (run via `npx tsx`).
- The `mess_incharge` account is created by `scripts/prov/mess-finalize.mjs`.
- The operator kiosk default is seeded by
  `database/migrations/20261112000002_gate_operator_kiosk_default.sql`
  (assigns Main Campus Gate to `OPERATOR`, sets `is_kiosk_default`, mints the
  kiosk PIN).
- Student accounts are bulk-imported via `/api/users/bulk` (or
  `scripts/prov` roster import). Their PINs come from the import feed.

## Reset / rotate

```bash
cd /root/monitoring
npx tsx scripts/prov/index.mts        # (re)provision the 9 role accounts
npx tsx scripts/prov/mess-finalize.mjs # create MESS_INCHARGE
```

To change a single PIN/password use the `/api/users` PATCH endpoint (sysadmin).

---
