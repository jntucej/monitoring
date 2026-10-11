# Unique ID Pattern — ucej-NNNN Auto-Generation

## Overview

When a user is created via `POST /api/users` with a **non-staff role** and no
explicit `uniqueId` (or `employeeId`) is supplied, the system auto-generates a
sequential unique identifier in the form:

```
ucej-{rolePrefix}-{NNNN}
```

- `rolePrefix` is a single lowercase character per role (see table below)
- `NNNN` is a zero-padded 4-digit number = **(max existing NNNN for that prefix) + 1**

## Role Prefix Mapping

| Role       | Prefix | Example Generated IDs          |
|------------|--------|--------------------------------|
| `student`  | `s`    | `ucej-s-0001`, `ucej-s-0002`… |
| `parent`   | `p`    | `ucej-p-0001`, `ucej-p-0002`… |
| `guardian` | `g`    | `ucej-g-0001`, `ucej-g-0002`… |
| `visitor`  | `v`    | `ucej-v-0001`, `ucej-v-0002`… |
| `worker`   | `w`    | `ucej-w-0001`, `ucej-w-0002`… |

## Staff Roles — Unchanged Convention

Staff roles keep their existing unique_id convention (single uppercase codes
like `FACULTY`, `HOD`, `PRINCIPAL`, `WARDEN`, `OPERATOR`, `STAFF`,
`CARETAKER`, `DEPUTY_WARDEN`, `HOSTEL_MANAGER`, `OIE`, `EXAM_BRANCH`,
`EXAM_SUPERINTENDENT`, `ADMIN`, `SYSADMIN`, `SUPERVISOR`, or `EMP-XXXXXXXX`).
Auto-generation does **not** apply to these roles.

Staff role list (for reference):

```
faculty, hod, principal, warden, operator, staff, caretaker,
deputy_warden, hostel_manager, oie, exam_branch, exam_superintendent,
admin, sysadmin, supervisor
```

## How Generation Works

`generateUceJUniqueId(role)` in `src/lib/db.ts`:

1. Looks up the role in the `UCEJ_ROLE_PREFIXES` map. If no prefix is found,
   the role is not eligible for auto-generation.
2. Queries `public.users.unique_id` with a `LIKE 'ucej-{prefix}-%'` filter.
3. Finds the maximum numeric suffix across all matching rows.
4. Returns the next number zero-padded to 4 digits: `ucej-{prefix}-{NNNN+1}`.
5. If no existing values exist (or the query fails), returns `ucej-{prefix}-0001`.

## Override: Custom Unique ID

In the sysadmin **Add User** form (`UserManagement.tsx`), when the selected
role is one of `student` / `parent` / `guardian` / `visitor` / `worker`, an
optional **Custom Unique ID** field appears. If filled, that value is sent as
`uniqueId` in the POST body and **overrides** the auto-generated value.

In the **Create Student** flow (`sysadmin/students/page.tsx`), the
**Custom Unique ID** field works the same way. The legacy **Roll Number**
field remains available and acts as a fallback; if both are blank, the
auto-generated ID is used.

## Response Shape

The POST response now includes:

```jsonc
{
  "success": true,
  "data": { /* full user object */ },
  "uniqueId": "ucej-s-0001",          // the ID actually stored
  "meta": {
    "authProvider": "supabase",
    "inviteSent": false,
    "uniqueIdGenerated": true        // true when auto-generated, false when explicitly supplied
  }
}
```

The success toast in both the Add User form and the Create Student flow
displays the assigned ID, e.g. `✅ Student John added with ID ucej-s-0001 (auto-generated)`.

## Email Derivation

When no email is supplied, the auto-generated ID is used as the local part:

```
ucej-s-0001@jntuhcej.ac.in
```
