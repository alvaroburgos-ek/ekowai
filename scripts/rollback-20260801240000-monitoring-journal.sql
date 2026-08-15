-- Rollback for 20260801240000_monitoring_journal.sql
-- Drops the Monitoring-Journal table (policy, index and grants go with it).
drop table if exists public.monitoring_entries;
