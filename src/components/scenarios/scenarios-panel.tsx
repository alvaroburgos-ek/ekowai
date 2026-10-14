'use client';
/**
 * Project tab „Fälle" (spec §4.1): list, „Neuer Fall", duplicate, archive, report flag, overrides with the real value
 * beside the input and a required note, drift warnings, the project setting „Fälle aktiv".
 */
import { useState } from 'react';
import {
  listScenarios, createScenario, duplicateScenario, updateScenario, archiveScenario, setScenarioOverrides,
  removeScenarioOverride, setScenariosEnabled, searchOverridableFields,
} from '@/lib/actions/scenarios';
import { MAX_ACTIVE_SCENARIOS, type OverridableFieldHit, type ScenarioSummary } from '@/lib/scenarios/types';
import { formatScenarioValue } from '@/lib/scenarios/values';
import { SCENARIOS_UNAVAILABLE } from '@/lib/scenarios/missing-table';

const L = {
  de: {
    title: 'Fälle (Annahmen, nicht nachgewiesen)', enabled: 'Fälle aktiv', name: 'Name', reason: 'Grund', create: 'Neuer Fall',
    limit: `Höchstens ${MAX_ACTIVE_SCENARIOS} aktive Fälle — zuerst einen Fall archivieren.`, duplicate: 'Fall duplizieren', archive: 'Archivieren',
    report: 'im Bericht anzeigen', overrides: (n: number) => `${n} geänderte ${n === 1 ? 'Eingabe' : 'Eingaben'}`,
    drift: 'Realwert geändert', edit: 'Wert ändern', search: 'Feld suchen (Bezeichnung oder Symbol)', searchBtn: 'Suchen',
    real: 'Realwert', value: 'Fallwert', note: 'Notiz (Herkunft der Annahme)', apply: 'Übernehmen', remove: 'Entfernen',
    hint: 'Ein Fall ändert nur Eingabewerte. Er wird nie freigegeben und ändert weder Nachweis noch Freigaben.',
  },
  en: {
    title: 'Cases (assumptions, not verified)', enabled: 'Cases active', name: 'Name', reason: 'Reason', create: 'New case',
    limit: `At most ${MAX_ACTIVE_SCENARIOS} active cases — archive one first.`, duplicate: 'Duplicate case', archive: 'Archive',
    report: 'show in report', overrides: (n: number) => `${n} changed ${n === 1 ? 'input' : 'inputs'}`,
    drift: 'Real value changed', edit: 'Change value', search: 'Search field (label or symbol)', searchBtn: 'Search',
    real: 'Real value', value: 'Case value', note: 'Note (origin of the assumption)', apply: 'Apply', remove: 'Remove',
    hint: 'A case only changes input values. It is never approved and changes neither the verification nor approvals.',
  },
} as const;

type Initial = { available: boolean; enabled: boolean; scenarios: ScenarioSummary[] };

