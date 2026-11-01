-- Backfill current_entry_type from student_type for rows where it is NULL.
-- student_type HM/HF = hostel male/female -> hosteller; DM/DF = day
-- scholar male/female -> day_scholar. Rows with student_type NULL get
-- day_scholar (the default entry type for never-scanned students).
-- Idempotent: only touches NULLs.
UPDATE student_details
   SET current_entry_type = CASE
         WHEN student_type IN ('HM', 'HF') THEN 'hosteller'
         ELSE 'day_scholar'
       END
 WHERE current_entry_type IS NULL;
