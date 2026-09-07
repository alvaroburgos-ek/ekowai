-- Rollback for din-18130-1-md-verification-pack.sql (2026-09-07).
-- The pack only backfilled verification_quote on 8 equations (status untouched), so the rollback nulls
-- the quote and strips the note tag, scoped to DIN-18130-1 and to rows this pack tagged.
update public.equations e
   set verification_quote=null,
       verification_note=nullif(regexp_replace(e.verification_note, '\s*\|\s*md-quote 2026-09-07 \([^)]*\) \[VC\]', ''), '')
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id
   and s.code = 'DIN-18130-1'
   and e.verification_note like '%md-quote 2026-09-07%';
