-- SOURCE-SETTLED FIX — DWA-M-277E Table 2 (printed p16 = PDF p18) "Characteristics" row:
-- 4 cells were column-shifted by one source-of-origin. RE-VERIFIED against the RENDERED page
-- in THIS session (footer "16 DWA Set of Rules"), not inherited from the audit. Corrected
-- values are the printed cells; class (b) source-settled (contradicts the verbatim page).
-- Non-safety orientation metadata, but factually mis-attributed. Guarded on the wrong value.
DO $$
DECLARE v_n int := 0; v_t int;
BEGIN
  UPDATE regulation_tables SET value_text = 'personal care products, nutrients and COD can be higher, dependent on user behavior (urine, traces of faeces)'
   WHERE id='5c507a11-4d78-4548-8444-aee9c49e1f05' AND variant_value='shower'
     AND value_text = 'personal care products; nutrients and COD can be higher';
  GET DIAGNOSTICS v_t = ROW_COUNT; v_n := v_n + v_t;
  UPDATE regulation_tables SET value_text = 'hydraulic shocks, personal care products'
   WHERE id='0a049893-2daf-46fe-a3d0-c894319dce36' AND variant_value='bathtub'
     AND value_text = 'dependent on user behaviour (urine, traces of faeces)';
  GET DIAGNOSTICS v_t = ROW_COUNT; v_n := v_n + v_t;
  UPDATE regulation_tables SET value_text = 'paint, little amounts of blood'
   WHERE id='dab4e132-a07c-4e5e-824d-0c68570f1675' AND variant_value='hand_washbasin'
     AND value_text = 'hydraulic shocks; personal care products';
  GET DIAGNOSTICS v_t = ROW_COUNT; v_n := v_n + v_t;
  UPDATE regulation_tables SET value_text = 'lint, detergents, surfactants, turbidity'
   WHERE id='10d64c83-edab-4e3c-8cf1-38b738d66591' AND variant_value='washing_machine'
     AND value_text = 'paint; little amounts of blood; lint, detergents, surfactants, turbidity';
  GET DIAGNOSTICS v_t = ROW_COUNT; v_n := v_n + v_t;
  RAISE NOTICE 'M277E TBL-2 realign: % of 4 cells corrected', v_n;
END $$;
