-- Rollback for fll-naturteich-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows this pack touched (identified by the verification_note prefix).
update public.fields
   set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
 where verification_note like 'md-verified 2026-09-05%' or verification_note like 'md-pass 2026-09-05%';
update public.equations
   set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
 where verification_note like 'md-verified 2026-09-05%';
