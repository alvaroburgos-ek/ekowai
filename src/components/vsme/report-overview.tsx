'use client';

import type { JSX } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { OwnerBadge, type Owner } from '@/components/vsme/owner-badge';
import { Flame, Plug, Sigma } from 'lucide-react';

export interface VsmeSummary {
  totalFields: number;
  filledFields: number;
  completionPct: number;
  scope1: number;
  scope2Location: number;
  totalLocation: number;
  ownerSplit: Record<Owner, { total: number; filled: number }>;
}

const T = {
  de: {
    title: 'VSME-Bericht · Überblick',
    subtitle: 'Datenstand und Treibhausgas-Bilanz dieses Projekts.',
    completion: 'Fertigstellung',
    fields: 'Felder',
    scope1: 'Scope 1',
    scope2: 'Scope 2 (standortbasiert)',
    total: 'Gesamt',
    ownership: 'Datenverantwortung',
    ownerNames: {
      ekowai_env: 'EKOWAI produziert',
      client_supplied: 'Kunde liefert',
      general: 'Allgemein',
    } as Record<Owner, string>,
  },
  en: {
    title: 'VSME report · Overview',
    subtitle: 'Data status and greenhouse-gas balance for this project.',
    completion: 'Completion',
    fields: 'fields',
    scope1: 'Scope 1',
    scope2: 'Scope 2 (location-based)',
    total: 'Total',
    ownership: 'Data ownership',
    ownerNames: {
      ekowai_env: 'EKOWAI produces',
      client_supplied: 'Client delivers',
      general: 'General',
    } as Record<Owner, string>,
  },
} as const;

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--paper-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--eko-green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-ink">{clamped}%</span>
      </div>
    </div>
  );
}

function EmissionCard({
  label,
  value,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: boolean;
}) {
  return (
    <Card className={cn('p-4')} style={emphasis ? { background: 'var(--eko-gradient-soft)' } : undefined}>
      <div className="flex items-center gap-2 text-subtext">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-ink">{fmt(value)}</span>
        <span className="text-xs text-subtext">tCO₂e</span>
      </div>
    </Card>
  );
}

function OwnerSplitCard({
  owner,
  name,
  filled,
  total,
  locale,
}: {
  owner: Owner;
  name: string;
  filled: number;
  total: number;
  locale: 'de' | 'en';
}) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const bar =
    owner === 'ekowai_env'
      ? 'bg-eko-green'
      : owner === 'client_supplied'
        ? 'bg-accent'
        : 'bg-subtext';
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <OwnerBadge owner={owner} locale={locale} />
        <span className="text-xs text-subtext tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2.5 text-sm font-medium text-ink">{name}</div>
      <div className="mt-1 text-xs text-subtext tabular-nums">
        {filled}/{total} {T[locale].fields}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-paper-2 overflow-hidden">
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

export function ReportOverview({
  projectId: _projectId,
  locale,
  summary,
}: {
  projectId: string;
  locale: 'de' | 'en';
  summary: VsmeSummary;
}): JSX.Element {
  const t = T[locale];
  const owners: Owner[] = ['ekowai_env', 'client_supplied', 'general'];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
        <p className="mt-0.5 text-sm text-subtext">{t.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <ProgressRing pct={summary.completionPct} />
          <div className="text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-subtext">
              {t.completion}
            </div>
            <div className="mt-0.5 text-sm tabular-nums text-ink">
              {summary.filledFields}/{summary.totalFields} {t.fields}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <EmissionCard label={t.scope1} value={summary.scope1} icon={Flame} />
          <EmissionCard label={t.scope2} value={summary.scope2Location} icon={Plug} />
          <EmissionCard
            label={t.total}
            value={summary.totalLocation}
            icon={Sigma}
            emphasis
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t.ownership}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {owners.map((owner) => (
            <OwnerSplitCard
              key={owner}
              owner={owner}
              name={t.ownerNames[owner]}
              filled={summary.ownerSplit[owner].filled}
              total={summary.ownerSplit[owner].total}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Inline mock data for standalone preview rendering. */
export const MOCK_SUMMARY: VsmeSummary = {
  totalFields: 50,
  filledFields: 34,
  completionPct: 68,
  scope1: 3.79,
  scope2Location: 7.38,
  totalLocation: 11.17,
  ownerSplit: {
    ekowai_env: { total: 20, filled: 18 },
    client_supplied: { total: 22, filled: 11 },
    general: { total: 8, filled: 5 },
  },
};
