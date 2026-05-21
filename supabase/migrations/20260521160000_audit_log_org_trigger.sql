-- After tightening audit_log SELECT RLS in 20260521150000, app code that
-- inserts audit_log rows without org_id produces rows that are invisible
-- (the SELECT policy requires org_id ∈ user's orgs).
--
-- Fix: BEFORE INSERT trigger that auto-derives org_id from project_id when
-- the app supplies project_id but not org_id. This is the canonical pattern
-- for derived audit columns and removes the need to update every action.

CREATE OR REPLACE FUNCTION public.audit_log_fill_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_fill_org_id_trg ON audit_log;

CREATE TRIGGER audit_log_fill_org_id_trg
BEFORE INSERT ON audit_log
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_fill_org_id();
