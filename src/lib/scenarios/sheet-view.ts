/** Pure assembly of what the sheet shows when „Fälle anzeigen" is on (spec §4.2–4.4). Client-safe. */
import { fmtNum } from './format';
import { formatScenarioValue } from './values';
import type { IterationSeries, ScenarioResultsPayload, ScenarioRun } from './types';
import type { ChartSeries } from '@/components/scenarios/chart-geometry';

export type SheetCell = { kind: 'value' | 'missing' | 'hidden'; text: string; mismatch?: boolean; carried?: boolean };
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
  de: { hidden: '– (ausgeblendet)', missing: 'nicht berechnet: fehlt', unstable: 'Rechnung nicht stabil — Ergebnis vorläufig', provisional: '(vorläufig)', mismatch: 'gespeicherter Wert weicht ab', carried: 'Realwert übernommen — im Fall nicht nachgerechnet' },
  en: { hidden: '– (hidden)', missing: 'not computed: missing', unstable: 'calculation did not settle — result provisional', provisional: '(provisional)', mismatch: 'stored value differs', carried: 'real value carried — not recomputed in the case' },
} as const;
const TITLES: Record<string, string> = { gl8: 'Gl. 8 — V_VA', gl10: 'Gl. 10 — V_Rück', gl16: 'Gl. 16 — A_S,m' };

export function buildSheetView(payload: ScenarioResultsPayload, code: string, locale: 'de' | 'en'): SheetView {
  const t = TXT[locale];
  const runs: Array<{ id: string; label: string; slot: number; run: ScenarioRun }> = [];
  if (payload.real) runs.push({ id: 'real', label: 'Real', slot: 0, run: payload.real });
  for (const c of payload.cases) runs.push({ id: c.scenario.id, label: c.scenario.name, slot: c.scenario.slot, run: c.run });
  const realRun = payload.real;
  // Spec Review Focus 5: a run that did not settle never shows a number that looks final.
  const num = (x: number, run: ScenarioRun) => run.converged ? fmtNum(x, locale) : `${fmtNum(x, locale)} ${t.provisional}`;

  const rows: SheetView['rows'] = [];
  const eqs = realRun?.sheets[code]?.equations ?? [];
  const eqOutputs = new Set<string>();
  for (const e of eqs) {
    if (!e.outputSymbol) continue;
    const out = e.outputSymbol;
    eqOutputs.add(out);
    rows.push({
      key: `eq:${e.equationId}`,
      label: `Gl. ${e.equationNumber} · ${out}`,
      cells: runs.map(({ run }): SheetCell => {
        const sh = run.sheets[code];
        const st = sh?.equations.find((x) => x.equationId === e.equationId)?.state;
        if (sh?.hiddenSymbols.includes(out)) return { kind: 'hidden', text: t.hidden };
        if (!st) return { kind: 'missing', text: '—' };
        if (st.kind === 'computed') return { kind: 'value', text: num(st.value, run) };
        if (st.kind === 'manual_required') return { kind: 'missing', text: st.missing?.length ? `${t.missing} ${st.missing.join(', ')}` : st.reason };
        return { kind: 'missing', text: st.message };
      }),
    });
  }
  // Server-materialised / carried values of this sheet (no equation output), e.g. V_M, k_i_Mulde.
  const extra = new Set<string>();
  for (const { run } of runs) for (const c of Object.values(run.values)) {
    if (c.worksheetCode === code && (c.origin === 'computed' || c.origin === 'carried') && !eqOutputs.has(c.symbol)) extra.add(c.symbol);
  }
  for (const sym of [...extra].sort()) {
    rows.push({
      key: `field:${sym}`, label: sym,
      cells: runs.map(({ id, run }): SheetCell => {
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
      const base = it.kind === 'gl10' ? `${label} · T = ${it.returnPeriod} a` : label;
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
  for (const { id, label, run } of runs) {
    if (!run.converged) warnings.push(`${label}: ${t.unstable}`);
    const carried = run.notRecomputed.filter((n) => n.worksheetCode === code);
    if (carried.length > 0 && id !== 'real') warnings.push(`${label}: ${t.carried} — ${carried.map((n) => n.symbol).join(', ')}`);
  }
  for (const m of realRun?.mismatches.filter((x) => x.worksheetCode === code) ?? []) warnings.push(`Real: ${t.mismatch} — ${m.symbol}`);

  return { columns: runs.map(({ id, label, slot }) => ({ id, label, slot })), rows, compliance, badges, charts, stepOptions, warnings };
}
