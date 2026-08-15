-- ============================================================================
-- ROLLBACK — OPTIONS-AS-SELECTION sweep TRANCHE 1
-- Restores data_type='text', enum_values=NULL for the 11 converted fields,
-- and restores the original clause_reference where the forward script
-- changed it. Guarded on the fields' ids AND data_type='enum'.
-- Forward script: scripts/options-sweep-tranche1.sql
-- ============================================================================

BEGIN;

-- DWA-M-102-4 · M104-16 · dachtyp
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = 'b4ea85df-22e0-4d93-a70d-da62af6393d1'
  AND symbol = 'dachtyp' AND data_type = 'enum';

-- DWA-M-102-4 · M104-17 · ableitungstyp
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '34d11bfa-4978-4c0c-98c3-60d2ad870f17'
  AND symbol = 'ableitungstyp' AND data_type = 'enum';

-- DWA-M-102-4 · M104-18 · belagstyp
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '0aa3ad89-ea91-4da0-8f01-6509f542fce2'
  AND symbol = 'belagstyp' AND data_type = 'enum';

-- DWA-M-102-4 · M104-19 · gd_typ
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '49a690f1-13d2-49eb-8c0e-d219d18c2608'
  AND symbol = 'gd_typ' AND data_type = 'enum';

-- DWA-M-102-4 · M104-32 · ermittlungsverfahren
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = 'f0593f31-6ab3-4f6b-840a-d41b83b94e7c'
  AND symbol = 'ermittlungsverfahren' AND data_type = 'enum';

-- DWA-A-262E · A262-07 · vorbehandlung_typ
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = 'a20766d0-9ac6-48ae-937a-8209e2bf9044'
  AND symbol = 'vorbehandlung_typ' AND data_type = 'enum';

-- DWA-A-262E · A262-17 · filtertyp_gewaehlt_KA (clause_reference was '§4.3')
UPDATE fields SET data_type = 'text', enum_values = NULL, clause_reference = '§4.3'
WHERE id = '19a58a32-8ca5-4105-803d-2657509c3fb2'
  AND symbol = 'filtertyp_gewaehlt_KA' AND data_type = 'enum';

-- DWA-A-262E · A262-18 · filter_type_KomKA (clause_reference was '§4.3.4-4.3.6')
UPDATE fields SET data_type = 'text', enum_values = NULL, clause_reference = '§4.3.4-4.3.6'
WHERE id = '083bba88-c0a0-48a4-93dc-339b86290a7c'
  AND symbol = 'filter_type_KomKA' AND data_type = 'enum';

-- DWA-A-262E · A262-24 · filtertyp_KomKA (clause_reference was '§4.3')
UPDATE fields SET data_type = 'text', enum_values = NULL, clause_reference = '§4.3'
WHERE id = 'f656b0e7-7f64-4fb5-9820-b121fe8131b1'
  AND symbol = 'filtertyp_KomKA' AND data_type = 'enum';

-- DWA-A-138-1 · A138-23 · facility_type_dimensioned (clause_reference was '§6')
UPDATE fields SET data_type = 'text', enum_values = NULL, clause_reference = '§6'
WHERE id = '1537f2e7-7812-4e9b-9694-74cb596990a0'
  AND symbol = 'facility_type_dimensioned' AND data_type = 'enum';

-- DWA-M-229-2 · M2292-03 · stoerung_typ
UPDATE fields SET data_type = 'text', enum_values = NULL
WHERE id = '6a19f3c4-b5dc-40a9-bff1-33feefab2986'
  AND symbol = 'stoerung_typ' AND data_type = 'enum';

-- Expect exactly 11 rows updated in total.
COMMIT;
