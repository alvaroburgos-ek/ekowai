-- Stage-1 verification (SR-1): verbatim source quote per verified field/equation.
-- Additive only. Rollback: scripts/rollback-20260801160000-verification-quote.sql
alter table public.fields add column if not exists verification_quote text;
alter table public.equations add column if not exists verification_quote text;

comment on column public.fields.verification_quote is
  'Verbatim quote from the standard''s own text/table backing the verification (doctrine SR-1). Required for verified_against_standard.';
comment on column public.equations.verification_quote is
  'Verbatim quote from the standard''s own text/table backing the verification (doctrine SR-1). Required for verified_against_standard.';
