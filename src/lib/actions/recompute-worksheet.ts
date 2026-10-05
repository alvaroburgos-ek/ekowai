/**
 * Server-side recompute of a worksheet's OWN engine equations (readiness run 2026-09-30 → 2026-10-05).
 *
 * The browser form evaluates every engine-eligible equation and writes the computed output back
 * into the output field (use-equation-engine.ts write-back effect); the server then stores it as
 * `derived`. A project driven only through the API (MCP `set_field_values`) never ran that loop,
 * so f_K, k_i, Q_S, q_S,AC, V_VA, Q_zu, q_VS … stayed empty until somebody opened the sheet in a
 * browser. This module runs the SAME evaluator the report/PDF uses (`evaluateWorksheetEquations`)
 * over the saved worksheet and persists the computed outputs through `saveWorksheet`, which marks
 * them `derived` and chains the producer materialisations exactly like a browser save.
 *
 * Mirrors the client write-back rules, with one deliberate difference:
 *   - displayOnly equations never write (sizing aids / alternative forms);
 *   - the A_S,m method suppression (Gl. 7 only writes for the direct method);
 *   - only the worksheet's OWN fields are written (the home-boundary rule of the form, which
 *     suppresses a local equation writing an inherited symbol, reduces to this);
 *   - a NON-computable result is NOT written as null here (the client clears the field): the
 *     server materialisations are authoritative for several outputs and a blanket null could
 *     clobber them. Stale values therefore survive a failed recompute and are reported instead.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  equations, fields, projectParameters, standards, worksheetInstances, worksheetSections, worksheetTemplates,
} from '@/lib/db/schema';
import { loadInheritedFields } from '@/lib/db/queries/worksheet';
import { ensureRegulationTablesLoaded } from '@/lib/db/queries/regulation-tables';
import {
  evaluateWorksheetEquations, reportVisibility,
  type EquationReportResult, type ReportParameter,
} from '@/lib/eval/evaluate-for-report';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import { asmEngineSuppressedSymbols } from '@/lib/eval/asm-source';
import { derivedOutputSymbols } from '@/lib/eval/derived-output-symbols';
import { parametersToFieldValues } from '@/lib/eval/materialize-derived';
import { resolveLookupFill, resolveLookupFillConfig } from '@/lib/eval/lookup-fill';
import { makeSymbolLookup } from '@/lib/compliance/symbol-lookup';
import type { FieldValue } from '@/lib/state/worksheet-store';
import { saveWorksheet, type SavedDerivedRow } from './worksheet';

export type RecomputeWrite = { fieldId: string; symbol: string; equationNumber: string; value: number | string | boolean };

export type RecomputeResult = {
  /** Outputs persisted by this pass (only values that changed). */
  written: RecomputeWrite[];
  /** Equations that could not compute, with the evaluator's reason — nothing was written for them. */
  notComputed: Array<{ equationNumber: string; outputSymbol: string | null; reason: string }>;
  warnings: string[];
  derived: SavedDerivedRow[];
};

/**
 * Pure selection of the outputs to persist (unit-tested): which evaluator results become writes.
 */
export function selectRecomputeWrites(args: {
  results: EquationReportResult[];
  ownFields: ReadonlyArray<{ id: string; symbol: string; dataType: string }>;
  currentNumberByFieldId: ReadonlyMap<string, number | null>;
  /** A138-12 `a_s_m_determination_method` when the worksheet owns it (null otherwise). */
  asmMethod: string | null;
}): { writes: RecomputeWrite[]; notComputed: RecomputeResult['notComputed'] } {
  const ownBySymbol = new Map(args.ownFields.map((f) => [f.symbol, f]));
  const suppressed = asmEngineSuppressedSymbols(args.asmMethod);
  const writes: RecomputeWrite[] = [];
  const notComputed: RecomputeResult['notComputed'] = [];
  for (const r of args.results) {
    if (equationProfiles[r.equationId]?.displayOnly) continue;
    const sym = r.outputSymbol;
    if (!sym) continue;
    const target = ownBySymbol.get(sym);
    if (!target || target.dataType !== 'number') continue; // inherited / non-numeric targets are never written
    if (suppressed.has(sym)) continue;
    if (r.state.kind !== 'computed') {
      const reason = 'reason' in r.state && typeof r.state.reason === 'string' ? r.state.reason : r.state.kind;
      notComputed.push({ equationNumber: r.equationNumber, outputSymbol: sym, reason });
      continue;
    }
    const v = r.state.value;
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const cur = args.currentNumberByFieldId.get(target.id) ?? null;
    if (cur != null && Math.abs(cur - v) <= 1e-12 * Math.max(1, Math.abs(v))) continue; // unchanged
    writes.push({ fieldId: target.id, symbol: sym, equationNumber: r.equationNumber, value: v });
  }
  return { writes, notComputed };
}

