/** Pure assembly of what the sheet shows when „Fälle anzeigen" is on (spec §4.2–4.4). Client-safe. */
import { fmtNum } from './format';
import { formatScenarioValue, numbersEqual } from './values';
import type { IterationSeries, ScenarioResultsPayload, ScenarioRun } from './types';
import type { ChartSeries } from '@/components/scenarios/chart-geometry';

/** `materialised`: the equation did not run in this case, the value is the tool's server materialisation (mirror), e.g. A_S,m by geometry. */
export type SheetCell = { kind: 'value' | 'missing' | 'hidden'; text: string; mismatch?: boolean; carried?: boolean; materialised?: boolean };
export type SheetView = {
  columns: Array<{ id: string; label: string; slot: number }>;
  rows: Array<{ key: string; label: string; cells: SheetCell[] }>;
  compliance: Array<{ code: string; title: string; cells: Array<'pass' | 'fail' | 'none'> }>;
  badges: Array<{ caseLabel: string; slot: number; label: string; caseValue: string; realValue: string }>;
  charts: Array<{ kind: string; title: string; unit: string; series: ChartSeries[] }>;
  stepOptions: Array<{ id: string; label: string; series: IterationSeries }>;
  warnings: string[];
};

const TXT = {
  de: { hidden: '– (ausgeblendet)', missing: 'nicht berechnet: fehlt', unstable: 'Rechnung nicht stabil — Ergebnis vorläufig', provisional: '(vorläufig)', mismatch: 'gespeicherter Wert weicht ab', carried: 'Realwert übernommen — im Fall nicht nachgerechnet', skipped: 'Annahme nicht angewendet', failed: 'Fall konnte nicht gerechnet werden — Real und die anderen Fälle sind nicht betroffen', failedCell: 'nicht berechnet: Fehler im Fall', governing: 'maßgebend',
    floodQs: (real: string, cas: string) => `Q_S (Überflutung) ist ein eingegebener Realwert ${real} l/s – im Fall nicht übernommen; Fall-Q_S ${cas} l/s` },
  en: { hidden: '– (hidden)', missing: 'not computed: missing', unstable: 'calculation did not settle — result provisional', provisional: '(provisional)', mismatch: 'stored value differs', carried: 'real value carried — not recomputed in the case', skipped: 'assumption not applied', failed: 'case could not be computed — Real and the other cases are unaffected', failedCell: 'not computed: error in the case', governing: 'governing',
    floodQs: (real: string, cas: string) => `Q_S (flood check) is an entered real value ${real} l/s – not taken over in the case; case Q_S ${cas} l/s` },
} as const;
/** Flood check sheet (Gl. 10) and the sheets whose Q_S a case recomputes upstream (later sheet first). */
const FLOOD_SHEET = 'A138-26';
const UPSTREAM_QS_SHEETS = ['A138-24', 'A138-12'];
const cellOf = (run: ScenarioRun, sheet: string, sym: string) => Object.values(run.values).find((c) => c.worksheetCode === sheet && c.symbol === sym);
const numOf = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
/** Final review A3-M6: the flood check's governing return period is the run's own T_n_Ue, 30 a when empty. */
const floodT = (run: ScenarioRun): number => numOf(cellOf(run, FLOOD_SHEET, 'T_n_Ue')?.value) ?? 30;
const floodSeries = (run: ScenarioRun, code: string, T: number) =>
  run.iterations.find((it) => it.kind === 'gl10' && it.worksheetCode === code && it.returnPeriod === T);

const TITLES: Record<string, string> = { gl8: 'Gl. 8 — V_VA', gl10: 'Gl. 10 — V_Rück', gl16: 'Gl. 16 — A_S,m' };

