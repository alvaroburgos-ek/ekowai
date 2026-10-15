-- 20261015120000_a138_flood_qs_labels.sql · DWA-A 138-1 / A138-26 Überflutungsnachweis — F-A9 (Q_S_flood) and the labels after F-A7
-- Apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/75_APPLY-ORDER-a138-flood-qs-labels.md.
-- Pattern: 20261014100000_m820_followup_o2_o3.sql (md5-guarded updates, in-transaction archives, byte-equal rollback, step-0 pre-check).
--
-- WHAT CHANGES (plain English):
--   F-A9 · A138-26 Q_S_flood is retired (active = false). It was an ENTERED, required duplicate that no equation reads: Gl. (10)
--     reads the symbol Q_S, and A138-26 already inherits Q_S from its single producer A138-12 (Gl. (4) Q_S = k_i · A_S · 10³;
--     A138-12 Q_S.consumer_worksheets = A138-13, A138-25, A138-26 — unchanged). The field's own text („übernommen aus Q_S (final) in
--     A138-24“) named a sheet that is not in the chain: A138-24 Q_S_final is itself an entered summary value with no consumers and no
--     equation. This is the A138 single-source pattern already used for A138-10 A_C / C_m (20260625170000: duplicate deactivated, the
--     consumer inherits by reference). After the apply A138-26 shows Q_S only as the carried-over value „← A138-12“ (read-only in the
--     upstream panel — the inheritance mechanism has no consumer-side override, so manual entry of Q_S stays on A138-12); the dead
--     entry box is gone from the form, the gates, recompute, MCP get_worksheet and the standard report value table, and A138-26 no
--     longer lists Q_S_flood as a missing required field. Computed values do not move (Gl. (10) never read Q_S_flood). Saved
--     Q_S_flood values (2 projects on prod, 2026-10-15) are kept, not deleted (read-back R2 lists them next to the A138-12 Q_S they
--     were meant to repeat) — and because pdf/load-data.ts and snapshots/capture.ts load own fields without an `active` filter, a
--     saved value can still appear in the legacy PDF "Eingaben" list and in snapshots; pre-existing for every inactive field.
--   F-A7 labels · A138-26 r_D_30 is relabelled „Regenspende r_D(T_n,Ü) – nur ohne KOSTRA-Tabelle (2D)“ / „Rainfall intensity r_D(T_n,Ü) –
--     only without a KOSTRA 2D table“, with a hint saying when it is read (legacy 1D table OR no rainfall table at all). Symbol,
--     unit, is_required (false) unchanged.
--   F-A7 hint · A138-26 T_n_Ue gets the owner's hint „leer = 30 a; 100 a, wenn die befestigten Flächen zu mehr als 70 % aus Dachflächen
--     und nicht überflutbaren Flächen bestehen (§ 5.3.4.1)“ + the verbatim § 5.3.4.1 sentences. is_required (true) unchanged — whether
--     it should become optional now that empty = 30 a in the code is a ruling (75_ R-FQ-2), not encoded.
--   Counts: 3 field rows updated (1 deactivated, 1 relabelled + hint, 1 hint), 0 gates, 0 equations, 0 inserted, 0 deleted.
--   Every changed text DE + [EN].
--   F-A10 (A138-12 Gl. (4) A_S vs A_S,m) · NOT encoded — the print does not settle it with zero interpretation; ruling 75_ R-FQ-1.
--
-- SOURCES (re-rendered 2026-10-15 from C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf, pdftotext -layout
--   -enc UTF-8 + pdftoppm page images; printed page = PDF page − 2, checked on the page footers; subscripts written with _):
--   § 5.3.4.1 (PDF S. 51 / printed 49): „Die zurückzuhaltende Regenwassermenge V_Rück wird für alle Schutzkategorien nach Tabelle 8
--     nach DIN 1986-100 in der Regel für eine Überflutungshäufigkeit von n = 0,033/a (T_n = 30 a) für Versickerungsanlagen gemäß
--     Gl. (10) berechnet:“
--   § 5.3.4.1, legend of Gl. (10) (PDF S. 52 / printed 50): „Q_S l/s Versickerungsleistung (nach Gl. (4))“ ·
--     „r_D(30) l/(s·ha) Regenspende für die Dauerstufe D und Wiederkehrzeit T_n = 30 Jahren“
--   § 5.3.4.1 (PDF S. 52 / printed 50): „Bestehen die befestigten Flächen des Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen
--     und nicht überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach DIN 1986-100 für eine Wiederkehrzeit
--     T_n = 100 Jahren nach Gl. (10) für Regenspenden r_D(100) iterativ zu führen.“
--   § 5.3.3.6 (PDF S. 46 / printed 44): „Q_S = k_i ⋅ A_S · 10³ (4)“ · „A_S m² erforderliche Versickerungsfläche, anlagenspezifisch“
--
-- Guards: every UPDATE matches the pre-state signature read on prod 2026-10-15 (READ ONLY, scripts/verification/prod-query.mjs) and
-- reproduced by the harness seed (dump tests/harness/a138-flood-qs-labels.dump.json of the same day); step 0 (read-back R0 on prod)
-- must show fields_pre 3 before the apply. Field signature md5(description md5 | visible_when | consumer_worksheets | enum md5 |
-- label_de | label_en | is_required | data_type | active) — `active` is part of the signature (not a filter) because Q_S_flood is
-- deactivated. Idempotent (a re-run changes nothing). In-transaction archive fields_archive_a138_fqs + ledger a138_fqs_written (md5 of
-- every row as written). No row is inserted or deleted; one is deactivated; no gate, equation, severity or required flag changes.
-- Rollback:  scripts/rollback-20261015120000-a138-flood-qs-labels.sql (byte-equal; a row edited after the apply is left alone).
-- Read-back: scripts/verification/apply/readback-20261015120000-a138-flood-qs-labels.sql.
-- Order: AFTER the F-A7 code fix (branch fix/flood-check-t100, bc4adf6 + 5129d44) is merged AND deployed — the T_n_Ue / r_D_30 texts
--   describe the post-F-A7 behaviour (Gl. (10) reads the T_n_Ue column; before F-A7 it always reads T 30). The F-A9 part has no code
--   prerequisite.
-- STAGED — not applied. Apply (from C:\Users\Ekowai\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\Users\Ekowai\_wt-a138-data\scripts\migrations\20261015120000_a138_flood_qs_labels.sql
BEGIN;

CREATE TABLE IF NOT EXISTS fields_archive_a138_fqs AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS a138_fqs_written (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- ── F-A9 · A138-26 Q_S_flood: retired; Gl. (10) reads Q_S ← A138-12 ──
INSERT INTO fields_archive_a138_fqs SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'Q_S_flood'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = 'f5447c2739c8beda2ff1b400c02c03ea'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_a138_fqs a WHERE a.id = f.id);
UPDATE fields f
   SET active = false,
       description = $m$Stillgelegt (F-A9): Gl. (10) setzt die Versickerungsleistung Q_S nach Gl. (4) an und liest sie aus A138-12, wo Gl. (4) gerechnet wird (Q_S = k_i · A_S · 10³); auf A138-26 erscheint Q_S als übernommener Wert ← A138-12. Dieses separat eingegebene Feld ging nie in Gl. (10) ein und wird nicht mehr angezeigt; gespeicherte Werte bleiben erhalten. § 5.3.4.1 (S. 50), Legende zu Gl. (10): „Q_S l/s Versickerungsleistung (nach Gl. (4))“.
[EN] Retired (F-A9): Eq. (10) applies the infiltration capacity Q_S per Eq. (4) and reads it from A138-12, where Eq. (4) is computed (Q_S = k_i · A_S · 10³); on A138-26 Q_S appears as a carried-over value ← A138-12. This separately entered field never entered Eq. (10) and is no longer shown; saved values are kept. § 5.3.4.1 (p. 50), legend of Eq. (10): "Q_S l/s infiltration capacity (per Eq. (4))".$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'Q_S_flood'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = 'f5447c2739c8beda2ff1b400c02c03ea';

-- ── F-A7 labels · A138-26 r_D_30 = r_D(T_n,Ü), read only when A138-04 has no KOSTRA 2D table (legacy 1D or none) ──
INSERT INTO fields_archive_a138_fqs SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'r_D_30'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = '415570e4a1dbb034bbe1f383ab20ef2f'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_a138_fqs a WHERE a.id = f.id);
UPDATE fields f
   SET label_de = $m$Regenspende r_D(T_n,Ü) – nur ohne KOSTRA-Tabelle (2D)$m$,
       label_en = $m$Rainfall intensity r_D(T_n,Ü) – only without a KOSTRA 2D table$m$,
       description = $m$Regenspende r_D für die Wiederkehrzeit des Überflutungsnachweises T_n,Ü (Feld T_n_Ue: leer oder 30 → r_D(30), 100 → r_D(100)) bei der Dauerstufe D, in l/(s·ha). Wird nur gelesen, wenn A138-04 keine KOSTRA-Tabelle mit Wiederkehrzeit-Spalten (2D) führt – also bei einer Alt-Niederschlagstabelle (1D, eine Spalte) oder wenn noch gar keine Niederschlagstabelle hinterlegt ist: dann wertet Gl. (10) einmal mit diesem eingetippten Wert und der Dauerstufe D aus (keine Iteration). Mit einer KOSTRA-Tabelle mit Wiederkehrzeit-Spalten (2D) liest Gl. (10) die Spalte T_n,Ü selbst und iteriert über alle Dauerstufen; dieses Feld bleibt dann leer. Der Symbolname r_D_30 bleibt aus technischen Gründen. § 5.3.4.1 (S. 50): „r_D(30) l/(s·ha) Regenspende für die Dauerstufe D und Wiederkehrzeit T_n = 30 Jahren“ · „Bestehen die befestigten Flächen des Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach DIN 1986-100 für eine Wiederkehrzeit T_n = 100 Jahren nach Gl. (10) für Regenspenden r_D(100) iterativ zu führen.“ Bei KOSTRA-Regenspenden die exakten Werte des DWD verwenden (§ 5.3.4.1).
