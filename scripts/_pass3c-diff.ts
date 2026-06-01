import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import type { ParsedWorkbook } from './_pass3c-types';

const { standards, worksheetTemplates, fields, equations, complianceRequirements } = schema;

type DbLike = PostgresJsDatabase<typeof schema>;

export type FieldChange = {
  worksheetCode: string;
  symbol: string;
  type: 'new' | 'changed' | 'unchanged';
  changedColumns: string[];
  willResetVerification: boolean;
  currentVerificationStatus: string | null;
};

export type EquationChange = {
  worksheetCode: string;
  equationNumber: string;
  type: 'new' | 'changed' | 'unchanged';
  changedColumns: string[];
  willResetVerification: boolean;
  currentVerificationStatus: string | null;
};

export type ImportDiff = {
  standardCode: string;
  standardExists: boolean;
  worksheetsNew: number;
  worksheetsUpdated: number;
  fields: {
    added: number;
    changed: number;
    unchanged: number;
    willResetVerification: number;
    details: FieldChange[];
  };
  equations: {
    added: number;
    changed: number;
    unchanged: number;
    willResetVerification: number;
    details: EquationChange[];
  };
  compliance: {
    added: number;
    total: number;
  };
  /** Orphan fields: in DB but not in workbook. Importer leaves them in DB
   * but the engineer should know about them. */
  orphanFields: Array<{ worksheetCode: string; symbol: string }>;
};

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseList(v: string | null): string[] | null {
  if (!v) return null;
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseRequired(v: string | null): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'required';
}

/** Compute a non-mutating preview of what would happen if we imported
 * `parsed` against the current DB state. Used by the upload UI to show
 * the engineer a diff before they confirm. */