export function buildSheetView(payload: ScenarioResultsPayload, code: string, locale: 'de' | 'en'): SheetView {
  const t = TXT[locale];
  const runs: Array<{ id: string; label: string; slot: number; run: ScenarioRun; failed: boolean }> = [];
  if (payload.real) runs.push({ id: 'real', label: 'Real', slot: 0, run: payload.real, failed: false });
  for (const c of payload.cases) runs.push({ id: c.scenario.id, label: c.scenario.name, slot: c.scenario.slot, run: c.run, failed: c.error != null });
  const realRun = payload.real;
  // Spec Review Focus 5: a run that did not settle never shows a number that looks final.
  const num = (x: number, run: ScenarioRun) => run.converged ? fmtNum(x, locale) : `${fmtNum(x, locale)} ${t.provisional}`;

  const rows: SheetView['rows'] = [];
  const eqs = realRun?.sheets[code]?.equations ?? [];
  const eqOutputs = new Set<string>();
  // A3-M6: on the flood check the Gl. 10 headline follows T_n_Ue (the engine row reads the T = 30 a column, F-A7).
  const floodOut = code === FLOOD_SHEET ? runs.flatMap(({ run }) => run.iterations).find((it) => it.kind === 'gl10' && it.worksheetCode === code)?.outputSymbol ?? null : null;
  const realT = realRun ? floodT(realRun) : 30;
  const floodCell = (run: ScenarioRun, T: number): SheetCell | null => {
    const it = floodSeries(run, code, T);
    if (!it || it.governingValue == null) return null;
    return { kind: 'value', text: num(it.floorAtZero ? Math.max(0, it.governingValue) : it.governingValue, run) };
  };
  for (const e of eqs) {
    if (!e.outputSymbol) continue;
    const out = e.outputSymbol;
    eqOutputs.add(out);
    const head = out === floodOut;
    rows.push({
      key: `eq:${e.equationId}`,
      label: head ? `Gl. ${e.equationNumber} · ${out} (${t.governing}: T = ${realT} a)` : `Gl. ${e.equationNumber} · ${out}`,
      cells: runs.map(({ run, failed }): SheetCell => {
        if (failed) return { kind: 'missing', text: t.failedCell };
        const sh = run.sheets[code];
        const st = sh?.equations.find((x) => x.equationId === e.equationId)?.state;
        if (sh?.hiddenSymbols.includes(out)) return { kind: 'hidden', text: t.hidden };
        if (head) {
          const T = floodT(run);
          const fc = floodCell(run, T);
          if (fc) return T === realT ? fc : { ...fc, text: `${fc.text} (T = ${T} a)` };
        }
        if (!st) return { kind: 'missing', text: '—' };
        if (st.kind === 'computed') return { kind: 'value', text: num(st.value, run) };
        // The equation is suppressed/not computed here, but the tool materialised the symbol (e.g. A_S,m by geometry/soil):
        // show the value the case actually uses, never „nicht berechnet" (final review A1-I1).
        const mat = Object.values(run.values).find((x) => x.worksheetCode === code && x.symbol === out && x.origin === 'computed');
        if (mat && typeof mat.value === 'number' && Number.isFinite(mat.value)) return { kind: 'value', text: num(mat.value, run), materialised: true };
        if (st.kind === 'manual_required') return { kind: 'missing', text: st.missing?.length ? `${t.missing} ${st.missing.join(', ')}` : st.reason };
        return { kind: 'missing', text: st.message };
      }),
    });
  }
  // A3-M6: both flood series as rows, the one matching T_n_Ue marked governing.
  if (floodOut) {
    for (const T of [30, 100]) {
      rows.push({
        key: `gl10:T${T}`,
        label: `Gl. 10 · ${floodOut} · T = ${T} a${T === realT ? ` (${t.governing})` : ''}`,
        cells: runs.map(({ run, failed }): SheetCell => {
          if (failed) return { kind: 'missing', text: t.failedCell };
          if (run.sheets[code]?.hiddenSymbols.includes(floodOut)) return { kind: 'hidden', text: t.hidden };
          return floodCell(run, T) ?? { kind: 'missing', text: '—' };
        }),
      });
    }
  }
  // Server-materialised / carried values of this sheet (no equation output), e.g. V_M, k_i_Mulde.
  const extra = new Set<string>();
  for (const { run } of runs) for (const c of Object.values(run.values)) {
    if (c.worksheetCode === code && (c.origin === 'computed' || c.origin === 'carried') && !eqOutputs.has(c.symbol)) extra.add(c.symbol);
  }
  for (const sym of [...extra].sort()) {
    rows.push({
      key: `field:${sym}`, label: sym,
      cells: runs.map(({ id, run, failed }): SheetCell => {
        if (failed) return { kind: 'missing', text: t.failedCell };
        const c = Object.values(run.values).find((x) => x.worksheetCode === code && x.symbol === sym);
        if (run.sheets[code]?.hiddenSymbols.includes(sym)) return { kind: 'hidden', text: t.hidden };
        if (!c || c.value == null) return { kind: 'missing', text: '—' };
        const text = typeof c.value === 'number' ? num(c.value, run) : String(c.value);
        return {
          kind: 'value', text,
          ...(c.origin === 'carried' && id !== 'real' ? { carried: true } : {}),
          ...(id === 'real' && run.mismatches.some((m) => m.worksheetCode === code && m.symbol === sym) ? { mismatch: true } : {}),
        };
      }),
    });
  }

  const compliance = (realRun?.sheets[code]?.compliance ?? []).map((c) => ({
    code: c.code, title: c.titleDe,
    cells: runs.map(({ run }) => {
      const k = run.sheets[code]?.compliance.find((x) => x.code === c.code)?.result.kind;
      return k === 'pass' ? 'pass' as const : k === 'fail' ? 'fail' as const : 'none' as const;
    }),
  }));

  const badges = payload.cases.flatMap((c) => c.scenario.overrides
    .filter((o) => o.worksheetCode === code)
    .map((o) => ({
      caseLabel: c.scenario.name, slot: c.scenario.slot,
      label: `${locale === 'en' ? o.labelEn ?? o.labelDe : o.labelDe} (${o.symbol})`,
      caseValue: formatScenarioValue(o.value, locale), realValue: formatScenarioValue(o.currentReal, locale),
    })));

  const byKind = new Map<string, ChartSeries[]>();
  const stepOptions: SheetView['stepOptions'] = [];
  const unitByKind = new Map<string, string>();
  for (const { id, label, slot, run } of runs) {
    for (const it of run.iterations.filter((x) => x.worksheetCode === code)) {
      const base = it.kind === 'gl10'
        ? `${label} · T = ${it.returnPeriod} a${it.returnPeriod === floodT(run) ? ` (${t.governing})` : ''}`
        : label;
      const name = run.converged ? base : `${base} ${t.provisional}`;
      const s: ChartSeries = {
        id: `${id}:${it.key}`, label: name, slot, dashed: it.key.endsWith(':T100'),
        points: it.perDuration.map((p) => ({ D: p.D, r_D: p.r_D, value: it.floorAtZero ? Math.max(0, p.value) : p.value })),
        governingIndex: it.governingD == null ? null : it.perDuration.findIndex((p) => p.D === it.governingD),
        boundaryLimited: it.boundaryLimited,
      };
      byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), s]);
      unitByKind.set(it.kind, it.unit);
      stepOptions.push({ id: s.id, label: name, series: it });
    }
  }
  const charts = [...byKind.entries()].map(([kind, series]) => ({ kind, title: TITLES[kind] ?? kind, unit: unitByKind.get(kind) ?? '', series }));

  const warnings: string[] = [];
  for (const { id, label, run, failed } of runs) {
    if (failed) { warnings.push(`${label}: ${t.failed}`); continue; }
    if (!run.converged) warnings.push(`${label}: ${t.unstable}`);
    const carried = run.notRecomputed.filter((n) => n.worksheetCode === code);
    if (carried.length > 0 && id !== 'real') warnings.push(`${label}: ${t.carried} — ${carried.map((n) => n.symbol).join(', ')}`);
  }
  // Review Focus 1 / A1-I2: a dropped assumption changes every sheet of the case — list it on each sheet, with its reason.
  for (const c of payload.cases) {
    for (const s of c.run.skippedOverrides) {
      const o = c.scenario.overrides.find((x) => x.fieldId === s.fieldId);
      const name = o ? `${locale === 'en' ? o.labelEn ?? o.labelDe : o.labelDe} (${o.symbol})` : s.fieldId;
      warnings.push(`${c.scenario.name}: ${t.skipped} — ${name}: ${locale === 'en' ? s.reasonEn : s.reason}`);
    }
  }
  // A3-I1: the flood check's Q_S is an entered record value a case does not change — say so when the case's upstream
  // Q_S differs (display only; the calculation is untouched).
  if (code === FLOOD_SHEET) {
    for (const c of payload.cases) {
      if (c.error != null) continue;
      const entered = cellOf(c.run, FLOOD_SHEET, 'Q_S') ?? cellOf(c.run, FLOOD_SHEET, 'Q_S_flood');
      const realQs = entered?.origin === 'entered' ? numOf(entered.value) : null;
      const upstream = UPSTREAM_QS_SHEETS.map((sh) => numOf(cellOf(c.run, sh, 'Q_S')?.value)).find((x) => x != null) ?? null;
      if (realQs != null && upstream != null && !numbersEqual(realQs, upstream)) {
        warnings.push(`${c.scenario.name}: ${t.floodQs(fmtNum(realQs, locale), fmtNum(upstream, locale))}`);
      }
    }
  }
  for (const m of realRun?.mismatches.filter((x) => x.worksheetCode === code) ?? []) warnings.push(`Real: ${t.mismatch} — ${m.symbol}`);

  return { columns: runs.map(({ id, label, slot }) => ({ id, label, slot })), rows, compliance, badges, charts, stepOptions, warnings };
}
