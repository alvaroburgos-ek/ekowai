import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, eq, inArray, and } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import type {
  ParsedWorkbook,
  EnumValueRow,
} from './_pass3c-types';

const {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
} = schema;

type DbLike = PostgresJsDatabase<typeof schema>;
// `tx` inside db.transaction has the same call surface as the db itself for
// the operations we use. Typing it via Parameters keeps it future-safe.
type Tx = Parameters<Parameters<DbLike['transaction']>[0]>[0];

export type ImportCounts = {
  standards: number;
  worksheetTemplates: number;
  worksheetSections: number;
  fields: number;
  equations: number;
  complianceRequirements: number;
  /** Fields/equations that were already engineer_verified but had their
   * content changed by this import — flipped back to imported_unverified
   * per the Re-Import policy. */
  revertedFields: number;
  revertedEquations: number;
};

function parseRequired(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'required';
}

function parseList(v: string | null): string[] | null {
  if (!v) return null;
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type EnumValuePayload = {
  value: string;
  label_de: string | null;
  label_en: string | null;
  order_index: number;
  regulation_reference: string | null;
};

function groupEnumValues(rows: EnumValueRow[]): Map<string, EnumValuePayload[]> {
  const map = new Map<string, EnumValuePayload[]>();
  for (const r of rows) {
    const arr = map.get(r.enum_name) ?? [];
    arr.push({
      value: r.value,
      label_de: r.label_de,
      label_en: r.label_en,
      order_index: r.order_index,
      regulation_reference: r.regulation_reference,
    });
    map.set(r.enum_name, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.order_index - b.order_index);
  }
  return map;
}

/** Stable deep-equality for the content-relevant columns of a field or
 * equation. Used to decide whether a re-import meaningfully changed the row
 * — if it did, the verification audit must reset. */
function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  // Stable stringify is fine here — both sides come from the same code path.
  return JSON.stringify(a) === JSON.stringify(b);
}

type ExistingField = {
  id: string;
  worksheetTemplateId: string;
  /** The CODE of the section this field used to be parented to (null for
   * orphan fields). We compare by code, not by section UUID, because
   * sections are wiped+re-inserted on every import so the UUIDs are
   * unstable but codes are stable. */
  sectionCode: string | null;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  dataType: string;
  unit: string | null;
  isRequired: boolean;
  enumValues: unknown;
  validationRules: unknown;
  clauseReference: string | null;
  description: string | null;
  consumerWorksheets: string[] | null;
  verificationStatus: string;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  verificationNote: string | null;
};

type NewFieldRow = {
  worksheetTemplateId: string;
  sectionId: string | null;
  /** Mirror of next.sectionId expressed as the section's stable CODE.
   * Used only for content-equality with the existing row. */
  sectionCode: string | null;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  dataType: string;
  unit: string | null;
  isRequired: boolean;
  enumValues: unknown;
  validationRules: unknown;
  clauseReference: string | null;
  description: string | null;
  consumerWorksheets: string[] | null;
};

function fieldContentChanged(existing: ExistingField, next: NewFieldRow): boolean {
  return (
    existing.sectionCode !== next.sectionCode ||
    existing.labelDe !== next.labelDe ||
    existing.labelEn !== next.labelEn ||
    existing.dataType !== next.dataType ||
    existing.unit !== next.unit ||
    existing.isRequired !== next.isRequired ||
    existing.clauseReference !== next.clauseReference ||
    existing.description !== next.description ||
    !jsonEqual(existing.enumValues, next.enumValues) ||
    !jsonEqual(existing.validationRules, next.validationRules) ||
    !jsonEqual(existing.consumerWorksheets, next.consumerWorksheets)
  );
}

type ExistingEquation = {
  id: string;
  worksheetTemplateId: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  clauseReference: string | null;
  description: string | null;
  verificationStatus: string;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  verificationNote: string | null;
};

type NewEquationRow = {
  worksheetTemplateId: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  clauseReference: string | null;
  description: string | null;
};

function equationContentChanged(existing: ExistingEquation, next: NewEquationRow): boolean {
  return (
    existing.formula !== next.formula ||
    existing.outputSymbol !== next.outputSymbol ||
    existing.clauseReference !== next.clauseReference ||
    existing.description !== next.description ||
    !jsonEqual(existing.inputSymbols, next.inputSymbols)
  );
}

