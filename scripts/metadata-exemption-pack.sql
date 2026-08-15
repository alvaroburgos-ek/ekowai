-- ============================================================================
-- Stage-1 metadata exemption pack — 2026-08-01
-- Reclassify app-internal fields (project metadata / workflow flags) that the
-- source norm does NOT define to verification_status='inferred_from_worksheet'
-- ("Wizard-intern, nicht direkt in der Norm"). Basis: the SR-1 verification
-- packs' residue lists (full-text greps of both standards found no defining
-- text for these fields). Exempt != verified: the finalize gate skips them,
-- they never display as verified.
-- Rollback: scripts/rollback-metadata-exemption-pack.sql
-- ============================================================================
begin;

-- DWA-A-138-1 · A138-01 project-metadata fields (13) + site_total_area
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
  and f.verification_status = 'imported_unverified';

-- DWA-A-138-1 · A138-12 app-workflow flags (3)
update public.fields f set
  verification_status = 'inferred_from_worksheet',
  verification_note = 'App-Metadatum/Workflow-Feld — kein Norminhalt (Stage-1 Exemption 2026-08-01)'
from public.worksheet_templates wt
where wt.id = f.worksheet_template_id
  and wt.code = 'A138-12'
  and f.symbol in ('a_s_m_needs_reconfirmation','a_s_m_provenance','ac_as_ratio_check_reason')
  and f.verification_status = 'imported_unverified';

-- DIN-18130-1 · Sachverständigen-Freigabe workflow field (1)
update public.fields f set
  verification_status = 'inferred_from_worksheet',
  verification_note = 'App-Metadatum/Workflow-Feld — kein Norminhalt (Stage-1 Exemption 2026-08-01)'
from public.worksheet_templates wt
join public.standards s on s.id = wt.standard_id
where wt.id = f.worksheet_template_id
  and s.code = 'DIN-18130-1'
  and f.symbol = 'freigabe_sachverstaendiger'
  and f.verification_status = 'imported_unverified';

commit;
