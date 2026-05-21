-- =============================================================================
-- Fix infinite recursion in org_members RLS policy.
-- The original policy references org_members from within itself, causing
-- infinite recursion. Fix: use a SECURITY DEFINER function that runs with
-- elevated privileges (bypassing RLS on org_members) for the inner lookup.
-- =============================================================================

-- Helper function: returns the org_ids of which the current user is a member.
-- SECURITY DEFINER makes it run as the function owner (postgres), bypassing RLS.
CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;

-- Drop the recursive policy and replace with non-recursive equivalent.
DROP POLICY IF EXISTS members_select ON public.org_members;

CREATE POLICY members_select ON public.org_members
  FOR SELECT
  USING (org_id IN (SELECT public.my_org_ids()));

-- Grant EXECUTE on the helper function to all PostgREST roles.
GRANT EXECUTE ON FUNCTION public.my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_org_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.my_org_ids() TO anon;
