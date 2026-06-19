-- Add external participant roles to the member_role enum.
-- Own migration file: the new values must be committed before
-- 20260619120100 references them in a CHECK constraint.
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'designer';
