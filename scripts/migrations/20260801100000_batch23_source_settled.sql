-- SOURCE-SETTLED (full-treatment batch 23) — DWA-M-381E + DVS-2225-4 (both Weißdruck/final).
-- (A) DWA-M-381E Eq.4 CRF (id befaedbd…): formula uses Python-style '**' power operator which the
--     arithmetic engine (src/lib/eval/arithmetic.ts, '^' only) cannot tokenise -> kind='error' every eval,
--     breaking the M381E-10 cost chain. Replace '**' -> '^'. Engine reproduction (in-session): '**' ->
--     ERROR 'Ausdruck erwartet'; '^' -> computed 0.0802 (i=0.05,n=20). Source §7/§8 Gl.(4) prints
--     CRF = i·(1+i)^n / ((1+i)^n − 1) with n as superscript. Broken-before/computes-after.
-- (B) DWA-M-381E output_unit backfills (physically determined by the output quantity + source prints the
--     bracketed unit): eta '%' (dec3bdb3, efficiency ·100 [%]), A_thickener 'm2' (2389029e, area [m²]),
--     H_S 'm' (a09b565f, height [m]). No computed-value change.
-- (C) DWA-M-381E CR-009 (ddc1f191) description "upstream" -> "downstream". R-2: re-extracted the PDF THIS
--     session — §4.2.1 line 1049 verbatim: "These thickening devices definitely need a downstream
--     flocculant mixing zone". Encoded "an upstream" contradicts it. Display-text only, no enforcement change.
-- (D) DVS-2225-4 output_unit backfills: delta_d_N1 (49fe794d) + delta_d_N2 (20079ef2) 'mm' (Fügeweg/
--     Dickenänderung; §6.2.12 acceptance band prints "0,40 mm ... 0,80 mm" + Blatt-3 header "Abmessungen(mm)").
-- All modal over-blocks, mis-homes, IS-NOT-NULL under-enforcements, logic inversions (CR-013), the
-- CR-011/CR-012 conflict, DVS CR-11/CR-18 enforcement upgrades, and the fabricated ue_2>=40/ue_1<15 bounds
-- are RULINGS (enforcement/severity changes) held for the owner. Nothing else applied.
-- Rollback: scripts/rollback-20260801100000-batch23.sql
DO $$
DECLARE v int := 0;
BEGIN
  UPDATE equations SET formula='CRF = i * (1 + i)^n / ((1 + i)^n - 1)'
   WHERE id='befaedbd-00da-4876-a951-e84f2d8cf185' AND formula='CRF = i * (1 + i)**n / ((1 + i)**n - 1)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M381E CRF **->^: %', v;

  UPDATE equations SET output_unit='%'  WHERE id='dec3bdb3-7578-45b5-86f6-7642c48790de' AND output_unit IS NULL;
  UPDATE equations SET output_unit='m2' WHERE id='2389029e-58e8-4174-a79e-ab3fbab89e7a' AND output_unit IS NULL;
  UPDATE equations SET output_unit='m'  WHERE id='a09b565f-bfc8-4518-aac8-32ff38b2ebd9' AND output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M381E eq units (last): %', v;

  UPDATE compliance_requirements
     SET description='Mechanical thickeners using natural gravity require a downstream flocculant mixing zone and flocculation unit.'
   WHERE id='ddc1f191-83e4-4e77-8c96-ffa7fcc91ca8'
     AND description='Mechanical thickeners using natural gravity require an upstream flocculant mixing zone and flocculation unit.';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'M381E CR-009 upstream->downstream: %', v;

  UPDATE equations SET output_unit='mm' WHERE id='49fe794d-0b73-4cda-ad4b-02680057f34b' AND output_unit IS NULL;
  UPDATE equations SET output_unit='mm' WHERE id='20079ef2-3e86-449f-9fe1-e5f0c602e729' AND output_unit IS NULL;
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'DVS delta_d_N2 unit: %', v;
END $$;
