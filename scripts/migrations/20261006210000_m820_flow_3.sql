-- 20261006210000_m820_flow_3.sql · M820 flow block 3 (data part) — one symbol per identity value across DWA-M 820-1 / -2 / -3
-- Requirements: vault 01-Projects/ekowai-wizard/m820-wizard-test/_briefs/flow-2-3-brief.md "Block 3" item 1 (owner ruling 2026-10-06:
-- "block 3: both yes"); evidence 33_FLOW-AUDIT-m820-sheet-order_2026-10-06.md § 4 X3 / X4 / X5 / X6.
-- Apply order: 37_APPLY-ORDER-m820-flow-3.md (AFTER flow block 1 — see there). Sign-off sheet: 38_SIGN-OFF-m820-flow-2-3.md.
-- Block 3 item 2 (risk register carry-over, X10) is CODE (src/lib/projects/cross-standard-carry.ts), committed separately; this file
-- does not depend on it and it does not depend on this file.
--
-- WHAT THE PROJECT TEAM SEES (plain English):
--   The three parts asked for the project name, the client and the registration date under different symbols, so a value typed in
--   one part was asked again in the next (and the contractor chosen at the award in 820-1 was asked again in 820-3). The existing
--   carry-over rule (A4: a text or date value of the same symbol, saved in another standard of the project, is offered on the sheet
--   — "aus <Blatt> … oder überschreiben" — and counts for the required-field check) needs the SAME symbol. After this block:
--     project name   820-1 project_name_de (M820-01) · 820-2 project_name_full (820-2-01) · 820-3 project_title (M8203-01) → project_name
--     client         820-1 client_organization_name · 820-2 client_organization · 820-3 client_auftraggeber               → client_name
--     reg. date      820-1 date_registration (M820-01)                                                                 → registration_date (= 820-3)
--     contractor     820-1 winning_bidder (M820-23)                                                                    → contractor_auftragnehmer (= 820-3)
--   project_name / client_name are the symbols most standards of the library already use (project_name 11 other standards,
--   client_name 4 — DWA-A 138-1, FLL Naturteich, DIN 276, DWA-A 272E); 820 now carries to and from them in the same project.
--   Labels, data types, required flags, sections, order, consumers and saved values are unchanged (each row keeps its id, so every
--   saved value stays with it — nothing to copy). A value saved in a part stays that part's own value; only an EMPTY field is
--   offered the other part's value. The 820-3 check REQ-01 "Anwendungsbereich" (block) reads the renamed client field: its condition
--   names client_name instead of client_auftraggeber (nothing else in it changes).
--
-- SOURCE CHECK: symbol names only (tool structure); no printed value is involved. The meaning of each pair is the same field label
--   class (Projektname / Projekttitel; Auftraggeber(-Organisation); Datum Projektregistrierung / Registrierungsdatum; Gewinnender
--   Bieter / Auftragnehmer — 820-3 starts after the planning award that 820-1 decides).
--   Code evidence (2026-10-06): A4 = src/lib/projects/required-fields.ts scopeForInheritance (text / date of the same symbol from
--   another standard), page prefill = loadSameSymbolValues (same symbol, any standard) + coerceSameSymbolValue.
--
-- LIVE PRE-STATE (read-only prod check 2026-10-06, scripts/verification/prod-query.mjs): the 8 fields active, text / date, required,
--   each the only field of its symbol in its standard; no field of the target symbols in 820-1 / -2 / -3; references in 820 rows:
--   gates 1 (820-3 REQ-01 on M8203-01, condition md5 0e0883c979c586e8b1f4e9ecd76c8d1c, reads client_auftraggeber and
--   contractor_auftragnehmer), equations 0, field / section visible_when 0, ui_config / lookup / default_value 0, equation inputs 0.
--   Prose mentions (descriptions only, no reader): winning_bidder in the descriptions of M820-18 bewerber / winner_count and
--   equation M820-18-D4 — left as written (sign-off 38). Saved values: 1 project, 8 rows on these 8 fields (they keep their ids).
--
-- WHAT THIS BLOCK DOES (idempotent; every write guarded on the live value; in-transaction archive of each pre-state row):
--   A. 8 field rows: symbol old → new (+ one "renamed" note on the description). Guard: standard + sheet + old symbol + data type +
--      active, and no active field of the new symbol on that sheet.
--   B. 1 gate row (820-3 REQ-01): condition client_auftraggeber → client_name (word match). Guard: condition md5.
--   Nothing is deactivated or re-activated; project_parameters untouched.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\migrations\20261006210000_m820_flow_3.sql
-- Rollback:  C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006210000-m820-flow-3.sql
-- Read-back: C:\Users\Ekowai\_wt-m820\scripts\verification\apply\readback-20261006210000-m820-flow-3.sql
BEGIN;

