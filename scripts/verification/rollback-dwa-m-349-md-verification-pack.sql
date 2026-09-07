-- Rollback for dwa-m-349-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY rows that pack touched (identified by the verification_note tag) and ONLY for standard
-- DWA-M-349 (joined through worksheet_templates -> standards.code, standard id
-- 5ae4beb8-ede4-4c1f-9bd4-0a7b50c20df2).
--
-- Prior state in the 2026-09-05 export was UNIFORM, so a single fields group suffices:
--   * all 92 fields: verification_status='imported_unverified', verification_quote=null,
--     verification_note=null, verified_at=null. That includes the one exempt row
--     (M349-08.nachweis_auslegung), which the pack moved to 'inferred_from_worksheet'.
--   * all 10 equations: verification_status='verified_against_standard' (UNCHANGED by the pack — it only
--     backfilled the quote), verification_quote=null, verification_note=null, verified_at=null. The
--     rollback therefore nulls quote/note/verified_at and leaves the status alone, exactly mirroring
--     Section B of the pack.
-- Gates and the encode-time source_quote column were never written and are not touched here.
-- The STAGED file (dwa-m-349-STAGED-rulings.sql) is commented-out and was never applied.

-- ---- fields: prior status = imported_unverified (92 rows: 91 quoted + 1 exempt) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-349'
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 10 rows — quote backfill only; verification_status stays 'verified_against_standard' ----
update public.equations e set verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-M-349'
   and e.verification_note like 'md-verified 2026-09-05%';
