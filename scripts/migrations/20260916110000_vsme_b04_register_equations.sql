-- Plan 2a · VSME-B04.100: the three per-medium pollutant sums become equation rows (were code-only materialisation
-- in saveWorksheet's pollutant block; now evaluated by the generic register materialiser).
-- Formulas byte-identical to FALLBACK_REGISTER_EQUATIONS in src/lib/eval/register-configs.ts; after applying,
-- the fallback entries can be deleted (withFallbackRegisterEquations appends a fallback only while no DB
-- equation of the worksheet outputs that symbol, so applying this is idempotent for the engine).
-- Dollar-quoted so the literal single quotes in flag(...)/if(medium == 'air', …) need no SQL escaping.
-- Rollback: scripts/rollback-20260916110000-vsme-b04-register-equations.sql (deletes by (worksheet_template_id, equation_number)).
-- WRITTEN, NOT APPLIED — owner applies with stamp.
BEGIN;
INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status)
SELECT wt.id, 'B04.100-air', $q$AmountOfEmissionToAir = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == 'air', amount_t, 0)))$q$, ARRAY['pollutant_register'], 'AmountOfEmissionToAir', 't', 'VSME para 32', 'Summe Luft aus dem Schadstoffregister', 'imported_unverified'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id WHERE s.code = 'VSME' AND wt.code = 'VSME-B04.100'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status)
SELECT wt.id, 'B04.100-water', $q$AmountOfEmissionToWater = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == 'water', amount_t, 0)))$q$, ARRAY['pollutant_register'], 'AmountOfEmissionToWater', 't', 'VSME para 32', 'Summe Wasser aus dem Schadstoffregister', 'imported_unverified'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id WHERE s.code = 'VSME' AND wt.code = 'VSME-B04.100'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;

INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status)
SELECT wt.id, 'B04.100-soil', $q$AmountOfEmissionToSoil = if(flag(pollutant_register, 'not_applicable'), 0, sum_rows(pollutant_register, if(medium == 'soil', amount_t, 0)))$q$, ARRAY['pollutant_register'], 'AmountOfEmissionToSoil', 't', 'VSME para 32', 'Summe Boden aus dem Schadstoffregister', 'imported_unverified'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id WHERE s.code = 'VSME' AND wt.code = 'VSME-B04.100'
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;
COMMIT;
