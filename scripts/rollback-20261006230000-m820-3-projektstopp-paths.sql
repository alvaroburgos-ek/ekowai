-- Rollback of scripts/migrations/20261006230000_m820_3_projektstopp_paths.sql (DWA-M 820-3 · Projektstopp code per project path).
-- Scoped, per column: each archived value comes back ONLY while the live row still carries exactly what the block wrote —
--   M8203-24-D1 formula + input_symbols (md5 0e7c0e64ba6c08ac022ea68a58e71ed3 / 0491f77109ae615e0cfd34028bbc4348), its description
--   (the block's text), project_type.consumer_worksheets (the archived list + 'M8203-24'), projektstopp_code.description (the
--   block's text). A value edited since the apply is left alone and shows up in read-back R3 (archive row kept). Restored archive rows
--   are deleted; the two archive tables stay (empty). Nothing is deactivated or re-activated by this file.
-- ORDER: run this BEFORE any rollback of block 19 (20261006120000 restores project_type '{ALL}' only while it carries exactly its own
--   17-sheet list) and BEFORE a rollback of the hint block 20261006220000 (it rewrites both descriptions unconditionally).
-- Stored projektstopp_code values are project data and are not touched; the next save / recompute of M8203-24 re-evaluates the old
--   67-goal formula (a single-path project then shows "not computed" again; the stale stored value stays until then).
-- Run (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-m820\scripts\rollback-20261006230000-m820-3-projektstopp-paths.sql
BEGIN;

CREATE TABLE IF NOT EXISTS equations_archive_m820_3_projektstopp_paths AS SELECT * FROM equations WHERE false;
CREATE TABLE IF NOT EXISTS fields_archive_m820_3_projektstopp_paths AS SELECT * FROM fields WHERE false;

-- 1⁻¹. M8203-24-D1 formula + inputs (while still the block's), then its description (while still the block's text)
UPDATE equations e
   SET formula = a.formula, input_symbols = a.input_symbols
  FROM equations_archive_m820_3_projektstopp_paths a
 WHERE a.id = e.id AND e.equation_number = 'M8203-24-D1'
   AND md5(e.formula) = '0e7c0e64ba6c08ac022ea68a58e71ed3' AND md5(e.input_symbols::text) = '0491f77109ae615e0cfd34028bbc4348';
UPDATE equations e
   SET description = a.description
  FROM equations_archive_m820_3_projektstopp_paths a
 WHERE a.id = e.id AND e.equation_number = 'M8203-24-D1'
   AND e.description = '1, wenn eines der Phasenziele des gewählten Projektwegs „Nicht erreicht“ oder „Teilweise erreicht“ hat, sonst 0. Der Weg kommt aus project_type (Blatt M8203-01): Gesamtsystem → die 13 Phasenziele § 5.2–5.4 (wie projektstopp_code_a, M8203-22-D3); Einzelprojekt → die 54 Phasenziele § 6.2–6.7 (wie projektstopp_code_b, M8203-23-D3); Beides → alle 67. Die Blätter des anderen Wegs sind ausgeblendet; ihre Phasenziele werden nicht gelesen. § 3 (gedruckt S. 10): „Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“
[EN] 1 if any phase goal of the chosen project path is "not met" or "partially met", otherwise 0. The path comes from project_type (sheet M8203-01): Gesamtsystem → the 13 phase goals of § 5.2–5.4 (as projektstopp_code_a, M8203-22-D3); Einzelprojekt → the 54 phase goals of § 6.2–6.7 (as projektstopp_code_b, M8203-23-D3); both → all 67. The other path''s sheets are hidden; their phase goals are not read. § 3 (printed p. 10): "If phase goals are not or only incompletely achieved, a review of a project stop is required."';

-- 2⁻¹. project_type back to the archived consumer list (while it is exactly that list + 'M8203-24')
UPDATE fields f
   SET consumer_worksheets = a.consumer_worksheets
  FROM fields_archive_m820_3_projektstopp_paths a
 WHERE a.id = f.id AND f.symbol = 'project_type'
   AND f.consumer_worksheets = a.consumer_worksheets || ARRAY['M8203-24']::text[];

-- 3⁻¹. projektstopp_code description (while still the block's text)
UPDATE fields f
   SET description = a.description
  FROM fields_archive_m820_3_projektstopp_paths a
 WHERE a.id = f.id AND f.symbol = 'projektstopp_code'
   AND f.description = 'Berechnet: 1, wenn eines der Phasenziele des gewählten Projektwegs (project_type, Blatt M8203-01) „Nicht erreicht“ oder „Teilweise erreicht“ hat, sonst 0. Gesamtsystem: die 13 Phasenziele § 5.2–5.4; Einzelprojekt: die 54 Phasenziele § 6.2–6.7; Beides: alle 67. Der Wert entsteht, sobald der Projektweg gewählt ist und jedes Phasenziel dieses Wegs einen Status hat (nicht zutreffende Ziele: „Nicht zutreffend“); die ausgeblendeten Blätter des anderen Wegs zählen nicht. „Phase noch nicht erreicht“ löst nichts aus. § 3 (gedruckt S. 10): „Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“
[EN] Computed: 1 if any phase goal of the chosen project path (project_type, sheet M8203-01) is "not met" or "partially met", otherwise 0. Gesamtsystem: the 13 phase goals of § 5.2–5.4; Einzelprojekt: the 54 phase goals of § 6.2–6.7; both: all 67. The value appears once the path is chosen and every phase goal of that path has a status (goals that do not apply: "not applicable"); the hidden sheets of the other path do not count. "Phase not reached yet" triggers nothing. § 3 (printed p. 10): "If phase goals are not or only incompletely achieved, a review of a project stop is required."';

-- archive rows whose live row is fully restored
DELETE FROM equations_archive_m820_3_projektstopp_paths a USING equations e
 WHERE e.id = a.id AND e.formula = a.formula AND e.input_symbols = a.input_symbols
   AND e.description IS NOT DISTINCT FROM a.description;
DELETE FROM fields_archive_m820_3_projektstopp_paths a USING fields f
 WHERE f.id = a.id AND f.consumer_worksheets IS NOT DISTINCT FROM a.consumer_worksheets
   AND f.description IS NOT DISTINCT FROM a.description;

COMMIT;
