-- Inbound leads from ekowai-landing-page contact form.
-- Slice 1 of the landing↔wizard integration: persistence + public read views.
--
-- Three concerns in one migration (all in a single transaction via drizzle-kit):
--   1. `leads` table — anonymous form submissions land here
--   2. RLS + GRANTs — anon can INSERT, authenticated can SELECT/UPDATE
--   3. Public read-only views — `public_standards`, `public_worksheet_templates`,
--      `public_worksheet_sections` for the landing-page SEO pages, owner-privileged
--      so they bypass any RLS on the underlying tables.

-- ============================================================================
-- 1. leads table
-- ============================================================================
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"topic" text NOT NULL,
	"message" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"standard_code" text,
	"source" text DEFAULT 'landing' NOT NULL,
	"source_path" text,
	"status" text DEFAULT 'new' NOT NULL,
	"claimed_by_user_id" uuid,
	"claimed_at" timestamp with time zone,
	"converted_to_project_id" uuid,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_claimed_by_user_id_profiles_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_project_id_projects_id_fk" FOREIGN KEY ("converted_to_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_status_created_idx" ON "leads" USING btree ("status","created_at");--> statement-breakpoint

-- ============================================================================
-- 2. RLS + grants on leads
-- ============================================================================
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Anon (landing page form): can only INSERT
GRANT INSERT ON "leads" TO anon;--> statement-breakpoint
CREATE POLICY "leads_anon_insert" ON "leads" FOR INSERT TO anon WITH CHECK (true);--> statement-breakpoint
-- Authenticated engineers: can read + update (claim, mark contacted, convert)
GRANT SELECT, UPDATE ON "leads" TO authenticated;--> statement-breakpoint
CREATE POLICY "leads_auth_select" ON "leads" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "leads_auth_update" ON "leads" FOR UPDATE TO authenticated USING (true);--> statement-breakpoint

-- ============================================================================
-- 3. Public read-only views for landing-page SEO pages
-- ============================================================================
-- Exposes ONLY the columns the landing should see. IP-sensitive columns
-- (fields, equations, compliance_requirements, verification audit) stay
-- behind the wizard's authenticated routes.
-- Views are owner-privileged (postgres) by default → bypass RLS on base tables,
-- which is intentional since the underlying data here is meta-only.

CREATE OR REPLACE VIEW "public"."public_standards" AS
SELECT "id", "code", "title_de", "title_en", "version", "issued_year", "created_at"
FROM "public"."standards";--> statement-breakpoint

CREATE OR REPLACE VIEW "public"."public_worksheet_templates" AS
SELECT "id", "standard_id", "code", "title_de", "title_en", "phase", "archetype", "order_index", "description"
FROM "public"."worksheet_templates";--> statement-breakpoint

CREATE OR REPLACE VIEW "public"."public_worksheet_sections" AS
SELECT "id", "worksheet_template_id", "parent_section_id", "code", "title_de", "title_en", "order_index"
FROM "public"."worksheet_sections";--> statement-breakpoint

GRANT SELECT ON "public"."public_standards" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON "public"."public_worksheet_templates" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON "public"."public_worksheet_sections" TO anon, authenticated;
