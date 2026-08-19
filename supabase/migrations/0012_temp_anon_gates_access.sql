-- Temporary policy to allow anon access to gates for testing
-- This unblocks the 406 error while we fix frontend auth

-- Allow anonymous users to read gates table
DROP POLICY IF EXISTS "gates_select_anon_testing" ON public.gates;
CREATE POLICY "gates_select_anon_testing"
ON public.gates
FOR SELECT
TO anon
USING (true);

-- Note: Remove this policy once frontend properly sends auth tokens
-- The authenticated policy (gates_select_auth) should be sufficient
