DO $$ BEGIN
  UPDATE equations SET formula='P_korr = a_F * P_korr + g_F * P_korr + v_F * P_korr   [mm/a]', output_unit=NULL WHERE id='84363b16-16cc-45b5-a983-6d9b2c2dfc65';
  UPDATE equations SET formula='Z = a_F * P_korr   [mm/a]', output_unit=NULL WHERE id='6da086d8-b051-465f-bf45-7763f8b2fa01';
  UPDATE equations SET formula='Z = a_A * Z + g_A * Z + v_A * Z   [mm/a]', output_unit=NULL WHERE id='2ab13f2f-5182-47dc-a0b7-1fec3330dbe9';
  UPDATE equations SET input_symbols='{P_korr,R,ET_a}' WHERE id='681fdcea-c1f6-472d-9efb-1300e5bf1d4a';
  UPDATE equations SET input_symbols='{R,GWN,R_D}' WHERE id='c8a7ab70-c4db-4b17-bf96-2ee0f1ca4858';
  UPDATE equations SET input_symbols='{P_korr,R_D,GWN,ET_a}' WHERE id='5cc33383-81ef-4d43-a5e8-02e6111bd7ac';
END $$;
