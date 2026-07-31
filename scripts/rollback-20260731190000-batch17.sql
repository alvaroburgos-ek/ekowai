-- Rollback for 20260731190000_batch17_source_settled.sql
DO $$
BEGIN
  UPDATE compliance_requirements
     SET condition='abdichtungsart IN {bitumen,kunststoff,elastomer,fluessig,gussasphalt,gup} AND scope_einzelprodukt_bestaetigt == true'
   WHERE id='658cacf7-27d2-4f80-bba6-fe75535ab286';
  UPDATE fields SET label_de='Wasserstand max. unter VTS'
   WHERE id='be9fae5d-cd32-40d1-953e-835d6189a8f3';
  UPDATE fields SET enum_values = jsonb_set(enum_values, '{7,regulation_reference}', '"§2 Abs.1 (Leistungsbilder)"')
   WHERE id='468f5751-d537-45f4-969a-3b5479095b6e' AND enum_values->7->>'value'='flaechennutzungsplan';
  UPDATE fields SET enum_values = jsonb_set(enum_values, '{8,regulation_reference}', '"§2 Abs.1 (Leistungsbilder)"')
   WHERE id='468f5751-d537-45f4-969a-3b5479095b6e' AND enum_values->8->>'value'='bebauungsplan';
END $$;
