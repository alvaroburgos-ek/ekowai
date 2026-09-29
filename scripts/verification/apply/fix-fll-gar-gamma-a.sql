-- FLL-GAR-2023 · FLL-GAR-22 field gamma_A (2026-09-29, coverage walk A-159 / B-01, source-settled: printed symbol list).
-- VA — rendered PDF page 135 (printed p. 133), Anhang 2, symbol list, read 2026-09-29:
--   "γA   Sicherheit gegen Auftrieb [-], γA = 1,00"
--   "γ'D  Wichte der Auflast unter Auftrieb [kN/m³]"   (the unit weight is γ'D = gamma_D_prime, a separate field)
-- The encoding labels gamma_A "Auftriebswichte γ_A" with unit kN/m³ and no default. It is a dimensionless safety
-- factor that the guideline fixes at 1,00 (data_class standard_fixed). Equation 2b already uses it as a factor
-- (Delta_u * gamma_A). Only label, unit, description and the printed default change; no value or gate changes.
-- NOTE (ruling, not applied): the printed inequality reads "dD ≥ Δu x γA / cos β − (γ'F x dF + γ'Di x dDi)" — left side
-- printed as dD (a thickness) while every term on the right is kN/m²; the encoding's 2b puts g' on the left and cos β
-- under the whole bracket. Which reading is intended is a ruling for Alvaro (coverage report FLL-GAR Table B-01).
BEGIN;
UPDATE fields
   SET label_de = 'Sicherheit gegen Auftrieb γ_A',
       label_en = 'Safety factor against uplift γ_A',
       unit = '-',
       default_value = '1.00',
       description = 'Anhang 2 (S. 133): „γA Sicherheit gegen Auftrieb [-], γA = 1,00“ — dimensionslos, vom Regelwerk auf 1,00 gesetzt. Nicht die Auftriebswichte (das ist γ''D).'
 WHERE id = '68974fef-ab20-40c9-8f51-c395197346b5' AND symbol = 'gamma_A' AND unit = 'kN/m³';
COMMIT;
-- Read-back: select symbol, label_de, unit, default_value from fields where id = '68974fef-ab20-40c9-8f51-c395197346b5';
-- Rollback:
-- UPDATE fields SET label_de = 'Auftriebswichte γ_A', label_en = NULL, unit = 'kN/m³', default_value = NULL, description = NULL
--  WHERE id = '68974fef-ab20-40c9-8f51-c395197346b5';
