-- APPLIED 2026-08-05 — VC-escalation re-verification batch (owner-authorized "apply all 10")
-- ============================================================================
-- These 10 gates escalated on the first resolver run ONLY because the evidence was VC
-- (two-column / image extraction). Each was re-verified per-gate against the RENDERED
-- source PDF in-session (pdftoppm page images where pdftotext drops glyphs), adversarial,
-- default-keep-block. Confirmed genuinely non-mandatory → block->warn. Effect re-queried.
-- Rollback: scripts/rollback-20260805100000_resolve_escalations_vc_reverified.sql
UPDATE compliance_requirements SET severity = 'warn' WHERE id = '380523c0-a93e-4cc2-9bd8-b0fb68995582'; -- DWA-A-201 CR-002  "in der Regel nicht … EW_BSB5=5000" (descriptive scope, no mandatory anchor)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = '22f9df00-7368-4855-94a1-e68dff901654'; -- ATV-A-704E CR-019 IQC-Card 3 "should be repeated" (recommendation register)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = '49b280e6-801c-4a93-98df-02e2d6c0e6cc'; -- ATV-A-704E CR-022 IQC-Card 6 "Usually … should not exceed ≤20%"; lower range explicitly allowed to exceed
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'beabf464-e506-4e73-8176-8f29164136e4'; -- ATV-A-704E CR-023 IQC-Card 7 "Usually … should not exceed ≤20%"; discretionary carve-out
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'ee4b65df-0721-451a-814e-5abbf4bc43c0'; -- DWA-A-222 CR-008  §4.3.5 "nur als Anhaltswerte zu verstehen" + "sollte" (declared non-binding)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'db1ee211-443c-4ece-825e-85e8f0156f34'; -- DWA-A-222 CR-010  §4.3.7 "sollte der Quotient tD/tT ≤ 0,35 sein" (purpose-justified recommendation)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'b7b22fc4-251f-4862-8b91-28e308a35de0'; -- DWA-A-222 CR-011 (A222-10) §4.4.1 "Es ist zweckmäßig … RV ≥ 1"
UPDATE compliance_requirements SET severity = 'warn' WHERE id = '19f7c726-5182-45b6-9a5b-2e494f9505d0'; -- DWA-A-222 CR-011 (A222-14) §4.4.1 "Es ist zweckmäßig … RV ≥ 1"
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'c6a10549-55ab-480d-852c-03324920d86d'; -- DWA-A-222 CR-019  §4.3.7 "CO sollte … mindestens 2 mg/l erreichen können" (sollte+können)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = 'ee3adf6a-7618-470f-9dcd-1c4381e58975'; -- DWA-A-222 CR-040 (A222-20) §5.7 "wird empfohlen … zweite Grenzkontaktmessung"
-- REVERSALS — NOT changed, stay BLOCK (VC ruling was wrong; mandatory anchor found on rendered-page re-read):
--   61c4cc3b-92ec-4592-952a-0ad3be285f71  DWA-A-222 CR-006  (85% value load-bearing in Reaktormindestvolumen arithmetic)
--   7d5ca38a-daf2-499a-abc8-71f14725cca1  DWA-A-222 CR-026  (DN≥150 sits on mandatory "sind … anzulegen")
--   43f5220b-3e8e-4022-a563-db6974480b71  DWA-A-222 CR-040 (A222-11) (Betriebstagebuch "hat … zu führen")
