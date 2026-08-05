-- REJECTED 2026-08-05 by PDF verification — NOT APPLIED, gate stays block.
-- CR-008 is anchored by the mandatory "erforderliche Mindestdurchflusszeit tR = 1 d" (DWA-A-201 S.11);
-- only the depth/area limits are "bewährt haben sich" descriptive. The block→warn ruling was a reversal.
-- R-MODAL-SEVERITY (risk med)
UPDATE compliance_requirements SET severity = 'warn' WHERE id = '2e0090d4-f53e-4d8a-8dff-883eca7e3134';
