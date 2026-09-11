'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import {
  normalizeMitigationCarrier,
  newPlan,
  newMeasure,
  summarizeMitigationPlan,
  MEASURE_TYPES,
  MEASURE_TYPE_LABELS,
  RISK_GROUP_LABELS,
  type Measure,
  type RiskMeasurePlan,
  type MitigationPlanCarrier,
} from '@/lib/eval/mitigation-plan';

type Props = { fieldId: string; readOnly?: boolean };

const inputCls =
  'block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60';
const labelCls = 'block text-[10px] uppercase tracking-[0.18em] text-subtext mb-0.5';

export function MitigationPlanEditor({ fieldId, readOnly = false }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<MitigationPlanCarrier>(
    () => normalizeMitigationCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  function write(plans: RiskMeasurePlan[]) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: { plans } });
  }
  function addPlan() {
    write([...carrier.plans, newPlan()]);
  }
  function updatePlan(id: string, patch: Partial<RiskMeasurePlan>) {
    write(carrier.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePlan(id: string) {
    write(carrier.plans.filter((p) => p.id !== id));
  }
  function addMeasure(planId: string) {
    write(carrier.plans.map((p) => (p.id === planId ? { ...p, measures: [...p.measures, newMeasure()] } : p)));
  }
  function updateMeasure(planId: string, mId: string, patch: Partial<Measure>) {
    write(
      carrier.plans.map((p) =>
        p.id === planId ? { ...p, measures: p.measures.map((m) => (m.id === mId ? { ...m, ...patch } : m)) } : p,
      ),
    );
  }
  function removeMeasure(planId: string, mId: string) {
    write(carrier.plans.map((p) => (p.id === planId ? { ...p, measures: p.measures.filter((m) => m.id !== mId) } : p)));
  }

  const summary = useMemo(() => summarizeMitigationPlan(carrier), [carrier]);

  return (
    <div className="space-y-3" data-testid="mitigation-plan-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">Risiko-Maßnahmenplan (je Risiko ein Plan)</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">
            Anhang A · Tab. A.2 · Maßnahmen: Technische (T) / Organisatorische (O) / Personelle (P)
          </div>
        </div>
        <button
          type="button"
          onClick={addPlan}
          disabled={readOnly}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-50"
        >
          + Risiko-Maßnahmenplan
        </button>
      </div>

      {carrier.plans.length === 0 ? (
        <p className="text-xs text-subtext italic">
          Noch kein Maßnahmenplan erfasst. Je (wesentlichem) Risiko einen Plan anlegen: Risiko,
          Risikokategorie, Wert, Schäden, Gefährdungsbilder sowie die Maßnahmen (T/O/P) mit
          Verantwortung, Durchführung und Überwachung (Tab. A.2, S. 46).
        </p>
      ) : (
        <div className="space-y-3">
          {carrier.plans.map((p) => (
            <div key={p.id} data-testid="mitigation-plan-card" className="rounded border border-hairline p-3 space-y-2">
              {/* Header: Risiko + Kategorie + Wert */}
              <div className="flex items-start gap-2">
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Risiko</label>
                    <input
                      type="text"
                      value={p.risiko}
                      disabled={readOnly}
                      aria-label="Risiko"
                      onChange={(e) => updatePlan(p.id, { risiko: e.target.value })}
                      placeholder="z. B. Altlasten / Schadstoffe"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <div>
                      <label className={labelCls}>Risikokategorie / -bereich</label>
                      <select
                        value={p.risikokategorie}
                        disabled={readOnly}
                        aria-label="Risikokategorie / -bereich"
                        onChange={(e) => updatePlan(p.id, { risikokategorie: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">— wählen —</option>
                        {RISK_GROUP_LABELS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Wert</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={p.wert == null ? '' : p.wert}
                        disabled={readOnly}
                        aria-label="Wert (Risiko)"
                        onChange={(e) => updatePlan(p.id, { wert: e.target.value === '' ? null : Number(e.target.value) })}
                        className={`${inputCls} text-right tabular-nums`}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePlan(p.id)}
                  disabled={readOnly}
                  aria-label="Maßnahmenplan entfernen"
                  className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40 shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Schäden</label>
                  <input
                    type="text"
                    value={p.schaeden}
                    disabled={readOnly}
                    aria-label="Schäden"
                    onChange={(e) => updatePlan(p.id, { schaeden: e.target.value })}
                    placeholder="z. B. Mehrkosten, Bauverzögerung"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bemerkung / Bearbeitungsstand</label>
                  <input
                    type="text"
                    value={p.bemerkung}
                    disabled={readOnly}
                    aria-label="Bemerkung / Bearbeitungsstand"
                    onChange={(e) => updatePlan(p.id, { bemerkung: e.target.value })}
                    placeholder="z. B. zu 50 % erledigt"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Gefährdungsbilder</label>
                <textarea
                  rows={2}
                  value={p.gefaehrdungsbilder}
                  disabled={readOnly}
                  aria-label="Gefährdungsbilder"
                  onChange={(e) => updatePlan(p.id, { gefaehrdungsbilder: e.target.value })}
                  placeholder="Gefährdungsszenarien beschreiben"
                  className={`${inputCls} resize-y`}
                />
              </div>

              {/* Measures table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
                    <tr>
                      <th className="text-left font-normal pb-1 pr-2 w-24">Typ</th>
                      <th className="text-left font-normal pb-1 pr-2">Maßnahme</th>
                      <th className="text-left font-normal pb-1 pr-2 w-28">Verantwortung</th>
                      <th className="text-left font-normal pb-1 pr-2 w-28">Durchführen</th>
                      <th className="text-left font-normal pb-1 pr-2 w-28">Überwachung</th>
                      <th aria-hidden="true" className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.measures.map((m) => (
                      <tr key={m.id} className="border-t border-hairline align-top">
                        <td className="py-1 pr-2">
                          <select
                            value={m.type ?? ''}
                            disabled={readOnly}
                            aria-label="Maßnahmen-Typ"
                            title="Technische (T) / Organisatorische (O) / Personelle (P) Maßnahme"
                            onChange={(e) => updateMeasure(p.id, m.id, { type: (e.target.value || null) as Measure['type'] })}
                            className={inputCls}
                          >
                            <option value="">—</option>
                            {MEASURE_TYPES.map((t) => (
                              <option key={t} value={t}>{t} — {MEASURE_TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="text"
                            value={m.text}
                            disabled={readOnly}
                            aria-label="Maßnahme"
                            onChange={(e) => updateMeasure(p.id, m.id, { text: e.target.value })}
                            placeholder="Präventions-/Korrekturmaßnahme"
                            className={inputCls}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="text" value={m.verantwortung} disabled={readOnly} aria-label="Verantwortung"
                            onChange={(e) => updateMeasure(p.id, m.id, { verantwortung: e.target.value })} className={inputCls} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="text" value={m.durchfuehren} disabled={readOnly} aria-label="Durchführen"
                            onChange={(e) => updateMeasure(p.id, m.id, { durchfuehren: e.target.value })} className={inputCls} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="text" value={m.ueberwachung} disabled={readOnly} aria-label="Überwachung"
                            onChange={(e) => updateMeasure(p.id, m.id, { ueberwachung: e.target.value })} className={inputCls} />
                        </td>
                        <td className="py-1 pl-1 text-right">
                          <button type="button" onClick={() => removeMeasure(p.id, m.id)} disabled={readOnly}
                            aria-label="Maßnahme entfernen" className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => addMeasure(p.id)}
                disabled={readOnly}
                className="text-xs px-2.5 py-1 rounded border border-hairline hover:bg-paper-2 text-ink disabled:opacity-50"
              >
                + Maßnahme
              </button>
            </div>
          ))}

          {/* Derived footer — never hand-entered. */}
          <div className="text-[11px] text-subtext border-t border-hairline-strong pt-2">
            <span className="font-mono">{summary.planCount}</span> Maßnahmenpläne ·{' '}
            <span className="font-mono">{summary.measureCount}</span> Maßnahmen
            {' '}(T <span className="font-mono">{summary.byType.T}</span> · O{' '}
            <span className="font-mono">{summary.byType.O}</span> · P{' '}
            <span className="font-mono">{summary.byType.P}</span>)
            {summary.plansWithoutMeasure > 0 ? (
              <span className="text-warning"> · <span className="font-mono">{summary.plansWithoutMeasure}</span> ohne Maßnahme</span>
            ) : null}
            {summary.measuresWithoutOwner > 0 ? (
              <span className="text-warning"> · <span className="font-mono">{summary.measuresWithoutOwner}</span> ohne Verantwortung</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
