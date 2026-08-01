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
  type AnyPgColumn,
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
  // Angebots-Engine (Slice E1) — internal calibration, never client-visible.
  // Mirrors the letterhead columns: org-level singletons, nullable until set.
  internalHourlyRate: numeric('internal_hourly_rate'),
  targetMarginPct: numeric('target_margin_pct'),
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

// External parties (client / designer) attached per project. Internal staff stay
// on org_members; these are the only non-org-member principals. role is plain text
// with a CHECK ('client','designer') enforced in the access-control RLS migration.
export const projectCollaborators = pgTable(
  'project_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // references auth.users(id) in DB; kept as plain uuid like project_parameters.entered_by
    userId: uuid('user_id').notNull(),
    role: text('role').notNull(),
    invitedBy: uuid('invited_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqProjectUser: unique().on(t.projectId, t.userId) }),
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
  /** Stage-5 edition lifecycle: date this edition became valid. */
  validFrom: date('valid_from'),
  /** Stage-5 edition lifecycle: self-FK to the standard that replaces this
   * edition (no cascade — superseded editions stay referenceable). */
  supersededBy: uuid('superseded_by').references((): AnyPgColumn => standards.id),
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
    /** Verbatim quote from the standard's own text/table backing the
     * verification (doctrine SR-1). Required for verified_against_standard. */
    verificationQuote: text('verification_quote'),
    /** Soft-deactivation marker. Set false by the Pile-2 deprecation pass for
     * fields that have no source basis and no code consumer; their rows are
     * retained for audit trail but the worksheet form filters them out. */
    active: boolean('active').notNull().default(true),
    /** Norm-recommended default value, shape `{ type, value }`. Resolved as a
     * fallback at render time when no project_parameters row and no
     * site_profile match exists. Never overwritten by user input. */
    defaultValue: jsonb('default_value'),
    /** VSME owner boundary: which side produces this datapoint.
     * Seeded by module default (B3–B7 → ekowai_env, B8–B11 → client_supplied,
     * B1/B2 → general) and editable per-field in the Worklist. Nullable so
     * non-VSME engineering fields stay untouched. */
    owner: text('owner'),
    /** VSME XBRL element id from the EFRAG taxonomy, used by the export
     * mapping. Nullable; only populated for VSME fields. */
    xbrlElementId: text('xbrl_element_id'),
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
    /** Verbatim quote from the standard (SR-1) — see fields.verificationQuote. */
    verificationQuote: text('verification_quote'),
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
    /** Kundenangabe: value was delivered by the client, not determined by
     * EKOWAI — the AGB liability carve-out for client-supplied input errors
     * applies. Toggled via setClientSupplied (src/lib/actions/client-supplied.ts),
     * never by saveWorksheet. */
    clientSupplied: boolean('client_supplied').notNull().default(false),
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

// =============================================================================
// VSME — EMISSION FACTORS REFERENCE TABLE (read-only after seeding; Plan 2)
// =============================================================================
export const emissionFactors = pgTable(
  'emission_factors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** UBA factor id, e.g. "05_20_01_001_01" — the citation key. */
    ubaId: text('uba_id').notNull(),
    scope: text('scope').notNull(),
    category: text('category').notNull(), // UBA Level 1, e.g. "Strom"
    subcategory: text('subcategory'), // UBA Level 2, e.g. "Deutscher Strommix"
    /**
     * Human-readable commodity label for the picker (German; the UBA list is
     * German-only so there is no name_en). Derived from the deepest non-numeric
     * UBA Level column, e.g. "Dieselkraftstoff", "Erdgas (Heizwert)", "R-410A".
     */
    name: text('name'),
    unit: text('unit').notNull(), // e.g. "kWh"
    kgCo2e: numeric('kg_co2e').notNull(),
    kgCo2: numeric('kg_co2'),
    kgCh4: numeric('kg_ch4'),
    kgN2o: numeric('kg_n2o'),
    source: text('source').notNull().default('UBA'),
    sourceVersion: text('source_version').notNull(),
    datasetYear: integer('dataset_year').notNull(),
    sheet: text('sheet'), // provenance: which UBA sheet
  },
  (t) => ({
    ubaIdVersionUnique: unique('emission_factors_uba_id_version_unique').on(
      t.ubaId,
      t.sourceVersion,
    ),
  }),
);

// =============================================================================
// VSME — CO₂ ACTIVITY LINES (working table; Plan 3)
// =============================================================================
// Per-line fuel/electricity activity data the CO₂ engine reads to compute
// Scope 1 / Scope 2 totals.  🚩PROD-PROMOTE: applied to local only; human
// promotes when coordinating both tracks.
export const co2ActivityLines = pgTable(
  'co2_activity_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    worksheetInstanceId: uuid('worksheet_instance_id').references(() => worksheetInstances.id, { onDelete: 'set null' }),
    scope: text('scope').notNull(),               // 'Scope 1' | 'Scope 2'
    category: text('category').notNull(),         // matches emission_factors.category
    subcategory: text('subcategory'),
    amount: numeric('amount').notNull(),
    unit: text('unit').notNull(),
    factorUbaId: text('factor_uba_id').notNull(),
    factorSourceVersion: text('factor_source_version').notNull(),
    computedTco2e: numeric('computed_tco2e'),      // last computed result (cache)
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// =============================================================================
// EFFORT LOGGING (roadmap v2 §2.9 — dependency for the Angebots-Engine)
// =============================================================================
// Per-project work-time entries. `position` is free text for now — offer
// positions arrive with Slice E1 and will link entries to Angebot line items.
export const effortEntries = pgTable(
  'effort_entries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    workDate: date('work_date').notNull(),
    hours: numeric('hours').notNull(),
    position: text('position').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectDateIdx: index('effort_entries_project_date_idx').on(t.projectId, t.workDate),
  }),
);

