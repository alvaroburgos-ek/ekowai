-- Verify for 20260724_fll_rhz18_rhz21_verdict_block_gates.sql
-- Expect exactly the two block CRs live, each on its verdict worksheet.
SELECT wt.code AS worksheet, cr.code, cr.severity, cr.condition,
       cr.clause_reference, cr.requires_attestation, cr.audit_status
FROM compliance_requirements cr
JOIN worksheet_templates wt ON wt.id = cr.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-TP-RHIZOM-2023'
WHERE cr.code IN ('REQ-RHZ18-VERDICT','REQ-RHZ21-CONFORMITY')
ORDER BY wt.code, cr.code;
