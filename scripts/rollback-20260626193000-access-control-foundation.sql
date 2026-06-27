-- Rollback for supabase/migrations/20260626193000_access_control_foundation.sql
-- Restores the pre-foundation RLS (library readable by any authenticated; project
-- tables FOR ALL by org membership) and drops project_collaborators.

-- (2-rollback) Library tables: restore USING(true) reads.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['standards','worksheet_templates','worksheet_sections','fields','equations','compliance_requirements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read_authenticated', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read_authenticated', t);
  END LOOP;
END $$;

-- (3-rollback) Project workflow tables: restore the FOR ALL org-scoped policy.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_standards','worksheet_instances','project_parameters']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_internal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_engineer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_all_org', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR ALL TO authenticated
      USING (project_id IN (SELECT p.id FROM projects p JOIN org_members om ON om.org_id=p.org_id WHERE om.user_id=auth.uid()))
      WITH CHECK (project_id IN (SELECT p.id FROM projects p JOIN org_members om ON om.org_id=p.org_id WHERE om.user_id=auth.uid()))
    $f$, t || '_all_org', t);
  END LOOP;
END $$;

-- (1+4-rollback) Drop project_collaborators (its policies drop with the table).
DROP TABLE IF EXISTS public.project_collaborators;
