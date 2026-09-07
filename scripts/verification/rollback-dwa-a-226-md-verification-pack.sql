-- Rollback for dwa-a-226-md-verification-pack.sql (DWA-A-226 only).
-- Reverts every row that pack touched, matched on the pack's own verification_note stamp
-- ('md-verified 2026-09-07%') AND scoped to standards.code = 'DWA-A-226' through
-- worksheet_templates. Nothing else is affected.
--
-- Pre-pass state, read back from prod this session (so the restore is exact):
--   fields    : 87 rows, ALL verification_status='imported_unverified', quote/note/verified_at NULL.
--   equations : 28 rows, 23 'verified_against_standard' + 5 'verified_via_cross_reference',
--               ALL with verification_quote / verification_note / verified_at = NULL.
--               The pack never writes equations.verification_status, so this rollback must not
--               either — it only nulls the three evidence columns the pack filled.
--
-- NOTE: only update statements — apply-pack.mjs supplies the transaction
-- (an inline begin/commit would defeat --dry-run; see the incident note in apply-pack.mjs).

update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
where f.verification_note like 'md-verified 2026-09-07%'
  and f.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-A-226');

update public.equations e
set verification_quote=null, verification_note=null, verified_at=null
where e.verification_note like 'md-verified 2026-09-07%'
  and e.worksheet_template_id in (
    select wt.id from public.worksheet_templates wt
    join public.standards s on s.id = wt.standard_id
    where s.code = 'DWA-A-226');
