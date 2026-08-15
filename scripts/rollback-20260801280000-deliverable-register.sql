-- Rollback for 20260801280000_deliverable_register.sql
-- Drops the deliverable-register table (policy, index and grants go with it).
drop table if exists public.deliverables;
