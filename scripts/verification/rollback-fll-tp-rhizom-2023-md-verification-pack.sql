-- Rollback for fll-tp-rhizom-2023-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note prefix) and ONLY for
-- standard FLL-TP-RHIZOM-2023 (joined through worksheet_templates → standards.code).
update public.fields f
   set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt
  join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id
   and s.code = 'FLL-TP-RHIZOM-2023'
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');
update public.equations e
   set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt
  join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id
   and s.code = 'FLL-TP-RHIZOM-2023'
   and e.verification_note like 'md-verified 2026-09-05%';
