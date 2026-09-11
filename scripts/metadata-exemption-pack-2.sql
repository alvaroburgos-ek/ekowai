-- Follow-up to metadata-exemption-pack.sql (2026-08-01): the 14 A138-01
-- metadata fields sat in 'needs_engineer_review', which the first pack's
-- guard skipped. The SR-1 pack's full-text grep proved the norm defines none
-- of them — app metadata regardless of prior status. Same note, same rollback.
begin;
update public.fields f set
  verification_status = 'inferred_from_worksheet',
  verification_note = 'App-Metadatum/Workflow-Feld — kein Norminhalt (Stage-1 Exemption 2026-08-01)'
from public.worksheet_templates wt
where wt.id = f.worksheet_template_id
  and wt.code = 'A138-01'
  and f.symbol in (
    'client_contact','client_name','planner_firm','planner_name','planning_phase',
    'project_name','project_number','project_type','site_address','site_bundesland',
    'site_lat','site_lon','site_municipality','site_total_area'
  )
  and f.verification_status in ('imported_unverified','needs_engineer_review');
commit;
