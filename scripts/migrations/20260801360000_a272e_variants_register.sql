-- DWA-A 272E · A272E-14 · variants register (§9.1(5)). `variants_developed` (bare count,
-- unconsumed) subsumed into the register. recommended_alternative/-score/sensitivity KEPT.
--   Apply:    node scripts/apply-migration.mjs scripts/migrations/20260801360000_a272e_variants_register.sql
--   Rollback: node scripts/apply-migration.mjs scripts/rollback-20260801360000-a272e-variants.sql
DO $$
DECLARE v14 uuid;
BEGIN
  SELECT wt.id INTO v14 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id WHERE s.code='DWA-A-272E' AND wt.code='A272E-14';
  IF v14 IS NULL THEN RAISE EXCEPTION 'A272E-14 not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM fields WHERE worksheet_template_id=v14 AND symbol='variants') THEN
    INSERT INTO fields (worksheet_template_id, symbol, label_de, label_en, data_type, is_required, clause_reference, description, order_index, verification_status, active)
    VALUES (v14,'variants','Entwickelte Lösungsvarianten','Developed solution variants','json',false,'§9.1(5)',
            'Register der entwickelten Lösungsvarianten (§9.1(5)): Variante + Beschreibung + Gesamtbewertung. Anzahl abgeleitet.',3,'imported_unverified',true);
  END IF;
  UPDATE fields SET active=false, description=COALESCE(description,'')||' [deaktiviert 2026-08-01: in Varianten-Register überführt (Anzahl abgeleitet).]'
    WHERE worksheet_template_id=v14 AND symbol='variants_developed' AND active=true;
  RAISE NOTICE 'A272E-14 variants register added';
END $$;
