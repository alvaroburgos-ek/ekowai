DO $$ BEGIN
  UPDATE equations SET formula='eta_BV = a_AFS63 * exp(-b_AFS63 * q_A_max)'
   WHERE id='d929851f-c55d-4e97-a849-1aa614decbf0';
END $$;