// =============================================================================
// ANGEBOTS-ENGINE (Slice E1 — margin-first, internal-only)
// =============================================================================
// EKOWAI's own fee offers. Margin math (Festpreis − hours×internal rate −
// externals) lives in src/lib/offers/margin.ts and is NEVER persisted or
// client-visible; the client PDF shows positions + Festpreis only.
export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** draft | sent | accepted | rejected — plain text, no workflow yet (YAGNI). */
    status: text('status').notNull().default('draft'),
    festpreisEur: numeric('festpreis_eur').notNull(),
    validUntil: date('valid_until'),
    /** e.g. "10 Werktage ab vollständigen Unterlagen" — free text for the PDF. */
    bearbeitungszeit: text('bearbeitungszeit'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('offers_project_idx').on(t.projectId),
  }),
);

// Offer line items. estimated_hours feeds the internal-cost side; external
// costs (lab, Gutachter) are passed through, never marked up silently.
export const offerPositions = pgTable(
  'offer_positions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    estimatedHours: numeric('estimated_hours').notNull(),
    externalCostEur: numeric('external_cost_eur').notNull().default('0'),
    orderIndex: integer('order_index').notNull().default(0),
    note: text('note'),
  },
  (t) => ({
    offerIdx: index('offer_positions_offer_idx').on(t.offerId),
  }),
);

// =============================================================================
// PARAMETRISCHE KOSTENSCHÄTZUNG (Slice E2 — the CLIENT's build cost)
// =============================================================================
// Unit-price catalog. Ships EMPTY and grows only from real sources (BKI-type
// references, contractor quotes, own project actuals) — prices are NEVER
// invented, which is why `source` and `price_date` are NOT NULL: a price
// without provenance cannot exist. Stale prices (> 365 d) are flagged in the
// app and the PDF — the provenance doctrine applied to euros.
export const costItems = pgTable(
  'cost_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    unit: text('unit'),
    priceLowEur: numeric('price_low_eur'),
    priceLikelyEur: numeric('price_likely_eur'),
    priceHighEur: numeric('price_high_eur'),
    /** Where the price comes from (BKI, Angebot Fa. X, eigene Abrechnung …). */
    source: text('source').notNull(),
    /** Date the price was valid — staleness is computed from this. */
    priceDate: date('price_date').notNull(),
    /** DIN-276 Kostengruppe code, e.g. '41x'. */
    din276Group: text('din276_group'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    active: boolean('active').notNull().default(true),
  },
  (t) => ({
    orgIdx: index('cost_items_org_idx').on(t.orgId),
  }),
);

