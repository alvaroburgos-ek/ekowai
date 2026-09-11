-- Stage 5 — EDITION LIFECYCLE (additive, staged; apply only after review).
-- Standards carry edition metadata: valid_from (date this edition became
-- valid) and superseded_by (self-FK to the standard row that replaces this
-- edition; no cascade — superseded editions stay referenceable so projects
-- computed under an old edition keep their provenance and get flagged in
-- the UI/PDF instead of losing data).

alter table public.standards
  add column if not exists valid_from date;

alter table public.standards
  add column if not exists superseded_by uuid references public.standards(id);

comment on column public.standards.valid_from is
  'Edition lifecycle: date this edition became valid (Stage 5).';
comment on column public.standards.superseded_by is
  'Edition lifecycle: standards.id of the edition that replaces this one; NULL = current edition (Stage 5).';
