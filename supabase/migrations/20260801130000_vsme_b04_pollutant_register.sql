-- VSME-B04.100 pollutant register (per-pollutant breakdown, VSME para 32).
--
-- Para 32: "it shall disclose the pollutants it emits to air, water and soil
-- in its own operations, with the respective amount for each pollutant."
-- The EFRAG XBRL taxonomy models this as AmountOfEmissionsTable ×
-- TypeOfPollutantAxis (94 E-PRTR members); the importer drops dimensional
-- concepts, so the app had collapsed it into three aggregate scalars.
--
-- This migration adds the json carrier field `pollutant_register` on
-- VSME-B04.100 (edited by PollutantRegisterEditor; E-PRTR member list ships
-- as the generated accessor src/lib/vsme/pollutants.ts). On save, the three
-- scalars AmountOfEmissionTo{Air,Water,Soil} are materialized as derived
-- per-medium sums (saveWorksheet pollutant block) and render read-only.
--
-- Precedent: 20260626140000_a138_area_singlesource.sql (carrier + derived
-- producer fields on DWA-A-138-1/A138-07).
--
-- Rollback: UPDATE fields SET active=false
--   WHERE id='b0410000-0000-4000-8000-000000000001';
--   (project_parameters rows for the carrier are preserved.)

DO $$
DECLARE
  wsb04 uuid;
  secb04 uuid;
  ord int;
BEGIN
  SELECT wt.id INTO wsb04 FROM worksheet_templates wt JOIN standards s ON s.id=wt.standard_id
    WHERE s.code='VSME' AND wt.code='VSME-B04.100';
  IF wsb04 IS NULL THEN
    RAISE EXCEPTION 'VSME B04 pollutant register: worksheet template VSME-B04.100 not found';
  END IF;

  -- Attach to the same section as the scalar sum fields.
  SELECT section_id INTO secb04 FROM fields
    WHERE worksheet_template_id=wsb04 AND symbol='AmountOfEmissionToAir' LIMIT 1;
  IF secb04 IS NULL THEN
    SELECT section_id INTO secb04 FROM fields
      WHERE worksheet_template_id=wsb04 AND section_id IS NOT NULL ORDER BY order_index LIMIT 1;
  END IF;

  -- Place the carrier just before the three scalar sums.
  SELECT COALESCE(MIN(order_index), 10) - 1 INTO ord FROM fields
    WHERE worksheet_template_id=wsb04
      AND symbol IN ('AmountOfEmissionToAir','AmountOfEmissionToWater','AmountOfEmissionToSoil');

  INSERT INTO fields (id, worksheet_template_id, section_id, symbol, label_de, label_en,
                      data_type, unit, is_required, consumer_worksheets, order_index, active)
  VALUES
    ('b0410000-0000-4000-8000-000000000001', wsb04, secb04, 'pollutant_register',
     'Schadstoffregister (je Schadstoff und Medium, E-PRTR)',
     'Pollutant register (per pollutant and medium, E-PRTR)',
     'json', NULL, false, NULL, ord, true)
  ON CONFLICT (worksheet_template_id, symbol) DO UPDATE
    SET active=true, label_de=EXCLUDED.label_de, label_en=EXCLUDED.label_en,
        section_id=EXCLUDED.section_id;
END $$;
