-- Rollback for _STAGED_20260724150000_fll_f7_range_selection_d4.sql
-- Author: Alvaro Burgos <alvaro.burgos@ekowai.com>
-- Co-authored: Claude Opus 4.8 <noreply@anthropic.com>
BEGIN;

-- F-7 #1: remove the staged freibord case-selection field.
DELETE FROM fields f
USING worksheet_templates wt, standards s
WHERE f.worksheet_template_id = wt.id
  AND wt.standard_id = s.id
  AND s.code = 'FLL-GAR-2023'
  AND wt.code = 'FLL-GAR-23'
  AND f.symbol = 'freibord_bauwerk_fall';

-- F-7 #2: restore GAR-07 slope ratio to free text.
UPDATE fields
SET data_type = 'text',
    enum_values = NULL,
    description = 'Slope ratio, varies by material per Tab.1'
WHERE id = 'd455a15f-3562-4301-a13a-438da6849162';

COMMIT;