/** Core import routine. Operates inside an open transaction. Re-used by
 * both the CLI flow (importWorkbook) and the server-action flow
 * (applyImportWithDb).
 *
 * Re-import policy: when an existing field or equation already in DB has
 * verification_status='engineer_verified' AND its content changes, the
 * status is flipped back to 'imported_unverified' and verified_by/at/note
 * are cleared. Decisions made in JS (pre-pass), then applied via UPSERT. */
async function executeImport(
  tx: Tx,
  parsed: ParsedWorkbook,
): Promise<ImportCounts> {
  // ---- 1. Standards (1 row UPSERT by code) ----
  const stdRow = await tx
    .insert(standards)
    .values({
      code: parsed.standard.standard_code,
      titleDe: parsed.standard.title_de,
      titleEn: parsed.standard.title_en,
      version: parsed.standard.edition,
    })
    .onConflictDoUpdate({
      target: standards.code,
      set: {
        titleDe: parsed.standard.title_de,
        titleEn: parsed.standard.title_en,
        version: parsed.standard.edition,
      },
    })
    .returning({ id: standards.id });
  const standardId = stdRow[0].id;

  // I4: warn about DB field symbols that are no longer in the xlsx for this standard
  const existingFieldSymbols = await tx
    .select({ symbol: fields.symbol, worksheetCode: worksheetTemplates.code })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(eq(worksheetTemplates.standardId, standardId));
  const xlsxFieldKeys = new Set(
    parsed.fields.map((f) => `${f.origin_worksheet}|${f.symbol}`),
  );
  const orphans = existingFieldSymbols.filter(
    (r) => !xlsxFieldKeys.has(`${r.worksheetCode}|${r.symbol}`),
  );
  if (orphans.length > 0) {
    console.warn(
      `⚠ ${orphans.length} field(s) exist in DB but not in xlsx — possible rename or removal. They remain in DB:`,
    );
    for (const o of orphans.slice(0, 10)) {
      console.warn(`    ${o.worksheetCode} · ${o.symbol}`);
    }
    if (orphans.length > 10) console.warn(`    ... and ${orphans.length - 10} more`);
  }

  // ---- 2. Worksheet templates ----
  const tmplValues = parsed.worksheets.map((w) => ({
    standardId,
    code: w.worksheet_code,
    titleDe: w.title_de,
    titleEn: w.title_en,
    phase: w.phase,
    archetype: w.archetype,
    orderIndex: w.order_index,
    description: w.description,
  }));
  const insertedTemplates = await tx
    .insert(worksheetTemplates)
    .values(tmplValues)
    .onConflictDoUpdate({
      target: [worksheetTemplates.standardId, worksheetTemplates.code],
      set: {
        titleDe: sql`excluded.title_de`,
        titleEn: sql`excluded.title_en`,
        phase: sql`excluded.phase`,
        archetype: sql`excluded.archetype`,
        orderIndex: sql`excluded.order_index`,
        description: sql`excluded.description`,
      },
    })
    .returning({ id: worksheetTemplates.id, code: worksheetTemplates.code });
  const tmplByCode = new Map(insertedTemplates.map((t) => [t.code, t.id]));

  // I5: warn about worksheet codes that collide with other standards
  const collisions = await tx
    .select({
      code: worksheetTemplates.code,
      otherStandardCode: standards.code,
    })
    .from(worksheetTemplates)
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        inArray(
          worksheetTemplates.code,
          parsed.worksheets.map((w) => w.worksheet_code),
        ),
        sql`${standards.id} <> ${standardId}`,
      ),
    );
  if (collisions.length > 0) {
    console.warn(
      `ℹ ${collisions.length} worksheet code(s) also exist in other standards (Phase 2: cross-standard field_bindings):`,
    );
    for (const c of collisions.slice(0, 10)) {
      console.warn(`    ${c.code} (also in ${c.otherStandardCode})`);
    }
  }

  const tmplIds = Array.from(tmplByCode.values());

  // Re-import policy pre-pass: snapshot every existing field BEFORE we
  // wipe sections, so we can compare incoming content (including the
  // section CODE) against the prior state. The section UUID is meaningless
  // for this purpose because sections get re-inserted on every import.
  const existingFieldRows: ExistingField[] = tmplIds.length === 0
    ? []
    : await tx
        .select({
          id: fields.id,
          worksheetTemplateId: fields.worksheetTemplateId,
          sectionCode: worksheetSections.code,
          symbol: fields.symbol,
          labelDe: fields.labelDe,
          labelEn: fields.labelEn,
          dataType: fields.dataType,
          unit: fields.unit,
          isRequired: fields.isRequired,
          enumValues: fields.enumValues,
          validationRules: fields.validationRules,
          clauseReference: fields.clauseReference,
          description: fields.description,
          consumerWorksheets: fields.consumerWorksheets,
          verificationStatus: fields.verificationStatus,
          verifiedByUserId: fields.verifiedByUserId,
          verifiedAt: fields.verifiedAt,
          verificationNote: fields.verificationNote,
        })
        .from(fields)
        .leftJoin(worksheetSections, eq(worksheetSections.id, fields.sectionId))
        .where(inArray(fields.worksheetTemplateId, tmplIds));
  const existingFieldByKey = new Map<string, ExistingField>(
    existingFieldRows.map((f) => [`${f.worksheetTemplateId}|${f.symbol}`, f]),
  );

  // ---- 3a. Sections, pass 1 (no parent_section_id) ----
  // Sections have no unique constraint on (worksheet_template_id, code),
  // so we wipe sections for this standard's worksheets and reinsert.
  // Clear section_id on fields that reference these worksheets' sections before deleting,
  // otherwise the FK constraint (fields.section_id → worksheet_sections.id) blocks the delete.
  if (tmplIds.length > 0) {
    await tx
      .update(fields)
      .set({ sectionId: null })
      .where(inArray(fields.worksheetTemplateId, tmplIds));
  }
  await tx.delete(worksheetSections).where(inArray(worksheetSections.worksheetTemplateId, tmplIds));

  const sectionValues = parsed.sections.map((s) => ({
    worksheetTemplateId: tmplByCode.get(s.worksheet_code)!,
    code: s.section_code,
    titleDe: s.title,
    orderIndex: s.order_index,
  }));
  const insertedSections = sectionValues.length === 0 ? [] : await tx
    .insert(worksheetSections)
    .values(sectionValues)
    .returning({
      id: worksheetSections.id,
      worksheetTemplateId: worksheetSections.worksheetTemplateId,
      code: worksheetSections.code,
    });
  const sectionByKey = new Map<string, string>();
  for (const s of insertedSections) {
    sectionByKey.set(`${s.worksheetTemplateId}|${s.code}`, s.id);
  }

  // ---- 3b. Sections, pass 2: resolve parent_section_id ----
  for (const src of parsed.sections) {
    if (!src.parent_section_code) continue;
    const tmplId = tmplByCode.get(src.worksheet_code);
    if (!tmplId) continue;
    const selfId = sectionByKey.get(`${tmplId}|${src.section_code}`);
    const parentId = sectionByKey.get(`${tmplId}|${src.parent_section_code}`);
    if (selfId && parentId) {
      await tx
        .update(worksheetSections)
        .set({ parentSectionId: parentId })
        .where(eq(worksheetSections.id, selfId));
    }
  }

  // ---- 4. Fields — apply re-verification policy ----
  // (existingFieldRows + existingFieldByKey were built before the section
  // wipe so we still have access to the pre-import section codes.)
  const enumGroups = groupEnumValues(parsed.enumValues);
  let revertedFields = 0;
  const fieldValues = parsed.fields.map((f) => {
    const tmplId = tmplByCode.get(f.origin_worksheet)!;
    const sectionId = f.origin_section
      ? sectionByKey.get(`${tmplId}|${f.origin_section}`) ?? null
      : null;
    const enumValues =
      f.data_type === 'enum' ? enumGroups.get(f.symbol) ?? null : null;
    const validationRules = f.validation_rules
      ? { raw: f.validation_rules }
      : null;
    const next: NewFieldRow = {
      worksheetTemplateId: tmplId,
      sectionId,
      sectionCode: f.origin_section ?? null,
      symbol: f.symbol,
      labelDe: f.label_de,
      labelEn: f.label_en,
      dataType: f.data_type,
      unit: f.unit,
      isRequired: parseRequired(f.required),
      enumValues,
      validationRules,
      clauseReference: f.regulation_reference,
      description: f.description,
      consumerWorksheets: parseList(f.consumer_worksheets),
    };

    // Re-import policy. Default for a row that doesn't yet exist:
    // imported_unverified, empty audit. For an existing engineer_verified
    // row: if content drifted, reset; otherwise preserve audit.
    const existing = existingFieldByKey.get(`${tmplId}|${f.symbol}`);
    let verificationStatus: string = existing?.verificationStatus ?? 'imported_unverified';
    let verifiedByUserId: string | null = null;
    let verifiedAt: Date | null = null;
    let verificationNote: string | null = null;

    if (existing && existing.verificationStatus === 'engineer_verified') {
      if (fieldContentChanged(existing, next)) {
        verificationStatus = 'imported_unverified';
        revertedFields += 1;
      } else {
        verificationStatus = 'engineer_verified';
        verifiedByUserId = existing.verifiedByUserId;
        verifiedAt = existing.verifiedAt;
        verificationNote = existing.verificationNote;
      }
    }

    // `sectionCode` is only used by the JS comparator above; the fields
     // table has no such column, so we drop it before INSERT.
    const { sectionCode: _drop, ...nextForInsert } = next;
    void _drop;
    return {
      ...nextForInsert,
      verificationStatus,
      verifiedByUserId,
      verifiedAt,
      verificationNote,
    };
  });

  if (fieldValues.length > 0) {
    await tx
      .insert(fields)
      .values(fieldValues)
      .onConflictDoUpdate({
        target: [fields.worksheetTemplateId, fields.symbol],
        set: {
          sectionId: sql`excluded.section_id`,
          labelDe: sql`excluded.label_de`,
          labelEn: sql`excluded.label_en`,
          dataType: sql`excluded.data_type`,
          unit: sql`excluded.unit`,
          isRequired: sql`excluded.is_required`,
          enumValues: sql`excluded.enum_values`,
          validationRules: sql`excluded.validation_rules`,
          clauseReference: sql`excluded.clause_reference`,
          description: sql`excluded.description`,
          consumerWorksheets: sql`excluded.consumer_worksheets`,
          // Re-import policy: verification audit columns now flow from
          // excluded.* — JS pre-pass already picked the right values
          // (preserve when unchanged, reset when content drifted).
          verificationStatus: sql`excluded.verification_status`,
          verifiedByUserId: sql`excluded.verified_by_user_id`,
          verifiedAt: sql`excluded.verified_at`,
          verificationNote: sql`excluded.verification_note`,
        },
      });
  }

  // ---- 5. Equations — same re-verification policy ----
  const existingEqRows: ExistingEquation[] = tmplIds.length === 0
    ? []
    : await tx
        .select({
          id: equations.id,
          worksheetTemplateId: equations.worksheetTemplateId,
          equationNumber: equations.equationNumber,
          formula: equations.formula,
          inputSymbols: equations.inputSymbols,
          outputSymbol: equations.outputSymbol,
          clauseReference: equations.clauseReference,
          description: equations.description,
          verificationStatus: equations.verificationStatus,
          verifiedByUserId: equations.verifiedByUserId,
          verifiedAt: equations.verifiedAt,
          verificationNote: equations.verificationNote,
        })
        .from(equations)
        .where(inArray(equations.worksheetTemplateId, tmplIds));
  const existingEqByKey = new Map<string, ExistingEquation>(
    existingEqRows.map((e) => [`${e.worksheetTemplateId}|${e.equationNumber}`, e]),
  );

  let revertedEquations = 0;
  const eqValues = parsed.equations.map((row) => {
    const tmplId = tmplByCode.get(row.used_in_worksheet)!;
    const next: NewEquationRow = {
      worksheetTemplateId: tmplId,
      equationNumber: row.equation_number,
      formula: row.formula,
      inputSymbols: parseList(row.input_symbols),
      outputSymbol: row.output_symbol,
      clauseReference: row.regulation_reference,
      description: row.description_de,
    };
    const existing = existingEqByKey.get(`${tmplId}|${row.equation_number}`);
    let verificationStatus: string = existing?.verificationStatus ?? 'imported_unverified';
    let verifiedByUserId: string | null = null;
    let verifiedAt: Date | null = null;
    let verificationNote: string | null = null;
    if (existing && existing.verificationStatus === 'engineer_verified') {
      if (equationContentChanged(existing, next)) {
        verificationStatus = 'imported_unverified';
        revertedEquations += 1;
      } else {
        verificationStatus = 'engineer_verified';
        verifiedByUserId = existing.verifiedByUserId;
        verifiedAt = existing.verifiedAt;
        verificationNote = existing.verificationNote;
      }
    }
    return {
      ...next,
      verificationStatus,
      verifiedByUserId,
      verifiedAt,
      verificationNote,
    };
  });

  if (eqValues.length > 0) {
    await tx
      .insert(equations)
      .values(eqValues)
      .onConflictDoUpdate({
        target: [equations.worksheetTemplateId, equations.equationNumber],
        set: {
          formula: sql`excluded.formula`,
          inputSymbols: sql`excluded.input_symbols`,
          outputSymbol: sql`excluded.output_symbol`,
          clauseReference: sql`excluded.clause_reference`,
          description: sql`excluded.description`,
          verificationStatus: sql`excluded.verification_status`,
          verifiedByUserId: sql`excluded.verified_by_user_id`,
          verifiedAt: sql`excluded.verified_at`,
          verificationNote: sql`excluded.verification_note`,
        },
      });
  }

  // ---- 6. Compliance requirements ----
  const firstPhase1 = parsed.worksheets.find((w) => w.phase === 1) ?? parsed.worksheets[0];
  const crValues = parsed.complianceRequirements.map((cr) => {
    const matchingByPhase = cr.phase != null
      ? parsed.worksheets.find((w) => w.phase === cr.phase)
      : undefined;
    const targetWorksheet = matchingByPhase ?? firstPhase1;
    let condition = cr.evaluation_expression;
    if (!condition) {
      if (cr.required_field_symbols) {
        condition = cr.required_field_symbols
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => `${s} IS NOT NULL`)
          .join(' AND ');
      } else {
        condition = 'TRUE';
      }
    }
    return {
      worksheetTemplateId: tmplByCode.get(targetWorksheet.worksheet_code)!,
      code: cr.requirement_code,
      titleDe: cr.title,
      condition,
      description: cr.description,
      clauseReference: cr.regulation_reference,
      severity: 'block' as const,
    };
  });
  if (crValues.length > 0) {
    await tx
      .insert(complianceRequirements)
      .values(crValues)
      .onConflictDoUpdate({
        target: [complianceRequirements.worksheetTemplateId, complianceRequirements.code],
        set: {
          titleDe: sql`excluded.title_de`,
          condition: sql`excluded.condition`,
          description: sql`excluded.description`,
          clauseReference: sql`excluded.clause_reference`,
          severity: sql`excluded.severity`,
        },
      });
  }

  return {
    standards: 1,
    worksheetTemplates: insertedTemplates.length,
    worksheetSections: insertedSections.length,
    fields: parsed.fields.length,
    equations: parsed.equations.length,
    complianceRequirements: parsed.complianceRequirements.length,
    revertedFields,
    revertedEquations,
  };
}

/** CLI flow — opens its own postgres connection from a URL, runs the
 * import inside one transaction. */
export async function importWorkbook(
  databaseUrl: string,
  parsed: ParsedWorkbook,
  options: { dryRun?: boolean } = {},
): Promise<ImportCounts> {
  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  try {
    if (options.dryRun) {
      return {
        standards: 1,
        worksheetTemplates: parsed.worksheets.length,
        worksheetSections: parsed.sections.length,
        fields: parsed.fields.length,
        equations: parsed.equations.length,
        complianceRequirements: parsed.complianceRequirements.length,
        revertedFields: 0,
        revertedEquations: 0,
      };
    }
    return await db.transaction((tx) => executeImport(tx, parsed));
  } finally {
    await client.end();
  }
}

/** Server-action flow — uses the app's existing drizzle db handle so the
 * connection pool is reused. Runs inside one transaction. */
export async function applyImportWithDb(
  db: DbLike,
  parsed: ParsedWorkbook,
): Promise<ImportCounts> {
  return await db.transaction((tx) => executeImport(tx, parsed));
}
