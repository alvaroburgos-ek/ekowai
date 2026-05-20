-- =============================================================================
-- Fix broken report_archives trigger that references dropped calculations table.
-- Migration 20260503130000 added report_archives_org_match_trg which checks:
--   select org_id from calculations where id = new.calculation_id
-- The calculations table was dropped in 20260520120000_db_driven_rebuild.sql.
-- This migration drops the broken trigger and its function.
-- The calculation_id column remains (NOT NULL, no FK) as a legacy placeholder.
-- =============================================================================

DROP TRIGGER IF EXISTS report_archives_org_match_trg ON report_archives;
DROP FUNCTION IF EXISTS report_archives_org_match();
