-- 20261030000000_refresh_students_view.sql
-- Refresh the public.students view to include soft-delete filtering and
-- full student metadata columns (some added as NULL placeholders for
-- columns that will be backfilled by later migrations).
--
-- Fixes R3-12: the students view was stale — missing soft-delete filter,
-- missing fields added after the baseline, and never updated by later migrations.
--
-- Columns that do not yet exist on student_details are emitted as NULL
-- placeholders so the view is forward-compatible; once a migration adds the
-- real column, the placeholder can be swapped for sd.<column>.

CREATE OR REPLACE VIEW public.students AS
SELECT
  u.id,
  u.unique_id AS roll,
  u.name,
  u.department_id AS department,
  COALESCE(sd.year, 1) AS year,
  COALESCE(sd.section, 'A') AS section,
  COALESCE(sd.batch, '') AS batch,
  u.photo_url AS photo,
  u.email,
  u.phone,
  NULL::text AS father_name,
  NULL::text AS landline_number,
  NULL::date AS dob,
  NULL::text AS parent_name,
  NULL::text AS parent_phone,
  sd.guardian_id AS parent_id,
  u.qr_code,
  NULL::timestamptz AS id_valid_until,
  u.status,
  sd.student_type,
  NULL::text AS current_entry_type,
  sd.gender,
  sd.hostel_block,
  sd.room_number,
  sd.hostel_curfew_time,
  sd.warden_id,
  NULL::text AS course,
  NULL::text AS branch,
  NULL::text AS semester,
  NULL::text AS regulation,
  u.deleted_at
FROM public.users u
LEFT JOIN public.student_details sd ON sd.user_id = u.id
WHERE u.role = 'student'
  AND u.deleted_at IS NULL;
