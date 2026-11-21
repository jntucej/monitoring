-- 20270129000007_add_complaint_respondent_details.sql
--
-- A complaint can be filed about a SPECIFIC person (a faculty member, another
-- student, staff) — the student identifies them by roll/ID or free-text
-- details about them. The complaints table had no field to capture "who is
-- this complaint about," so the intake could only record category + narrative.
--
-- This adds an optional free-text respondent_details column. It is a single
-- text blob (roll/ID or a description) so the intake stays simple and the
-- student can identify the person however they know them. Idempotent.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS respondent_details TEXT;

COMMENT ON COLUMN public.complaints.respondent_details
  IS 'Who the complaint is about: a roll/ID or free-text details identifying the person (faculty, student, staff). NULL when the complaint is not about a specific person.';
