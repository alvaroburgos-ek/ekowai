-- Extend orgs with letterhead fields
alter table orgs add column logo_url text;
alter table orgs add column address_line1 text;
alter table orgs add column address_line2 text;
alter table orgs add column postal_code text;
alter table orgs add column city text;
alter table orgs add column phone text;
alter table orgs add column email text;
alter table orgs add column website text;
alter table orgs add column vat_id text;

-- Project documents
create table project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  org_id uuid not null references orgs(id),
  kind text not null check (kind in (
    'lab_analysis','authority_decision','soil_report',
    'hydrology','correspondence','other')),
  title text not null,
  citation_label text not null,
  issued_at date,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  sha256 text not null,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);

create index project_documents_project_idx on project_documents(project_id);
create index project_documents_org_idx on project_documents(org_id);

alter table project_documents enable row level security;

create policy "project_documents_select_org_member"
  on project_documents for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "project_documents_insert_org_member"
  on project_documents for insert
  with check (
    org_id in (select org_id from org_members where user_id = auth.uid())
    and uploaded_by = auth.uid()
  );

create policy "project_documents_delete_org_member"
  on project_documents for delete
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

-- Trigger: enforce org_id matches project.org_id
create or replace function project_documents_org_match() returns trigger as $$
begin
  if new.org_id <> (select org_id from projects where id = new.project_id) then
    raise exception 'project_documents.org_id must match projects.org_id';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger project_documents_org_match_trg
  before insert or update on project_documents
  for each row execute function project_documents_org_match();

-- Report archives (write-once)
create table report_archives (
  id uuid primary key default gen_random_uuid(),
  calculation_id uuid not null references calculations(id) on delete cascade,
  approval_id uuid not null references approvals(id) on delete restrict,
  org_id uuid not null,
  file_path text not null,
  sha256 text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references profiles(id),
  unique (calculation_id, approval_id)
);

create index report_archives_calc_idx on report_archives(calculation_id);
create index report_archives_org_idx on report_archives(org_id);

alter table report_archives enable row level security;

create policy "report_archives_select_org_member"
  on report_archives for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

-- No insert/update/delete policy: only service_role writes (during approval flow).

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-documents', 'project-documents', false, 26214400,
   array['application/pdf','image/png','image/jpeg','image/tiff',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('report-archives', 'report-archives', false, 104857600,
   array['application/pdf']);

-- Storage RLS
create policy "project_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] in (
      select org_id::text from org_members where user_id = auth.uid()
    )
  );

create policy "project_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] in (
      select org_id::text from org_members where user_id = auth.uid()
    )
  );

create policy "project_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1] in (
      select org_id::text from org_members where user_id = auth.uid()
    )
  );

create policy "report_archives_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'report-archives'
    and (storage.foldername(name))[1] in (
      select org_id::text from org_members where user_id = auth.uid()
    )
  );
