-- Rollback for dwa-m-229-1-md-verification-pack.sql (DWA-M-229-1 only).
-- Reverts every row this session's md pass touched, matched on the verification_note stamp AND scoped
-- to standards.code = 'DWA-M-229-1' through worksheet_templates. Nothing else is affected.
-- NOTE: only update statements — the runner supplies the transaction (no begin/commit here).

-- 1) fields: all 151 were 'imported_unverified' before the pack.
update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
where f.verification_note like 'md-verified 2026-09-07%'
  and f.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-M-229-1');

-- 2) equations whose STATUS was raised (4 rows: Gl. 16, f_SBR, beta_alpha, beta_St) — restore
--    'verified_via_cross_reference' and drop the quote/note.
update public.equations e
set verification_status='verified_via_cross_reference', verification_quote=null, verification_note=null, verified_at=null
where e.verification_note like 'md-verified 2026-09-07%status raised from verified_via_cross_reference'
  and e.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-M-229-1');

-- 3) equations that only received a quote backfill (43 rows) — status stays untouched.
update public.equations e
set verification_quote=null, verification_note=null, verified_at=null
where e.verification_note like 'md-verified 2026-09-07%quote backfill only%'
  and e.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-M-229-1');
