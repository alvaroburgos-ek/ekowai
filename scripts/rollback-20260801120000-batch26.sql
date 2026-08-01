DO $$ BEGIN
  UPDATE equations SET formula='eta_F = ((C_RBF_zu * VQ_DR_RBF_zu) - (B_RBF_ab * 1000)) / (C_RBF_zu * VQ_RBF_zu)'
   WHERE id='18a6351e-31f7-448f-9e0f-a74bd6fbdfcf';
  UPDATE equations SET formula='V_buffer = Q_GWT * 1 d', output_unit=NULL
   WHERE id IN ('0b9966ea-64bc-43ae-b410-476a19b5f4ea','4df4256f-4098-4b6f-94bd-e5c67276d3a8');
  UPDATE equations SET formula='Q_SW = 25*33 + 60*150/180 = 825 + 50 = 875 (l/d)', input_symbols='{P,Q_SW_P,Q_SW_A,A}', output_unit=NULL
   WHERE id IN ('4cc17e46-f898-42b9-9836-2184a12f3c5f','89340a0c-143a-4a2c-bba4-872906416e66');
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15 = 1375 (l/d)', input_symbols='{P,Q_GW_P}', output_unit=NULL WHERE id='7e6180be-2e90-4172-ac9c-cf23fb533edb';
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15 = 1000 + 375 = 1375 (l/d)', input_symbols='{P,Q_GW_P}', output_unit=NULL WHERE id='8e434536-7820-4038-9691-bb37b6a9a653';
  UPDATE equations SET formula='Q_GW = 25*40 + 25*15 + 25*10 = 1625 (l/d)', input_symbols='{P,Q_GW_P}', output_unit=NULL
   WHERE id IN ('9a24e0c9-12da-473e-8a7c-220fce1f4129','dd0ccdaf-8fa5-4b04-973f-45604e1184df');
  UPDATE equations SET formula='Q_WB = 1625 - 875 = +750 (l/d)', input_symbols='{Q_GW,Q_SW}', output_unit=NULL
   WHERE id IN ('66da37aa-60cd-4ee9-8bc2-6a1c030dff2e','8ed7e9e9-b247-482a-924c-d1e7f5a435fd');
END $$;
