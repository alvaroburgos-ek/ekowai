// src/lib/eval/scenario-chain.ts
/**
 * What-if cases — the in-memory chain runner (spec docs/superpowers/specs/2026-10-14-what-if-cases-design.md §3).
 *
 * Pure: no DB, no React, never mutates its inputs, never persists. The SAME evaluator primitives as the report/PDF path
 * (`evaluateWorksheetEquations`, `evaluateWorksheetCompliance`, `reportVisibility`) and the SAME visibility rules as the
 * approval gate (hidden-at-source R-14…R-16). Inherited values come from THIS run's values; the approval-based
 * withholding of inherited produced values (worksheet page, `carrierWithholdFieldIds`) does not exist here — the caller
 * states that explicitly with `approvalWithholding: 'bypass'`, a literal the real save/approval path never passes.
 */
import {
  evaluateWorksheetEquations, evaluateWorksheetCompliance, reportVisibility,
  type ReportField, type ReportParameter,
} from './evaluate-for-report';
import { inheritedFieldsFor } from '@/lib/compliance/visibility';
import {
  buildVisibilityArgs, buildStandardScopedFallback, type StandardVisibilityMeta, type ProjectFieldRow,
} from '@/lib/actions/approval-gate';
import {
  dropHiddenAtSource, gateHiddenSymbols, hiddenAtSourceFieldIds, sourceHiddenSymbolsByTemplate, type GateValue,
} from '@/lib/projects/required-field-counts';
import { equationProfiles } from './equation-profiles';
import { asmEngineSuppressedSymbols } from './asm-source';
import { BASIN_GL8_EQUATION_ID } from './governing-duration';
import { mirrorA138, A138_STANDARD_CODE, type MirrorAccessor } from '@/lib/scenarios/a138-mirror';
import { seriesForSheet } from '@/lib/scenarios/sheet-series';
import { sortSheets, type BaselineField, type ScenarioBaseline, type ScenarioOverrideInput } from '@/lib/scenarios/baseline';
import { fieldValueToParameter, scalarOfParameter, numbersEqual } from '@/lib/scenarios/values';
import type { RunCell, ScenarioRun, SheetRun, StoredMismatch, ValueOrigin } from '@/lib/scenarios/types';

export const MAX_PASSES = 6;

export type RunOptions = {
  caseId: string;
  /** Spec §3 step 2: the runner never withholds inherited values for unapproved sources. Required literal. */
  approvalWithholding: 'bypass';
  maxPasses?: number;
};

const EMPTY = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };

function groupBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) { const k = key(x); const a = m.get(k); if (a) a.push(x); else m.set(k, [x]); }
  return m;
}
const toReportField = (f: BaselineField): ReportField => ({
  id: f.id, symbol: f.symbol, unit: f.unit, dataType: f.dataType, sectionId: f.sectionId, visibleWhen: f.visibleWhen,
  widget: f.widget, uiConfig: f.uiConfig,
});