// One Kostenschätzung per deliverable (Wirtschaftlichkeits-Check, Vergabe,
// Förderantrag). `snapshot_id` version-locks the estimate to the approve
// snapshot the quantities came from; contingency is structural — NOT NULL,
// default 10 %, bounded 5–15 in the app, and an estimate whose contingency
// falls below 5 % renders WITH a warning (never silently without).
export const costEstimates = pgTable(
  'cost_estimates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    standardCode: text('standard_code'),
    title: text('title').notNull(),
    contingencyPct: numeric('contingency_pct').notNull().default('10'),
    /** Approve-snapshot the quantities came from (null = no approved state yet). */
    snapshotId: uuid('snapshot_id'),
    /** draft | issued — plain text, no workflow yet (YAGNI, mirrors offers). */
    status: text('status').notNull().default('draft'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('cost_estimates_project_idx').on(t.projectId),
  }),
);

// Estimate line items. Prices are a FROZEN COPY taken from the catalog item at
// add time (the catalog can move on; the issued estimate must not drift).
// `source_symbol` records which design value the quantity came from
// (e.g. 'V_storage' off the Wertetabelle) — quantity provenance.
export const costEstimateLines = pgTable(
  'cost_estimate_lines',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    estimateId: uuid('estimate_id')
      .notNull()
      .references(() => costEstimates.id, { onDelete: 'cascade' }),
    costItemId: uuid('cost_item_id').references(() => costItems.id, { onDelete: 'set null' }),
    position: text('position').notNull(),
    quantity: numeric('quantity').notNull(),
    unit: text('unit'),
    /** Design-value symbol the quantity came from, e.g. 'V_storage'. */
    sourceSymbol: text('source_symbol'),
    priceLowEur: numeric('price_low_eur').notNull(),
    priceLikelyEur: numeric('price_likely_eur').notNull(),
    priceHighEur: numeric('price_high_eur').notNull(),
    din276Group: text('din276_group'),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => ({
    estimateIdx: index('cost_estimate_lines_estimate_idx').on(t.estimateId),
  }),
);

// Real contractor bids entered against an estimate (Vergabe / Slice E3
// Nachkalkulation on the client's side) — the feedback loop the catalog
// learns from. Projected vs. real, this time in the client's euros.
export const contractorBids = pgTable(
  'contractor_bids',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    estimateId: uuid('estimate_id').references(() => costEstimates.id, { onDelete: 'set null' }),
    bidder: text('bidder').notNull(),
    position: text('position'),
    amountEur: numeric('amount_eur').notNull(),
    bidDate: date('bid_date'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('contractor_bids_project_idx').on(t.projectId),
  }),
);

// =============================================================================
// MONITORING-JOURNAL (interim — documentation-only precursor to Stage 8)
// =============================================================================
// Deliberately stores NO parameter values/units: the time-series schema is
// frozen later from the owner's Messplan. Until then this journal only
// documents THAT something happened (Laborbericht eingegangen, Begehung
// durchgeführt …) and optionally links the uploaded document.
export const monitoringEntries = pgTable(
  'monitoring_entries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date').notNull(),
    /**
     * 'laborbericht' | 'messung' | 'begehung' | 'wartung' | 'foto' |
     * 'sonstiges' — validated app-side (monitoring-core.ts), plain text in DB.
     */
    category: text('category').notNull(),
    note: text('note'),
    /** Link to an uploaded lab report / photo in project_documents. */
    documentId: uuid('document_id').references(() => projectDocuments.id, {
      onDelete: 'set null',
    }),
    /** Optional link to the guideline (standards.id) this entry refers to —
     * app-validated to be one of the project's attached standards
     * (monitoring.ts). */
    standardId: uuid('standard_id').references(() => standards.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectDateIdx: index('monitoring_entries_project_date_idx').on(
      t.projectId,
      t.entryDate,
    ),
  }),
);

