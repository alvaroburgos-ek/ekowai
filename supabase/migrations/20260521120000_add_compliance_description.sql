-- Add description column to compliance_requirements so xlsx Pass3c
-- description data has a home. NULL allowed for legacy/synthetic rows.
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS description text;
