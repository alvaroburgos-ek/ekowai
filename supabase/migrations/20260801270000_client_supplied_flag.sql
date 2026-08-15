-- Client-supplied value flagging (roadmap Stage 5 — AGB input-error carve-out).
-- A saved parameter can be marked as "Kundenangabe": the value was DELIVERED BY
-- THE CLIENT, not determined by EKOWAI. The flag surfaces on the worksheet
-- field, in the dossier field rows, and as a summary section on the
-- Konformitätserklärung, because the AGB carve out liability for client-supplied
-- input errors (Haftungsausschluss für Eingabefehler bei kundenseitig
-- beigestellten Eingaben). Additive only; app-side toggle respects the
-- post-approval write-lock.
alter table public.project_parameters
  add column if not exists client_supplied boolean not null default false;

comment on column public.project_parameters.client_supplied is
  'True when this value is a Kundenangabe (delivered by the client, not determined by EKOWAI). Shown on the field, in the dossier and summarized on the Konformitätserklärung; the AGB liability carve-out for client-supplied input errors (Eingabefehler) applies to flagged values.';
