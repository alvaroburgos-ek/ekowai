import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  boolean,
  pgEnum,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// === Enums ===
export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'engineer',
  'viewer',
]);

export const calcStatusEnum = pgEnum('calc_status', [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'changes_requested',
]);

export const complianceStatusEnum = pgEnum('compliance_status', [
  'compliant',
  'warning',
  'blocking_violation',
  'unknown',
]);

// === Tables ===

// Profile mirrors auth.users (auto-created via trigger, see Task 7)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // FK to auth.users(id), enforced by trigger
  email: text('email').notNull(),
  fullName: text('full_name'),
  locale: text('locale').notNull().default('de'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull().default('DE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('engineer'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orgId, t.userId] }),
  }),
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    clientName: text('client_name'),
    location: text('location'),
    projectType: text('project_type'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index('projects_org_idx').on(t.orgId),
  }),
);

export const calculations = pgTable(
  'calculations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id), // denorm for RLS perf
    regulationCode: text('regulation_code').notNull(),
    regulationVersion: text('regulation_version').notNull(),
    worksheetId: text('worksheet_id').notNull(),
    name: text('name').notNull(),
    inputs: jsonb('inputs').notNull(),
    results: jsonb('results').notNull(),
    rationale: text('rationale'),
    rationaleDraft: text('rationale_draft'),
    status: calcStatusEnum('status').notNull().default('draft'),
    complianceStatus: complianceStatusEnum('compliance_status').notNull().default('unknown'),
    complianceViolations: jsonb('compliance_violations'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('calc_project_idx').on(t.projectId),
    orgIdx: index('calc_org_idx').on(t.orgId),
    regIdx: index('calc_regulation_idx').on(t.regulationCode, t.regulationVersion),
    statusIdx: index('calc_status_idx').on(t.status),
  }),
);

export const calculationHistory = pgTable('calculation_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  calculationId: uuid('calculation_id')
    .notNull()
    .references(() => calculations.id, { onDelete: 'cascade' }),
  inputs: jsonb('inputs').notNull(),
  results: jsonb('results').notNull(),
  rationale: text('rationale'),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => profiles.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

// Decisions (Plan 3 will use this; table created in Plan 1 to avoid migration churn)
export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    calculationId: uuid('calculation_id')
      .notNull()
      .references(() => calculations.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull(),
    decisionPointId: text('decision_point_id').notNull(),
    choice: text('choice').notNull(),
    rationale: text('rationale'),
    rationaleDraft: text('rationale_draft'),
    madeBy: uuid('made_by')
      .notNull()
      .references(() => profiles.id),
    madeAt: timestamp('made_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    calcIdx: index('decisions_calc_idx').on(t.calculationId),
    uniq: unique('decisions_calc_dp_unique').on(t.calculationId, t.decisionPointId),
  }),
);

// Approvals (Plan 3 will use this)
export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    calculationId: uuid('calculation_id')
      .notNull()
      .references(() => calculations.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull(),
    reviewerId: uuid('reviewer_id').references(() => profiles.id),
    action: text('action').notNull(), // 'submitted'|'approved'|'rejected'|'changes_requested'
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    calcIdx: index('approvals_calc_idx').on(t.calculationId),
  }),
);

// Cross-references (regulation metadata, public read)
export const crossReferences = pgTable(
  'cross_references',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sourceRegulation: text('source_regulation').notNull(),
    sourceVersion: text('source_version').notNull(),
    sourceSection: text('source_section').notNull(),
    triggerCondition: jsonb('trigger_condition').notNull(),
    targetRegulation: text('target_regulation').notNull(),
    targetSection: text('target_section').notNull(),
    rationale: text('rationale').notNull(),
    wizardSupported: boolean('wizard_supported').notNull().default(false),
  },
  (t) => ({
    uniq: unique('xref_unique').on(
      t.sourceRegulation,
      t.sourceVersion,
      t.sourceSection,
      t.targetRegulation,
      t.targetSection,
    ),
  }),
);

// Calculation metrics (MVP-2 dashboard populates; created here to avoid migration churn)
export const calculationMetrics = pgTable(
  'calculation_metrics',
  {
    calculationId: uuid('calculation_id')
      .primaryKey()
      .references(() => calculations.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull(),
    peDesigned: numeric('pe_designed'),
    capacityM3D: numeric('capacity_m3_d'),
    co2KgYear: numeric('co2_kg_year'),
    energyKwhYear: numeric('energy_kwh_year'),
    metricVersion: text('metric_version').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('metrics_org_idx').on(t.orgId),
  }),
);
