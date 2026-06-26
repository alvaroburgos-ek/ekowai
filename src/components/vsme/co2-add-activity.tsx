'use client';

import type { JSX } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Loader2, X } from 'lucide-react';
import { addCo2Line } from '@/lib/actions/co2-lines';
import type { CatalogFactor } from '@/lib/db/queries/emission-factors-catalog';
import { CO2_SHORTLIST } from './co2-shortlist';

type Locale = 'de' | 'en';

const T = {
  de: {
    add: 'Aktivität hinzufügen',
    quickPick: 'Häufige Aktivitäten',
    or: 'oder im Katalog suchen',
    searchPlaceholder: 'Energieträger suchen (z. B. Diesel, Strom, Kältemittel) …',
    allCategories: 'Alle Kategorien',
    noResults: 'Kein Energieträger gefunden.',
    selected: 'Ausgewählter Faktor',
    factor: 'Emissionsfaktor (UBA)',
    coefficient: 'Koeffizient',
    perUnit: 'pro',
    amountLabel: 'Menge',
    amountIn: 'in',
    preview: 'Vorschau',
    addLine: 'Aktivität erfassen',
    cancel: 'Abbrechen',
    pickFirst: 'Bitte zuerst einen Energieträger wählen.',
    clear: 'Auswahl aufheben',
    scope1: 'Scope 1',
    scope2: 'Scope 2',
  },
  en: {
    add: 'Add activity',
    quickPick: 'Common activities',
    or: 'or search the catalog',
    searchPlaceholder: 'Search a commodity (e.g. diesel, electricity, refrigerant) …',
    allCategories: 'All categories',
    noResults: 'No commodity found.',
    selected: 'Selected factor',
    factor: 'Emission factor (UBA)',
    coefficient: 'Coefficient',
    perUnit: 'per',
    amountLabel: 'Amount',
    amountIn: 'in',
    preview: 'Preview',
    addLine: 'Add activity',
    cancel: 'Cancel',
    pickFirst: 'Pick a commodity first.',
    clear: 'Clear selection',
    scope1: 'Scope 1',
    scope2: 'Scope 2',
  },
} as const;

function fmtCoeff(n: number, locale: Locale): string {
  const bcp47 = locale === 'en' ? 'en-US' : 'de-DE';
  // Coefficients span 6 orders of magnitude (0.003 … 3200) — show enough digits.
  const maxFrac = Math.abs(n) >= 100 ? 2 : 5;
  return n.toLocaleString(bcp47, { minimumFractionDigits: 2, maximumFractionDigits: maxFrac });
}

function fmtTonnes(n: number, locale: Locale): string {
  const bcp47 = locale === 'en' ? 'en-US' : 'de-DE';
  return n.toLocaleString(bcp47, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function ScopeChip({
  scope,
  scope1Label,
  scope2Label,
}: {
  scope: string;
  scope1Label: string;
  scope2Label: string;
}) {
  const isS1 = scope.toUpperCase().includes('1');
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        isS1 ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent-2',
      )}
      title={isS1 ? scope1Label : scope2Label}
    >
      {isS1 ? 'S1' : 'S2'}
    </span>
  );
}

