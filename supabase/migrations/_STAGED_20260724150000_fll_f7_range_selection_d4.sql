-- ============================================================================
-- STAGED — WRITTEN-NOT-APPLIED — D-4 F-7 range fields (SR-2 selection)
-- ----------------------------------------------------------------------------
-- `_STAGED_` prefix => runner SKIPS. Prod write outside the D-3 mandate =>
-- STOP-and-batch for Alvaro. These are FIELD-DESIGN changes (add an explicit
-- engineer-selection field so a point value inside a standard_range is HUMAN-
-- chosen, never auto-picked) → ratification-gated. Nothing applied.
--
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
--
-- F-7 CLASS (doctrine): "a value inside a standard_range with no selection
-- record = finding." The M2 run surfaced these as SR-2 range picks (report §3.A).
-- The TWO clearest F-7 range fields — a range whose point value the machine must
-- NOT silently pick — are:
--
-- ── F-7 #1: GAR-23 freibord (edge-sealing height above max water level) ──────
--   Field: freibord_zu_bauwerk_cm (c0fcbcfa-a69f-44d4-9bd6-5321ba3a632a),
--          FLL-GAR-23, currently a bare number with no band/selection.
--   SR-1/SR-3 VERBATIM (rendered this session, GAR PDF §4.5, p.119):
--     "Die Oberkante der Abdichtung ist an aufgehenden Bauteilen und Bauwerken
--      i. d. R. 30 cm ueber den geplanten Hoechstwasserstand auszufuehren. Nur
--      mit geeigneter Randbefestigung und Sicherung gegen Hinter- und Unter-
--      laufen ist eine Reduzierung auf mind. 15 cm ueber Hoechstwasserstand
--      zugelassen." (+ "mind. 5 cm" fuer Schwimm-/Badeteiche, p.119.)
--   RANGE + CHOICE: default 30 cm; reducible to a 15 cm FLOOR *only* under the
--     "geeignete Randbefestigung" condition. The reduction is an ENGINEER CHOICE
--     the standard gates on a construction condition — so the 15-vs-30 point must
--     be an explicit selection, not auto-picked (M2 GAR-23/DI-1).
--   SR-2 SELECTION (staged): add enum field `freibord_bauwerk_fall` on GAR-23:
--     'regel_30'  → regular case, min 30 cm (Randbefestigung not required)
--     'reduziert_15' → reduced case, min 15 cm, REQUIRES geeignete Randbefestigung
--     'schwimmteich_5' → Schwimm-/Badeteich, min 5 cm (Wellenschlag-abhaengig)
--   so the numeric freibord_zu_bauwerk_cm is validated against the SELECTED band,
--   never against a machine-chosen point. A follow-on block gate (staged for the
--   controlled pass, not authored here) would enforce the min per selection.
--
-- ── F-7 #2: GAR-07 slope ratio (Boeschungsneigung) ─────────────────────────
--   Field: boeschungsneigung_ratio (d455a15f-3562-4301-a13a-438da6849162),
--          FLL-GAR-07, currently a FREE-TEXT field (M2 GAR-07/F-1) — a range value
--          with no bounded selection.
--   SR-1/SR-3 VERBATIM (rendered this session, GAR PDF Tab.1, p.31 — per material):
--     Ortbeton (ohne Schalung) <= 1:2 (<= 50 %); Asphaltbeton <= 1:2 (<= 50 %);
--     Asphaltmastix/GTD/Bitumenbahnen/mineral. <= 1:3 (<= 33 %);
--     Kunststoff-/Elastomerbahnen <= 1:1,5 (<= 66 %); PEHD <= 1:1,5 (<= 66 %);
--     Fluessigkunststoffe <= 1:1 (<= 100 %). (natuerlicher Schuettwinkel <= 1:3.)
--   RANGE + CHOICE: the admissible slope is a per-MATERIAL maximum — the engineer
--     selects the material, which pins the limit; the free-text field lets any
--     value through. SR-2 SELECTION (staged): convert boeschungsneigung_ratio to a
--     source-locked enum of the Tab.1 ratios ('1:1','1:1,5','1:2','1:3') so the
--     value is a bounded selection, paired with the existing material choice.
--
-- WHY STAGED not applied: adding/replacing fields changes the rendered worksheet
--   (design). Per D-4, default to stage+batch unless pure mechanical config —
--   these carry a design choice (band semantics + gate wiring), so batched.
-- Rollback: scripts/rollback-_STAGED_20260724150000-fll-f7-range-selection-d4.sql
-- ============================================================================

