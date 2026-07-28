-- ROLLBACK: restore the shifted originals.
DO $$
BEGIN
  UPDATE regulation_tables SET value_text='personal care products; nutrients and COD can be higher' WHERE id='5c507a11-4d78-4548-8444-aee9c49e1f05';
  UPDATE regulation_tables SET value_text='dependent on user behaviour (urine, traces of faeces)' WHERE id='0a049893-2daf-46fe-a3d0-c894319dce36';
  UPDATE regulation_tables SET value_text='hydraulic shocks; personal care products' WHERE id='dab4e132-a07c-4e5e-824d-0c68570f1675';
  UPDATE regulation_tables SET value_text='paint; little amounts of blood; lint, detergents, surfactants, turbidity' WHERE id='10d64c83-edab-4e3c-8cf1-38b738d66591';
  RAISE NOTICE 'M277E TBL-2 rolled back';
END $$;
