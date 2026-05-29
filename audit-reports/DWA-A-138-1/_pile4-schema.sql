-- =====================================================================
-- DWA-A 138-1, A138-13, Gl. 8 (V_VA over KOSTRA duration table).
-- Schema change is MINIMAL: no INSERT, no DROP, no ALTER on existing
-- columns. The JSON carrier `r_D_n_table` already exists on A138-04
-- (verified Step 0: id c610cf69-..., data_type='json', unit l/(s·ha),
-- is_required=true). We only downgrade the single-value r_D and D fields
-- to inferred_from_worksheet so the form badge reflects their new
-- derived/optional role under the table-as-primary model.
-- =====================================================================

-- Single r_D and single D on A138-04 are no longer the primary inputs —
-- the table supersedes them. Mark as inferred_from_worksheet (no
-- is_required change, no deletion, no anchor change).

UPDATE fields f
SET verification_status = 'inferred_from_worksheet',
    audit_notes = COALESCE(audit_notes, '') || ' | Pile-4 2026-05-29: Role downgraded from primary input to derived/optional after KOSTRA-table-as-primary model (r_D_n_table) was wired to Gl. 8.',
    audited_at = NOW()
FROM worksheet_templates wt
JOIN standards s ON s.id = wt.standard_id
WHERE f.worksheet_template_id = wt.id
  AND s.code = 'DWA-A-138-1' AND wt.code = 'A138-04'
  AND f.symbol IN ('a138_regenspende_r_DT', 'a138_dauerstufe_D')
  AND f.verification_status <> 'inferred_from_worksheet';

-- Verify
SELECT f.symbol, f.label_de, f.data_type, f.unit, f.is_required, f.verification_status
FROM fields f
JOIN worksheet_templates wt ON wt.id = f.worksheet_template_id
JOIN standards s ON s.id = wt.standard_id
WHERE s.code = 'DWA-A-138-1' AND wt.code = 'A138-04'
ORDER BY f.order_index;
