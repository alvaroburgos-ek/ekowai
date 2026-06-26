'use client';

import type { JSX } from 'react';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { OwnerBadge, type Owner } from '@/components/vsme/owner-badge';
import { setFieldOwner, type VsmeOwner } from '@/lib/actions/vsme-owner';
import { Check, Circle } from 'lucide-react';

/** One field row in the worklist. Frozen shape — later tasks pass real data. */
export interface WorklistRow {
  fieldId: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  owner: string;
  dataType: string;
  valueText: string | null;
  valueNumber: string | null;
  hasValue: boolean;
}

const T = {
  de: {
    title: 'Arbeitsliste',
    subtitle: 'Welche Datenpunkte EKOWAI produziert und welche der Kunde liefert.',
    ekowai: 'EKOWAI produziert',
    client: 'Kunde liefert',
    general: 'Allgemein',
    fields: 'Felder',
    open: 'offen',
    empty: 'Keine Felder in dieser Kategorie.',
    ownerLabel: 'Zuständigkeit',
    ownerHint: 'Standardweite Zuordnung (gilt für alle Projekte)',
    ownerEkowai: 'EKOWAI',
    ownerClient: 'Kunde',
    ownerGeneral: 'Allgemein',
  },
  en: {
    title: 'Worklist',
    subtitle: 'Which data points EKOWAI produces and which the client must deliver.',
    ekowai: 'EKOWAI produces',
    client: 'Client delivers',
    general: 'General',
    fields: 'fields',
    open: 'open',
    empty: 'No fields in this category.',
    ownerLabel: 'Owner',
    ownerHint: 'Standard-wide assignment (applies to all projects)',
    ownerEkowai: 'EKOWAI',
    ownerClient: 'Client',
    ownerGeneral: 'General',
  },
} as const;

function progress(rows: WorklistRow[]): { filled: number; total: number; pct: number } {
  const total = rows.length;
  const filled = rows.filter((r) => r.hasValue).length;
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { filled, total, pct };
}

function rowLabel(r: WorklistRow, locale: 'de' | 'en'): string {
  return locale === 'en' ? (r.labelEn ?? r.labelDe) : r.labelDe;
}

function rowValue(r: WorklistRow): string {
  return r.valueText ?? r.valueNumber ?? '';
}

function OwnerSelect({
  fieldId,
  currentOwner,
  locale,
}: {
  fieldId: string;
  currentOwner: string;
  locale: 'de' | 'en';
}) {
  const t = T[locale];
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as VsmeOwner;
    startTransition(() => {
      void setFieldOwner(fieldId, next);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        size="sm"
        inline
        value={currentOwner}
        onChange={handleChange}
        aria-label={t.ownerLabel}
        title={t.ownerHint}
      >
        <option value="ekowai_env">{t.ownerEkowai}</option>
        <option value="client_supplied">{t.ownerClient}</option>
        <option value="general">{t.ownerGeneral}</option>
      </Select>
      <span className="text-xs text-subtext">{t.ownerHint}</span>
    </div>
  );
}

function FieldRow({ row, locale }: { row: WorklistRow; locale: 'de' | 'en' }) {
  const t = T[locale];
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink break-words leading-tight">
          {rowLabel(row, locale)}
        </div>
        <div className="citation mt-0.5">{row.symbol}</div>
      </div>
      <OwnerSelect fieldId={row.fieldId} currentOwner={row.owner} locale={locale} />
      <OwnerBadge owner={row.owner as Owner} locale={locale} />
      {row.hasValue ? (
        <span className="inline-flex items-center gap-1.5 text-success tabular-nums shrink-0">
          <Check className="size-3.5" aria-hidden />
          <span className="max-w-28 truncate">{rowValue(row)}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-subtext shrink-0">
          <Circle className="size-3.5" aria-hidden />
          {t.open}
        </span>
      )}
    </li>
  );
}

