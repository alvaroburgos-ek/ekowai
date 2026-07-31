-- SOURCE-SETTLED (full-treatment batch 17) — FLL-TP-RHIZOM-2023 + HOAI-2021.
-- All mis-home re-homes, over-blocks, vacuous-TRUE gates, umbau-cap materializations and coverage
-- gaps are RULINGS (enforcement/severity-changing) held for the owner — NOT here.
--
-- (A) FLL-TP-RHIZOM-2023 REQ-01 condition (id 658cacf7…): the IN-membership tokens
--     {bitumen,kunststoff,elastomer,fluessig,gussasphalt,gup} match NONE of the field abdichtungsart's
--     own declared enum values except gussasphalt. Correct to the declared values
--     {bitumenbahn,kunststoffbahn,elastomerbahn,fluessigabdichtung,gussasphalt,gup_beschichtung}.
--     Structural proof = the field's own enum_values; PDF §2 Geltungsbereich (folio 8) prints
--     "Bitumenbahnen; Kunststoff- und Elastomerbahnen; Flüssigabdichtungen; Gussasphalt;
--     GUP-Beschichtungen". Each abbreviated token is an unambiguous prefix of exactly one declared
--     value (zero interpretation). Engine reproduction (agent, real evaluate.ts): ORIG val=bitumenbahn
--     -> gate can never pass for 5 of 6 product classes; FIXED val=bitumenbahn passes / val=unbekannt
--     fails. NOTE: the gate is separately mis-homed on RHZ-01 (a held ruling) so current enforcement is
--     unchanged (pending either way) — this only corrects the latent token set to the declared enum.
--
-- (B) FLL-TP-RHIZOM-2023 field wasserstand_min_unter_vts_mm (id be9fae5d…): label_de
--     "Wasserstand max. unter VTS" is wrong wording — §7.3 defines the range as 20 mm ÜBER bis 50 mm
--     UNTER der VTS-Oberfläche; this field is the LOWER bound (min., 50 mm unter). Paired field
--     wasserstand_max_ueber_vts_mm ("20 mm über") is correct. Relabel to "Wasserstand min. (unter VTS)"
--     (label only; no value/condition/enforcement change). PDF §7.3 folio 20.
--
-- (C) HOAI-2021 field objektart (id 468f5751…) enum values flaechennutzungsplan / bebauungsplan:
--     regulation_reference tagged "§2 Abs.1 (Leistungsbilder)" is wrong — §2 Abs.1 defines Objekte
--     (Gebäude, Innenräume, Freianlagen, Ingenieurbauwerke, Verkehrsanlagen, Tragwerke, TA); the
--     Bauleitplan Leistungsbilder are §18 (Flächennutzungsplan) / §19 (Bebauungsplan). Provenance/
--     reference correction to the standard's own clause structure (SR-1 dead-reference class). Guarded
--     on the array element's value token so position drift cannot mis-target.
-- Rollback: scripts/rollback-20260731190000-batch17.sql
DO $$
DECLARE v int := 0;
BEGIN
  -- (A) FLL REQ-01 enum-token set
  UPDATE compliance_requirements
     SET condition = 'abdichtungsart IN {bitumenbahn,kunststoffbahn,elastomerbahn,fluessigabdichtung,gussasphalt,gup_beschichtung} AND scope_einzelprodukt_bestaetigt == true'
   WHERE id='658cacf7-27d2-4f80-bba6-fe75535ab286'
     AND condition='abdichtungsart IN {bitumen,kunststoff,elastomer,fluessig,gussasphalt,gup} AND scope_einzelprodukt_bestaetigt == true';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'FLL REQ-01 enum tokens: %', v;

  -- (B) FLL label fix
  UPDATE fields SET label_de='Wasserstand min. (unter VTS)'
   WHERE id='be9fae5d-cd32-40d1-953e-835d6189a8f3' AND label_de='Wasserstand max. unter VTS';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'FLL wasserstand label: %', v;

  -- (C) HOAI objektart provenance (index 7 = flaechennutzungsplan, index 8 = bebauungsplan)
  UPDATE fields
     SET enum_values = jsonb_set(enum_values, '{7,regulation_reference}', '"§18"')
   WHERE id='468f5751-d537-45f4-969a-3b5479095b6e'
     AND enum_values->7->>'value'='flaechennutzungsplan'
     AND enum_values->7->>'regulation_reference'='§2 Abs.1 (Leistungsbilder)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'HOAI flaechennutzungsplan §18: %', v;

  UPDATE fields
     SET enum_values = jsonb_set(enum_values, '{8,regulation_reference}', '"§19"')
   WHERE id='468f5751-d537-45f4-969a-3b5479095b6e'
     AND enum_values->8->>'value'='bebauungsplan'
     AND enum_values->8->>'regulation_reference'='§2 Abs.1 (Leistungsbilder)';
  GET DIAGNOSTICS v=ROW_COUNT; RAISE NOTICE 'HOAI bebauungsplan §19: %', v;
END $$;
