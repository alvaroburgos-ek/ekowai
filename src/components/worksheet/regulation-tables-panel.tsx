'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Table2 } from 'lucide-react';
import type { RegulationTable } from '@/lib/db/queries/regulation-tables';

/**
 * Shows the guideline's own printed tables next to the form.
 *
 * DWA-A 138-1's Tabelle 9 is picked from a list and fills its coefficients in.
 * Every other standard's tables were imported and then never surfaced, so an
 * engineer had to already know a limit or open the PDF to find it. This panel
 * puts them on the worksheet, with the clause and the printed sentence behind
 * each value, so a number can be read where it is needed and checked against
 * its source without leaving the Wizard.
 *
 * It is deliberately read-only. Selecting a row to fill a field needs a
 * field-to-table mapping that does not exist yet; inventing one per field would
 * be guessing which printed cell a field means.
 */

type Props = {
  tables: RegulationTable[];
  locale: 'de' | 'en';
};

const T = {
  de: {
    heading: 'Tabellen der Richtlinie',
    subtitle: (n: number) =>
      `${n} gedruckte ${n === 1 ? 'Tabelle' : 'Tabellen'} aus der Richtlinie — Werte zum Nachschlagen`,
    search: 'Tabellen durchsuchen …',
    none: 'Für diese Richtlinie sind keine Tabellen erfasst.',
    noMatch: 'Kein Treffer.',
    parameter: 'Parameter',
    value: 'Wert',
    unit: 'Einheit',
    readOnly: 'Nachschlagewerte. Übernahme in ein Feld ist noch nicht verdrahtet.',
  },
  en: {
    heading: 'Guideline tables',
    subtitle: (n: number) =>
      `${n} printed ${n === 1 ? 'table' : 'tables'} from the guideline — values to look up`,
    search: 'Search tables …',
    none: 'No tables are recorded for this guideline.',
    noMatch: 'No match.',
    parameter: 'Parameter',
    value: 'Value',
    unit: 'Unit',
    readOnly: 'Look-up values. Filling a field from a row is not wired yet.',
  },
} as const;

function cellValue(r: RegulationTable['rows'][number]): string {
  // A printed cell can be a number, a text ("not permitted"), or a bounded
  // value whose comparison operator carries half its meaning ("≤ 150").
  const num = r.valueNumeric != null && r.valueNumeric !== '' ? r.valueNumeric : null;
  const body = num ?? r.valueText ?? '—';
  return r.comparison && body !== '—' ? `${r.comparison} ${body}` : body;
}

export function RegulationTablesPanel({ tables, locale }: Props) {
  const t = T[locale];
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables
      .map((tb) => ({
        ...tb,
        rows: tb.rows.filter((r) =>
          [r.parameterLabel, r.parameterSymbol, r.variantValue, r.valueText, r.unit]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        ),
      }))
      .filter((tb) => tb.rows.length > 0 || tb.tableName.toLowerCase().includes(q));
  }, [tables, query]);

  if (tables.length === 0) {
    return (
      <section className="rounded-lg border border-ink/10 bg-white p-3 text-sm">
        <h3 className="flex items-center gap-1.5 font-medium">
          <Table2 className="size-4" aria-hidden />
          {t.heading}
        </h3>
        <p className="mt-1 text-ink/60">{t.none}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-3 text-sm">
      <h3 className="flex items-center gap-1.5 font-medium">
        <Table2 className="size-4" aria-hidden />
        {t.heading}
      </h3>
      <p className="mt-0.5 text-xs text-ink/60">{t.subtitle(tables.length)}</p>

      <label className="sr-only" htmlFor="regtable-search">
        {t.search}
      </label>
      <input
        id="regtable-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search}
        className="mt-2 w-full rounded border border-ink/15 px-2 py-1 text-sm"
      />

      {filtered.length === 0 ? (
        <p className="mt-2 text-ink/60">{t.noMatch}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {filtered.map((tb) => {
            const open = openId === tb.tableId;
            return (
              <li key={tb.tableId} className="rounded border border-ink/10">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : tb.tableId)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-1.5 px-2 py-1.5 text-left hover:bg-ink/[0.03]"
                >
                  <ChevronDown
                    className={`mt-0.5 size-3.5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{tb.tableName}</span>
                    {tb.clauseReference ? (
                      <span className="text-xs text-ink/50">{tb.clauseReference}</span>
                    ) : null}
                  </span>
                </button>

                {open ? (
                  <div className="overflow-x-auto border-t border-ink/10 px-2 py-1.5">
                    <table className="w-full min-w-[22rem] border-collapse text-xs">
                      <thead>
                        <tr className="text-left text-ink/60">
                          <th className="py-1 pr-2 font-normal">{t.parameter}</th>
                          {tb.variantDimension ? (
                            <th className="py-1 pr-2 font-normal">{tb.variantDimension}</th>
                          ) : null}
                          <th className="py-1 pr-2 text-right font-normal">{t.value}</th>
                          <th className="py-1 font-normal">{t.unit}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tb.rows.map((r) => (
                          <tr key={r.id} className="border-t border-ink/5 align-top">
                            <td className="py-1 pr-2">
                              {r.parameterLabel ?? r.parameterSymbol ?? '—'}
                              {r.sourceQuote ? (
                                <span
                                  title={r.sourceQuote}
                                  className="ml-1 cursor-help text-ink/40"
                                  aria-label={r.sourceQuote}
                                >
                                  ⓘ
                                </span>
                              ) : null}
                            </td>
                            {tb.variantDimension ? (
                              <td className="py-1 pr-2 text-ink/70">{r.variantValue ?? '—'}</td>
                            ) : null}
                            <td className="py-1 pr-2 text-right tabular-nums">{cellValue(r)}</td>
                            <td className="py-1 text-ink/70">{r.unit ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-1.5 text-[11px] text-ink/45">{t.readOnly}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