export async function computeImportDiff(
  db: DbLike,
  parsed: ParsedWorkbook,
): Promise<ImportDiff> {
  const stdRows = await db
    .select({ id: standards.id })
    .from(standards)
    .where(eq(standards.code, parsed.standard.standard_code))
    .limit(1);
  const standardId = stdRows[0]?.id;

  if (!standardId) {
    // Brand-new standard — everything is "added".
    return {
      standardCode: parsed.standard.standard_code,
      standardExists: false,
      worksheetsNew: parsed.worksheets.length,
      worksheetsUpdated: 0,
      fields: {
        added: parsed.fields.length,
        changed: 0,
        unchanged: 0,
        willResetVerification: 0,
        details: parsed.fields.map((f) => ({
          worksheetCode: f.origin_worksheet,
          symbol: f.symbol,
          type: 'new' as const,
          changedColumns: [],
          willResetVerification: false,
          currentVerificationStatus: null,
        })),
      },
      equations: {
        added: parsed.equations.length,
        changed: 0,
        unchanged: 0,
        willResetVerification: 0,
        details: parsed.equations.map((e) => ({
          worksheetCode: e.used_in_worksheet,
          equationNumber: e.equation_number,
          type: 'new' as const,
          changedColumns: [],
          willResetVerification: false,
          currentVerificationStatus: null,
        })),
      },
      compliance: {
        added: parsed.complianceRequirements.length,
        total: parsed.complianceRequirements.length,
      },
      orphanFields: [],
    };
  }

  // Existing standard. Load all worksheets + fields + equations for it.
  const wsRows = await db
    .select({ id: worksheetTemplates.id, code: worksheetTemplates.code })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, standardId));
  const wsByCode = new Map(wsRows.map((w) => [w.code, w.id]));

  const existingWsCodes = new Set(wsRows.map((w) => w.code));
  let worksheetsNew = 0;
  let worksheetsUpdated = 0;
  for (const w of parsed.worksheets) {
    if (existingWsCodes.has(w.worksheet_code)) worksheetsUpdated += 1;
    else worksheetsNew += 1;
  }

  const wsIds = Array.from(wsByCode.values());
  const existingFields = wsIds.length === 0 ? [] : await db
    .select()
    .from(fields)
    .where(inArray(fields.worksheetTemplateId, wsIds));
  const existingFieldByKey = new Map<string, typeof existingFields[number]>();
  for (const f of existingFields) {
    const wsCode = [...wsByCode.entries()].find(([, id]) => id === f.worksheetTemplateId)?.[0];
    if (wsCode) existingFieldByKey.set(`${wsCode}|${f.symbol}`, f);
  }

  const fieldDetails: FieldChange[] = [];
  let fAdded = 0, fChanged = 0, fUnchanged = 0, fReset = 0;
  for (const incoming of parsed.fields) {
    const key = `${incoming.origin_worksheet}|${incoming.symbol}`;
    const existing = existingFieldByKey.get(key);
    if (!existing) {
      fAdded += 1;
      fieldDetails.push({
        worksheetCode: incoming.origin_worksheet,
        symbol: incoming.symbol,
        type: 'new',
        changedColumns: [],
        willResetVerification: false,
        currentVerificationStatus: null,
      });
      continue;
    }
    const changed: string[] = [];
    if (existing.labelDe !== incoming.label_de) changed.push('labelDe');
    if (existing.labelEn !== incoming.label_en) changed.push('labelEn');
    if (existing.dataType !== incoming.data_type) changed.push('dataType');
    if (existing.unit !== incoming.unit) changed.push('unit');
    if (existing.isRequired !== parseRequired(incoming.required)) changed.push('isRequired');
    if (existing.clauseReference !== incoming.regulation_reference) changed.push('clauseReference');
    if (existing.description !== incoming.description) changed.push('description');
    // validationRules and enumValues need value-level comparison
    const newVal = incoming.validation_rules ? { raw: incoming.validation_rules } : null;
    if (!jsonEqual(existing.validationRules, newVal)) changed.push('validationRules');
    if (!jsonEqual(existing.consumerWorksheets, parseList(incoming.consumer_worksheets))) {
      changed.push('consumerWorksheets');
    }
    // enumValues: compared by re-running the same grouping logic would be
    // costly here; defer to import-time check. For preview we mark "may
    // change" when datatype is enum.

    if (changed.length === 0) {
      fUnchanged += 1;
      fieldDetails.push({
        worksheetCode: incoming.origin_worksheet,
        symbol: incoming.symbol,
        type: 'unchanged',
        changedColumns: [],
        willResetVerification: false,
        currentVerificationStatus: existing.verificationStatus,
      });
    } else {
      fChanged += 1;
      const willReset = existing.verificationStatus === 'engineer_verified';
      if (willReset) fReset += 1;
      fieldDetails.push({
        worksheetCode: incoming.origin_worksheet,
        symbol: incoming.symbol,
        type: 'changed',
        changedColumns: changed,
        willResetVerification: willReset,
        currentVerificationStatus: existing.verificationStatus,
      });
    }
  }

  // Orphans
  const incomingFieldKeys = new Set(
    parsed.fields.map((f) => `${f.origin_worksheet}|${f.symbol}`),
  );
  const orphanFields = [...existingFieldByKey.entries()]
    .filter(([k]) => !incomingFieldKeys.has(k))
    .map(([k]) => {
      const [worksheetCode, symbol] = k.split('|');
      return { worksheetCode, symbol };
    });

  // Equations
  const existingEqs = wsIds.length === 0 ? [] : await db
    .select()
    .from(equations)
    .where(inArray(equations.worksheetTemplateId, wsIds));
  const existingEqByKey = new Map<string, typeof existingEqs[number]>();
  for (const e of existingEqs) {
    const wsCode = [...wsByCode.entries()].find(([, id]) => id === e.worksheetTemplateId)?.[0];
    if (wsCode) existingEqByKey.set(`${wsCode}|${e.equationNumber}`, e);
  }
  const eqDetails: EquationChange[] = [];
  let eAdded = 0, eChanged = 0, eUnchanged = 0, eReset = 0;
  for (const incoming of parsed.equations) {
    const key = `${incoming.used_in_worksheet}|${incoming.equation_number}`;
    const existing = existingEqByKey.get(key);
    if (!existing) {
      eAdded += 1;
      eqDetails.push({
        worksheetCode: incoming.used_in_worksheet,
        equationNumber: incoming.equation_number,
        type: 'new',
        changedColumns: [],
        willResetVerification: false,
        currentVerificationStatus: null,
      });
      continue;
    }
    const changed: string[] = [];
    if (existing.formula !== incoming.formula) changed.push('formula');
    if (existing.outputSymbol !== incoming.output_symbol) changed.push('outputSymbol');
    if (existing.clauseReference !== incoming.regulation_reference) changed.push('clauseReference');
    if (existing.description !== incoming.description_de) changed.push('description');
    if (!jsonEqual(existing.inputSymbols, parseList(incoming.input_symbols))) {
      changed.push('inputSymbols');
    }
    if (changed.length === 0) {
      eUnchanged += 1;
      eqDetails.push({
        worksheetCode: incoming.used_in_worksheet,
        equationNumber: incoming.equation_number,
        type: 'unchanged',
        changedColumns: [],
        willResetVerification: false,
        currentVerificationStatus: existing.verificationStatus,
      });
    } else {
      eChanged += 1;
      const willReset = existing.verificationStatus === 'engineer_verified';
      if (willReset) eReset += 1;
      eqDetails.push({
        worksheetCode: incoming.used_in_worksheet,
        equationNumber: incoming.equation_number,
        type: 'changed',
        changedColumns: changed,
        willResetVerification: willReset,
        currentVerificationStatus: existing.verificationStatus,
      });
    }
  }

  // Compliance — for preview we just give totals (the importer always
  // overwrites these, no verification status on the table).
  const existingCRs = wsIds.length === 0 ? 0 : (await db
    .select({ id: complianceRequirements.id })
    .from(complianceRequirements)
    .where(inArray(complianceRequirements.worksheetTemplateId, wsIds))).length;

  return {
    standardCode: parsed.standard.standard_code,
    standardExists: true,
    worksheetsNew,
    worksheetsUpdated,
    fields: {
      added: fAdded,
      changed: fChanged,
      unchanged: fUnchanged,
      willResetVerification: fReset,
      details: fieldDetails,
    },
    equations: {
      added: eAdded,
      changed: eChanged,
      unchanged: eUnchanged,
      willResetVerification: eReset,
      details: eqDetails,
    },
    compliance: {
      added: Math.max(0, parsed.complianceRequirements.length - existingCRs),
      total: parsed.complianceRequirements.length,
    },
    orphanFields,
  };
}
