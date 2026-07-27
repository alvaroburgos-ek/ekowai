-- Rollback for _STAGED_20260724130000_fll_check_encodings_es1.sql
-- Removes only the RHZ-07 ES-1 proposed CRs (deterministic REQ-RHZ07-* codes).
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
BEGIN;
DELETE FROM compliance_requirements cr
USING worksheet_templates wt, standards s
WHERE cr.worksheet_template_id = wt.id
  AND wt.standard_id = s.id
  AND s.code = 'FLL-TP-RHIZOM-2023'
  AND wt.code = 'FLLTP-RHZ-07'
  AND cr.code LIKE 'REQ-RHZ07-%';
COMMIT;
