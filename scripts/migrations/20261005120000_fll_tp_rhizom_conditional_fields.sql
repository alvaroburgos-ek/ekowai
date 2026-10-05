-- FLL-TP-RHIZOM-2023 · readiness run 2026-10-05 (defects D-1, D-2, D-3 of 14_FLL-Run_TP-Rhizom_2026-10-05.md) — source-settled by the
-- standard's own structure: the gates' guards already say which product kind each field belongs to.
--   D-2  RHZ-09 `arbeitsfuge_zeitabstand_h` is required for every product, although REQ-12 (§7.1 "Nicht bahnenförmige Abdichtungen,
--        wie z. B. Flüssigabdichtungen, Gussasphalt oder GUP-Beschichtungen …") applies to NON-sheet products only → a sheet product
--        could not complete RHZ-09 without inventing a joint interval. Mirror: the four `naht_anzahl_*` + `pruefmuster_2_versatz_grad`
--        belong to sheet products only (REQ-11, §7.1 "Bei bahnenartigen Abdichtungen werden Teile der Bahn zugeschnitten …") → a rigid
--        product had to type 0 seams. Fix: visible_when on `ist_bahnenartig` (RHZ-02, inherited by RHZ-09).
--   D-1  RHZ-02 `schutzschicht_definition` is optional, so REQ-04 (`mehrschichtprodukt == false OR schutzschicht_definition IS NOT NULL`,
--        §3.9) stays `pending` for a multi-layer product with no definition and the approval goes through. Fix: required, visible only
--        for multi-layer products — the required-field check then blocks (the A1 existence rule keeps the gate pending by design).
--   D-3  RHZ-06 equation D1 `vts_gesamt_dicke_mm = vts_untere_schicht_dicke_mm + vts_obere_schicht_dicke_mm` reads two RHZ-09 fields
--        that list only RHZ-10 as consumer → never computed (browser and API alike); REQ-26 never evaluates. Fix: RHZ-06 added to the
--        consumer lists.
-- SAFETY: no gate, value or severity change; visibility + required + consumer wiring only. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005120000_fll_tp_rhizom_conditional_fields.sql
-- Rollback: scripts/migrations/rollback-20261005120000_fll_tp_rhizom_conditional_fields.sql
BEGIN;

-- D-2: joint interval only for non-sheet products; seams only for sheet products (§7.1)
UPDATE fields f SET visible_when = 'ist_bahnenartig == false'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-09' AND f.symbol = 'arbeitsfuge_zeitabstand_h' AND f.visible_when IS NULL;

UPDATE fields f SET visible_when = 'ist_bahnenartig == true'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-09'
  AND f.symbol IN ('naht_anzahl_wand_eck', 'naht_anzahl_boden_eck', 'naht_anzahl_t_naht', 'naht_anzahl_laengs_2_pruefmuster', 'pruefmuster_2_versatz_grad')
  AND f.visible_when IS NULL;

-- D-1: the protective-layer definition is required for multi-layer products (§3.9, REQ-04)
UPDATE fields f SET is_required = true, visible_when = 'mehrschichtprodukt == true'
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-02' AND f.symbol = 'schutzschicht_definition' AND f.visible_when IS NULL;

-- D-3: the two layer thicknesses of RHZ-09 feed the RHZ-06 sum
UPDATE fields f SET consumer_worksheets = COALESCE(f.consumer_worksheets, ARRAY[]::text[]) || ARRAY['FLLTP-RHZ-06']::text[]
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-TP-RHIZOM-2023' AND w.code = 'FLLTP-RHZ-09'
  AND f.symbol IN ('vts_untere_schicht_dicke_mm', 'vts_obere_schicht_dicke_mm')
  AND NOT ('FLLTP-RHZ-06' = ANY (COALESCE(f.consumer_worksheets, ARRAY[]::text[])));

COMMIT;
