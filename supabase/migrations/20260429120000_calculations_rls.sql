-- Plan 2 Task 10: org_id consistency trigger for calculations.
-- (RLS policies were already created in Plan 1's RLS migration.)

CREATE OR REPLACE FUNCTION enforce_calc_org_match() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id <> (SELECT org_id FROM projects WHERE id = NEW.project_id) THEN
    RAISE EXCEPTION 'calc.org_id must match project.org_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calc_org_match ON calculations;
CREATE TRIGGER calc_org_match
  BEFORE INSERT OR UPDATE OF org_id, project_id ON calculations
  FOR EACH ROW EXECUTE FUNCTION enforce_calc_org_match();
