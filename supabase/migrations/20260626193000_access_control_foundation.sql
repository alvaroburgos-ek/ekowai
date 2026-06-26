-- Access-Control Foundation (Sub-Project 1).
-- (1) project_collaborators: external client/designer attached per project.
-- (2) Lock the standards library (questions + formulas) to internal org members.
-- (3) Restrict project-table writes to engineer+; reads stay org-scoped.
-- (4) RLS for project_collaborators.
-- Idempotent. Externals (never org_members) are default-denied on project tables here.

-- ============================================================================
-- (1) project_collaborators table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,                 -- references auth.users(id)
  role        text NOT NULL,
  invited_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_collaborators_project_user_unique UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_collaborators
  DROP CONSTRAINT IF EXISTS project_collaborators_role_check;
ALTER TABLE public.project_collaborators
  ADD CONSTRAINT project_collaborators_role_check CHECK (role IN ('client','designer'));