function toReportParameter(p: typeof projectParameters.$inferSelect): ReportParameter {
  return {
    fieldId: p.fieldId,
    valueNumber: p.valueNumber == null ? null : Number(p.valueNumber),
    valueText: p.valueText,
    valueEnum: p.valueEnum,
    valueBoolean: p.valueBoolean,
    valueDate: p.valueDate,
    valueJson: p.valueJson,
  };
}

/** Chained equations on one sheet (Gl. 6 f_K → Gl. 5 k_i): the browser re-evaluates reactively, the
 * server evaluates stored values, so a pass is repeated while it still produces new writes. */
const MAX_PASSES = 4;

/**
 * Evaluate the worksheet's own equations against the stored values and persist the computed
 * outputs (as `derived`, via saveWorksheet). Access control is the caller's (the MCP tools check
 * project access before calling; saveWorksheet re-checks on write).
 */
export async function recomputeWorksheetEquations(instanceId: string): Promise<RecomputeResult> {
  const written: RecomputeWrite[] = [];
  const warnings: string[] = [];
  const derived: SavedDerivedRow[] = [];
  let notComputed: RecomputeResult['notComputed'] = [];
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const r = await recomputePass(instanceId);
    written.push(...r.written);
    warnings.push(...r.warnings);
    derived.push(...r.derived);
    notComputed = r.notComputed;
    if (r.written.length === 0 || r.warnings.length > 0) break;
  }
  return { written, notComputed, warnings, derived };
}

