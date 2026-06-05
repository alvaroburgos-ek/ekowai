-- Harden leads RLS (follow-up to 0002_inbound_leads).
--
-- The wizard admin reads/writes leads via the postgres-role Drizzle client
-- (bypasses RLS) and enforces the engineer boundary at the app layer
-- (PLATFORM_ENGINEER_EMAILS allowlist). No client uses the `authenticated`
-- PostgREST path for leads, so the permissive USING(true) SELECT/UPDATE
-- policies were pure attack surface — any logged-in Supabase user with a valid
-- JWT could read or modify all lead PII directly via PostgREST. Remove them.
--
-- Also column-scope the anon INSERT grant to exactly the columns the landing
-- contact form writes, so a public submitter can no longer forge triage /
-- lifecycle state (status, claimed_by_user_id, converted_to_project_id,
-- claimed_at, archived_at) — those now always take their DB default.

-- 1. Drop the permissive authenticated policies and revoke the grants.
DROP POLICY IF EXISTS "leads_auth_select" ON "leads";--> statement-breakpoint
DROP POLICY IF EXISTS "leads_auth_update" ON "leads";--> statement-breakpoint
REVOKE SELECT, UPDATE ON "leads" FROM authenticated;--> statement-breakpoint

-- 2. Column-scope the anon INSERT grant. These are exactly the columns the
-- landing `sendContactEmail` server action inserts; the leads_anon_insert
-- policy (WITH CHECK true) still governs the row.
REVOKE INSERT ON "leads" FROM anon;--> statement-breakpoint
GRANT INSERT ("name", "email", "company", "phone", "topic", "message", "locale", "standard_code", "source", "source_path") ON "leads" TO anon;
