-- Rollback for 20260801160000_verification_quote.sql
alter table public.fields drop column if exists verification_quote;
alter table public.equations drop column if exists verification_quote;
