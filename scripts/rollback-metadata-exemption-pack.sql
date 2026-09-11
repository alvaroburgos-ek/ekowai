-- Rollback for metadata-exemption-pack.sql — resets exactly the rows this
-- pack touched (note-guarded, cannot clobber later human classifications).
update public.fields set
  verification_status = 'imported_unverified',
  verification_note = null
where verification_note = 'App-Metadatum/Workflow-Feld — kein Norminhalt (Stage-1 Exemption 2026-08-01)';