function ColumnHeader({
  title,
  rows,
  tone,
  locale,
}: {
  title: string;
  rows: WorklistRow[];
  tone: 'ekowai' | 'client' | 'general';
  locale: 'de' | 'en';
}) {
  const t = T[locale];
  const { filled, total, pct } = progress(rows);
  const bar =
    tone === 'ekowai' ? 'bg-eko-green' : tone === 'client' ? 'bg-accent' : 'bg-subtext';
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-subtext tabular-nums shrink-0">
          {filled}/{total} {t.fields}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-paper-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Worklist({
  projectId: _projectId,
  locale,
  fieldsByOwner,
}: {
  projectId: string;
  locale: 'de' | 'en';
  fieldsByOwner: Record<string, WorklistRow[]>;
}): JSX.Element {
  const t = T[locale];
  const ekowai = fieldsByOwner.ekowai_env ?? [];
  const client = fieldsByOwner.client_supplied ?? [];
  const general = fieldsByOwner.general ?? [];

  function Column({
    title,
    rows,
    tone,
  }: {
    title: string;
    rows: WorklistRow[];
    tone: 'ekowai' | 'client' | 'general';
  }) {
    return (
      <Card className="p-5">
        <ColumnHeader title={title} rows={rows} tone={tone} locale={locale} />
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-subtext italic">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <FieldRow key={r.fieldId} row={r} locale={locale} />
            ))}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
        <p className="mt-0.5 text-sm text-subtext">{t.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Column title={t.ekowai} rows={ekowai} tone="ekowai" />
        <Column title={t.client} rows={client} tone="client" />
      </div>

      <Card className="p-5">
        <ColumnHeader title={t.general} rows={general} tone="general" locale={locale} />
        {general.length === 0 ? (
          <p className="py-6 text-center text-xs text-subtext italic">{t.empty}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 [&>li]:border-hairline">
            {general.map((r) => (
              <div key={r.fieldId} className="border-t border-hairline first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                <FieldRow row={r} locale={locale} />
              </div>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/** Inline mock data for standalone preview rendering. */
export const MOCK_FIELDS_BY_OWNER: Record<string, WorklistRow[]> = {
  ekowai_env: [
    {
      fieldId: 'e1',
      symbol: 'E_ges',
      labelDe: 'Energieverbrauch gesamt',
      labelEn: 'Total energy use',
      owner: 'ekowai_env',
      dataType: 'number',
      valueText: null,
      valueNumber: '1240 kWh',
      hasValue: true,
    },
    {
      fieldId: 'e2',
      symbol: 'W_ent',
      labelDe: 'Wasserentnahme',
      labelEn: 'Water withdrawal',
      owner: 'ekowai_env',
      dataType: 'number',
      valueText: null,
      valueNumber: '320 m³',
      hasValue: true,
    },
    {
      fieldId: 'e3',
      symbol: 'Abf_g',
      labelDe: 'Abfallaufkommen',
      labelEn: 'Waste generated',
      owner: 'ekowai_env',
      dataType: 'number',
      valueText: null,
      valueNumber: null,
      hasValue: false,
    },
  ],
  client_supplied: [
    {
      fieldId: 'c1',
      symbol: 'N_emp',
      labelDe: 'Mitarbeiterzahl',
      labelEn: 'Headcount',
      owner: 'client_supplied',
      dataType: 'number',
      valueText: null,
      valueNumber: '42',
      hasValue: true,
    },
    {
      fieldId: 'c2',
      symbol: 'F_ant',
      labelDe: 'Frauenanteil',
      labelEn: 'Share of women',
      owner: 'client_supplied',
      dataType: 'number',
      valueText: null,
      valueNumber: null,
      hasValue: false,
    },
  ],
  general: [
    {
      fieldId: 'g1',
      symbol: 'BJ',
      labelDe: 'Berichtsjahr',
      labelEn: 'Reporting year',
      owner: 'general',
      dataType: 'text',
      valueText: '2025',
      valueNumber: null,
      hasValue: true,
    },
    {
      fieldId: 'g2',
      symbol: 'RF',
      labelDe: 'Rechtsform',
      labelEn: 'Legal form',
      owner: 'general',
      dataType: 'text',
      valueText: null,
      valueNumber: null,
      hasValue: false,
    },
  ],
};
