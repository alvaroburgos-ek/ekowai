-- FLL-Naturteich · ornamental pond without bathing use (owner ruling 2026-10-05: "the Blumen Forscheln pond is not for swimming —
-- apply the guideline as the exception"). The guideline's own scope settles what the exception removes:
--   § 1.1 Area of application (printed p. 9): the guidelines "apply to the planning and construction as well as operation, inspection,
--   maintenance and repairs for open-air natural swimming pools … which are specifically built and operated for use as a natural
--   swimming pool; which are exclusively used for private purposes; which have a seal between the water in the pool and subsoil;
--   which are subject to requirements in terms of water quality; which feature systems for purifying the water biologically …;
--   which represent a closed system and do not have any permanent inflows or outflows."
-- An ornamental pond is outside that scope; EKOWAI applies the guideline to it in analogy (owner decision, recorded per project). The
-- requirements that exist only because people bathe — the swimming-area water limits of Tab. 8 (§ 7.1.2, p. 33), the swimming area
-- itself (§ 8.2.1) and the swimming-area construction attestation (§ 9.5.1–9.5.3) — then do not apply; everything else (fill water
-- Tab. 7, regeneration area, hydrobotanical system, filters, circulation, planting, acceptance, maintenance) applies unchanged.
-- MECHANISM: a required selector `bathing_use` on FLLNT-03 (inherited by every other sheet) and `visible_when` on the bathing-only
-- fields; a hidden field is not required (approval-gate.ts) and a gate over a hidden symbol is not applicable (hidden-term rule
-- 8151496) — REQ-10 (Tab. 8) therefore reads not applicable for an ornamental pond without any gate change. Second, independent
-- clean-up found in the same run (D10 list): the App.-5 fields of the 50× rule (§ 10.2.3, quick-flow substrate filters) were required
-- on every Naturteich; they now show only for a quick-flow filter (`filter_flow_type == 'quick'`), and the sunlit underwater surface
-- of FLLNT-06 (App. 5 input) only for Types IV / V. REQ-22 then reads not applicable for slow filters, as § 10.2.3 intends.
-- SAFETY: one new required selector (a project must answer it before FLLNT-03 approves again), visible_when on 17 fields, no gate,
-- severity or value change. Projects already approved keep their state; re-approval of FLLNT-03 asks for the selector. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005190000_fll_naturteich_bathing_use.sql
-- Rollback: scripts/migrations/rollback-20261005190000_fll_naturteich_bathing_use.sql
-- Read-back: scripts/verification/apply/readback-fll-naturteich-bathing-use-20261005.sql
BEGIN;

-- 1. the selector on FLLNT-03, beside the pool type
INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, label_en, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, consumer_worksheets, order_index, active)
SELECT w.id,
       (SELECT f0.section_id FROM fields f0 WHERE f0.worksheet_template_id = w.id AND f0.symbol = 'natural_pool_type'),
       'bathing_use',
       'Nutzung: Schwimmteich mit Badenutzung oder Zierteich ohne Badenutzung',
       'Use: natural swimming pool with bathing or ornamental pond without bathing',
       'enum', NULL, true, '§1.1',
       'Legt fest, ob die Richtlinie in ihrem Anwendungsbereich oder in Anlehnung angewendet wird. „Schwimmteich mit Badenutzung“ = Anwendungsbereich nach § 1.1 (Teiche, die eigens als Naturschwimmteich gebaut und betrieben werden) — alle Anforderungen gelten, einschließlich der Richtwerte für den Schwimmbereich (Tab. 8), des Schwimmbereichs (§ 8.2.1) und der baulichen Anforderungen an den Schwimmbereich (§ 9.5). „Zierteich ohne Badenutzung“ = Ausnahme: die Richtlinie wird in Anlehnung angewendet; die nur aus der Badenutzung folgenden Felder werden ausgeblendet und sind nicht erforderlich, ihre Tore gelten als nicht anwendbar. Alles Übrige (Füllwasser Tab. 7, Regenerationsbereich, Hydrobotanik, Filter, Umwälzung, Pflanzung, Abnahme, Instandhaltung) gilt unverändert.
[EN] Decides whether the guideline is applied within its scope or in analogy. "Natural swimming pool with bathing" = scope per § 1.1 (pools specifically built and operated for use as a natural swimming pool) — every requirement applies, including the swimming-area water limits (Tab. 8), the swimming area (§ 8.2.1) and the swimming-area construction requirements (§ 9.5). "Ornamental pond without bathing" = the exception: the guideline is applied in analogy; the fields that exist only because of bathing are hidden and not required, and their gates read not applicable. Everything else (fill water Tab. 7, regeneration area, hydrobotanical system, filters, circulation, planting, acceptance, maintenance) applies unchanged.',
       'imported_unverified',
       '§ 1.1 (printed p. 9): "apply to the planning and construction as well as operation, inspection, maintenance and repairs for open-air natural swimming pools … which are specifically built and operated for use as a natural swimming pool".',
       'select_one', NULL, NULL, NULL,
       '[{"value":"swimming_pool","label_de":"Schwimmteich mit Badenutzung (Anwendungsbereich § 1.1)","label_en":"Natural swimming pool with bathing (scope § 1.1)","order_index":1,"regulation_reference":"§1.1"},{"value":"ornamental_no_bathing","label_de":"Zierteich ohne Badenutzung — Anwendung in Anlehnung (Ausnahme)","label_en":"Ornamental pond without bathing — applied in analogy (exception)","order_index":2,"regulation_reference":"§1.1"}]'::jsonb,
       ARRAY['FLLNT-01','FLLNT-02','FLLNT-04','FLLNT-05','FLLNT-06','FLLNT-07','FLLNT-08','FLLNT-09','FLLNT-10','FLLNT-11','FLLNT-12','FLLNT-13','FLLNT-14','FLLNT-15']::text[],
       (SELECT COALESCE(f0.order_index, 0) + 1 FROM fields f0 WHERE f0.worksheet_template_id = w.id AND f0.symbol = 'natural_pool_type'),
       true
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-03'
   AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'bathing_use');

-- 2. bathing-only fields: Tab. 8 swimming-area values and their limit fills (FLLNT-04), swimming area and § 9.5 attestation (FLLNT-06)
UPDATE fields f SET visible_when = 'bathing_use == ''swimming_pool'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND f.visible_when IS NULL
   AND ((w.code = 'FLLNT-04' AND f.symbol IN ('swimming_test_ammonium','swimming_test_hardness','swimming_test_conductivity','swimming_test_nitrate','swimming_test_nitrite','swimming_test_ph','swimming_test_acid_capacity_ks43','swimming_test_p_total','swimming_test_orthophosphate','swimming_orthophosphate_limit','swimming_p_total_limit'))
     OR (w.code = 'FLLNT-06' AND f.symbol IN ('swimming_area_m2','attest_fllnt_06_req_18')));

-- 3. App.-5 / 50×-rule fields only for quick-flow substrate filters (§ 10.2.3); the sunlit underwater surface only for Types IV / V
UPDATE fields f SET visible_when = 'filter_flow_type == ''quick'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-10' AND f.visible_when IS NULL
   AND f.symbol IN ('filter_50x_rule_met','filter_colonized_surface_actual','filter_volume_required','grain_specific_surface');

UPDATE fields f SET visible_when = 'natural_pool_type IN {''type_IV'', ''type_V''}'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-Naturteich' AND w.code = 'FLLNT-06' AND f.visible_when IS NULL
   AND f.symbol = 'pool_underwater_surface';

COMMIT;
