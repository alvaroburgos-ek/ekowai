-- ============================================================================
-- Migration: 20260708260000_dwa_m_205_es1_disposition.sql
-- Standard : DWA-M-205 (Merkblatt DWA-M 205 — Desinfektion von biologisch
--            gereinigtem Abwasser)
-- Source   : Desktop/Guidelines/DWA-M-205/DWA-M_205.pdf
--            (Titel "Desinfektion von biologisch gereinigtem Abwasser · DWA-M
--             205 · 2013"; Fußzeile "März 2013"; DB-Version "April 2013"
--             → AUTHORITATIVE, richtige Norm/Ausgabe). Jeder Schwellenwert und
--             jedes Modalverb unten wurde RENDER-bestätigt (poppler pdftoppm
--             150 dpi S. 18/24/25/31/32 + pdftotext lineare Extraktion —
--             Textschicht sauber, nicht OCR-verstümmelt).
--
-- WRITTEN-NOT-APPLIED. READ-ONLY campaign. Do NOT commit. Do NOT apply to prod.
--
-- Apply    : node scripts/apply-migration.mjs scripts/migrations/20260708260000_dwa_m_205_es1_disposition.sql
--
-- ----------------------------------------------------------------------------
-- SCOPE — DWA-M-205 ES-1 ONLY (Ungleichung-als-Produzent, Registerklasse S1/S7).
--
--   Der Defekt (DEEP-DWA-M-205.md F-threshold-as-eq): 8 eindeutige "Gleichungen"
--   sind Schwellenwert-BÄNDER aus Prosa, deren output_symbol das GEPRÜFTE
--   Eingabefeld selbst ist (uv_dosis, spez_strom_uv, spez_energie_membran,
--   ozon_pro_doc, clo2_dosis, freies_chlor, restchlor_betrieb). Damit ist jedes
--   ein zweiter Produzent desselben Symbols → der Multi-Producer-Collision-Guard
--   der Engine kann den vom Ingenieur eingegebenen Wert BLANKEN (identisch zum
--   FLL-GAR-22:2b g_prime-Bug). Jedes ×2 dupliziert (S3, Basis-Set
--   M205-05/06/07/08 + Duplikat-Set M205-10/13/15/17/21).
--
--   NEUTRALISIERUNG (Produzenten-Rolle):
--   (a) ALLE 8 eindeutigen Gleichungen (×2 = 16 Zeilen) → displayOnly:true in
--       src/lib/eval/equation-profiles.ts (CODE-Änderung, in diesem Commit
--       enthalten — stoppt den Collision-Blank). KEINE equations-Zeile wird
--       hier gelöscht oder umgeschrieben.
--   (b) Enforcement NUR dort, wo die Quelle ein Modalverb trägt:
--         • EQ-11 restchlor_betrieb ≥ 0,2 mg/l — "muss … nachzuweisen sein" →
--           BLOCK, FÜR ALVARO-RATIFIZIERUNG geflaggt.
--         • EQ-04 ozon_pro_doc < 0,8 mg/mg — "kann minimiert werden, wenn …
--           dosiert wird" (Sicherheitsbezug Bromat) → WARN, FÜR ALVARO geflaggt.
--       Die übrigen 6 Bänder tragen KEIN Modalverb (deskriptiv/Richtwert) →
--       displayOnly ONLY, KEIN Gate (siehe LEFT-UNFIXED).
--
-- ----------------------------------------------------------------------------
-- MODALVERB-BEFUND (verbatim aus PDF, gerendert) — Dispositionsentscheidung je Instanz:
--
--   EQ-02  uv_dosis 300–450 J/m²  §4.1.2.3 S.18
--     "Danach beträgt die Mindestbestrahlung etwa 300 J/m² bis 450 J/m² …"
--     → "beträgt etwa" = deskriptiver Richtwert, KEIN muss → displayOnly ONLY.
--   EQ-12  uv_dosis 400–(600)–700 J/m²  §4.1.2.3 S.18
--     "… zeigt eine Schwankungsbreite … von 400 J/m² bis 600 J/m² und im
--      Einzelfall bis zu 700 J/m²"
--     → "zeigt eine Schwankungsbreite" = empirische Betriebsspanne → displayOnly ONLY.
--   EQ-06  spez_strom_uv 30–60 Wh/m³  §4.1.5.2 S.24
--     "… bewegt sich der spezifische Stromverbrauch im Bereich von 30 Wh bis 60 Wh …"
--     → "bewegt sich im Bereich" = deskriptiv → displayOnly ONLY.
--   EQ-07  spez_energie_membran 0,1–0,2 kWh/m³  §4.2.2 S.25
--     "Bei einem spezifischen Energiebedarf von ca. 0,1 kWh/m³ bis 0,2 kWh/m³ Filtrat …"
--     → "von ca." = deskriptiv → displayOnly ONLY.
--   EQ-04  ozon_pro_doc < 0,8 mg/mg  §4.3.6 S.31
--     "Die Bromatbildung kann minimiert werden, wenn Ozon proportional zum DOC
--      (< 0,8 mg/mg) dosiert wird."
--     → "kann minimiert werden, wenn … dosiert wird" = Empfehlung mit
--       Sicherheitsbezug → WARN (geflaggt).
--   EQ-09  clo2_dosis 5–10 g/m³  §4.4.2 S.32
--     "… sind etwa 5 g bis 10 g Chlordioxid pro Kubikmeter … notwendig, bei
--      sandfiltriertem Abwasser … nur 1 g/m³ bis 5 g/m³."
--     → "sind etwa … notwendig" = deskriptive Dosierspanne → displayOnly ONLY.
--   EQ-10  freies_chlor 1–20 mg/l  §4.4.2 S.31
--     "Je nach dem Gehalt an organischen Stoffen … sind 1 mg bis 20 mg freies
--      Chlor pro Liter … erforderlich."
--     → "sind … erforderlich" = kontextabhängige Betriebsspanne → displayOnly ONLY.
--   EQ-11  restchlor_betrieb ≥ 0,2 mg/l  §4.4.2 S.30/32
--     "In dem aus dem Behandlungsbecken abfließenden Abwasser MUSS noch ein
--      Überschuss von freiem Chlor in der Größenordnung von 0,2 mg/l
--      nachzuweisen sein, um die Desinfektionswirkung sicherzustellen."
--     → "muss … nachzuweisen sein" = einziges MUSS-Item → BLOCK (geflaggt).
--       Anmerkung: "in der Größenordnung von" mildert die harte Grenze → block
--       vs warn ist eine Modal-Ratifizierung (nur Alvaro entscheidet).
--
-- ----------------------------------------------------------------------------
-- GRAMMAR-CHECK (gegen src/lib/compliance/evaluate.ts, verifiziert):
--   Beide Bedingungen haben einen NUMERISCH-LITERALEN RHS:
--     'restchlor_betrieb >= 0.2'  und  'ozon_pro_doc < 0.8'
--   → legacy compare-Pfad mit Zahl-RHS = korrekt (KEINE Symbol-vs-Symbol-Falle,
--     KEINE Subtraktionsform nötig). Fehlender Wert → `pending`, nie false-fail.
--
-- P-13: DWA-M-205 hat KEINE regulation_tables, die von diesen Gates gelesen
--   werden. Beide Gates keyen direkt auf ihr eigenes Eingabefeld (die
--   maßgebende Größe der jeweiligen §4.4.2/§4.3.6-Klausel). Nicht getriggert.
--
-- ----------------------------------------------------------------------------
-- LEFT-UNFIXED (bewusst — siehe Bericht):
--
--   * displayOnly für die 8 Gleichungen (×2) ist CODE (equation-profiles.ts),
--     NICHT SQL — im selben Commit enthalten, aber nicht in dieser Datei.
--
--   * S3 ×2-DUPLIKATION (jede Gleichung + Worksheet doppelt) — GEFLAGGT, NICHT
--     dedupliziert. Destruktives Löschen einer Worksheet-/Gleichungs-Kopie ist
--     FLAG-only (Kampagnen-Regel: Flaggen statt destruktivem Dedup). Die
--     displayOnly-Profile + die Gates unten werden auf BEIDE Kopien angewandt,
--     damit keine Kopie inkonsistent bleibt.
--
--   * S9 RANGE-LOSS (2 verlorene Qualifizierer): EQ-12 DB-Band "400–700"
--     verflacht "400–600, Einzelfall bis 700"; EQ-09 DB-Band "5–10" lässt die
--     "sandfiltriert 1–5 g/m³"-Alternative aus. Beide quellenbestätigt, aber
--     das ist die S9-Erfassungslücke, NICHT der ES-1-Defekt → separat, hier
--     nicht angefasst (kein Wert erfunden).
--
--   * Die 6 deskriptiven Bänder (EQ-02/06/07/09/10/12) bekommen KEIN Gate — die
--     Quelle trägt kein durchsetzbares Modalverb. Ein Warn-Gate hier wäre eine
--     erfundene Anforderung → unterlassen (never-invent).
--
-- ----------------------------------------------------------------------------
-- Rollback:
--   DELETE FROM compliance_requirements
--     WHERE code IN ('REQ-M205-ES1-04','REQ-M205-ES1-11')
--       AND worksheet_template_id IN (
--         SELECT wt.id FROM worksheet_templates wt
--         JOIN standards s ON s.id = wt.standard_id
--         WHERE s.code='DWA-M-205'
--           AND wt.code IN ('M205-07','M205-17','M205-08','M205-21'));
--   (equation-profiles.ts: displayOnly-Blöcke wieder entfernen — Code-Revert.)
-- ============================================================================

