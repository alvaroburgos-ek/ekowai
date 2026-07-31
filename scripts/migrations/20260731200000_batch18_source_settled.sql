-- SOURCE-SETTLED (full-treatment batch 18) — DWA-M-229-2 + DWA-M-349.
-- Both are DWA Merkblätter (advisory). Their dominant defect is modal over-block (~9 + ~11 CRs encoding
-- sollte/empfohlen/kann/descriptive-range as hard block) plus two fabricated blocks (349 CR-013 O2<=1,
-- 229-2 CR-013 O2) and cross-worksheet equation-input gaps — ALL severity/enforcement/structural RULINGS
-- held for the owner, NOT here. The equation layer is clean (229-2 12/12 faithful; 349 9/10 — Gl.7 eta
-- subscript is an owner ratification because the SOURCE itself contradicts oTR vs oTS).
--
-- REVERSAL LOGGED (R-2/R-5): the batch agent flagged 229-2 CR-019 "(jährlich)" as a fabricated annual
-- cadence and proposed stripping it + block->warn. Re-extraction of the PDF THIS session refutes that —
-- §10.2 Arbeitssicherheit (folio 46) reads verbatim: "Das Personal muss in regelmäßigen Abständen
-- (einmal pro Jahr) sicherheitstechnisch unterrichtet werden." The label and CR-019 title are FAITHFUL
-- and the block severity is CORRECT ("muss"). Finding WITHDRAWN; nothing stripped. This is why an agent
-- quote is unverified input until re-extracted.
--
-- ONLY zero-interpretation fix in this batch (structural, DB-verifiable — not source-quote-dependent):
-- (A) DWA-M-229-2 CR-014 (id c5c7d076…) clause_reference "8.4" -> "§8.4". 17/17 numeric-clause siblings
--     carry the § prefix (incl. CR-013 and CR-020 which both reference "§8.4"); CR-014 is the lone bare
--     outlier. Cosmetic normalisation, no value/enforcement change.
-- Rollback: scripts/rollback-20260731200000-batch18.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE compliance_requirements SET clause_reference='§8.4'
   WHERE id='c5c7d076-5ceb-4bfd-a0d3-523817478fe5' AND clause_reference='8.4';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'DWA-M-229-2 CR-014 § prefix: %', v;
END $$;
