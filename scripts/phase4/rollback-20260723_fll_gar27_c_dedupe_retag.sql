-- Rollback for 20260723_fll_gar27_c_dedupe_retag.
-- Restores the pre-fix field state captured 2026-07-23 (read-only MCP).
-- audit_status / verification_status were never touched by the forward migration.

-- Reactivate the decoy twin C_abflusswert and restore its NULL description.
UPDATE fields
SET active = true,
    description = NULL
WHERE id = '34d5b6f0-faf8-4f4c-b308-b330b36f6d94';

-- Restore the consumed C's pre-retag provenance.
UPDATE fields
SET source_file      = 'orphan_fix_FLLGAR_20260621',
    source_anchor    = 'equation',
    source_quote     = NULL,
    clause_reference = 'Anhang 1',
    description       = 'Eingang in Gl.1 Q_NOT (Abflussbeiwert).'
WHERE id = 'd6f02425-71c9-4a85-bfd2-35069a118771';
