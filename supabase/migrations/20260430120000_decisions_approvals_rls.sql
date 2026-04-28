-- Plan 3 Task 4: triggers for decisions, approvals, status sync, auto-revert.
-- (RLS policies on decisions + approvals already exist from Plan 1's RLS migration.)

-- decision.org_id must match calc.org_id
CREATE OR REPLACE FUNCTION enforce_decision_org_match() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id <> (SELECT org_id FROM calculations WHERE id = NEW.calculation_id) THEN
    RAISE EXCEPTION 'decision.org_id must match calculation.org_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decision_org_match ON decisions;
CREATE TRIGGER decision_org_match
  BEFORE INSERT OR UPDATE OF org_id, calculation_id ON decisions
  FOR EACH ROW EXECUTE FUNCTION enforce_decision_org_match();

-- approval.org_id must match calc.org_id
CREATE OR REPLACE FUNCTION enforce_approval_org_match() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id <> (SELECT org_id FROM calculations WHERE id = NEW.calculation_id) THEN
    RAISE EXCEPTION 'approval.org_id must match calculation.org_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approval_org_match ON approvals;
CREATE TRIGGER approval_org_match
  BEFORE INSERT ON approvals
  FOR EACH ROW EXECUTE FUNCTION enforce_approval_org_match();

-- Denormalise current approval state onto calculations.status
CREATE OR REPLACE FUNCTION sync_calc_status_from_approval() RETURNS TRIGGER AS $$
BEGIN
  UPDATE calculations
  SET status = (
    CASE NEW.action
      WHEN 'submitted'         THEN 'submitted'::calc_status
      WHEN 'approved'          THEN 'approved'::calc_status
      WHEN 'rejected'          THEN 'rejected'::calc_status
      WHEN 'changes_requested' THEN 'changes_requested'::calc_status
      ELSE status
    END
  ),
  updated_at = NOW()
  WHERE id = NEW.calculation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approval_status_sync ON approvals;
CREATE TRIGGER approval_status_sync
  AFTER INSERT ON approvals
  FOR EACH ROW EXECUTE FUNCTION sync_calc_status_from_approval();

-- Auto-revert: editing inputs of an approved calc resets it to draft
CREATE OR REPLACE FUNCTION revert_approved_on_edit() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.inputs IS DISTINCT FROM OLD.inputs THEN
    NEW.status = 'draft'::calc_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS revert_approved_on_edit ON calculations;
CREATE TRIGGER revert_approved_on_edit
  BEFORE UPDATE OF inputs ON calculations
  FOR EACH ROW EXECUTE FUNCTION revert_approved_on_edit();
