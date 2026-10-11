# Gate Monitor — Multi-Stage Permission Workflow

**Version:** 1.0 · **Date:** 2026-10-10 · **Owner:** Gate Monitor Team

---

## 1. 
---

## 2. System Overview

```
Users → Next.js UI → API Routes → Workflow Engine → PostgreSQL
                                        │
                                        ├── Local Storage (data/uploads/)
                                        ├── Notifications
                                        └── Audit Logs
```

- **Frontend:** Next.js 16 App Router, Tailwind CSS, Recharts (radial dashboards).
- **Database:** PostgreSQL 17 (Supabase-compatible).
- **Storage:** local filesystem under `data/uploads/permissions/{ticket}/`.

---

## 3. 
### Role → Stage Authorization

| Role | Can act at stage |
|---|---|
| caretaker | `caretaker` |
| deputy_warden | `deputy_warden` |
| hostel_manager | `hostel_manager` |
| warden | `warden_or_principal` |
| principal | `warden_or_principal`, `principal` |
| operator | `main_gate` |
| faculty | `faculty` |
| hod | `hod` |
| oie | `oie` |
| vice_principal | `vice_principal` |
| admin / sysadmin | any stage (override) |

---

## 4. Workflow Chains

| Workflow | Chain |
|---|---|
| **Hostel** | caretaker → deputy_warden → hostel_manager → warden_or_principal → main_gate → completed |
| **Exam** | faculty → hod → oie → vice_principal → principal → completed |
| **Memo** | faculty → hod → oie → vice_principal → principal → completed |
| **Staff Leave** | hod → vice_principal → principal → completed |

Defined in `src/lib/permission-workflow.ts` as `WORKFLOW_STAGES`.

---

## 5. Ticket Numbers

Per-workflow sequences, formatted with prefix:

| Workflow | Prefix | Example | Sequence |
|---|---|---|---|
| Hostel | `HST-` | HST-1001 | `hostel_ticket_seq` |
| Exam | `EXM-` | EXM-1001 | `exam_ticket_seq` |
| Memo | `MEM-` | MEM-1001 | `memo_ticket_seq` |
| Staff Leave | `STF-` | STF-1001 | `staff_leave_ticket_seq` |

Unique across the table. 
---

## 6. Database Schema (New Objects)

### `permission_requests`
`id · ticket_number · workflow_type · student_user_id · hostel_scope · current_stage · status · stage_history JSONB · document_required · document_url · biometric_hostel_at · biometric_gate_at · digital_signature · created_at · updated_at`

### `device_verification_settings`
`id · device_type (thumb|face|barcode|qr) · enabled (default FALSE) · scope · scope_id`

### `custom_reasons`
`id · code · label · workflow_type · created_by` · `UNIQUE(code, workflow_type)` · seeded with 21 defaults.

### `document_templates`
`id · name · body_html · workflow_type`

### `document_signatures`
`id · document_id · signed_by · signed_at · signature_hash`

### Extended
`users.role` CHECK expanded (+7 new roles) · `users.hostel_scope` added.

### Sequences
`hostel_ticket_seq`, `exam_ticket_seq`, `memo_ticket_seq`, `staff_leave_ticket_seq` (all start at 1001).

---

## 7. API Endpoints

### Permission CRUD
| Method | Path | Auth |
|---|---|---|
| POST | `/api/permissions` | Any authenticated |
| GET | `/api/permissions` | Role-scoped |
| GET | `/api/permissions/[ticket]` | Role-scoped |
| PATCH | `/api/permissions/[ticket]` | Stage-gated |

### Document
| Method | Path | Auth |
|---|---|---|
| POST | `/api/permissions/[ticket]/upload` | Owner only |
| GET | `/api/permissions/[ticket]/document` | Role-scoped |
| POST | `/api/permissions/[ticket]/sign` | principal, sysadmin |

### Biometric
| Method | Path | Auth |
|---|---|---|
| POST | `/api/permissions/[ticket]/biometric` | Stage-appropriate role |

### Bulk
| Method | Path | Max |
|---|---|---|
| POST | `/api/permissions/bulk` | 100 tickets |

### Config
| Method | Path |
|---|---|
| GET, POST | `/api/config/custom-reasons` |
| PATCH, DELETE | `/api/config/custom-reasons/[id]` |
| GET | `/api/admin/device-settings` |
| PATCH | `/api/admin/device-settings/[id]` |

### Dashboards
| Method | Path |
|---|---|
| GET | `/api/dashboard/hostel` |
| GET | `/api/dashboard/exam` |
| GET | `/api/dashboard/campus` |

---

## 8. Storage

```
data/uploads/permissions/{ticket}/
  ├── document.pdf             (student upload, exam/memo only)
  └── document_signed.pdf      (Principal signed copy)
```

- Git-ignored (`data/uploads/`).
- Served via `/api/permissions/[ticket]/document`.

---

## 9. - SHA-256 signature over `(pdf || ticket || signerId || timestamp)`.

---

## 10. - SysAdmin toggles at `/sysadmin/devices`.
- When enabled: signature required; mismatch returns `400 BIOMETRIC_FAILED`.
- `useDeviceSettings()` hook caches settings for 60 seconds.

---

## 11. Dashboards

- `/dashboard/hostel` — Boys/Girls pending, stage funnel, overdue, biometric completion.
- `/dashboard/exam` — HOD/OIE/VP/Principal pipeline, upload/signature, top reasons, recent signs.
- `/dashboard/campus` — active permissions, workflow split, staff leave, gate scans, device status, recent completions.
Live refresh every 30 s.

---

## 12. - API: `/api/permissions/bulk` (≤100).

---

## 13. File Manifest

**New:** 42 files (migrations, APIs, pages, components, hooks, docs, scripts).
**Modified:** 5 files (`.gitignore`, `package.json`, `useNavigation.ts`, `PermissionDetailPanel.tsx`, `PermissionList.tsx`).
**Removed:** 0.

---

## 14. Preservation Guarantees

| Area | Status |
|---|---|
| `gate_passes`, `/api/passes/*` | Untouched |
| `/api/gate/scan`, `movement_logs` | Untouched |
| `Scanner.tsx`, `ScanConfirmation.tsx` | Untouched |
| Existing dashboards | Untouched |
| Auth / session / CSRF | Untouched |
| Existing roles, nav items | Only added |
| `config_exit_reasons` | Untouched |

---

## 15. Verification

```bash
npx tsc --noEmit
npx eslint .
npx tsx scripts/verify-permission-workflow.ts
```

All three must pass before release.

---

## 16. Rollout

1. 2. Confirm 21 custom reasons + 4 device toggles (all OFF) are seeded.
3. Assign new roles via `/sysadmin/staff`; set `hostel_scope`.
4. 5. ````