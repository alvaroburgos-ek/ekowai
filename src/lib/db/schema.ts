import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  numeric,
  bigint,
  bigserial,
  boolean,
  integer,
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

// Note: calc_status and compliance_status enums still exist in DB for now
// (they are not used by any new tables but were not dropped in the migration)

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
  // Letterhead fields (Plan 6)
  logoUrl: text('logo_url'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  postalCode: text('postal_code'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  vatId: text('vat_id'),
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
    siteLocation: text('site_location'),
    projectCode: text('project_code'),
    projectType: text('project_type'),
    /** Project-level site profile (Bundesland, Gemeinde, lat/lon, KOSTRA cell,
     * soil, k_f, mhgw, planner, …). Maps to worksheet field symbols via
     * SITE_PROFILE_SYMBOL_MAP. Stored as plain JSON object — see
     * src/lib/site-profile/symbol-map.ts. */
    siteProfile: jsonb('site_profile'),
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

// =============================================================================
// STANDARDS LIBRARY (6 tables, read-only after import)
// =============================================================================
export const standards = pgTable('standards', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  titleDe: text('title_de').notNull(),
  titleEn: text('title_en'),
  version: text('version').notNull(),
  issuedYear: integer('issued_year'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const worksheetTemplates = pgTable(
  'worksheet_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    standardId: uuid('standard_id').notNull().references(() => standards.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    phase: integer('phase'),
    archetype: text('archetype'),
    orderIndex: integer('order_index').notNull().default(0),
    description: text('description'),
  },
  (t) => ({ uniqStandardCode: unique().on(t.standardId, t.code) }),
);

export const worksheetSections = pgTable('worksheet_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  worksheetTemplateId: uuid('worksheet_template_id')
    .notNull()
    .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
  parentSectionId: uuid('parent_section_id'),
  code: text('code'),
  titleDe: text('title_de').notNull(),
  titleEn: text('title_en'),
  orderIndex: integer('order_index').notNull().default(0),
});

export const fields = pgTable(
  'fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => worksheetSections.id),
    symbol: text('symbol').notNull(),
    labelDe: text('label_de').notNull(),
    labelEn: text('label_en'),
    dataType: text('data_type').notNull(),
    unit: text('unit'),
    isRequired: boolean('is_required').notNull().default(false),
    enumValues: jsonb('enum_values'),
    validationRules: jsonb('validation_rules'),
    clauseReference: text('clause_reference'),
    description: text('description'),
    consumerWorksheets: text('consumer_worksheets').array(),
    orderIndex: integer('order_index').notNull().default(0),
    verificationStatus: text('verification_status').notNull().default('imported_unverified'),
    /** Audit columns: who flipped the field to engineer_verified, when, and an
     * optional short note. Nullable — populated by the verifyField server
     * action (src/lib/actions/verification.ts). */
    verifiedByUserId: uuid('verified_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
    /** Soft-deactivation marker. Set false by the Pile-2 deprecation pass for
     * fields that have no source basis and no code consumer; their rows are
     * retained for audit trail but the worksheet form filters them out. */
    active: boolean('active').notNull().default(true),
    /** Norm-recommended default value, shape `{ type, value }`. Resolved as a
     * fallback at render time when no project_parameters row and no
     * site_profile match exists. Never overwritten by user input. */
    defaultValue: jsonb('default_value'),
  },
  (t) => ({ uniqWorksheetSymbol: unique().on(t.worksheetTemplateId, t.symbol) }),
);

export const equations = pgTable(
  'equations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    equationNumber: text('equation_number').notNull(),
    formula: text('formula').notNull(),
    formulaLatex: text('formula_latex'),
    inputSymbols: text('input_symbols').array(),
    outputSymbol: text('output_symbol'),
    outputUnit: text('output_unit'),
    clauseReference: text('clause_reference'),
    description: text('description'),
    verificationStatus: text('verification_status').notNull().default('imported_unverified'),
    /** Audit columns — see fields.verifiedByUserId. */
    verifiedByUserId: uuid('verified_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
  },
  (t) => ({ uniqWorksheetEqn: unique().on(t.worksheetTemplateId, t.equationNumber) }),
);

export const complianceRequirements = pgTable(
  'compliance_requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    condition: text('condition').notNull(),
    description: text('description'),
    clauseReference: text('clause_reference'),
    severity: text('severity').notNull(),
    /** Short hint shown alongside the requirement — fallback when no structured
     * suggestion rows exist. */
    suggestion: text('suggestion'),
    // requires_attestation column is added by Pile-11 SQL (reviewable, not
    // applied by this PR). The application reads requires-attestation from
    // a pattern match on `condition` until the SQL is applied AND the
    // engineer has populated the column. See `isAttestationCondition` in
    // src/lib/eval/attestation.ts.
  },
  (t) => ({ uniqWorksheetCr: unique().on(t.worksheetTemplateId, t.code) }),
);

export const complianceSuggestions = pgTable(
  'compliance_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => complianceRequirements.id, { onDelete: 'cascade' }),
    /** alternative_worksheet | alternative_standard | upstream_treatment | design_change */
    suggestionType: text('suggestion_type').notNull(),
    targetStandardCode: text('target_standard_code'),
    targetWorksheetCode: text('target_worksheet_code'),
    suggestionDe: text('suggestion_de').notNull(),
    suggestionEn: text('suggestion_en'),
    /** Optional gating condition — only show this suggestion when it matches the
     * current field values (parsed with the same evaluator that drives
     * pass/fail badges). Null = always show on REQ fail. */
    condition: text('condition'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// =============================================================================
// PROJECT WORKFLOW (5 tables)
// =============================================================================
export const projectStandards = pgTable(
  'project_standards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    standardId: uuid('standard_id').notNull().references(() => standards.id),
    status: text('status').notNull().default('active'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    // addedBy/removedBy reference auth.users directly in DB, no Drizzle FK needed
    addedBy: uuid('added_by'),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removedBy: uuid('removed_by'),
    removalReason: text('removal_reason'),
    /** Manual sequencing within the project. Earlier stage_order = upstream
     * in the treatment train (e.g. infiltration before treatment). Null means
     * unsequenced. */
    stageOrder: integer('stage_order'),
    /** Project layer this standard belongs to. Drives the grouping on the
     * project overview page: management → cost → technical. */
    layer: text('layer'),
    /** Hierarchical relationships within the technical train. Null = root
     * standard. Self-referencing FK on project_standards.id.
     *   - series      : downstream step from parent (parent feeds this)
     *   - parallel    : alternative approach at parent's stage (engineer
     *                   picks one or compares all)
     *   - sub_standard: scoped inside parent's process (e.g. FLL-TP-RHIZOM
     *                   inside FLL-Naturteich) */
    parentStandardId: uuid('parent_standard_id'),
    relationType: text('relation_type'),
  },
  (t) => ({ uniqProjectStd: unique().on(t.projectId, t.standardId) }),
);

export const worksheetInstances = pgTable(
  'worksheet_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    worksheetTemplateId: uuid('worksheet_template_id')
      .notNull()
      .references(() => worksheetTemplates.id),
    status: text('status').notNull().default('draft'),
    isStale: boolean('is_stale').notNull().default(false),
    stalenessReason: text('staleness_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqProjectTmpl: unique().on(t.projectId, t.worksheetTemplateId) }),
);

export const projectParameters = pgTable(
  'project_parameters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => fields.id),
    sourceWorksheetInstanceId: uuid('source_worksheet_instance_id').references(() => worksheetInstances.id),
    valueNumber: numeric('value_number'),
    valueText: text('value_text'),
    valueEnum: text('value_enum'),
    valueDate: date('value_date'),
    valueBoolean: boolean('value_boolean'),
    valueJson: jsonb('value_json'),
    sourceType: text('source_type').notNull().default('entered'),
    /** Legacy single-citation column. New writes go to citationSources; the
     * single column is kept only so older rows don't lose data until a follow-up
     * migration drops it. */
    citationSource: jsonb('citation_source'),
    /** Array of citation objects: { id, docId, page?, note?, attachedBy, attachedAt }.
     * docId may be a real project_documents.id or the synthetic prefix
     * `label:<text>` for plain-text citations. */
    citationSources: jsonb('citation_sources').notNull().default(sql`'[]'::jsonb`),
    // enteredBy references auth.users directly in DB, kept as plain uuid here
    enteredBy: uuid('entered_by').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow(),
    isStale: boolean('is_stale').notNull().default(false),
  },
  (t) => ({ uniqProjectField: unique().on(t.projectId, t.fieldId) }),
);

export const approvalEvents = pgTable('approval_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  worksheetInstanceId: uuid('worksheet_instance_id')
    .notNull()
    .references(() => worksheetInstances.id, { onDelete: 'restrict' }),
  eventType: text('event_type').notNull(),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  // actorId references auth.users directly in DB
  actorId: uuid('actor_id').notNull(),
  actorRole: text('actor_role').notNull(),
  comment: text('comment').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  // DB uses bigserial; mode 'bigint' matches DB introspection
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  // actorId references auth.users directly in DB
  actorId: uuid('actor_id'),
  actorRole: text('actor_role'),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'restrict' }),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'restrict' }),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id'),
  action: text('action').notNull(),
  changes: jsonb('changes').notNull(),
});

