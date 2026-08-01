-- Rollback for 20260801210000_standard_editions.sql
-- Drops the Stage-5 edition-lifecycle columns from standards.
-- Safe: both columns are additive and nullable; dropping superseded_by also
-- drops its self-FK constraint.

alter table public.standards
  drop column if exists superseded_by;

alter table public.standards
  drop column if exists valid_from;
