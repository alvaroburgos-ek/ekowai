-- =============================================================================
-- DB-driven Multi-Standard Rebuild — 2026-05-20
-- Spec: docs/superpowers/specs/2026-05-20-db-driven-multi-standard-design.md
-- Plan: docs/superpowers/plans/2026-05-20-plan-1-schema-migration.md
-- Atomic: ROLLBACK on any error.
-- =============================================================================
BEGIN;

-- ----- PHASE 1: DROP OLD TABLES ---------------------------------------------
-- These are replaced by worksheet_instances + project_parameters + approval_events.
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS calculation_history CASCADE;
DROP TABLE IF EXISTS calculation_metrics CASCADE;
DROP TABLE IF EXISTS cross_references CASCADE;
DROP TABLE IF EXISTS calculations CASCADE;

-- ----- PHASE 2: RESTRUCTURE EXISTING TABLES ---------------------------------
-- projects: drop A-201-specific columns if present, ensure site_location +
-- project_code exist.
ALTER TABLE projects DROP COLUMN IF EXISTS standard_code;
ALTER TABLE projects DROP COLUMN IF EXISTS standard_version;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_location text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code text;

-- ----- PHASE 3: STANDARDS LIBRARY (6 NEW TABLES) ----------------------------

-- One row per regulatory standard
CREATE TABLE standards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  title_de     text NOT NULL,
  title_en     text,
  version      text NOT NULL,
  issued_year  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE worksheet_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id            uuid NOT NULL REFERENCES standards ON DELETE CASCADE,
  code                   text NOT NULL,
  title_de               text NOT NULL,
  title_en               text,
  phase                  int,
  archetype              text CHECK (archetype IN
    ('registration','data_collection','calculation','summary','verification')),
  order_index            int NOT NULL DEFAULT 0,
  description            text,
  UNIQUE (standard_id, code)
);

CREATE TABLE worksheet_sections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  parent_section_id      uuid REFERENCES worksheet_sections,
  code                   text,
  title_de               text NOT NULL,
  title_en               text,
  order_index            int NOT NULL DEFAULT 0
);

CREATE TABLE fields (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  section_id             uuid REFERENCES worksheet_sections,
  symbol                 text NOT NULL,
  label_de               text NOT NULL,
  label_en               text,
  data_type              text NOT NULL CHECK (data_type IN
    ('number','text','enum','date','boolean','json')),
  unit                   text,
  is_required            boolean NOT NULL DEFAULT false,
  enum_values            jsonb,
  validation_rules       jsonb,
  clause_reference       text,
  description            text,
  consumer_worksheets    text[],
  order_index            int NOT NULL DEFAULT 0,
  verification_status    text NOT NULL DEFAULT 'imported_unverified'
    CHECK (verification_status IN ('imported_unverified','engineer_verified')),
  UNIQUE (worksheet_template_id, symbol)
);

CREATE TABLE equations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  equation_number        text NOT NULL,
  formula                text NOT NULL,
  formula_latex          text,
  input_symbols          text[],
  output_symbol          text,
  output_unit            text,
  clause_reference       text,
  description            text,
  verification_status    text NOT NULL DEFAULT 'imported_unverified'
    CHECK (verification_status IN ('imported_unverified','engineer_verified')),
  UNIQUE (worksheet_template_id, equation_number)
);

CREATE TABLE compliance_requirements (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates ON DELETE CASCADE,
  code                   text NOT NULL,
  title_de               text NOT NULL,
  title_en               text,
  condition              text NOT NULL,
  clause_reference       text,
  severity               text NOT NULL CHECK (severity IN ('block','warn','info')),
  UNIQUE (worksheet_template_id, code)
);

-- ----- PHASE 4: PROJECT WORKFLOW (5 NEW TABLES) -----------------------------

CREATE TABLE project_standards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  standard_id     uuid NOT NULL REFERENCES standards,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  added_at        timestamptz NOT NULL DEFAULT now(),
  added_by        uuid REFERENCES auth.users,
  removed_at      timestamptz,
  removed_by      uuid REFERENCES auth.users,
  removal_reason  text,
  UNIQUE (project_id, standard_id)
);

CREATE TABLE worksheet_instances (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  worksheet_template_id  uuid NOT NULL REFERENCES worksheet_templates,
  status                 text NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft','submitted_for_review','engineer_approved','final','deactivated')),
  is_stale               boolean NOT NULL DEFAULT false,
  staleness_reason       text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, worksheet_template_id)
);

CREATE TABLE project_parameters (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                    uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  field_id                      uuid NOT NULL REFERENCES fields,
  source_worksheet_instance_id  uuid REFERENCES worksheet_instances,
  value_number                  numeric,
  value_text                    text,
  value_enum                    text,
  value_date                    date,
  value_boolean                 boolean,
  value_json                    jsonb,
  source_type                   text NOT NULL DEFAULT 'entered' CHECK (source_type IN
    ('entered','calculated','computed','derived')),
  citation_source               jsonb,
  entered_by                    uuid NOT NULL REFERENCES auth.users,
  entered_at                    timestamptz NOT NULL DEFAULT now(),
  is_stale                      boolean NOT NULL DEFAULT false,
  UNIQUE (project_id, field_id)
);

