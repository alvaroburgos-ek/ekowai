-- FLL-GAR-2023 · guideline re-read 2026-10-05 (owner: "read the guidelines, check it yourself"): two items of the GAR readiness run
-- that the printed pages settle (PDF page = printed page + 2; every quote re-read on the rendered page in this session).
--   D8  FLL-GAR-23 freibord_zu_bauwerk_cm is REQUIRED on every project, so a free-standing pond cannot approve the sheet (B1 refusal
--       "Pflichteingaben fehlen: Freibord zu Bauwerk"). Tab. 28 (printed p. 118) "Objektbezogene An- und Abschlusshöhen für
--       Gewässerabdichtungen" has three application cases as columns — "Bauteil/Bauwerk", "Freifläche", "Schwimmteich" — and §9.3.5
--       (printed p. 121): "Tabelle 28 gibt einen Überblick über die An- und Abschlusshöhen für Abdichtungsbahnen an Bauteilen und
--       Bauwerken (z. B. Fassadenanschluss, Gebäudeübergang), Freiflächen (z. B. Vegetationsfläche, Belagsfläche) sowie bei Nutzung
--       als Schwimmteich." The building column applies only where the sealing connects to a building component. The sheet already
--       carries the case selector abschluss_anwendungsfall (bauteil_bauwerk / freiflaeche / schwimmteich) and the field itself is
--       described as the "edge sealing height above max water-level at building connections". Fix: the field is shown (and therefore
--       required) only for the building case — visible_when abschluss_anwendungsfall == bauteil_bauwerk. REQ-23 keeps reading it;
--       with the field hidden its terms are the identity of their OR (gate engine rule of 8151496), so the terrain term decides.
--   D9  Anhang 2 (printed p. 133) "Flächengewichtsberechnung der Auflast gegen Abheben": "Das erforderliche Flächengewicht g' der
--       Deckschicht eines dichten Deckwerks gegen Abheben ergibt sich aus:" · "g' = γ'D" (heading "erforderliches Flächengewicht g' der
--       Auflast gegen Abheben in kN/m²") · "dD ≥ (Δu x γA − (γ'F x dF + γ'Di x dDi)) / cos ß" · "Δu = (ΔhW + za) γw" · symbols
--       "dD Dicke der Auflast [m]", "g' Flächengewicht der Auflast [kN/m²]", "Δu Porenwasserüberdruck unter der Dichtung [kN/m²]",
--       "β Böschungswinkel [°]", "ΔhW Höhenunterschied [m] zwischen Grundwasserspiegel und Ruhewasserspiegel …: positiv, wenn der
--       Grundwasserspiegel über dem Ruhewasserspiegel liegt", "γA Sicherheit gegen Auftrieb [-], γA = 1,00".
--       The print writes the left-hand side as "dD" (a thickness in m) while the heading, the sentence before the formula and the symbol
--       list define the REQUIRED quantity as g' in kN/m²; the right-hand side is kN/m² (kN/m² − kN/m³·m), so the comparison is g' ≥ …
--       (dimensional identity, no interpretation). The stored equation 2b carries this inequality, but a comparison is not a computable
--       equation (the engine classifies it as a criterion) and cos did not exist in the expression language until 2026-10-05
--       (functions.ts: sin / cos / tan in radians, rad() for a printed angle in degrees). Fix: the inequality becomes gate REQ-44 on
--       FLL-GAR-22 — IF Delta_u > 0 THEN g_prime >= (Delta_u * gamma_A) / cos(rad(beta)) - (gamma_F_prime * d_F + gamma_Di_prime * d_Di).
--       STRUCTURE (re-rendered 2026-10-05 after the hint writer flagged it): the fraction bar on p. 133 runs under "Δu x γA" only, with
--       "cos ß" beneath it; the bracket "− (γ'F x dF + γ'Di x dDi)" stands outside the fraction. The stored equation 2b divided the whole
--       bracket by cos β — corrected below to the printed structure (source-settled, class b).
--       Guard: Δu > 0 is the uplift case the Anhang computes a required weight for (ΔhW "positiv, wenn der Grundwasserspiegel über dem
--       Ruhewasserspiegel liegt"); without pore-water overpressure nothing is required. Severity block: the page calls g' the
--       "erforderliche" surcharge weight against lifting of the sealing. Hand check: Δu 1,5 · 1,0 / cos 33,69° (0,8321) = 1,8028;
--       − (10 · 0,05 + 0) = 1,3028 kN/m²; g' 2,0 passes, g' 1,2 fails (src/lib/expr/__tests__/trigonometry.test.ts).
-- SAFETY: one field becomes conditional (no value changes), one gate added (block) — the owner's apply ratifies both as written.
-- Needs the deploy with cos / rad before REQ-44 can evaluate; until then the gate reads manual. Idempotent.
-- STAGED — not applied. Apply: node scripts/apply-migration.mjs scripts/migrations/20261005150000_fll_gar_anhang2_and_edge_fields.sql
-- Rollback: scripts/migrations/rollback-20261005150000_fll_gar_anhang2_and_edge_fields.sql
-- Read-back: scripts/verification/apply/readback-fll-gar-anhang2-20261005.sql
BEGIN;

-- D8: the building-connection freeboard only for the building case (Tab. 28 column "Bauteil/Bauwerk")
UPDATE fields f SET visible_when = 'abschluss_anwendungsfall == ''bauteil_bauwerk'''
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE f.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-23' AND f.symbol = 'freibord_zu_bauwerk_cm'
   AND f.visible_when IS NULL;

-- D9: the stored inequality 2b takes the printed structure (division by cos β applies to Δu · γA only)
UPDATE equations e SET formula = 'g_prime >= (Delta_u * gamma_A) / cos(rad(beta)) - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE e.worksheet_template_id = w.id AND s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-22' AND e.equation_number = '2b'
   AND e.formula = 'g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)) / cos(beta)';

-- D9: Anhang 2 uplift check as a gate
INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, title_en, condition, description, clause_reference, severity)
SELECT w.id, 'REQ-44',
       'Auflast gegen Abheben (Anhang 2): Flächengewicht g'' ≥ erforderliches Flächengewicht',
       'Surcharge against uplift (Annex 2): surface weight g'' ≥ required surface weight',
       'IF Delta_u > 0 THEN g_prime >= (Delta_u * gamma_A) / cos(rad(beta)) - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)',
       'Anhang 2 (S. 133): "Das erforderliche Flächengewicht g'' der Deckschicht eines dichten Deckwerks gegen Abheben ergibt sich aus: g'' = γ''D · dD; g'' ≥ (Δu · γA) / cos β − (γ''F · dF + γ''Di · dDi); Δu = (ΔhW + za) · γw", β Böschungswinkel in Grad (rad() rechnet um), γA = 1,00. Gilt bei Porenwasserüberdruck Δu > 0 (Grundwasserspiegel über dem Ruhewasserspiegel). Die gedruckte linke Seite "dD" ist dimensionsbedingt g'' in kN/m² (Überschrift und Symbolliste).
[EN] Annex 2 (p. 133): required surface weight of the cover layer against uplift; applies when the pore-water overpressure Δu is positive.',
       'Anhang 2', 'block'
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE s.code = 'FLL-GAR-2023' AND w.code = 'FLL-GAR-22'
   AND NOT EXISTS (SELECT 1 FROM compliance_requirements c2 WHERE c2.worksheet_template_id = w.id AND c2.code = 'REQ-44');

COMMIT;
