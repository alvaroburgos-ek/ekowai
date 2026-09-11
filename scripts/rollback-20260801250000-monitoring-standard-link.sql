-- Rollback for 20260801250000_monitoring_standard_link.sql
-- Drops the optional guideline link column (FK + comment go with it).
alter table public.monitoring_entries drop column if exists standard_id;