CREATE TABLE IF NOT EXISTS fields_archive_m820_flow_3 AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS compliance_requirements_archive_m820_flow_3 AS SELECT * FROM compliance_requirements WHERE false;

CREATE TEMP TABLE m820f3_ren ON COMMIT DROP AS SELECT * FROM (VALUES
  ('DWA-M-820-1', 'M820-01',  'project_name_de',          'project_name',             'text'),
  ('DWA-M-820-2', '820-2-01', 'project_name_full',        'project_name',             'text'),
  ('DWA-M-820-3', 'M8203-01', 'project_title',            'project_name',             'text'),
  ('DWA-M-820-1', 'M820-01',  'client_organization_name', 'client_name',              'text'),
  ('DWA-M-820-2', '820-2-01', 'client_organization',      'client_name',              'text'),
  ('DWA-M-820-3', 'M8203-01', 'client_auftraggeber',      'client_name',              'text'),
  ('DWA-M-820-1', 'M820-01',  'date_registration',        'registration_date',        'date'),
  ('DWA-M-820-1', 'M820-23',  'winning_bidder',           'contractor_auftragnehmer', 'text')
) AS t(std, ws, old_symbol, new_symbol, data_type);

CREATE TEMP TABLE m820f3_ren_old ON COMMIT DROP AS
SELECT f.id, r.old_symbol, r.new_symbol FROM m820f3_ren r
  JOIN standards s ON s.code = r.std JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = r.ws
  JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = r.old_symbol AND f.data_type = r.data_type AND f.active
 WHERE NOT EXISTS (SELECT 1 FROM fields f2 JOIN worksheet_templates w2 ON w2.id = f2.worksheet_template_id
                    WHERE w2.standard_id = s.id AND f2.symbol = r.new_symbol AND f2.active);

INSERT INTO fields_archive_m820_flow_3
SELECT f.* FROM fields f JOIN m820f3_ren_old o ON o.id = f.id
 WHERE NOT EXISTS (SELECT 1 FROM fields_archive_m820_flow_3 a WHERE a.id = f.id);
INSERT INTO compliance_requirements_archive_m820_flow_3
SELECT cr.* FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND cr.code = 'REQ-01' AND md5(cr.condition) = '0e0883c979c586e8b1f4e9ecd76c8d1c'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements_archive_m820_flow_3 a WHERE a.id = cr.id);

-- A. the renames (the row keeps its id → saved values stay)
UPDATE fields f
   SET symbol = o.new_symbol,
       description = COALESCE(f.description, '') || E'\n' || '[Flow 3, 2026-10-06] Symbol ' || o.new_symbol || ' (vorher / was ' || o.old_symbol
         || '): dasselbe Symbol in DWA-M 820-1 / -2 / -3, damit ein in einem Teil gespeicherter Wert in den anderen angeboten wird (Regel A4: Text / Datum desselben Symbols). [EN] Same symbol in the three parts so a value saved in one part is offered in the others (rule A4: text / date of the same symbol).'
  FROM m820f3_ren_old o
 WHERE f.id = o.id;

-- B. 820-3 REQ-01 reads the renamed client field
UPDATE compliance_requirements cr
   SET condition = regexp_replace(cr.condition, '\mclient_auftraggeber\M', 'client_name', 'g')
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE w.id = cr.worksheet_template_id AND s.code = 'DWA-M-820-3' AND w.code = 'M8203-01' AND cr.code = 'REQ-01'
   AND md5(cr.condition) = '0e0883c979c586e8b1f4e9ecd76c8d1c';

COMMIT;
