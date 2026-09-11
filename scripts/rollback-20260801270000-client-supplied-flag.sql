-- Rollback for 20260801270000_client_supplied_flag.sql
-- Drops the Kundenangabe flag column (comment goes with it).
alter table public.project_parameters drop column if exists client_supplied;