export function ScenariosPanel({ locale, projectId, initial, error = null }: { locale: 'de' | 'en'; projectId: string; initial: Initial; error?: string | null }) {
  const t = L[locale];
  const [state, setState] = useState<Initial>(initial);
  const [msg, setMsg] = useState<string | null>(error);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const reload = async () => {
    const r = await listScenarios(projectId);
    if (r.ok) setState({ available: r.available, enabled: r.enabled, scenarios: r.scenarios });
    else setMsg(r.error);
  };
  const run = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok) { setMsg(r.error ?? 'Fehler'); return false; }
    setMsg(null);
    await reload();
    return true;
  };

  if (!state.available) return <p className="text-sm text-subtext" role="status">{SCENARIOS_UNAVAILABLE[locale]}</p>;
  const atLimit = state.scenarios.length >= MAX_ACTIVE_SCENARIOS;

  return (
    <section className="space-y-6 max-w-4xl" data-testid="scenarios-panel">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-ink">{t.title}</h2>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state.enabled} onChange={(e) => void run(setScenariosEnabled(projectId, e.target.checked))} />
          {t.enabled}
        </label>
      </header>
      <p className="text-xs text-subtext">{t.hint}</p>
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      {state.enabled && (
        <>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await createScenario({ projectId, name, reason: reason || null });
              if (!r.ok) { setMsg(r.error); return; }
              setName(''); setReason(''); setMsg(null); setEditing(r.scenario.id);
              await reload();
            }}
          >
            <label className="text-sm flex flex-col">{t.name}<input aria-label={t.name} value={name} onChange={(e) => setName(e.target.value)} className="border border-hairline rounded px-2 py-1" /></label>
            <label className="text-sm flex flex-col">{t.reason}<input aria-label={t.reason} value={reason} onChange={(e) => setReason(e.target.value)} className="border border-hairline rounded px-2 py-1" /></label>
            <button type="submit" disabled={atLimit || !name.trim()} className="rounded-full border border-hairline px-3 py-1 text-sm">{t.create}</button>
            {atLimit && <span className="text-xs text-subtext">{t.limit}</span>}
          </form>
          <ul className="space-y-3">
            {state.scenarios.map((s) => (
              <li key={s.id} className="rounded-xl border border-hairline bg-paper p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span data-testid={`scenario-swatch-${s.id}`} aria-hidden className="inline-block w-5 h-1 rounded" style={{ background: `var(--scn-${s.slot})` }} />
                  <strong className="text-ink">{s.name}</strong>
                  {s.reason && <span className="text-sm text-subtext">— {s.reason}</span>}
                  <span className="text-xs text-subtext">{t.overrides(s.overrides.length)}</span>
                  <label className="ml-auto inline-flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={s.includeInReport} onChange={(e) => void run(updateScenario(s.id, { includeInReport: e.target.checked }))} />
                    {t.report}
                  </label>
                  <button type="button" className="text-xs underline" disabled={atLimit} onClick={() => void run(duplicateScenario(s.id))}>{t.duplicate}</button>
                  <button type="button" className="text-xs underline" onClick={() => void run(archiveScenario(s.id))}>{t.archive}</button>
                  <button type="button" className="text-xs underline" onClick={() => setEditing(editing === s.id ? null : s.id)}>{t.edit}</button>
                </div>
                <ul className="text-sm space-y-1">
                  {s.overrides.map((o) => (
                    <li key={o.fieldId} className="flex flex-wrap gap-2">
                      <span className="text-subtext">{o.worksheetCode}</span>
                      <span>{(locale === 'en' ? o.labelEn ?? o.labelDe : o.labelDe)} ({o.symbol})</span>
                      <span>= {formatScenarioValue(o.value, locale)}{o.unit ? ` ${o.unit}` : ''}</span>
                      <span className="text-subtext">({t.real} {formatScenarioValue(o.currentReal, locale)})</span>
                      {o.drift && <span className="text-amber-700">{`${t.drift}: ${formatScenarioValue(o.baseValueAtCreation, locale)} → ${formatScenarioValue(o.currentReal, locale)}`}</span>}
                      <span className="text-xs text-subtext">„{o.note}&rdquo;</span>
                      <button type="button" className="text-xs underline" onClick={() => void run(removeScenarioOverride(s.id, o.fieldId))}>{t.remove}</button>
                    </li>
                  ))}
                </ul>
                {editing === s.id && <OverrideEditor locale={locale} projectId={projectId} scenarioId={s.id} onDone={reload} onError={setMsg} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function OverrideEditor({ locale, projectId, scenarioId, onDone, onError }: {
  locale: 'de' | 'en'; projectId: string; scenarioId: string; onDone: () => Promise<void>; onError: (m: string | null) => void;
}) {
  const t = L[locale];
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<OverridableFieldHit[]>([]);
  const [pick, setPick] = useState<OverridableFieldHit | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="rounded-lg bg-paper-2/60 p-3 space-y-2">
      <div className="flex gap-2 items-end">
        <label className="text-sm flex flex-col grow">{t.search}
          <input aria-label={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="border border-hairline rounded px-2 py-1" />
        </label>
        <button type="button" className="rounded-full border border-hairline px-3 py-1 text-sm"
          onClick={async () => { const r = await searchOverridableFields(projectId, q); if (r.ok) setHits(r.fields); else onError(r.error); }}>
          {t.searchBtn}
        </button>
      </div>
      {!pick && (
        <ul className="text-sm">
          {hits.map((h) => (
            <li key={h.fieldId}>
              <button type="button" className="underline" onClick={() => { setPick(h); setValue(''); }}>
                {(locale === 'en' ? h.labelEn ?? h.labelDe : h.labelDe)} ({h.symbol}) · {h.worksheetCode}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pick && (
        <div className="space-y-2">
          <p className="text-sm">{(locale === 'en' ? pick.labelEn ?? pick.labelDe : pick.labelDe)} ({pick.symbol}) — {t.real}: {formatScenarioValue(pick.realValue, locale)}{pick.unit ? ` ${pick.unit}` : ''}</p>
          {pick.dataType === 'enum' && pick.enumValues ? (
            <select aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1">
              <option value="">—</option>
              {pick.enumValues.map((o) => <option key={o.value} value={o.value}>{(locale === 'en' ? o.label_en : o.label_de) ?? o.value}</option>)}
            </select>
          ) : pick.dataType === 'boolean' ? (
            <select aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1">
              <option value="">—</option><option value="true">{locale === 'en' ? 'Yes' : 'Ja'}</option><option value="false">{locale === 'en' ? 'No' : 'Nein'}</option>
            </select>
          ) : (
            <input aria-label={t.value} value={value} onChange={(e) => setValue(e.target.value)} className="border border-hairline rounded px-2 py-1" />
          )}
          <input aria-label={t.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} className="border border-hairline rounded px-2 py-1 w-full" />
          <button type="button" disabled={!value || !note.trim()} className="rounded-full border border-hairline px-3 py-1 text-sm"
            onClick={async () => {
              const r = await setScenarioOverrides(scenarioId, [{ fieldId: pick.fieldId, value, note }]);
              if (!r.ok) { onError(r.error); return; }
              onError(null); setPick(null); setValue(''); setNote(''); setHits([]); setQ('');
              await onDone();
            }}>
            {t.apply}
          </button>
        </div>
      )}
    </div>
  );
}
