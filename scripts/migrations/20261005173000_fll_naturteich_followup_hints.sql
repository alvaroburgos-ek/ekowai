-- FLL-Naturteich · engineer hints on every field, equation and compliance requirement (hint wave 2026-10-05).
-- Each description now carries a German hint and an English part after the marker "[EN] " (src/lib/eval/hint-text.ts; the form
-- renders the part of the page locale; the approval refusal prints the whole text as "Hinweis" for a block gate without its inputs).
-- Content authored from the printed guideline pages (rendered PDF read in the authoring session; the authoring JSON in the vault
-- carries a source string with the printed page per hint); every number / limit / clause in a hint is traceable to those pages.
-- SAFETY: text only (fields.description, equations.description, compliance_requirements.description); no field, equation, gate,
-- value or severity changes. The pre-block descriptions (encoder notes) are restored by the rollback and kept in the inventory JSON.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005173000_fll_naturteich_followup_hints.sql
-- Rollback: scripts/migrations/rollback-20261005173000_fll_naturteich_followup_hints.sql
BEGIN;
UPDATE compliance_requirements x SET description = 'Besteht, wenn alle neun Schwimmbereichswerte (FLLNT-04) die Richtwerte der Tab. 8 einhalten: Ammonium ≤ 0,3 mg/l; Gesamthärte ≥ 1,0 mmol/l; Leitfähigkeit ≤ 1000 µS/cm (20 °C); Nitrat ≤ 30,0 mg/l; Nitrit ≤ 0,01 mg/l; pH 7,0–9,0; Säurekapazität KS 4,3 ≥ 2 mmol/l; Gesamtphosphor und Orthophosphat (als P) ≤ 0,03 mg/l bei Typ I–III bzw. ≤ 0,01 mg/l bei Typ IV/V. Einzugeben: Naturteich-Typ hier und die swimming_test_*-Werte in FLLNT-04 (Referenzverfahren Anhang 1). Bei Abweichungen sind die biologischen Prozesse zu beobachten, ggf. eine erweiterte Gesamtwasseranalyse und Maßnahmen (§ 7.1.2).
[EN] Passes when all nine swimming-area values (FLLNT-04) meet the approximate values of Tab. 8: ammonium ≤ 0.3 mg/l; total hardness ≥ 1.0 mmol/l; conductivity ≤ 1000 µS/cm (20 °C); nitrate ≤ 30.0 mg/l; nitrite ≤ 0.01 mg/l; pH 7.0–9.0; acid capacity KS 4.3 ≥ 2 mmol/l; total phosphorus and orthophosphate (as P) ≤ 0.03 mg/l for Types I–III or ≤ 0.01 mg/l for Types IV/V. Enter: the pool type here and the swimming_test_* values in FLLNT-04 (reference method Appendix 1). If results deviate, the biological processes must be observed, if applicable an advanced total water analysis and measures (§ 7.1.2).' FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE x.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-04' AND x.code = 'REQ-10';
COMMIT;
