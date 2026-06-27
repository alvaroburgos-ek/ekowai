-- Access-Control Foundation (Sub-Project 1).
-- (1) project_collaborators: external client/designer attached per project.
-- (2) Lock the standards library (questions + formulas) to internal org members.
-- (3) Restrict project-table writes to engineer+; reads stay org-scoped.
-- (4) RLS for project_collaborators.
-- Idempotent. Externals (never org_members) are default-denied on project tables here.

-- ============================================================================
-- (1) project_collaborators table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,                 -- references auth.users(id)
  role        text NOT NULL,
  invited_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_collaborators_project_user_unique UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_collaborators
  DROP CONSTRAINT IF EXISTS project_collaborators_role_check;
ALTER TABLE public.project_collaborators
  ADD CONSTRAINT project_collaborators_role_check CHECK (role IN ('client','designer'));

-- ============================================================================
-- (2) Library tables: replace USING(true) reads with an org-membership gate.
--     Externals (never org_members) lose all access to questions + formulas.
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['standards','worksheet_templates','worksheet_sections','fields','equations','compliance_requirements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_internal', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()))
    $f$, t || '_read_internal', t);
  END LOOP;
END $$;

-- ============================================================================
-- (3) Project workflow tables: org-scoped reads, engineer-only writes.
--     Externals get no policy here -> default-deny in this sub-project.
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_standards','worksheet_instances','project_parameters']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_all_org', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_engineer', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid()))
    $f$, t || '_select_internal', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_insert_engineer', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
      WITH CHECK (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_update_engineer', t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR DELETE TO authenticated
      USING (project_id IN (
        SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
    $f$, t || '_delete_engineer', t);
  END LOOP;
END $$;

-- ============================================================================
-- (4) project_collaborators RLS: internal engineers manage; collaborator reads own row.
-- ============================================================================
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_manage_internal ON public.project_collaborators;
CREATE POLICY pc_manage_internal ON public.project_collaborators FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','engineer')));

DROP POLICY IF EXISTS pc_read_own ON public.project_collaborators;
CREATE POLICY pc_read_own ON public.project_collaborators FOR SELECT TO authenticated
  USING (user_id = auth.uid());
