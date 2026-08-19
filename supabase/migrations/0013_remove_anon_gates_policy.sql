-- Remove temporary anonymous gates access policy and add role-appropriate policies
-- for operator/supervisor data that was previously returning empty (silent failure)
-- due to auth_user being null in client-side direct Supabase calls.

-- 1. Drop the temporary anonymous gates policy (security cleanup)
DROP POLICY IF EXISTS "gates_select_anon_testing" ON public.gates;

-- 2. Add a proper authenticated-only SELECT policy for gates (active gates only)
--    The anonymous (anon) role is explicitly excluded; only authenticated users can read.
DROP POLICY IF EXISTS "Authenticated users can view active gates" ON public.gates;
CREATE POLICY "Authenticated users can view active gates"
ON public.gates
FOR SELECT
TO authenticated
USING (is_active = TRUE);

-- 3. Allow operators to view campus_occupancy for their gate
--    Previously only admins could view campus_occupancy, causing the operator
--    page's HEAD campus_occupancy request to return empty results.
DROP POLICY IF EXISTS "Operators can view campus occupancy for their gate" ON public.campus_occupancy;
CREATE POLICY "Operators can view campus occupancy for their gate"
ON public.campus_occupancy
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'operator'
      AND gate_id::TEXT = (
        SELECT gates.id FROM gates
        WHERE gates.id::TEXT = campus_occupancy.last_gate_id::TEXT
      )
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'sysadmin')
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'supervisor'
      AND campus_occupancy.last_gate_id::TEXT = ANY(
        COALESCE((SELECT supervised_gates FROM users WHERE id = auth.uid()), ARRAY[]::TEXT[])
      )
  )
);

-- 4. Allow supervisors to view all gate_logs
--    Previously only operators (their gates) and admins could view gate_logs,
--    which blocked supervisors from the live events feed.
DROP POLICY IF EXISTS "Supervisors can view all gate logs" ON public.gate_logs;
CREATE POLICY "Supervisors can view all gate logs"
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'supervisor')
  OR gate_id = (SELECT gate_id FROM users WHERE id = auth.uid() AND role = 'operator')
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Add indexes to support the new policies (performance)
CREATE INDEX IF NOT EXISTS idx_campus_occupancy_last_gate ON public.campus_occupancy(last_gate_id);