async function recomputePass(instanceId: string): Promise<RecomputeResult> {
  const [inst] = await db
    .select({
      id: worksheetInstances.id,
      projectId: worksheetInstances.projectId,
      templateId: worksheetInstances.worksheetTemplateId,
      code: worksheetTemplates.code,
      standardId: worksheetTemplates.standardId,
      standardCode: standards.code,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetInstances.id, instanceId))
    .limit(1);
  if (!inst) throw new Error('Arbeitsblatt nicht gefunden.');

  const tmplEquations = await db.select().from(equations).where(eq(equations.worksheetTemplateId, inst.templateId));
  // (no early return on "no equations": a sheet may still carry lookup_fill fields — FLLNT-09, D7 re-test 2026-10-05)

  // The regulation tables of this standard back `lookup()` in the evaluator (same guard as the report loader).
  await ensureRegulationTablesLoaded(inst.standardCode);

  const [ownFields, sections, inherited] = await Promise.all([
    db.select().from(fields).where(and(eq(fields.worksheetTemplateId, inst.templateId), eq(fields.active, true))).orderBy(fields.orderIndex),
    db.select().from(worksheetSections).where(eq(worksheetSections.worksheetTemplateId, inst.templateId)).orderBy(worksheetSections.orderIndex),
    loadInheritedFields(inst.templateId, inst.standardId, inst.code),
  ]);
  const allIds = [...ownFields.map((f) => f.id), ...inherited.map((f) => f.id)];
  const params = allIds.length === 0
    ? []
    : await db.select().from(projectParameters).where(and(eq(projectParameters.projectId, inst.projectId), inArray(projectParameters.fieldId, allIds)));
  const paramByFieldId = new Map(params.map((p) => [p.fieldId, p]));
  const ownParams = ownFields.map((f) => paramByFieldId.get(f.id)).filter((p): p is NonNullable<typeof p> => p != null).map(toReportParameter);
  const inheritedParams = inherited.map((f) => paramByFieldId.get(f.id)).filter((p): p is NonNullable<typeof p> => p != null).map(toReportParameter);

  const { hiddenSymbols } = reportVisibility(ownFields, sections, ownParams, { fields: inherited, parameters: inheritedParams });

  const results = evaluateWorksheetEquations(
    inst.code,
    tmplEquations.map((e) => ({
      id: e.id, equationNumber: e.equationNumber, formula: e.formula,
      inputSymbols: e.inputSymbols, outputSymbol: e.outputSymbol, outputUnit: e.outputUnit,
    })),
    ownFields,
    ownParams,
    { standardCode: inst.standardCode, hiddenSymbols, inherited: { fields: inherited, parameters: inheritedParams } },
  );

  // A138-12's determination method gates Gl. 7's write (A_S,m single source); read it only when owned.
  const asmField = ownFields.find((f) => f.symbol === 'a_s_m_determination_method');
  const asmMethod = asmField ? (paramByFieldId.get(asmField.id)?.valueEnum ?? null) : null;

  const currentNumberByFieldId = new Map<string, number | null>();
  for (const f of ownFields) {
    const p = paramByFieldId.get(f.id);
    currentNumberByFieldId.set(f.id, p?.valueNumber == null ? null : Number(p.valueNumber));
  }

  const { writes, notComputed } = selectRecomputeWrites({ results, ownFields, currentNumberByFieldId, asmMethod });

  // FLL run 2026-10-05 (Naturteich D7): `lookup_fill` fields (Tab. 1 / 9 / 10 values keyed by other symbols) were filled only by
  // the browser widget; through the API they stayed empty. Resolve every EMPTY own lookup_fill field against the same state the
  // widget sees (own + inherited values) and write the bound cell; saveWorksheet's lookup block then stamps it `derived` because
  // the value equals the bound cell. An existing value (typed override or earlier fill) is never touched here.
  const equationOutputs = derivedOutputSymbols(tmplEquations.map((e) => ({ id: e.id, outputSymbol: e.outputSymbol })));
  const ownSymbols = new Set(ownFields.map((o) => o.symbol));
  const readable = [
    ...ownFields.map((o) => ({ id: o.id, symbol: o.symbol, dataType: o.dataType })),
    ...inherited.filter((i) => !ownSymbols.has(i.symbol)).map((i) => ({ id: i.id, symbol: i.symbol, dataType: i.dataType })),
  ];
  const persistedValues = parametersToFieldValues(params, readable);
  const fillLookup = makeSymbolLookup(readable, persistedValues);
  const fillWrites: RecomputeWrite[] = [];
  for (const o of ownFields) {
    if (o.widget !== 'lookup_fill' || equationOutputs.has(o.symbol)) continue;
    const current = persistedValues[o.id];
    const hasValue = current != null && current.type !== 'json' && current.value != null && current.value !== '';
    if (hasValue) continue;
    const cfg = resolveLookupFillConfig(o);
    if (!cfg) continue;
    const state = resolveLookupFill(cfg.binding, inst.standardCode, fillLookup);
    if (state.kind !== 'resolved' || state.tableValue == null) continue;
    const tv = state.tableValue;
    if (o.dataType === 'number') {
      const n = typeof tv === 'number' ? tv : Number(tv);
      if (Number.isFinite(n)) fillWrites.push({ fieldId: o.id, symbol: o.symbol, equationNumber: `lookup:${cfg.binding.table_code}`, value: n });
    } else if (o.dataType === 'boolean') {
      if (typeof tv === 'boolean') fillWrites.push({ fieldId: o.id, symbol: o.symbol, equationNumber: `lookup:${cfg.binding.table_code}`, value: tv });
    } else if (o.dataType === 'enum' || o.dataType === 'text') {
      fillWrites.push({ fieldId: o.id, symbol: o.symbol, equationNumber: `lookup:${cfg.binding.table_code}`, value: String(tv) });
    }
  }
  writes.push(...fillWrites);
  if (writes.length === 0) return { written: [], notComputed, warnings: [], derived: [] };

  const values: Record<string, FieldValue> = {};
  for (const w of writes) {
    const target = ownFields.find((o) => o.id === w.fieldId);
    const dt = target?.dataType ?? 'number';
    values[w.fieldId] =
      dt === 'boolean' ? { type: 'boolean', value: typeof w.value === 'boolean' ? w.value : w.value === 'true' }
      : dt === 'enum' ? { type: 'enum', value: String(w.value) }
      : dt === 'text' ? { type: 'text', value: String(w.value) }
      : { type: 'number', value: typeof w.value === 'number' ? w.value : Number(w.value) };
  }
  const saved = await saveWorksheet({ instanceId, values });
  if (!saved.ok) return { written: [], notComputed, warnings: [`Nachrechnung nicht gespeichert: ${saved.error}`], derived: [] };
  return { written: writes, notComputed, warnings: saved.warnings, derived: saved.derived };
}