BEGIN;

-- F-7 #1: freibord case-selection enum on GAR-23 (idempotent on symbol+template).
INSERT INTO fields
  (worksheet_template_id, symbol, data_type, label_de, label_en, unit,
   enum_values, clause_reference, description, active, verification_status)
SELECT wt.id,
       'freibord_bauwerk_fall',
       'enum',
       'Freibord-Fall (Bauwerksanschluss)',
       'Freeboard case (building connection)',
       NULL,
       '[{"value":"regel_30","label_de":"Regelfall — mind. 30 cm","label_en":"Regular — min 30 cm","order_index":1,"regulation_reference":"§4.5"},
         {"value":"reduziert_15","label_de":"Reduziert — mind. 15 cm (nur mit geeigneter Randbefestigung)","label_en":"Reduced — min 15 cm (only with suitable edge fastening)","order_index":2,"regulation_reference":"§4.5"},
         {"value":"schwimmteich_5","label_de":"Schwimm-/Badeteich — mind. 5 cm (wellenschlagabhaengig)","label_en":"Swim/bathing pond — min 5 cm (wave-load dependent)","order_index":3,"regulation_reference":"§4.5"}]'::jsonb,
       '§4.5',
       'SR-2 Auswahl: bestimmt die anzuwendende Freibord-Mindesthoehe. Der 15-cm-Fall ist nur mit geeigneter Randbefestigung und Sicherung gegen Hinter-/Unterlaufen zulaessig (GAR PDF p.119). Der Zahlenwert freibord_zu_bauwerk_cm wird gegen den GEWAEHLTEN Fall geprueft, nie gegen einen maschinell gewaehlten Punkt.',
       true,
       'imported_unverified'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-GAR-2023'
WHERE wt.code = 'FLL-GAR-23'
  AND NOT EXISTS (
    SELECT 1 FROM fields f WHERE f.worksheet_template_id = wt.id AND f.symbol = 'freibord_bauwerk_fall');

-- F-7 #2: source-lock GAR-07 slope ratio to the Tab.1 enum (was free text).
UPDATE fields f
SET data_type = 'enum',
    enum_values = '[{"value":"1:1","label_de":"1:1 (<= 100 %)","label_en":"1:1 (<= 100 %)","order_index":1,"regulation_reference":"Tab.1"},
                    {"value":"1:1,5","label_de":"1:1,5 (<= 66 %)","label_en":"1:1.5 (<= 66 %)","order_index":2,"regulation_reference":"Tab.1"},
                    {"value":"1:2","label_de":"1:2 (<= 50 %)","label_en":"1:2 (<= 50 %)","order_index":3,"regulation_reference":"Tab.1"},
                    {"value":"1:3","label_de":"1:3 (<= 33 %)","label_en":"1:3 (<= 33 %)","order_index":4,"regulation_reference":"Tab.1"}]'::jsonb,
    description = 'SR-2 Auswahl: Boeschungsneigung als quellgebundene Auswahl der Tab.1-Grenzwerte (materialabhaengiges Maximum, GAR PDF p.31). Ersetzt das Freitextfeld (M2 GAR-07/F-1), damit kein Punktwert ausserhalb der Tab.1-Bandbreite auto-gewaehlt wird.'
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id AND s.code = 'FLL-GAR-2023'
WHERE f.id = 'd455a15f-3562-4301-a13a-438da6849162'
  AND f.worksheet_template_id = wt.id
  AND wt.code = 'FLL-GAR-07'
  AND f.data_type <> 'enum';

COMMIT;
