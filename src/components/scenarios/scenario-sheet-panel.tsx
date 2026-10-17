'use client';
/** Sheet header switch „Fälle anzeigen" (spec §4.2). Off ⇒ renders only the switch; the form below is unchanged. */
import { useState } from 'react';
import { getScenarioResults } from '@/lib/actions/scenarios';
import { buildSheetView, type SheetView } from '@/lib/scenarios/sheet-view';
import { seriesColor } from './chart-geometry';
import { ScenarioIterationChart } from './scenario-iteration-chart';
import { ScenarioStepThrough } from './scenario-step-through';

const L = {
  de: { show: 'Fälle anzeigen', loading: 'Fälle werden gerechnet …', result: 'Ergebnis', checks: 'Anforderung', inCase: 'im Fall', real: 'Real',
    disclaimer: 'Fälle beruhen auf angenommenen Eingangswerten. Sie sind nicht Teil des Nachweises und nicht freigegeben.', mismatch: 'gespeicherter Wert weicht ab', carried: 'Realwert übernommen — im Fall nicht nachgerechnet',
    materialised: 'vom Werkzeug berechnet (wie beim Speichern) — die Gleichung selbst läuft in diesem Fall nicht', materialisedMark: ' (W)',
    failed: 'Die Fälle konnten nicht gerechnet werden. Bitte später erneut versuchen.' },
  en: { show: 'Show cases', loading: 'Computing cases …', result: 'Result', checks: 'Requirement', inCase: 'in case', real: 'Real',
    disclaimer: 'Cases rest on assumed input values. They are not part of the verification and not approved.', mismatch: 'stored value differs', carried: 'real value carried — not recomputed in the case',
    materialised: 'computed by the tool (as on save) — the equation itself does not run in this case', materialisedMark: ' (T)',
    failed: 'The cases could not be computed. Please try again later.' },
} as const;
const VERDICT = { pass: '✓', fail: '✗', none: '–' } as const;

export function ScenarioSheetPanel({ locale, projectId, standardCode, worksheetCode }: { locale: 'de' | 'en'; projectId: string; standardCode: string; worksheetCode: string }) {
  const t = L[locale];
  const [on, setOn] = useState(false);
  const [view, setView] = useState<SheetView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !on;
    setOn(next);
    if (!next) return;
    setBusy(true); setErr(null);
    try {
      const r = await getScenarioResults(projectId, standardCode);
      if (!r.ok) { setErr(r.error); return; }
      setView(buildSheetView(r, worksheetCode, locale));
    } catch {
      setErr(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 space-y-3" data-testid="scenario-sheet-panel">
      <button type="button" aria-pressed={on} onClick={() => void toggle()} className="rounded-full border border-hairline px-3 py-1 text-xs font-medium">{t.show}</button>
      {on && busy && <p className="text-xs text-subtext">{t.loading}</p>}
      {on && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      {on && view && !busy && !err && (
        <div className="space-y-4 rounded-2xl border border-hairline bg-paper p-4">
          <p className="text-xs text-subtext">{t.disclaimer}</p>
          {view.warnings.length > 0 && <ul className="text-xs text-amber-700">{view.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          {view.badges.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {view.badges.map((b) => (
                <li key={`${b.caseLabel}:${b.label}`} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-xs">
                  <span aria-hidden className="inline-block w-3 h-1 rounded" style={{ background: seriesColor(b.slot) }} />
                  {`${t.inCase} ${b.caseLabel}: ${b.label} = ${b.caseValue} (${t.real} ${b.realValue})`}
                </li>
              ))}
            </ul>
          )}
          {view.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead><tr>
                  <th className="text-left">{t.result}</th>
                  {view.columns.map((c) => (
                    <th key={c.id} className="text-right">
                      <span aria-hidden className="inline-block w-3 h-1 rounded mr-1 align-middle" style={{ background: seriesColor(c.slot) }} />{c.label}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {view.rows.map((r) => (
                    <tr key={r.key} className="border-t border-hairline">
                      <td>{r.label}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className={`text-right ${c.kind !== 'value' ? 'text-subtext' : ''}`}
                          title={c.mismatch ? t.mismatch : c.carried ? t.carried : c.materialised ? t.materialised : undefined}>
                          {c.text}{c.mismatch ? ' ⚠' : ''}{c.carried ? ' (R)' : ''}{c.materialised ? t.materialisedMark : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {view.compliance.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr><th className="text-left">{t.checks}</th>{view.columns.map((c) => <th key={c.id} className="text-center">{c.label}</th>)}</tr></thead>
              <tbody>{view.compliance.map((c) => (
                <tr key={c.code} className="border-t border-hairline">
                  <td>{c.code}</td>
                  {c.cells.map((v, i) => <td key={i} className="text-center" aria-label={v}>{VERDICT[v]}</td>)}
                </tr>
              ))}</tbody>
            </table>
          )}
          {view.charts.map((ch) => <ScenarioIterationChart key={ch.kind} locale={locale} title={ch.title} unit={ch.unit} series={ch.series} />)}
          {view.stepOptions.length > 0 && <ScenarioStepThrough locale={locale} options={view.stepOptions} />}
        </div>
      )}
    </section>
  );
}
