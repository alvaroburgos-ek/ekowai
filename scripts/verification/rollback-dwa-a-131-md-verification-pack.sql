-- Rollback for dwa-a-131-md-verification-pack.sql (DWA-A-131 only).
-- Reverts every row this session's md pass touched, matched on the verification_note stamp AND scoped
-- to standards.code = 'DWA-A-131' through worksheet_templates. Nothing else is affected.
-- NOTE: only update statements — the runner supplies the transaction.

update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
where f.verification_note like 'md-verified 2026-09-07%'
  and f.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-A-131');

update public.equations e
set verification_quote=null, verification_note=null, verified_at=null
where e.verification_note like 'md-verified 2026-09-07%'
  and e.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-A-131');
