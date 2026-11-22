-- ============================================================
-- 20270130000006 · institutional reference domain workflows (PR-15)
-- ============================================================
--
-- PR-15's three complete chains need two more reference domain
-- definitions (the debarment chain + the security-incident chain).
-- Compose, don't fork:
--   * academic_status is the debarment workflow (Example 2).
--   * security_incident is the risk-engine → emergency-chain input
--     (Example 3: a security incident is what drives an emergency
--     command; the chain is incident → risk → state → command →
--     gate → audit → review).
--
-- Idempotent: ON CONFLICT (code) DO UPDATE. No other data is touched.

INSERT INTO public.workflow_definitions (code, name, states, transitions, transition_roles, version) VALUES
  ('academic_status',
   'Academic Status (Debarment)',
   '["under_review","debar_pending","debarred","restored"]'::jsonb,
   '{
     "under_review":     ["debar","restore"],
     "debar_pending":    ["debar","restore"],
     "debarred":         ["restore"],
     "restored":         []
   }'::jsonb,
   '{
     "under_review":  ["hod","academic_officer"],
     "debar_pending": ["principal"],
     "debarred":      ["principal"],
     "restored":      ["principal","hod"]
   }'::jsonb,
   1),
  ('security_incident',
   'Security Incident',
   '["reported","assessed","contained","closed","emergency"]'::jsonb,
   '{
     "reported":  ["assess","close"],
     "assessed":  ["contain","escalate_emergency","close"],
     "contained": ["close"],
     "closed":    [],
     "emergency": ["close"]
   }'::jsonb,
   '{
     "reported":  ["security_officer","deputy_warden"],
     "assessed":  ["deputy_warden","principal"],
     "contained": ["deputy_warden","principal"],
     "closed":    ["deputy_warden","principal"],
     "emergency": ["principal"]
   }'::jsonb,
   1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, states = EXCLUDED.states,
  transitions = EXCLUDED.transitions, transition_roles = EXCLUDED.transition_roles;

-- ============================================================
-- Authority policies for the reference domain actions
-- ============================================================
INSERT INTO public.authority_policies
  (code, name, role, context, operation, case_type, scope_type, scope_code, bounds, version)
VALUES
  ('academic_status.debar.principal', 'Debar student',
   'principal', 'chief_warden', 'debar', 'academic_status', 'institution', NULL, '{}'::jsonb, 1),
  ('academic_status.restore.hod', 'Restore academic status',
   'hod', 'academic', 'restore', 'academic_status', 'campus_wide', NULL, '{}'::jsonb, 1),
  ('academic_status.restore.principal', 'Restore academic status (principal)',
   'principal', 'chief_warden', 'restore', 'academic_status', 'institution', NULL, '{}'::jsonb, 1),
  ('security_incident.assess.deputy_warden', 'Assess security incident',
   'deputy_warden', NULL, 'assess', 'security_incident', 'campus_wide', NULL, '{}'::jsonb, 1),
  ('security_incident.assess.principal', 'Assess security incident (principal)',
   'principal', 'chief_warden', 'assess', 'security_incident', 'institution', NULL, '{}'::jsonb, 1),
  ('security_incident.contain.deputy_warden', 'Contain security incident',
   'deputy_warden', NULL, 'contain', 'security_incident', 'campus_wide', NULL, '{}'::jsonb, 1),
  ('security_incident.escalate_emergency.principal', 'Escalate to emergency',
   'principal', 'chief_warden', 'escalate_emergency', 'security_incident', 'institution', NULL, '{}'::jsonb, 1),
  ('security_incident.close.deputy_warden', 'Close security incident',
   'deputy_warden', NULL, 'close', 'security_incident', 'campus_wide', NULL, '{}'::jsonb, 1),
  ('security_incident.close.principal', 'Close security incident (principal)',
   'principal', 'chief_warden', 'close', 'security_incident', 'institution', NULL, '{}'::jsonb, 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, context = EXCLUDED.context,
  operation = EXCLUDED.operation, case_type = EXCLUDED.case_type,
  scope_type = EXCLUDED.scope_type, scope_code = EXCLUDED.scope_code,
  bounds = EXCLUDED.bounds;
