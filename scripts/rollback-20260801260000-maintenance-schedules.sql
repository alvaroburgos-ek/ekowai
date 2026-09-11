-- Rollback for 20260801260000_maintenance_schedules.sql
-- Drops the maintenance-schedules library table (policy, index and grants go
-- with it).
drop table if exists public.maintenance_schedules;
