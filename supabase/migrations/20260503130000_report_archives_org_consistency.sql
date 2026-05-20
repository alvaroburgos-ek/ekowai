-- Forward fix for 20260503120000_documents_and_archives.sql:
-- report_archives.org_id was created without a FK to orgs(id) and without
-- a trigger enforcing it matches calculations.org_id. Add both.

alter table report_archives
  add constraint report_archives_org_id_fkey
  foreign key (org_id) references orgs(id);

create or replace function report_archives_org_match() returns trigger as $$
begin
  if new.org_id <> (select org_id from calculations where id = new.calculation_id) then
    raise exception 'report_archives.org_id must match calculations.org_id';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger report_archives_org_match_trg
  before insert or update of org_id, calculation_id on report_archives
  for each row execute function report_archives_org_match();
