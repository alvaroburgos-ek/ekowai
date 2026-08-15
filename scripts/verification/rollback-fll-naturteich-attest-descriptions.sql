-- Rollback for fll-naturteich-attest-descriptions.sql — restores the pre-apply
-- state (all 7 descriptions were NULL on 2026-08-14, verified before staging).
UPDATE fields SET description = NULL
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND (
    (wt.code = 'FLLNT-01' AND fields.symbol IN ('attest_fllnt_01_req_03','attest_fllnt_01_req_04')) OR
    (wt.code = 'FLLNT-06' AND fields.symbol IN ('attest_fllnt_06_req_14','attest_fllnt_06_req_18')) OR
    (wt.code = 'FLLNT-09' AND fields.symbol = 'attest_fllnt_09_req_23') OR
    (wt.code = 'FLLNT-12' AND fields.symbol = 'attest_fllnt_12_req_25') OR
    (wt.code = 'FLLNT-13' AND fields.symbol = 'attest_fllnt_13_req_28')
  );