CREATE TABLE approval_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_instance_id  uuid NOT NULL REFERENCES worksheet_instances ON DELETE RESTRICT,
  event_type             text NOT NULL CHECK (event_type IN
    ('submit','engineer_approve','engineer_reject','finalize','reopen',
     'deactivate','reactivate')),
  from_status            text NOT NULL,
  to_status              text NOT NULL,
  actor_id               uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role             text NOT NULL CHECK (actor_role IN ('engineer','customer','system')),
  comment                text NOT NULL CHECK (length(trim(comment)) > 0),
  occurred_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid REFERENCES auth.users ON DELETE RESTRICT,
  actor_role   text CHECK (actor_role IN ('engineer','customer','system')),
  project_id   uuid REFERENCES projects ON DELETE RESTRICT,
  org_id       uuid REFERENCES orgs ON DELETE RESTRICT,
  table_name   text NOT NULL,
  record_id    uuid,
  action       text NOT NULL CHECK (action IN ('insert','update','delete','transition')),
  changes      jsonb NOT NULL
);

-- ----- PHASE 5: RE-ANCHOR PLAN-6 TABLES -------------------------------------
-- report_archives: drop FK to dropped approvals.id, add FKs to new workflow.
ALTER TABLE report_archives DROP COLUMN IF EXISTS approval_id;
ALTER TABLE report_archives
  ADD COLUMN approval_event_id uuid REFERENCES approval_events ON DELETE RESTRICT,
  ADD COLUMN worksheet_instance_id uuid REFERENCES worksheet_instances ON DELETE RESTRICT;

-- ----- PHASE 6: INDICES -----------------------------------------------------
CREATE INDEX idx_fields_worksheet              ON fields(worksheet_template_id, order_index);
CREATE INDEX idx_fields_symbol                 ON fields(symbol);
CREATE INDEX idx_equations_worksheet           ON equations(worksheet_template_id);
CREATE INDEX idx_compliance_worksheet          ON compliance_requirements(worksheet_template_id);
CREATE INDEX idx_worksheet_instances_project   ON worksheet_instances(project_id, status);
CREATE INDEX idx_project_parameters_pf         ON project_parameters(project_id, field_id);
CREATE INDEX idx_project_parameters_source     ON project_parameters(source_worksheet_instance_id);
CREATE INDEX idx_approval_events_instance      ON approval_events(worksheet_instance_id);
CREATE INDEX idx_approval_events_actor         ON approval_events(actor_id);
CREATE INDEX idx_audit_log_project             ON audit_log(project_id, occurred_at DESC);
CREATE INDEX idx_audit_log_actor               ON audit_log(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_log_table               ON audit_log(table_name, record_id);
CREATE INDEX idx_project_standards_project     ON project_standards(project_id);
CREATE INDEX idx_project_standards_active      ON project_standards(project_id) WHERE status = 'active';
CREATE INDEX idx_worksheet_sections_template   ON worksheet_sections(worksheet_template_id, order_index);
CREATE INDEX idx_worksheet_sections_parent     ON worksheet_sections(parent_section_id);
CREATE INDEX idx_report_archives_instance      ON report_archives(worksheet_instance_id);
CREATE INDEX idx_report_archives_event         ON report_archives(approval_event_id);

-- ----- PHASE 7: ROW-LEVEL SECURITY ------------------------------------------

-- Standards Library: read for authenticated, write only via service role
ALTER TABLE standards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE equations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standards_read_authenticated"
  ON standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "worksheet_templates_read_authenticated"
  ON worksheet_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "worksheet_sections_read_authenticated"
  ON worksheet_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "fields_read_authenticated"
  ON fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "equations_read_authenticated"
  ON equations FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_requirements_read_authenticated"
  ON compliance_requirements FOR SELECT TO authenticated USING (true);

-- Project workflow: scoped per org via org_members lookup
ALTER TABLE project_standards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_parameters  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_standards_all_org"
  ON project_standards FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "worksheet_instances_all_org"
  ON worksheet_instances FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "project_parameters_all_org"
  ON project_parameters FOR ALL TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- Immutable tables: INSERT + SELECT only, NO UPDATE, NO DELETE
ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_events_insert_org"
  ON approval_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND worksheet_instance_id IN (
      SELECT wi.id FROM worksheet_instances wi
      JOIN projects p ON p.id = wi.project_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "approval_events_select_org"
  ON approval_events FOR SELECT TO authenticated
  USING (
    worksheet_instance_id IN (
      SELECT wi.id FROM worksheet_instances wi
      JOIN projects p ON p.id = wi.project_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "audit_log_insert_self"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (
    (actor_id = auth.uid() OR actor_id IS NULL)
    AND (
      org_id IS NULL
      OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "audit_log_select_org"
  ON audit_log FOR SELECT TO authenticated
  USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
-- Deliberately NO update / delete policies on approval_events and audit_log.

COMMIT;
