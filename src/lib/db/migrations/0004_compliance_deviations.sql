CREATE TABLE IF NOT EXISTS compliance_deviations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id        uuid NOT NULL REFERENCES compliance_requirements(id) ON DELETE RESTRICT,
  worksheet_instance_id uuid REFERENCES worksheet_instances(id) ON DELETE SET NULL,
  justification         text NOT NULL,
  basis_citations       jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_ref         text,
  status                text NOT NULL DEFAULT 'active',
  created_by            uuid NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  withdrawn_by          uuid,
  withdrawn_at          timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS compliance_deviations_active_uniq
  ON compliance_deviations (project_id, requirement_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS compliance_deviations_project_idx
  ON compliance_deviations (project_id) WHERE status = 'active';