DO $$
DECLARE
  v_standard_id uuid;
  v_ws07 uuid;  -- M205-07 Ozonung (EQ-04 ozon_pro_doc, Basis-Kopie)
  v_ws17 uuid;  -- M205-17 Ozonung (EQ-04, S3-Duplikat)
  v_ws08 uuid;  -- M205-08 Chlorung (EQ-11 restchlor_betrieb, Basis-Kopie)
  v_ws21 uuid;  -- M205-21 Chlorung (EQ-11, S3-Duplikat)
BEGIN
  -- ---- resolve standard -----------------------------------------------------
  SELECT id INTO v_standard_id FROM standards WHERE code = 'DWA-M-205';
  IF v_standard_id IS NULL THEN
    RAISE EXCEPTION 'Standard DWA-M-205 not found';
  END IF;

  -- ---- resolve the four worksheets carrying EQ-04 / EQ-11 -------------------
  SELECT id INTO v_ws07 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'M205-07';
  SELECT id INTO v_ws17 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'M205-17';
  SELECT id INTO v_ws08 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'M205-08';
  SELECT id INTO v_ws21 FROM worksheet_templates WHERE standard_id = v_standard_id AND code = 'M205-21';
  IF v_ws07 IS NULL OR v_ws17 IS NULL OR v_ws08 IS NULL OR v_ws21 IS NULL THEN
    RAISE EXCEPTION 'DWA-M-205 worksheet(s) missing (M205-07=%, M205-17=%, M205-08=%, M205-21=%) — cannot author ES-1 gates',
      v_ws07, v_ws17, v_ws08, v_ws21;
  END IF;

  -- Assert the checked fields exist on their worksheets before writing a gate
  -- that references them (task rule — fail loud on schema drift, never write a
  -- gate against a missing symbol).
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws07 AND symbol = 'ozon_pro_doc')
     OR NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws17 AND symbol = 'ozon_pro_doc') THEN
    RAISE EXCEPTION 'DWA-M-205: ozon_pro_doc field missing on M205-07/M205-17 — cannot write EQ-04 warn gate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws08 AND symbol = 'restchlor_betrieb')
     OR NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id = v_ws21 AND symbol = 'restchlor_betrieb') THEN
    RAISE EXCEPTION 'DWA-M-205: restchlor_betrieb field missing on M205-08/M205-21 — cannot write EQ-11 block gate';
  END IF;

  -- ==========================================================================
  -- EQ-11 · restchlor_betrieb ≥ 0,2 mg/l  →  BLOCK (FÜR ALVARO-RATIFIZIERUNG)
  --   §4.4.2 "muss … in der Größenordnung von 0,2 mg/l nachzuweisen sein …"
  --   Numerisch-literaler RHS → legacy compare-Pfad (grammar-OK). Auf BEIDE
  --   S3-Kopien (M205-08 + M205-21) identisch. Idempotent per (ws_id, code).
  --   ⚠ FLAG: block vs warn ist eine Modal-Entscheidung ("muss …" hart, aber
  --     "in der Größenordnung von" weich) — nur Alvaro ratifiziert die Schwere.
  -- ==========================================================================
  INSERT INTO compliance_requirements
    (worksheet_template_id, code, title_de, title_en, condition, severity,
     requires_attestation, clause_reference, source_file, source_anchor, source_quote,
     description, suggestion)
  SELECT
    ws.id,
    'REQ-M205-ES1-11',
    'Restchlor-Überschuss am Beckenablauf ≥ 0,2 mg/l',
    'Residual free-chlorine excess at basin outlet ≥ 0.2 mg/l',
    'restchlor_betrieb >= 0.2',
    'block',
    false,
    '§4.4.2',
    'DWA-M_205.pdf',
    '§4.4.2 Chlorung (PDF S. 30/32, gerendert)',
    'In dem aus dem Behandlungsbecken abfließenden Abwasser muss noch ein Überschuss von freiem Chlor in der Größenordnung von 0,2 mg/l nachzuweisen sein, um die Desinfektionswirkung sicherzustellen. Dieser Restchlorgehalt muss vor Einleitung in ein Gewässer mit Hilfe einer Entchlorungsstufe entfernt werden.',
    'Bei Chlorung muss am Beckenablauf ein Überschuss an freiem Chlor in der Größenordnung von 0,2 mg/l nachweisbar sein (§4.4.2), um die Desinfektionswirkung sicherzustellen. [FÜR ALVARO: block↔warn ratifizieren — "muss … nachzuweisen sein" trägt ein hartes Modalverb, "in der Größenordnung von" weicht die exakte 0,2-Grenze auf.]',
    'Stellen Sie einen freien Restchlorüberschuss von ~0,2 mg/l am Beckenablauf sicher; vor Gewässereinleitung ist eine Entchlorungsstufe erforderlich (§4.4.2).'
  FROM (SELECT v_ws08 AS id UNION ALL SELECT v_ws21) ws
  ON CONFLICT (worksheet_template_id, code) DO NOTHING;

  -- ==========================================================================
  -- EQ-04 · ozon_pro_doc < 0,8 mg/mg  →  WARN (FÜR ALVARO-RATIFIZIERUNG)
  --   §4.3.6 "kann minimiert werden, wenn Ozon proportional zum DOC
  --   (< 0,8 mg/mg) dosiert wird." — Empfehlung mit Sicherheitsbezug
  --   (Bromat-Minimierung), kein muss → warn, nicht block. Auf BEIDE S3-Kopien
  --   (M205-07 + M205-17). Numerisch-literaler RHS → grammar-OK.
  --   ⚠ FLAG: warn-Wahl ist geflaggt (Empfehlung, kein muss — aber Sicherheits-
  --     bezug; Alvaro bestätigt warn vs block).
  -- ==========================================================================
  INSERT INTO compliance_requirements
    (worksheet_template_id, code, title_de, title_en, condition, severity,
     requires_attestation, clause_reference, source_file, source_anchor, source_quote,
     description, suggestion)
  SELECT
    ws.id,
    'REQ-M205-ES1-04',
    'Ozon-DOC-Verhältnis < 0,8 mg/mg (Bromat-Minimierung)',
    'Ozone-to-DOC ratio < 0.8 mg/mg (bromate minimisation)',
    'ozon_pro_doc < 0.8',
    'warn',
    false,
    '§4.3.6',
    'DWA-M_205.pdf',
    '§4.3.6 Ozonung (PDF S. 31, gerendert)',
    'Die Ozonung von bromidhaltigem Abwasser kann zur Bildung von Bromat führen, dessen Einleitung in Gewässer aufgrund seiner toxikologischen Eigenschaften grundsätzlich unerwünscht ist. … Die Bromatbildung kann minimiert werden, wenn Ozon proportional zum DOC (< 0,8 mg/mg) dosiert wird.',
    'Zur Minimierung der Bromatbildung sollte Ozon proportional zum DOC mit einem Verhältnis < 0,8 mg/mg dosiert werden (§4.3.6). [FÜR ALVARO: warn-Wahl ratifizieren — Quelle sagt "kann minimiert werden, wenn … dosiert wird" (Empfehlung, kein muss); Sicherheitsbezug (Bromat toxisch) könnte block rechtfertigen.]',
    'Dosieren Sie Ozon proportional zum DOC-Gehalt mit einem Verhältnis unter 0,8 mg O₃/mg DOC, um die Bromatbildung zu begrenzen (§4.3.6).'
  FROM (SELECT v_ws07 AS id UNION ALL SELECT v_ws17) ws
  ON CONFLICT (worksheet_template_id, code) DO NOTHING;

  -- ---- converge / sanity checks ---------------------------------------------
  IF (SELECT count(*) FROM compliance_requirements
        WHERE code = 'REQ-M205-ES1-11' AND severity = 'block'
          AND worksheet_template_id IN (v_ws08, v_ws21)) <> 2 THEN
    RAISE WARNING 'DWA-M-205: EQ-11 block gate not present on both S3 copies (M205-08 + M205-21) — review.';
  END IF;
  IF (SELECT count(*) FROM compliance_requirements
        WHERE code = 'REQ-M205-ES1-04' AND severity = 'warn'
          AND worksheet_template_id IN (v_ws07, v_ws17)) <> 2 THEN
    RAISE WARNING 'DWA-M-205: EQ-04 warn gate not present on both S3 copies (M205-07 + M205-17) — review.';
  END IF;

  RAISE NOTICE 'DWA-M-205 ES-1 disposition applied: EQ-11 restchlor_betrieb>=0.2 BLOCK (×2, M205-08/21, FLAGGED); EQ-04 ozon_pro_doc<0.8 WARN (×2, M205-07/17, FLAGGED). displayOnly for all 8 ES-1 eqs (×2) is in equation-profiles.ts (code). S3 dedup + S9 range-loss FLAGGED, not applied.';
END $$;
