-- Rollback for dwa-m-381e-md-verification-pack.sql (2026-09-05).
-- Reverts ONLY the rows that pack touched (identified by the verification_note tag) and ONLY for
-- standard DWA-M-381E (joined through worksheet_templates -> standards.code; standard id
-- 23f7b102-1a7f-450f-aadf-e2510d384aac).
--
-- Prior state in the 2026-09-05 export was UNIFORM, so a single fields group suffices:
--   * all 75 fields: verification_status='imported_unverified', verification_quote=null,
--     verification_note=null, verified_at=null. (The pack produced 0 exempt rows — this leaflet has no
--     app-metadata fields — so there is no 'inferred_from_worksheet' group to restore.)
--   * all 4 equations: verification_status='verified_against_standard' (UNCHANGED by the pack — it only
--     backfilled the quote), verification_quote=null, verification_note=null, verified_at=null. The
--     rollback therefore nulls quote/note/verified_at and leaves the status alone, exactly mirroring
--     Section B of the pack.
-- Gates and the encode-time source_quote column were never written and are not touched here.
-- The STAGED file (dwa-m-381e-STAGED-rulings.sql) is commented-out and was never applied.

-- ---- fields: prior status = imported_unverified (75 rows, all quoted) ----
update public.fields f set verification_status='imported_unverified', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-381E'
   and (f.verification_note like 'md-verified 2026-09-05%' or f.verification_note like 'md-pass 2026-09-05%');

-- ---- equations: 4 rows — quote backfill only; verification_status stays 'verified_against_standard' ----
update public.equations e set verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-M-381E'
   and e.verification_note like 'md-verified 2026-09-05%';
