-- Rollback for dwa-m-102-4-md-verification-pack.sql (DWA-M-102-4 only).
-- Reverts fields/equations this pack touched, identified by the pack's own verification_note stamps,
-- scoped to DWA-M-102-4 through worksheet_templates -> standards.code.
begin;

update public.fields f
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where f.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-M-102-4'
  and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

update public.equations e
set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
from public.worksheet_templates wt, public.standards s
where e.worksheet_template_id = wt.id and wt.standard_id = s.id and s.code = 'DWA-M-102-4'
  and e.verification_note like 'md-verified 2026-09-05%';

commit;
