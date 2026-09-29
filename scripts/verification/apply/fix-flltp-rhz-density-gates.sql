-- FLL-TP-RHIZOM-2023 · REQ-16 / REQ-17 / REQ-18 (2026-09-29, coverage walk Table B-2, source-settled class (a):
-- symbol mismatch between a gate and the standard's own declared fields).
-- Print (TP §3.7, pdftotext line 379): "…in den Prüfgefäßen muss mindestens 80 % der Bestandsdichte der Pflanzen in den
-- Kontrollgefäßen…" — the 80 % ratio applies to EVERY evaluation (6, 12, 18, 24 months). The encoding declares one
-- ratio field per evaluation (RHZ-13 dichte_relativ_prozent = 6 months, RHZ-14 relativ_prozent_12mon,
-- RHZ-15 relativ_prozent_18mon, RHZ-16 relativ_prozent_24mon) but the 12/18/24-month gates all read the 6-month
-- symbol, so the later ratios are never checked. Fix = point each gate at its own evaluation's field.
-- Read-back: select code, condition from compliance_requirements where id in (the three ids). Rollback below.
BEGIN;
UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_12mon >= 120 AND relativ_prozent_12mon >= 80'
 WHERE id = 'faccb52d-fff7-48d9-9dff-5046c0a0dd0e' AND code = 'REQ-16'
   AND condition = 'bestandsdichte_p_avg_12mon >= 120 AND dichte_relativ_prozent >= 80';
UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_18mon >= 160 AND relativ_prozent_18mon >= 80'
 WHERE id = '58683d0b-3d30-4a20-a186-838049acf7c3' AND code = 'REQ-17'
   AND condition = 'bestandsdichte_p_avg_18mon >= 160 AND dichte_relativ_prozent >= 80';
UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_24mon >= 160 AND relativ_prozent_24mon >= 80'
 WHERE id = '057c9d5e-ee15-4de5-b759-253a9140d274' AND code = 'REQ-18'
   AND condition = 'bestandsdichte_p_avg_24mon >= 160 AND dichte_relativ_prozent >= 80';
COMMIT;
-- ROLLBACK (run separately if needed):
-- UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_12mon >= 120 AND dichte_relativ_prozent >= 80' WHERE id = 'faccb52d-fff7-48d9-9dff-5046c0a0dd0e';
-- UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_18mon >= 160 AND dichte_relativ_prozent >= 80' WHERE id = '58683d0b-3d30-4a20-a186-838049acf7c3';
-- UPDATE compliance_requirements SET condition = 'bestandsdichte_p_avg_24mon >= 160 AND dichte_relativ_prozent >= 80' WHERE id = '057c9d5e-ee15-4de5-b759-253a9140d274';
-- Note: REQ-16/-17 are hosted on RHZ-12 while their inputs live on RHZ-14/-15 (cross-sheet symbols resolve
-- project-wide, conflict-free) — hosting is unchanged here; the coverage report lists it as a separate item.