[EN] Rainfall intensity r_D for the return period of the flood proof T_n,Ü (field T_n_Ue: empty or 30 → r_D(30), 100 → r_D(100)) at duration D, in l/(s·ha). Read only when A138-04 holds no KOSTRA table with return-period columns (2D) – that is, a legacy rainfall table (1D, one column) or no rainfall table at all: Eq. (10) is then evaluated once with this typed value and the duration D (no iteration). With a KOSTRA table with return-period columns (2D) Eq. (10) reads the T_n,Ü column itself and iterates over all durations; this field then stays empty. The symbol name r_D_30 is kept for technical reasons. § 5.3.4.1 (p. 50): "r_D(30) l/(s·ha) rainfall intensity for duration D and return period T_n = 30 years" · "if, for example, more than 70 % of the paved surfaces of the plot are roofs and non-floodable surfaces such as inner courtyards, the flood check per DIN 1986-100 is to be carried out iteratively for a return period T_n = 100 years per Eq. (10) with rainfall intensities r_D(100)." With KOSTRA intensities use the exact DWD values (§ 5.3.4.1).$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'r_D_30'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = '415570e4a1dbb034bbe1f383ab20ef2f';

-- ── F-A7 hint · A138-26 T_n_Ue: empty = 30 a; 100 a for > 70 % roofs / non-floodable surfaces ──
INSERT INTO fields_archive_a138_fqs SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'T_n_Ue'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = '6ebeab92c877bf70d1495f0d06791fb3'
   AND NOT EXISTS (SELECT 1 FROM fields_archive_a138_fqs a WHERE a.id = f.id);
