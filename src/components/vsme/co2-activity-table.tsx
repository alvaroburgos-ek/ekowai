'use client';

import type { JSX } from 'react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCw, Loader2, Trash2 } from 'lucide-react';
import { recompute, deleteCo2Line } from '@/lib/actions/co2-lines';
import { Co2AddActivity } from './co2-add-activity';
import type { CatalogFactor } from '@/lib/db/queries/emission-factors-catalog';

/** One activity line in the CO₂ worksheet. Frozen shape — later tasks pass real data. */
export interface Co2Line {
  id: string;
  scope: string;
  category: string;
  subcategory: string | null;
  amount: string;
  unit: string;
  factorUbaId: string;
  computedTco2e: string | null;
}

export interface Co2Totals {
  scope1: number;
  scope2Location: number;
  totalLocation: number;
  lineCount: number;
}

const T = {
  de: {
    title: 'THG-Aktivitäten',
    subtitle: 'Tätigkeitsdaten mit hinterlegten UBA-Emissionsfaktoren.',
    recompute: 'Neu berechnen',
    colCategory: 'Kategorie',
    colAmount: 'Menge',
    colFactor: 'Faktor (UBA)',
    colResult: 'tCO₂e',
    scope1: 'Scope 1',
    scope2: 'Scope 2 (standortbasiert)',
    total: 'Gesamt',
    lines: 'Aktivitäten',
    empty: 'Noch keine Aktivitäten erfasst.',
    delete: 'Aktivität löschen',
    colActions: 'Aktion',
  },
  en: {
    title: 'GHG activities',
    subtitle: 'Activity data with attached UBA emission factors.',
    recompute: 'Recompute',
    colCategory: 'Category',
    colAmount: 'Amount',
    colFactor: 'Factor (UBA)',
    colResult: 'tCO₂e',
    scope1: 'Scope 1',
    scope2: 'Scope 2 (location-based)',
    total: 'Total',
    lines: 'activities',
    empty: 'No activities recorded yet.',
    delete: 'Delete activity',
    colActions: 'Action',
  },
} as const;

function fmt(n: number, locale: 'de' | 'en'): string {
  const bcp47 = locale === 'en' ? 'en-US' : 'de-DE';
  return n.toLocaleString(bcp47, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ScopeChip({ scope }: { scope: string }) {
  const isS1 = scope.toUpperCase().includes('1');
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        isS1 ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent-2',
      )}
    >
      {isS1 ? 'S1' : 'S2'}
    </span>
  );
}

export function Co2ActivityTable({
  projectId,
  worksheetInstanceId,
  locale,
  lines,
  totals,
  catalog = [],
}: {
  projectId: string;
  worksheetInstanceId: string;
  locale: 'de' | 'en';
  lines: Co2Line[];
  totals: Co2Totals;
  /** Full emission-factor catalog for the Add-activity picker. */
  catalog?: CatalogFactor[];
}): JSX.Element {
  const t = T[locale];
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleRecompute() {
    startTransition(async () => {
      await recompute(projectId, worksheetInstanceId);
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteCo2Line(id);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
          <p className="mt-0.5 text-sm text-subtext">{t.subtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={handleRecompute}
          disabled={isPending || !worksheetInstanceId}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RotateCw />
          )}
          {t.recompute}
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-subtext italic">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-hairline bg-paper-2/50 text-left">
                <th className="px-5 py-2.5 font-medium text-subtext text-xs">
                  {t.colCategory}
                </th>
                <th className="px-3 py-2.5 font-medium text-subtext text-xs text-right">
                  {t.colAmount}
                </th>
                <th className="px-3 py-2.5 font-medium text-subtext text-xs">
                  {t.colFactor}
                </th>
                <th className="px-5 py-2.5 font-medium text-subtext text-xs text-right">
                  {t.colResult}
                </th>
                <th className="px-3 py-2.5 font-medium text-subtext text-xs text-right w-12">
                  <span className="sr-only">{t.colActions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-paper-2/40 transition-colors">
                  <td className="px-5 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <ScopeChip scope={line.scope} />
                      <span className="font-medium text-ink">{line.category}</span>
                    </div>
                    {line.subcategory && (
                      <div className="mt-0.5 pl-7 text-xs text-subtext">
                        {line.subcategory}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-right tabular-nums whitespace-nowrap">
                    <span className="text-ink">{line.amount}</span>{' '}
                    <span className="text-subtext text-xs">{line.unit}</span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="citation">{line.factorUbaId}</span>
                  </td>
                  <td className="px-5 py-3 align-top text-right tabular-nums font-medium text-ink whitespace-nowrap">
                    {line.computedTco2e != null
                      ? `${Number(line.computedTco2e).toLocaleString(locale === 'en' ? 'en-US' : 'de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(line.id)}
                      disabled={isPending}
                      aria-label={t.delete}
                      title={t.delete}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-subtext transition-colors hover:bg-error-soft hover:text-error disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {deletingId === line.id && isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Co2AddActivity
        projectId={projectId}
        worksheetInstanceId={worksheetInstanceId}
        locale={locale}
        catalog={catalog}
      />

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1.5 border-t border-hairline bg-paper-2/40 px-5 py-3 text-sm">
        <span className="text-subtext">
          {t.scope1}:{' '}
          <span className="tabular-nums font-medium text-ink">{fmt(totals.scope1, locale)} t</span>
        </span>
        <span className="text-subtext">
          {t.scope2}:{' '}
          <span className="tabular-nums font-medium text-ink">
            {fmt(totals.scope2Location, locale)} t
          </span>
        </span>
        <span className="text-ink font-semibold">
          {t.total}:{' '}
          <span className="tabular-nums">{fmt(totals.totalLocation, locale)} tCO₂e</span>
        </span>
        <span className="text-xs text-subtext tabular-nums">
          ({totals.lineCount} {t.lines})
        </span>
      </div>
    </Card>
  );
}

/** Inline mock data for standalone preview rendering. */
export const MOCK_CO2_LINES: Co2Line[] = [
  {
    id: 'l1',
    scope: 'scope_1',
    category: 'Erdgas',
    subcategory: 'Heizung',
    amount: '4.200',
    unit: 'kWh',
    factorUbaId: 'UBA-2024-NG-0182',
    computedTco2e: '0.84',
  },
  {
    id: 'l2',
    scope: 'scope_1',
    category: 'Diesel',
    subcategory: 'Fuhrpark',
    amount: '1.100',
    unit: 'l',
    factorUbaId: 'UBA-2024-DSL-0091',
    computedTco2e: '2.95',
  },
  {
    id: 'l3',
    scope: 'scope_2',
    category: 'Strom',
    subcategory: 'Netzbezug',
    amount: '18.500',
    unit: 'kWh',
    factorUbaId: 'UBA-2024-EL-LOC-22',
    computedTco2e: '7.38',
  },
];

export const MOCK_CO2_TOTALS: Co2Totals = {
  scope1: 3.79,
  scope2Location: 7.38,
  totalLocation: 11.17,
  lineCount: 3,
};
