-- Rollback for 20260724_fll_rhz18_rhz21_verdict_block_gates.sql
-- Removes ONLY the two verdict-block CRs added by that migration (matched by the
-- deterministic codes + worksheet_template + FLL-TP-RHIZOM-2023 standard join).
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
BEGIN;

DELETE FROM compliance_requirements cr
USING worksheet_templates wt, standards s
WHERE cr.worksheet_template_id = wt.id
  AND wt.standard_id = s.id
  AND s.code = 'FLL-TP-RHIZOM-2023'
  AND (
    (wt.code = 'FLLTP-RHZ-18' AND cr.code = 'REQ-RHZ18-VERDICT')
    OR (wt.code = 'FLLTP-RHZ-21' AND cr.code = 'REQ-RHZ21-CONFORMITY')
  );

COMMIT;