UPDATE fields f
   SET description = $m$leer = 30 a; 100 a, wenn die befestigten Flächen zu mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen bestehen (§ 5.3.4.1). Gl. (10) liest mit der KOSTRA-Tabelle mit Wiederkehrzeit-Spalten (A138-04) die Spalte dieser Wiederkehrzeit und iteriert über alle Dauerstufen; fehlt die Spalte (z. B. T = 100 a), rechnet Gl. (10) nicht und nennt die fehlende Spalte. Bei einer Alt-Tabelle (1D) oder wenn noch keine Niederschlagstabelle hinterlegt ist, gilt stattdessen der eingetippte Wert r_D(T_n,Ü) (Feld r_D_30). Für die Freigabe bleibt das Feld ein Pflichtfeld (30 oder 100 eintragen). § 5.3.4.1 (S. 49): „Die zurückzuhaltende Regenwassermenge V_Rück wird für alle Schutzkategorien nach Tabelle 8 nach DIN 1986-100 in der Regel für eine Überflutungshäufigkeit von n = 0,033/a (T_n = 30 a) für Versickerungsanlagen gemäß Gl. (10) berechnet“ · (S. 50): „Bestehen die befestigten Flächen des Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach DIN 1986-100 für eine Wiederkehrzeit T_n = 100 Jahren nach Gl. (10) für Regenspenden r_D(100) iterativ zu führen.“
[EN] empty = 30 a; 100 a when more than 70 % of the paved surfaces are roofs and non-floodable surfaces (§ 5.3.4.1). With the KOSTRA table with return-period columns (A138-04) Eq. (10) reads the column of this return period and iterates over all durations; if that column is missing (e.g. T = 100 a) Eq. (10) does not compute and names the missing column. With a legacy 1D table, or when no rainfall table is held yet, the typed value r_D(T_n,Ü) (field r_D_30) is used instead. For approval the field remains required (enter 30 or 100). § 5.3.4.1 (p. 49): "the rainwater volume to be retained V_Rück is, for all protection categories of Table 8, as a rule calculated per DIN 1986-100 for a flooding frequency of n = 0.033/a (T_n = 30 a) for infiltration facilities per Eq. (10)" · (p. 50): "if, for example, more than 70 % of the paved surfaces of the plot are roofs and non-floodable surfaces such as inner courtyards, the flood check per DIN 1986-100 is to be carried out iteratively for a return period T_n = 100 years per Eq. (10) with rainfall intensities r_D(100)."$m$
  FROM worksheet_templates w, standards s
 WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'DWA-A-138-1' AND w.code = 'A138-26' AND f.symbol = 'T_n_Ue'
   AND md5(concat_ws('|', md5(coalesce(f.description,'')), coalesce(f.visible_when,''), coalesce(array_to_string(f.consumer_worksheets, ','),''), coalesce(md5(f.enum_values::text),''), f.label_de, coalesce(f.label_en,''), f.is_required::text, f.data_type, f.active::text)) = '6ebeab92c877bf70d1495f0d06791fb3';

-- ── ledger: md5 of every archived row as this block left it (the rollback restores only rows still in that state) ──
INSERT INTO a138_fqs_written (tbl, id, md5) SELECT 'fields', x.id, md5(row_to_json(x)::text) FROM fields x WHERE x.id IN (SELECT id FROM fields_archive_a138_fqs) ON CONFLICT DO NOTHING;

COMMIT;
