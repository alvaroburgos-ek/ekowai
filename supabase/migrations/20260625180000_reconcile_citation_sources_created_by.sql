-- 🚩PROD-PROMOTE: reconciles pre-existing schema.ts columns missing from the DB (apply to local now; human promotes to prod).
ALTER TABLE project_parameters ADD COLUMN IF NOT EXISTS citation_sources jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL REFERENCES profiles(id);
