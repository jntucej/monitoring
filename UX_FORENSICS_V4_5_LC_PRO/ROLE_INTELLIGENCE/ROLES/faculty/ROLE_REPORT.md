# ROLE_REPORT — faculty

**Role:** Faculty (`faculty`)
**Audit date:** 2026-11-24
**Status:** Consolidated in `ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md` §faculty
**Verification Log:** See consolidated report.

- 16 pages + 1 top-level (attendance)
- 2 write paths: `POST /api/class-messages` (line 136), `POST /api/class-level-issues/[id]/resolve` (line 162)
- 3 EmptyState stubs: subject, subject/classes, subject/attendance
- **Finding F-FA-01:** 3 EmptyState stubs
- **Finding F-FA-02:** FacultyRosterPanel PATCH not mounted