// Project documents (Plan 6 — uploaded source documents for citations)
export const projectDocuments = pgTable(
  'project_documents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    citationLabel: text('citation_label').notNull(),
    issuedAt: date('issued_at', { mode: 'date' }),
    filePath: text('file_path').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    sha256: text('sha256').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => profiles.id),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('project_documents_project_idx').on(t.projectId),
    orgIdx: index('project_documents_org_idx').on(t.orgId),
  }),
);

// Calculation snapshots (frozen captures of parameters + equation outputs +
// compliance results at submit/approve transitions). Supports the calculation
// diff viewer that engineers use during the review/approval workflow.
//
// JSONB shapes (kept off-schema so they can evolve without a migration):
//   parameters:         { [fieldId]: { type, value, unit, citationSources } }
//   equation_outputs:   { [equationNumber]: { kind: 'computed'|'manual_required'|'error',
//                                             value?: number, formula?: string,
//                                             substituted?: Record<string, number>,
//                                             manualRequiredReason?: string } }
//   compliance_results: { [requirementId]: 'pass' | 'fail' | 'open' }
export const calculationSnapshots = pgTable(
  'calculation_snapshots',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    worksheetInstanceId: uuid('worksheet_instance_id')
      .notNull()
      .references(() => worksheetInstances.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
    // References auth.users(id) directly in DB, kept FK-less in Drizzle to
    // match the project's pattern for actor columns.
    takenByUserId: uuid('taken_by_user_id'),
    trigger: text('trigger').notNull(),
    parameters: jsonb('parameters').notNull(),
    equationOutputs: jsonb('equation_outputs').notNull(),
    complianceResults: jsonb('compliance_results').notNull(),
  },
  (t) => ({
    instanceIdx: index('calculation_snapshots_instance_taken_idx').on(
      t.worksheetInstanceId,
      t.takenAt,
    ),
    projectIdx: index('calculation_snapshots_project_taken_idx').on(
      t.projectId,
      t.takenAt,
    ),
  }),
);

// Report archives (frozen PDFs of approved worksheet instances)
// Note: calculationId column still exists in DB for now (migration kept it)
export const reportArchives = pgTable(
  'report_archives',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    calculationId: uuid('calculation_id').notNull(), // legacy; kept in DB, no FK (calculations table dropped)
    approvalEventId: uuid('approval_event_id').references(() => approvalEvents.id, { onDelete: 'restrict' }),
    worksheetInstanceId: uuid('worksheet_instance_id').references(() => worksheetInstances.id, { onDelete: 'restrict' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id),
    filePath: text('file_path').notNull(),
    sha256: text('sha256').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    generatedBy: uuid('generated_by')
      .notNull()
      .references(() => profiles.id),
  },
  (t) => ({
    orgIdx: index('report_archives_org_idx').on(t.orgId),
  }),
);
