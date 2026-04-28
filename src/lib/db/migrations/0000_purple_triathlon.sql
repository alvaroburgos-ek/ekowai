CREATE TYPE "public"."calc_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('compliant', 'warning', 'blocking_violation', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'engineer', 'viewer');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"action" text NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"inputs" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"rationale" text,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculation_metrics" (
	"calculation_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"pe_designed" numeric,
	"capacity_m3_d" numeric,
	"co2_kg_year" numeric,
	"energy_kwh_year" numeric,
	"metric_version" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"regulation_code" text NOT NULL,
	"regulation_version" text NOT NULL,
	"worksheet_id" text NOT NULL,
	"name" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"rationale" text,
	"rationale_draft" text,
	"status" "calc_status" DEFAULT 'draft' NOT NULL,
	"compliance_status" "compliance_status" DEFAULT 'unknown' NOT NULL,
	"compliance_violations" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_regulation" text NOT NULL,
	"source_version" text NOT NULL,
	"source_section" text NOT NULL,
	"trigger_condition" jsonb NOT NULL,
	"target_regulation" text NOT NULL,
	"target_section" text NOT NULL,
	"rationale" text NOT NULL,
	"wizard_supported" boolean DEFAULT false NOT NULL,
	CONSTRAINT "xref_unique" UNIQUE("source_regulation","source_version","source_section","target_regulation","target_section")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"decision_point_id" text NOT NULL,
	"choice" text NOT NULL,
	"rationale" text,
	"rationale_draft" text,
	"made_by" uuid NOT NULL,
	"made_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_calc_dp_unique" UNIQUE("calculation_id","decision_point_id")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'engineer' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text DEFAULT 'DE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"client_name" text,
	"location" text,
	"project_type" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_history" ADD CONSTRAINT "calculation_history_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_history" ADD CONSTRAINT "calculation_history_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_metrics" ADD CONSTRAINT "calculation_metrics_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_made_by_profiles_id_fk" FOREIGN KEY ("made_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_calc_idx" ON "approvals" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "metrics_org_idx" ON "calculation_metrics" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "calc_project_idx" ON "calculations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "calc_org_idx" ON "calculations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "calc_regulation_idx" ON "calculations" USING btree ("regulation_code","regulation_version");--> statement-breakpoint
CREATE INDEX "decisions_calc_idx" ON "decisions" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects" USING btree ("org_id");