// =============================================================================
// DELIVERABLE REGISTER (roadmap Stage 10, AGB §3(2))
// =============================================================================
// First-class, automatic record of every emitted deliverable per project —
// written by the PDF/export routes AFTER a successful buffer build (see
// src/lib/deliverables/record.ts). Read-only in the UI (Leistungsregister
// panel); a register failure must NEVER break a document emission.
export const deliverables = pgTable(
  'deliverables',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Guideline the deliverable belongs to; NULL for project-level documents. */
    standardCode: text('standard_code'),
    /**
     * 'bericht' | 'konformitaetserklaerung' | 'wertetabelle' |
     * 'einreichungs_checkliste' | 'pruefmemo' | 'angebot' |
     * 'kostenschaetzung' | 'vsme_export' | 'projektbericht' — validated
     * app-side (src/lib/deliverables/kinds.ts), plain text in DB.
     */
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    /** Approve-snapshot the emitted document was locked to (when it carries one). */
    snapshotId: uuid('snapshot_id'),
    emittedBy: uuid('emitted_by').references(() => profiles.id, { onDelete: 'set null' }),
    emittedAt: timestamp('emitted_at', { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb('meta'),
  },
  (t) => ({
    projectEmittedIdx: index('deliverables_project_emitted_idx').on(
      t.projectId,
      t.emittedAt,
    ),
  }),
);

// =============================================================================
// MAINTENANCE SCHEDULES (library-level — verbatim maintenance duties per
// standard)
// =============================================================================
// Standard-scoped (NOT project-scoped) reference data, like standards/fields:
// each row is one maintenance/inspection duty a guideline prescribes, with the
// VERBATIM printed interval wording (SR-1 quote + page in source_quote). The
// table ships EMPTY — rows are seeded exclusively by the extraction pack from
// the standard's own text, never by hand. Projects inherit duties via their
// attached standards; due-state is computed app-side against the project's
// Monitoring-Journal (src/lib/monitoring/schedule.ts).
export const maintenanceSchedules = pgTable(
  'maintenance_schedules',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    standardId: uuid('standard_id')
      .notNull()
      .references(() => standards.id, { onDelete: 'cascade' }),
    /** Short duty title, e.g. "Sichtkontrolle der Mulde". */
    title: text('title').notNull(),
    /**
     * Same six-value vocabulary as monitoring_entries.category
     * ('laborbericht' | 'messung' | 'begehung' | 'wartung' | 'foto' |
     * 'sonstiges') — validated app-side (monitoring-core.ts); journal entries
     * of this category tick the duty off.
     */
    category: text('category').notNull(),
    /** VERBATIM printed interval wording, e.g. "halbjährlich". */
    /** Verbatim printed frequency wording; NULL when the source prints none
     * (inventing wording would violate SR-1). */
    intervalText: text('interval_text'),
    /**
     * Numeric interpretation of interval_text in months; NULL when the source
     * prints no fixed number (e.g. "bei Bedarf") → due-state 'unscheduled'.
     */
    intervalMonths: numeric('interval_months'),
    /** Clause/table the duty comes from, e.g. "Abschn. 6.2". */
    clauseReference: text('clause_reference'),
    /** SR-1: verbatim quote from the standard's own text + page ref. */
    sourceQuote: text('source_quote').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    standardIdx: index('maintenance_schedules_standard_idx').on(t.standardId),
  }),
);

// =============================================================================
// LEADS (inbound contact-form submissions from ekowai-landing-page)
// =============================================================================
// Anonymous form submissions land here via the landing-page server action using
// the Supabase anon key. RLS allows anon INSERT only; engineers see/claim/
// convert leads from the wizard's /leads admin route.
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company'),
    phone: text('phone'),
    topic: text('topic').notNull(),
    message: text('message'),
    locale: text('locale').notNull().default('de'),
    /** Code of the standard the lead came in for (deep-link from
     * /wissen/normen/[code] on the landing page). Nullable — generic
     * /kontakt submissions have no standard context. No FK to standards(code)
     * because that table is not managed by Drizzle migrations; validated at
     * the app layer. */
    standardCode: text('standard_code'),
    /** Origin marker — 'landing' for now; may grow to 'partner-form' etc. */
    source: text('source').notNull().default('landing'),
    /** Page path the form was submitted from, for attribution. */
    sourcePath: text('source_path'),
    /** new | contacted | converted | archived */
    status: text('status').notNull().default('new'),
    claimedByUserId: uuid('claimed_by_user_id').references(() => profiles.id, { onDelete: 'set null' }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    convertedToProjectId: uuid('converted_to_project_id').references(() => projects.id, { onDelete: 'set null' }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => ({
    statusCreatedIdx: index('leads_status_created_idx').on(t.status, t.createdAt),
  }),
);
