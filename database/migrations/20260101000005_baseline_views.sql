SET check_function_bodies = off;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables
             WHERE schemaname='public' AND tablename='system_config') THEN
    DROP TABLE public.system_config CASCADE;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.system_config AS
SELECT id AS key, value, value AS data, updated_at FROM public.system_settings;

CREATE OR REPLACE VIEW public.students AS
SELECT u.id, u.unique_id AS roll, u.name, u.department_id AS department,
       COALESCE(sd.year,1) AS year, COALESCE(sd.section,'A') AS section,
       COALESCE(sd.batch,'') AS batch, u.photo_url AS photo, u.email, u.phone,
       NULL::text AS parent_name, NULL::text AS parent_phone,
       sd.guardian_id AS parent_id, u.qr_code, NULL::timestamptz AS id_valid_until,
       u.status, sd.student_type, sd.gender, sd.hostel_block, sd.room_number,
       sd.hostel_curfew_time, sd.warden_id
FROM public.users u
LEFT JOIN public.student_details sd ON sd.user_id = u.id
WHERE u.role = 'student';
