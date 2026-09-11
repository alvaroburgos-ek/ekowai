-- A duty can be printed WITHOUT any frequency wording (e.g. M-1200-3 §7.2.4
-- Sediment-/Biofilmbeobachtung). Inventing interval text would violate SR-1,
-- so the column must allow NULL. Display renders "ohne Intervallangabe".
alter table public.maintenance_schedules alter column interval_text drop not null;
