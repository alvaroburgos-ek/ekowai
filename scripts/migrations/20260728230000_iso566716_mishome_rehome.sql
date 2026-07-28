-- SOURCE-SETTLED — ISO-5667-16: mis-homed WARN gate re-home (17 gates).
-- This guideline pairs "check" worksheets (01/03/05/07) with "data" worksheets (02/04/06/08). 17
-- warn compliance requirements were filed on the check worksheet, but every operand field lives on
-- the paired DATA worksheet — all within ISO-5667-16, no cross-guideline content. Engine lookup is
-- worksheet-LOCAL, so on the check sheet the operand is never in the value map → the gate resolves
-- pending/fail forever, never reflecting the engineer's answer. Re-home each CR to the paired data
-- worksheet (its operand's sole home). All severity=warn → ZERO enforcement change.
--
-- REPRODUCTION: EXECUTED per row this session through the real evaluateCondition (operands absent on
-- the check sheet → pending/fail; operands present on the data sheet → pass/fail). broken→works each.
--
-- Homing (all within ISO-5667-16):
--   CR-003..007 ws01 → ws02   CR-013..018 ws03 → ws04   CR-023..025 ws05 → ws06   CR-031..033 ws07 → ws08
-- Guarded per-row to the current (broken) host; aborts unless exactly 17 rows move.
-- Rollback: scripts/rollback-20260728230000-iso566716-mishome.sql
DO $$
DECLARE v int := 0; t int := 0;
  ws01 uuid := '167c7efd-3823-4555-a100-e44ee066cc42'; ws02 uuid := 'a25b9256-28c7-4101-8f42-2893b46ec705';
  ws03 uuid := 'db935b3c-5d8c-4da7-8951-7f0b974e64e2'; ws04 uuid := '15fc6170-bfe7-461b-a39f-9351624ba9c0';
  ws05 uuid := 'f2ff0173-7d37-4498-997e-250b4108eaeb'; ws06 uuid := 'c2fd5bf6-e3e7-431a-853a-dce1aae39a1c';
  ws07 uuid := '1036e063-2ad5-469b-86c6-7f4b2e0de1ef'; ws08 uuid := '658df938-00d6-4261-a095-d89cd2c38c59';
BEGIN
  UPDATE compliance_requirements SET worksheet_template_id=ws02 WHERE worksheet_template_id=ws01 AND id IN
    ('8c4898ae-9b2e-4e50-92d3-84cf85584921','83508274-f2fa-4424-9f59-aff0b7dde12b','f9f21e0e-791e-4ba1-8fbb-479ae48e062e',
     '9a36f0f2-02df-4d58-9d4e-ebcb66802bd1','d0bdcc6f-6f5a-4b02-8c1d-08ef35ed3aa7');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  UPDATE compliance_requirements SET worksheet_template_id=ws04 WHERE worksheet_template_id=ws03 AND id IN
    ('a1f49bb8-1876-4e72-a6f9-ca70a0f92494','05b70597-f4a4-44d1-adf2-91dbd7001ca1','b6443fba-077e-4f64-a37b-0babca7770b0',
     '04fba4ba-2df8-4ba9-8f4f-50626f5085fd','21806c73-726e-4d37-ac55-20b20760c852','c62d52f9-d202-4c29-87a1-1fa00269feff');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  UPDATE compliance_requirements SET worksheet_template_id=ws06 WHERE worksheet_template_id=ws05 AND id IN
    ('a6ffc69f-68ee-4446-8901-cfc38113faf7','66d791f5-0f87-4be8-83bb-00d832465e45','8014b138-1f6e-438a-ab06-b283b08b1bdc');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  UPDATE compliance_requirements SET worksheet_template_id=ws08 WHERE worksheet_template_id=ws07 AND id IN
    ('6bf1e1fd-0680-4082-9f39-a263b5fe68c6','d9887208-07a0-4a18-bc75-2cce8548c4fb','5ce778f2-cddc-4c08-be59-fb13f1958690');
  GET DIAGNOSTICS v=ROW_COUNT; t:=t+v;
  IF t <> 17 THEN RAISE EXCEPTION 'ISO-5667-16 expected 17 re-homes, got % — prod not in expected state', t; END IF;
  RAISE NOTICE 'ISO-5667-16 mis-homed warn: % gates re-homed', t;
END $$;
