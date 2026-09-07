-- Rollback for dwa-m-229-2-md-verification-pack.sql (DWA-M-229-2 only).
-- Reverts every row this session's md pass touched, matched on the verification_note stamp AND scoped
-- to standards.code = 'DWA-M-229-2' through worksheet_templates. Nothing else is affected.
-- NOTE: only update statements — the runner supplies the transaction (no begin/commit here).

-- 1) fields: all 65 were 'imported_unverified' before the pack (0 were verified).
update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
where f.verification_note like 'md-verified 2026-09-07%'
  and f.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-M-229-2');

-- 2) equations: all 12 were already 'verified_against_standard' with verification_quote NULL — the pack
--    only backfilled the quote/note/verified_at. Status was never touched, so it is not restored here.
update public.equations e
set verification_quote=null, verification_note=null, verified_at=null
where e.verification_note like 'md-verified 2026-09-07%quote backfill only%'
  and e.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-M-229-2');
