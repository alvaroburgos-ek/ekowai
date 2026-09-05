-- Wizard step-by-step documentation workflow audit (READ-ONLY).
--   node scripts/verification/prod-query.mjs scripts/verification/audit-wizard-workflow.sql
-- A1 standards in scope
select code, version, issued_year, valid_from, superseded_by from standards where code in ('DWA-A-138-1','DIN-18130-1') or code ilike 'FLL%' order by code;
-- A2 fields per standard by verification status (active only)
select s.code, f.verification_status, count(*) as n, count(f.verification_quote) as with_quote from fields f join worksheet_templates wt on wt.id=f.worksheet_template_id join standards s on s.id=wt.standard_id where (s.code in ('DWA-A-138-1','DIN-18130-1') or s.code ilike 'FLL%') and coalesce(f.active,true) group by 1,2 order by 1,2;
-- A3 equations per standard
select s.code, count(*) as n_eq, count(e.source_quote) as with_quote, count(*) filter (where e.verification_status='verified_against_standard') as verified, count(e.verification_quote) as with_vquote from equations e join worksheet_templates wt on wt.id=e.worksheet_template_id join standards s on s.id=wt.standard_id where (s.code in ('DWA-A-138-1','DIN-18130-1') or s.code ilike 'FLL%') group by 1 order by 1;
-- A4 gates per standard by severity
select s.code, cr.severity, count(*) as n, count(cr.source_quote) as with_quote, count(*) filter (where cr.requires_attestation) as attest from compliance_requirements cr join worksheet_templates wt on wt.id=cr.worksheet_template_id join standards s on s.id=wt.standard_id where (s.code in ('DWA-A-138-1','DIN-18130-1') or s.code ilike 'FLL%') group by 1,2 order by 1,2;
-- B1 real project(s)
select p.id, p.name, p.client_name, p.project_type, o.name as org, p.created_at::date as created, p.updated_at::date as updated, p.archived_at::date as archived from projects p left join orgs o on o.id=p.org_id where p.name ilike '%forsch%' order by p.created_at;
-- B2 standards attached to the real project
select s.code, ps.status, ps.layer, ps.relation_type, ps.stage_order, ps.added_at::date as added from project_standards ps join projects p on p.id=ps.project_id join standards s on s.id=ps.standard_id where p.name ilike '%forsch%' order by ps.layer, ps.stage_order, s.code;
-- B3 worksheet instance states per attached standard
select s.code, wi.status, count(*) as n, max(wi.updated_at)::date as last_touch from worksheet_instances wi join projects p on p.id=wi.project_id join worksheet_templates wt on wt.id=wi.worksheet_template_id join standards s on s.id=wt.standard_id where p.name ilike '%forsch%' group by 1,2 order by 1,2;
-- B4 values captured per standard in the real project
select s.code, count(*) as n_params, count(*) filter (where pp.value_number is not null or pp.value_text is not null or pp.value_enum is not null or pp.value_boolean is not null or pp.value_date is not null or pp.value_json is not null) as filled, count(*) filter (where pp.source_type='derived') as derived, count(*) filter (where pp.client_supplied) as client_supplied, max(pp.entered_at)::date as last_entry from project_parameters pp join projects p on p.id=pp.project_id join fields f on f.id=pp.field_id join worksheet_templates wt on wt.id=f.worksheet_template_id join standards s on s.id=wt.standard_id where p.name ilike '%forsch%' group by 1 order by 1;
-- B5 workflow artifacts for the real project
select 'calculation_snapshots' as tbl, count(*) as n from calculation_snapshots x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'approval_events', count(*) from approval_events ae join worksheet_instances wi on wi.id=ae.worksheet_instance_id join projects p on p.id=wi.project_id where p.name ilike '%forsch%'
union all select 'deliverables', count(*) from deliverables x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'effort_entries', count(*) from effort_entries x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'monitoring_entries', count(*) from monitoring_entries x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'offers', count(*) from offers x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'project_documents', count(*) from project_documents x join projects p on p.id=x.project_id where p.name ilike '%forsch%'
union all select 'audit_log', count(*) from audit_log x join projects p on p.id=x.project_id where p.name ilike '%forsch%';
-- C1 all projects by org (junk vs real)
select o.name as org, count(*) as n_projects, count(*) filter (where p.archived_at is not null) as archived, min(p.created_at)::date as first, max(p.updated_at)::date as last from projects p left join orgs o on o.id=p.org_id group by 1 order by 2 desc limit 12;
-- C2 projects with any real activity
select p.name, o.name as org, (select count(*) from project_parameters pp where pp.project_id=p.id) as params, (select count(*) from calculation_snapshots cs where cs.project_id=p.id) as snaps, (select count(*) from deliverables d where d.project_id=p.id) as docs, (select count(*) from worksheet_instances wi where wi.project_id=p.id and wi.status<>'draft') as ws_beyond_draft, p.updated_at::date as updated from projects p left join orgs o on o.id=p.org_id where exists (select 1 from project_parameters pp where pp.project_id=p.id) or exists (select 1 from deliverables d where d.project_id=p.id) order by p.updated_at desc limit 15;
-- C3 worksheet status distribution across the whole DB
select status, count(*) as n from worksheet_instances group by 1 order by 2 desc;
-- C4 deliverables emitted overall by kind
select kind, standard_code, count(*) as n, max(emitted_at)::date as last from deliverables group by 1,2 order by 3 desc limit 20;
-- C5 last real activity anywhere
select (select max(entered_at) from project_parameters) as last_param, (select max(taken_at) from calculation_snapshots) as last_snapshot, (select max(occurred_at) from approval_events) as last_approval, (select max(emitted_at) from deliverables) as last_deliverable, (select max(created_at) from effort_entries) as last_effort, (select max(created_at) from monitoring_entries) as last_journal, (select max(occurred_at) from audit_log) as last_audit;
-- C6 users and orgs
select (select count(*) from auth.users) as users, (select count(*) from profiles) as profiles, (select count(*) from orgs) as orgs, (select count(*) from org_members) as memberships;
