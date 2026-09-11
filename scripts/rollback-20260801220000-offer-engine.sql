-- Rollback for 20260801220000_offer_engine.sql
-- Drops the Angebots-Engine tables (policies, indexes and grants go with
-- them) and the org calibration columns.
drop table if exists public.offer_positions;
drop table if exists public.offers;
alter table public.orgs drop column if exists internal_hourly_rate;
alter table public.orgs drop column if exists target_margin_pct;