export function Co2AddActivity({
  projectId,
  worksheetInstanceId,
  locale,
  catalog,
}: {
  projectId: string;
  worksheetInstanceId: string;
  locale: Locale;
  catalog: CatalogFactor[];
}): JSX.Element {
  const t = T[locale];
  const [isPending, startTransition] = useTransition();

  const [selectedUbaId, setSelectedUbaId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fast lookup keyed by ubaId|sourceVersion (uba_id is not unique across versions).
  const byKey = useMemo(() => {
    const m = new Map<string, CatalogFactor>();
    for (const f of catalog) m.set(`${f.ubaId}|${f.sourceVersion}`, f);
    return m;
  }, [catalog]);

  const categories = useMemo(
    () => Array.from(new Set(catalog.map((f) => f.category))).sort(),
    [catalog],
  );

  // Resolve the shortlist against the loaded catalog — values stay source-driven.
  const shortlist = useMemo(
    () =>
      CO2_SHORTLIST.map((s) => {
        const factor = byKey.get(`${s.ubaId}|${s.sourceVersion}`);
        return factor ? { ...s, factor } : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null),
    [byKey],
  );

  const selected = selectedUbaId && selectedVersion
    ? byKey.get(`${selectedUbaId}|${selectedVersion}`) ?? null
    : null;

  // Full-catalog search/filter (only relevant when no shortlist pick is active).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter((f) => (category ? f.category === category : true))
      .filter((f) =>
        q
          ? f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
          : true,
      )
      .slice(0, 60); // cap the rendered list; users narrow with search/category
  }, [catalog, search, category]);

  function selectFactor(f: CatalogFactor) {
    setSelectedUbaId(f.ubaId);
    setSelectedVersion(f.sourceVersion);
    setError(null);
  }

  function clearSelection() {
    setSelectedUbaId(null);
    setSelectedVersion(null);
    setAmount('');
    setError(null);
  }

  const amountNum = Number(amount.replace(',', '.'));
  const amountValid = amount.trim() !== '' && Number.isFinite(amountNum) && amountNum >= 0;
  const previewTonnes =
    selected && amountValid ? (amountNum * selected.kgCo2e) / 1000 : null;

  function handleAdd() {
    if (!selected) {
      setError(t.pickFirst);
      return;
    }
    if (!amountValid) return;
    setError(null);

    const scope = selected.scope.toUpperCase().includes('1') ? 'Scope 1' : 'Scope 2';

    startTransition(async () => {
      try {
        await addCo2Line({
          projectId,
          worksheetInstanceId,
          scope,
          category: selected.name,
          subcategory: selected.category, // optional grouping label
          amount: amountNum,
          unit: selected.unit,
          factorUbaId: selected.ubaId,
          factorSourceVersion: selected.sourceVersion,
        });
        clearSelection();
        setSearch('');
        setCategory('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="border-t border-hairline bg-paper-2/30 p-5">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-accent" />
        <h3 className="text-sm font-semibold text-ink">{t.add}</h3>
      </div>

      {/* Curated one-click shortlist */}
      <div className="mt-3">
        <p className="text-xs font-medium text-subtext">{t.quickPick}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {shortlist.map((s) => {
            const active =
              selectedUbaId === s.factor.ubaId && selectedVersion === s.factor.sourceVersion;
            return (
              <button
                key={`${s.ubaId}|${s.sourceVersion}`}
                type="button"
                onClick={() => selectFactor(s.factor)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  active
                    ? 'border-accent bg-accent-soft text-accent-2 ring-2 ring-accent-soft'
                    : 'border-hairline-strong bg-paper text-ink hover:bg-paper-2',
                )}
              >
                <ScopeChip scope={s.factor.scope} scope1Label={t.scope1} scope2Label={t.scope2} />
                {locale === 'en' ? s.labelEn : s.labelDe}
                <span className="text-subtext">/ {s.factor.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full catalog search */}
      <div className="mt-4">
        <p className="text-xs font-medium text-subtext">{t.or}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtext" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="pl-9"
              aria-label={t.searchPlaceholder}
            />
          </div>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-56"
            aria-label={t.allCategories}
          >
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {(search.trim() !== '' || category !== '') && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-hairline bg-paper">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs italic text-subtext">{t.noResults}</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {filtered.map((f) => {
                  const active =
                    selectedUbaId === f.ubaId && selectedVersion === f.sourceVersion;
                  return (
                    <li key={`${f.ubaId}|${f.sourceVersion}`}>
                      <button
                        type="button"
                        onClick={() => selectFactor(f)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                          active ? 'bg-accent-soft' : 'hover:bg-paper-2',
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <ScopeChip scope={f.scope} scope1Label={t.scope1} scope2Label={t.scope2} />
                          <span className="truncate font-medium text-ink">{f.name}</span>
                          <span className="truncate text-xs text-subtext">{f.category}</span>
                        </span>
                        <span className="shrink-0 text-xs text-subtext tabular-nums">
                          {fmtCoeff(f.kgCo2e, locale)} kg/{f.unit}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected factor + amount + live preview */}
      {selected && (
        <div className="mt-4 rounded-xl border border-hairline-strong bg-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ScopeChip scope={selected.scope} scope1Label={t.scope1} scope2Label={t.scope2} />
                <span className="font-semibold text-ink">{selected.name}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtext">
                <span>
                  {t.factor}: <span className="citation">{selected.ubaId}</span>
                </span>
                <span>
                  {t.coefficient}:{' '}
                  <span className="tabular-nums text-ink">
                    {fmtCoeff(selected.kgCo2e, locale)} kg CO₂e {t.perUnit} {selected.unit}
                  </span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 rounded-lg p-1 text-subtext hover:bg-paper-2 hover:text-ink"
              aria-label={t.clear}
              title={t.clear}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-xs font-medium text-subtext">
                {t.amountLabel} <span className="text-ink">({t.amountIn} {selected.unit})</span>
              </span>
              <div className="relative mt-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="pr-12 tabular-nums"
                  aria-label={`${t.amountLabel} ${selected.unit}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-subtext">
                  {selected.unit}
                </span>
              </div>
            </label>

            <div className="rounded-xl bg-paper-2/60 px-4 py-2.5 text-center sm:min-w-[140px]">
              <div className="text-[10px] font-medium uppercase tracking-wide text-subtext">
                {t.preview}
              </div>
              <div className="tabular-nums text-lg font-semibold text-ink">
                {previewTonnes != null ? fmtTonnes(previewTonnes, locale) : '—'}
                <span className="ml-1 text-xs font-normal text-subtext">tCO₂e</span>
              </div>
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-error">{error}</p>}

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={clearSelection} disabled={isPending}>
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleAdd}
              disabled={isPending || !amountValid || !worksheetInstanceId}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              {t.addLine}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