export function runScenarioChain(
  baseline: ScenarioBaseline,
  overrides: readonly ScenarioOverrideInput[],
  opts: RunOptions,
): ScenarioRun {
  if (opts.approvalWithholding !== 'bypass') throw new Error('runScenarioChain: approvalWithholding must be "bypass"');
  const maxPasses = opts.maxPasses ?? MAX_PASSES;
  const std = baseline.standardCode;
  const fieldById = new Map(baseline.fields.map((f) => [f.id, f]));
  const fieldByCodeSymbol = new Map(baseline.fields.map((f) => [`${f.templateCode}:${f.symbol}`, f]));
  const fieldsByTemplate = groupBy(baseline.fields, (f) => f.templateId);
  const sectionsByTemplate = groupBy(baseline.sections, (s) => s.templateId);
  const fieldsBySymbol = groupBy(baseline.fields, (f) => f.symbol);
  const sheets = sortSheets(baseline.sheets);
  const instantiated = new Set(baseline.sheets.map((s) => s.templateId));

  // ── 1. start values ──────────────────────────────────────────────────────────
  const values = new Map<string, ReportParameter>();
  const origin = new Map<string, ValueOrigin>();
  for (const [id, p] of Object.entries(baseline.stored)) {
    if (!fieldById.has(id)) continue;
    const { sourceType, ...param } = p;
    values.set(id, { ...param });
    origin.set(id, sourceType === 'derived' || sourceType === 'computed' ? 'carried' : 'entered');
  }
  const skippedOverrides: ScenarioRun['skippedOverrides'] = [];
  for (const o of overrides) {
    const f = fieldById.get(o.fieldId);
    if (!f) { skippedOverrides.push({ fieldId: o.fieldId, reason: 'Feld gehört nicht zu dieser Norm oder ist deaktiviert.' }); continue; }
    // Review Focus 1 / ruling R1: a field whose worksheet is not instantiated in the project is not part of the chain.
    if (!instantiated.has(f.templateId)) { skippedOverrides.push({ fieldId: o.fieldId, reason: `Arbeitsblatt ${f.templateCode} ist im Projekt nicht angelegt.` }); continue; }
    if (f.dataType !== o.value.type) { skippedOverrides.push({ fieldId: o.fieldId, reason: `Datentyp passt nicht (${f.dataType} ≠ ${o.value.type}).` }); continue; }
    values.set(o.fieldId, fieldValueToParameter(o.fieldId, o.value));
    origin.set(o.fieldId, 'override');
  }

  // ── visibility inputs (the approval gate's shared rule) ──────────────────────
  const meta: StandardVisibilityMeta = {
    standardCode: std,
    templateIds: [...new Set([...baseline.fields.map((f) => f.templateId), ...baseline.sections.map((s) => s.templateId)])],
    fields: baseline.fields.map((f) => ({
      id: f.id, symbol: f.symbol, labelDe: f.labelDe, dataType: f.dataType, isRequired: f.isRequired, templateId: f.templateId,
      templateCode: f.templateCode, sectionId: f.sectionId, visibleWhen: f.visibleWhen, unit: f.unit, widget: f.widget,
      uiConfig: f.uiConfig, consumerWorksheets: f.consumerWorksheets,
    })),
    sections: baseline.sections.map((s) => ({ id: s.id, parentSectionId: s.parentSectionId, visibleWhen: s.visibleWhen, templateId: s.templateId })),
  };
  const projectFields: ProjectFieldRow[] = baseline.fields
    .filter((f) => instantiated.has(f.templateId))
    .map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType, templateId: f.templateId, standardCode: std }));
  const inheritable = baseline.fields.map((f) => ({ ...f, worksheetTemplateId: f.templateId, standardCode: std, active: true }));

  const targeted = new Set<string>();
  const setNumber = (fieldId: string, v: number | null): boolean => {
    if (origin.get(fieldId) === 'override') return false; // spec §3 step 1: the override wins
    targeted.add(fieldId);
    const prev = values.get(fieldId);
    const prevNum = prev?.valueNumber == null ? null : Number(prev.valueNumber);
    const same = (prevNum === null && v === null) || (prevNum !== null && v !== null && numbersEqual(prevNum, v));
    values.set(fieldId, { fieldId, ...EMPTY, valueNumber: v });
    origin.set(fieldId, 'computed');
    return !same;
  };
  const paramsOf = (fs: readonly BaselineField[]) => fs.flatMap((f) => (values.has(f.id) ? [values.get(f.id)!] : []));

  /**
   * Ruling R2 — the A138-12 geometry branch reads the swale's inputs the way the save path does
   * (worksheet.ts, Mulde Gl. 16 sweep ≈ L1872–1946): `rainfall_table_ref` from A138-17's own field; the scalars
   * h_M / n_M_Bemessung from A138-17 first, else by symbol across the standard's instantiated sheets. Without this
   * the A138-12 accessor (own → inherited → conflict-free fallback) loses a symbol that lives on several sheets and
   * silently falls back to the project n / the default rain table. Fields hidden at source are never read.
   */
  const sheetRank = new Map(sheets.map((s, i) => [s.templateId, i]));
  const MULDE_SHEET = 'A138-17';
  const MULDE_SCALARS = new Set(['h_M', 'n_M_Bemessung']);
  const muldeProducerAccessor = (base: MirrorAccessor, hiddenAtSource: ReadonlySet<string>): MirrorAccessor => {
    const readable = (f: BaselineField | undefined): f is BaselineField => !!f && instantiated.has(f.templateId) && !hiddenAtSource.has(f.id);
    const muldeNum = (sym: string): number | null => {
      const f = fieldByCodeSymbol.get(`${MULDE_SHEET}:${sym}`);
      const p = readable(f) ? values.get(f.id) : undefined;
      return p?.valueNumber != null && Number.isFinite(Number(p.valueNumber)) ? Number(p.valueNumber) : null;
    };
    const anyNum = (sym: string): number | null => {
      const fs = (fieldsBySymbol.get(sym) ?? []).filter(readable)
        .sort((a, b) => (sheetRank.get(a.templateId) ?? Infinity) - (sheetRank.get(b.templateId) ?? Infinity));
      for (const f of fs) {
        const p = values.get(f.id);
        if (f.dataType === 'number' && p?.valueNumber != null && Number.isFinite(Number(p.valueNumber))) return Number(p.valueNumber);
      }
      return null;
    };
    return {
      num: (sym) => (MULDE_SCALARS.has(sym) ? muldeNum(sym) ?? base.num(sym) ?? anyNum(sym) : base.num(sym)),
      str: (sym) => {
        if (sym !== 'rainfall_table_ref') return base.str(sym);
        const f = fieldByCodeSymbol.get(`${MULDE_SHEET}:${sym}`);
        if (!f || !instantiated.has(f.templateId)) return base.str(sym);
        if (hiddenAtSource.has(f.id)) return null;
        const p = values.get(f.id);
        return p?.valueText || p?.valueEnum || null;
      },
      json: (sym) => base.json(sym),
    };
  };

  let sheetRuns: Record<string, SheetRun> = {};
  let accessors = new Map<string, { acc: MirrorAccessor; eqIds: string[] }>();
  let passes = 0;
  let converged = false;

  for (let pass = 1; pass <= maxPasses; pass++) {
    passes = pass;
    let changed = false;
    const args = buildVisibilityArgs(meta, projectFields, [...values.values()]);
    const hiddenAtSource = args ? hiddenAtSourceFieldIds(args) : new Set<string>();
    const sourceHidden = args ? sourceHiddenSymbolsByTemplate(args, hiddenAtSource) : new Map<string, Set<string>>();
    const fallback: Map<string, GateValue> = args
      ? buildStandardScopedFallback(dropHiddenAtSource(args.projectEntries, hiddenAtSource), args.ownScope.templateIds, args.ownScope.symbols)
      : new Map();
    const runs: Record<string, SheetRun> = {};
    const accs = new Map<string, { acc: MirrorAccessor; eqIds: string[] }>();

    for (const sheet of sheets) {
      const own = fieldsByTemplate.get(sheet.templateId) ?? [];
      const ownSymbols = new Set(own.map((f) => f.symbol));
      const ownBySymbol = new Map(own.map((f) => [f.symbol, f]));
      const ownFields = own.map(toReportField);
      const inhRows = inheritedFieldsFor(
        { worksheetTemplateId: sheet.templateId, worksheetCode: sheet.code, standardCode: std }, inheritable,
      ).filter((f) => !hiddenAtSource.has(f.id));
      const inherited = { fields: inhRows.map(toReportField), parameters: paramsOf(inhRows) };
      const { hiddenSymbols: ownHidden } = reportVisibility(ownFields, sectionsByTemplate.get(sheet.templateId) ?? [], paramsOf(own), inherited);
      const hiddenSymbols = gateHiddenSymbols(ownHidden, sourceHidden.get(sheet.templateId) ?? [], ownSymbols);

      // Accessor for the mirror and the series: own → inherited → standard-scoped fallback; hidden ⇒ absent.
      const hit = (sym: string): { f: BaselineField; p: ReportParameter } | undefined => {
        if (hiddenSymbols.has(sym)) return undefined;
        const o = ownBySymbol.get(sym);
        if (o && values.has(o.id)) return { f: o, p: values.get(o.id)! };
        if (!ownSymbols.has(sym)) for (const f of inhRows) if (f.symbol === sym && values.has(f.id)) return { f, p: values.get(f.id)! };
        return undefined;
      };
      const acc: MirrorAccessor = {
        num: (sym) => {
          const h = hit(sym);
          if (h) return h.f.dataType === 'number' && h.p.valueNumber != null && Number.isFinite(Number(h.p.valueNumber)) ? Number(h.p.valueNumber) : null;
          if (hiddenSymbols.has(sym)) return null;
          const g = fallback.get(sym);
          return typeof g === 'number' && Number.isFinite(g) ? g : null;
        },
        str: (sym) => {
          const h = hit(sym);
          if (h) return h.p.valueEnum ?? h.p.valueText ?? null;
          if (hiddenSymbols.has(sym)) return null;
          const g = fallback.get(sym);
          return typeof g === 'string' ? g : null;
        },
        json: (sym) => {
          const h = hit(sym);
          if (h) return h.p.valueJson ?? undefined;
          if (hiddenSymbols.has(sym)) return undefined;
          for (const f of fieldsBySymbol.get(sym) ?? []) {
            if (hiddenAtSource.has(f.id)) continue;
            const p = values.get(f.id);
            if (p?.valueJson != null) return p.valueJson;
          }
          return undefined;
        },
      };

      // ── equations ──
      const results = evaluateWorksheetEquations(sheet.code, sheet.equations, ownFields, paramsOf(own), {
        standardCode: std, hiddenSymbols, inherited,
      });
      const method = ownBySymbol.get('a_s_m_determination_method');
      const suppressed = asmEngineSuppressedSymbols(method ? (values.get(method.id)?.valueEnum ?? null) : null);
      const candidates = new Map<string, number | null>();
      for (const r of results) {
        if (r.equationId === BASIN_GL8_EQUATION_ID) {
          const ex = r.state.kind === 'computed' ? r.state.derivedExtras : undefined;
          const rf = ownBySymbol.get('r_D_n');
          if (rf) candidates.set(rf.id, ex ? ex.r_D_gov : null);
          const df = ownBySymbol.get('D_min');
          if (df) candidates.set(df.id, ex ? ex.D_gov : null);
        }
        if (equationProfiles[r.equationId]?.displayOnly) continue;
        const sym = r.outputSymbol;
        if (!sym) continue;
        const target = ownBySymbol.get(sym);
        if (!target || target.dataType !== 'number' || suppressed.has(sym)) continue;
        const val = r.state.kind === 'computed' && Number.isFinite(r.state.value) ? r.state.value : null;
        const prev = candidates.get(target.id);
        if (prev === undefined || (prev === null && val !== null)) candidates.set(target.id, val);
      }
      for (const [id, val] of candidates) changed = setNumber(id, val) || changed;

      // ── A 138 server materialisations (spec gap G-2) ──
      if (std === A138_STANDARD_CODE) {
        for (const w of mirrorA138(sheet.code, sheet.code === 'A138-12' ? muldeProducerAccessor(acc, hiddenAtSource) : acc)) {
          const f = fieldByCodeSymbol.get(`${w.worksheetCode}:${w.symbol}`);
          if (f && f.dataType === 'number') changed = setNumber(f.id, w.value) || changed;
        }
      }

      // ── compliance: own + inherited + the gate's fallback (spec gap G-5) ──
      const readable = [...ownFields, ...inherited.fields.filter((f) => !ownSymbols.has(f.symbol))];
      const readableSymbols = new Set(readable.map((f) => f.symbol));
      const extraFields: ReportField[] = [];
      const extraParams: ReportParameter[] = [];
      for (const [sym, gv] of fallback) {
        if (readableSymbols.has(sym) || gv == null) continue;
        const id = `fallback:${sym}`;
        if (typeof gv === 'number') { extraFields.push({ id, symbol: sym, unit: null, dataType: 'number' }); extraParams.push({ fieldId: id, ...EMPTY, valueNumber: gv }); }
        else if (typeof gv === 'boolean') { extraFields.push({ id, symbol: sym, unit: null, dataType: 'boolean' }); extraParams.push({ fieldId: id, ...EMPTY, valueBoolean: gv }); }
        else { extraFields.push({ id, symbol: sym, unit: null, dataType: 'text' }); extraParams.push({ fieldId: id, ...EMPTY, valueText: String(gv) }); }
      }
      const compliance = evaluateWorksheetCompliance(
        sheet.code, sheet.compliance, [...readable, ...extraFields],
        [...paramsOf(own), ...paramsOf(inhRows), ...extraParams], results, { hiddenSymbols },
      );

      runs[sheet.code] = {
        code: sheet.code,
        equations: results.map((r) => ({ equationId: r.equationId, equationNumber: r.equationNumber, outputSymbol: r.outputSymbol, state: r.state })),
        compliance: compliance.map((c) => ({ code: c.code, titleDe: c.titleDe, severity: c.severity, result: c.result })),
        hiddenSymbols: [...hiddenSymbols].sort(),
      };
      accs.set(sheet.code, { acc, eqIds: sheet.equations.map((e) => e.id) });
    }
    sheetRuns = runs;
    accessors = accs;
    if (!changed) { converged = true; break; }
  }

  // ── output ──
  const iterations = sheets.flatMap((s) => {
    const a = accessors.get(s.code);
    return a ? seriesForSheet(s.code, a.eqIds, a.acc) : [];
  });
  const cells: Record<string, RunCell> = {};
  for (const [id, p] of values) {
    const f = fieldById.get(id)!;
    if (f.dataType === 'json') continue;
    cells[id] = { worksheetCode: f.templateCode, symbol: f.symbol, dataType: f.dataType, value: scalarOfParameter(f.dataType, p), origin: origin.get(id) ?? 'entered' };
  }
  const mismatches: StoredMismatch[] = [];
  const notRecomputed: ScenarioRun['notRecomputed'] = [];
  for (const [id, stored] of Object.entries(baseline.stored)) {
    const f = fieldById.get(id);
    if (!f || (stored.sourceType !== 'derived' && stored.sourceType !== 'computed')) continue;
    if (!targeted.has(id)) { notRecomputed.push({ worksheetCode: f.templateCode, symbol: f.symbol }); continue; }
    if (overrides.length > 0) continue; // the consistency check is the Real run's job
    const a = scalarOfParameter(f.dataType, stored);
    const b = scalarOfParameter(f.dataType, values.get(id));
    const same = typeof a === 'number' && typeof b === 'number' ? numbersEqual(a, b) : a === b;
    if (!same) mismatches.push({ fieldId: id, worksheetCode: f.templateCode, symbol: f.symbol, stored: a, computed: b });
  }
  return { caseId: opts.caseId, converged, passes, values: cells, sheets: sheetRuns, iterations, mismatches, notRecomputed, skippedOverrides };
}
