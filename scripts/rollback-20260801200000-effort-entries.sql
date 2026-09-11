-- Rollback for 20260801200000_effort_entries.sql
-- Drops the effort-logging table (policy, index and grants go with it).
drop table if exists public.effort_entries;
