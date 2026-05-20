-- =============================================================================
-- Grant table-level permissions to PostgREST roles.
-- Tables created via raw SQL migrations by the `postgres` user inherit a
-- default ACL that omits SELECT/INSERT/UPDATE/DELETE for authenticated/anon.
-- RLS policies govern row-level access; these GRANTs provide the table-level
-- access that PostgREST requires before evaluating any RLS policy.
-- =============================================================================

-- Pre-existing tables (may already be correct, but explicit is safer)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orgs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_members  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_documents TO authenticated;
GRANT SELECT                          ON TABLE public.report_archives  TO authenticated;

-- Standards library: authenticated may SELECT; INSERT/UPDATE/DELETE via service role only
GRANT SELECT ON TABLE public.standards               TO authenticated;
GRANT SELECT ON TABLE public.worksheet_templates     TO authenticated;
GRANT SELECT ON TABLE public.worksheet_sections      TO authenticated;
GRANT SELECT ON TABLE public.fields                  TO authenticated;
GRANT SELECT ON TABLE public.equations               TO authenticated;
GRANT SELECT ON TABLE public.compliance_requirements TO authenticated;

-- Project workflow: authenticated may read+write (RLS enforces org scope)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_standards   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worksheet_instances  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_parameters   TO authenticated;

-- Immutable tables: authenticated may INSERT + SELECT (RLS blocks UPDATE/DELETE)
GRANT SELECT, INSERT ON TABLE public.approval_events TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_log       TO authenticated;

-- Sequences for bigserial tables
GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO service_role;

-- service_role: full access to all tables (bypasses RLS, used by server-side actions)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orgs                  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_members           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_documents     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_archives       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.standards             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worksheet_templates   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worksheet_sections    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fields                TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.equations             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.compliance_requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_standards     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worksheet_instances   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_parameters    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.approval_events       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_log             TO service_role;
