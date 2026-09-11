-- Rollback for 20260801290000_rate_roles.sql
-- Drops the role_id links first, then the rate_roles table (policies,
-- indexes, constraint and grants go with it).
alter table public.effort_entries  drop column if exists role_id;
alter table public.offer_positions drop column if exists role_id;
drop table if exists public.rate_roles;
