# Gate Monitor — Admin User Manual

**Version:** 1.0.0 · August 2026

---

## 1. Logging In

1. Open the portal URL (e.g. `https://<your-app>.vercel.app`).
2. Click **Admin Portal**.
3. Enter your **User ID** (e.g. `ADM-001`) and your **PIN/password**.
4. You will be redirected to the Admin Dashboard.

> 🔒 **Security:** PIN login issues a genuine Supabase Auth session. Logging in on a second device invalidates the first session (single-active-session policy).

## 2. Dashboard KPIs

The dashboard (`/admin/dashboard`) shows:
- **Students on campus** (live count from gate scans)
- **Entries / Exits today**
- **Pending alerts** requiring attention
- **Active gate passes**

## 3. Managing Students

Navigate to `/admin/students`:
- Search by roll number or name
- View a student's movement history, hostel block, curfew time, and guardian link
- Verify seeded data: students follow the pattern `<YY>JJ<1A|5A><DEPT><SEQ>` e.g. `25JJ1A0503`

## 4. Approving Gate Passes

Gate passes flow: **Student/Parent request → Guardian approval → Admin approval → APPROVED**.

- Go to `/admin/students` or the passes screen to see `final_status`
- Only passes with `final_status = APPROVED` permit an exit scan at the gate

## 5. Generating Reports

- `/admin/reports` — daily entry/exit summaries
- `/api/analytics/export` — CSV export for registers

## 6. Managing Users & Roles


To add a user:
1. Use the admin users API/screen (`POST /api/users`) with the person's details.
2. The system invites them by email; their account becomes active after first login.

## 7. Changing Default PINs ⚠️

All seeded accounts ship with a shared bootstrap PIN taken from the `SEED_DEFAULT_PIN` environment variable at seed time (it is never hardcoded in this repository). **Before production use**, rotate every system-account PIN:

| Account | ID |
|---|---|
| Admin | `ADM-001` |
| Operator | `OP-001` |
| Wardens | `WDN-001`, `WDN-002` |

Use the settings/profile screen, or update `initial_pin_hash` server-side (bcrypt).

## 8. Monitoring Health

- Uptime probe target: `GET /api/health` (returns `200 OK` when DB is reachable)
- Configure BetterStack/Sentry per `docs/RUNBOOK.md`

## 9. Common Tasks Quick Reference

| Task | Where |
|---|---|
| Live campus count | Dashboard header |
| Who is out past curfew? | Alerts panel |
| Re-issue a student QR | Student detail → Digital ID |
| Audit a scan event | Scan Log History (`/gate/history`) |
