-- Monitoring-Journal: optional link to a GUIDELINE (standard). Lets a journal
-- entry say WHICH Regelwerk an observation belongs to (e.g. Begehung nach
-- DWA-A-138). App-side validation ensures the standard is one of the project's
-- attached standards (src/lib/actions/monitoring.ts). Additive only.
alter table public.monitoring_entries
  add column if not exists standard_id uuid references public.standards(id) on delete set null;

comment on column public.monitoring_entries.standard_id is
  'Optional link to the guideline (standards.id) this journal entry refers to; app-validated to be one of the project''s attached standards; SET NULL if the standard is deleted.';
