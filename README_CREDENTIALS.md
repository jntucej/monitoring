# Role Credentials (dev / testing)

> **Test-only credentials** provisioned for the campus monitoring stack.
> These accounts exist so every role dashboard can be exercised end-to-end.
> They live in the dev DB (`gate_monitor`).
>
> **⚠️ No plaintext passwords are stored in this file or anywhere in the repo.**
> All credentials are bcrypt-hashed in the DB. The last rotation was 2026-10-12.
> If you need the current values, ask the repo owner or set new ones via the
> `/api/users` PATCH endpoint (sysadmin).

## Login

- **PIN login** (`/login` → PIN tab): works only for the *device-facing* roles —
  `operator`, `staff`, `worker`, `faculty`, and students (bulk-imported).
- **Password login** (`/login` → password tab): use the identifier for privileged
  roles. (Privileged roles are intentionally excluded from PIN login by design.)
- The **operator kiosk** (`/gate`) auto-signs-in the designated default operator
  (Main Campus Gate) without a manual login.

## Provisioned role accounts (13)

| # | Role | Login identifier | Dashboard |
|---|------|------------------|-----------|
| 1 | `operator`       | `OPERATOR`       | `/gate` |
| 2 | `principal`      | `PRINCIPAL`      | `/principal` |
| 3 | `vice_principal` | `VICE_PRINCIPAL` | `/vice-principal` |
| 4 | `exam_branch`    | `EXAM_BRANCH`    | `/exam-branch` |
| 5 | `oie`            | `OIE`            | `/oie` |
| 6 | `caretaker`      | `CARETAKER`      | `/hostel/permissions` |
| 7 | `deputy_warden`  | `DEPUTY_WARDEN`  | `/hostel/permissions` |
| 8 | `hostel_manager` | `HOSTEL_MANAGER` | `/hostel/permissions` |
| 9 | `parent`         | `PARENT`         | `/parent` |
| 10| `mess_incharge`  | `MESS_INCHARGE`  | `/mess` |
| 11| `supervisor`     | `SUPERVISOR`     | `/supervisor` |
| 12| `student`        | e.g. `23JJ1A0210` | `/student` |

### Supporting roles (pre-existing, not part of the 13)

| Role | Login identifier |
|------|------------------|
| `admin`      | `ADMIN` |
| `sysadmin`   | `SYSADMIN` |
| `guardian`   | `GUARDIAN` |
| `hod`        | `HOD` |
| `staff`      | `STAFF` |
| `worker`     | `WORKER` |
| `faculty`    | `FACULTY` |
| `visitor`    | `VISITOR` |

> **To get or change a credential:** log in as `sysadmin` and use the
> `/api/users` PATCH endpoint. Never commit credentials to the repo.

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
npx tsx scripts/prov/index.mts         # (re)provision the 9 role accounts
npx tsx scripts/prov/mess-finalize.mjs # create MESS_INCHARGE
```

To change a single PIN/password use the `/api/users` PATCH endpoint (sysadmin).
**Never commit credentials to the repo.**
