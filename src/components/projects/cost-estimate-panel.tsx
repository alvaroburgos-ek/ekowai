'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Loader2, FileDown, Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addCostItem,
  deactivateCostItem,
  createEstimate,
  addEstimateLine,
  deleteEstimateLine,
  updateContingency,
} from '@/lib/actions/costs';
import type {
  ListEstimatesResult,
  EstimateView,
  CostItemView,
} from '@/lib/actions/costs';
import {
  CONTINGENCY_MIN_PCT,
  CONTINGENCY_MAX_PCT,
  CONTINGENCY_DEFAULT_PCT,
  STALE_PRICE_MAX_AGE_DAYS,
} from '@/lib/costs/estimate';

/**
 * Kostenschätzung — Slice E2 panel on the project overview.
 *
 * The CLIENT's build cost as a deliverable: DIN-276 ranges, structural
 * contingency (5–15 %, warning badge below 5 % or when empty), a unit-price
 * catalog that ships EMPTY and only grows from real sources (source +
 * price date required, stale prices flagged amber after 365 days).
 */

function fmtNum(v: string | number, digits = 2): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}

function fmtEur(v: string | number): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
}

function parseDecimal(s: string): number {
  return Number(s.replace(',', '.'));
}

function isStale(priceDate: string): boolean {
  const t = Date.parse(`${priceDate}T00:00:00Z`);
  if (Number.isNaN(t)) return true;
  return (Date.now() - t) / 86_400_000 > STALE_PRICE_MAX_AGE_DAYS;
}

/** likely-total + contingency badge; warning style when < 5 % or no lines. */
function EstimateBadge({ estimate }: { estimate: EstimateView }) {
  const pct = Number(estimate.contingencyPct);
  const warning =
    !Number.isFinite(pct) || pct < CONTINGENCY_MIN_PCT || estimate.lines.length === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
        warning ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
      }`}
      title={
        [...estimate.totals.warnings, ...estimate.staleWarnings.map((w) => w.message)]
          .join(' · ') || 'Schätzung mit strukturellem Unvorhergesehenes-Zuschlag'
      }
    >
      {warning && <AlertTriangle className="size-3 shrink-0" aria-hidden />}
      {`~ ${fmtEur(estimate.totals.grandTotal.likely)} · +${fmtNum(estimate.contingencyPct, 1)} % Unvorh.`}
    </span>
  );
}

function EstimateCard({
  estimate,
  projectId,
  locale,
  catalog,
}: {
  estimate: EstimateView;
  projectId: string;
  locale: string;
  catalog: CostItemView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Line add-row: catalog select ('' = manual) + manual price fields.
  const [itemId, setItemId] = useState('');
  const [linePos, setLinePos] = useState('');
  const [lineQty, setLineQty] = useState('');
  const [lineUnit, setLineUnit] = useState('');
  const [lineSymbol, setLineSymbol] = useState('');
  const [priceLow, setPriceLow] = useState('');
  const [priceLikely, setPriceLikely] = useState('');
  const [priceHigh, setPriceHigh] = useState('');
  const [lineKg, setLineKg] = useState('');

  // Contingency edit
  const [editingPct, setEditingPct] = useState(false);
  const [pct, setPct] = useState(estimate.contingencyPct);

  const selectedItem = catalog.find((c) => c.id === itemId) ?? null;
  const qtyNum = parseDecimal(lineQty);
  const manualPricesOk =
    selectedItem !== null
    || ([priceLow, priceLikely, priceHigh].every(
      (p) => p.trim() !== '' && Number.isFinite(parseDecimal(p)) && parseDecimal(p) >= 0,
    ));
  const canAddLine =
    (selectedItem !== null || linePos.trim() !== '')
    && lineQty.trim() !== ''
    && Number.isFinite(qtyNum)
    && qtyNum > 0
    && manualPricesOk;

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleAddLine() {
    if (!canAddLine) return;
    run(async () => {
      await addEstimateLine({
        estimateId: estimate.id,
        costItemId: selectedItem ? selectedItem.id : undefined,
        position: linePos.trim() !== '' ? linePos.trim() : (selectedItem?.position ?? ''),
        quantity: qtyNum,
        unit: lineUnit.trim() !== '' ? lineUnit.trim() : undefined,
        sourceSymbol: lineSymbol.trim() !== '' ? lineSymbol.trim() : undefined,
        priceLowEur: selectedItem ? undefined : parseDecimal(priceLow),
        priceLikelyEur: selectedItem ? undefined : parseDecimal(priceLikely),
        priceHighEur: selectedItem ? undefined : parseDecimal(priceHigh),
        din276Group: lineKg.trim() !== '' ? lineKg.trim() : undefined,
      });
      setItemId('');
      setLinePos('');
      setLineQty('');
      setLineUnit('');
      setLineSymbol('');
      setPriceLow('');
      setPriceLikely('');
      setPriceHigh('');
      setLineKg('');
    });
  }

  function handleSavePct() {
    const p = parseDecimal(pct);
    if (!Number.isFinite(p) || p < CONTINGENCY_MIN_PCT || p > CONTINGENCY_MAX_PCT) {
      setError(
        `Unvorhergesehenes-Zuschlag muss zwischen ${CONTINGENCY_MIN_PCT} und ${CONTINGENCY_MAX_PCT} % liegen.`,
      );
      return;
    }
    run(async () => {
      await updateContingency({ estimateId: estimate.id, contingencyPct: p });
      setEditingPct(false);
    });
  }

  const t = estimate.totals;

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-ink break-words">{estimate.title}</span>
          {estimate.standardCode && (
            <span className="text-xs text-subtext">({estimate.standardCode})</span>
          )}
        </div>
        <EstimateBadge estimate={estimate} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-subtext tabular-nums">
        <span className="text-ink font-medium">
          {`Spanne: ${fmtEur(t.grandTotal.low)} – ${fmtEur(t.grandTotal.high)}`}
        </span>
        <span>{`Positionen: ${fmtEur(t.subtotal.likely)}`}</span>
        <span>{`Unvorhergesehenes: ${fmtEur(t.contingency.likely)}`}</span>
        <span>
          {estimate.snapshotId
            ? `Snapshot ${estimate.snapshotId.slice(0, 8)}`
            : 'kein freigegebener Berechnungsstand'}
        </span>
        <button
          type="button"
          onClick={() => setEditingPct((v) => !v)}
          className="rounded-lg p-1 text-subtext hover:bg-paper-2 hover:text-accent-2 transition-colors"
          aria-label="Unvorhergesehenes-Zuschlag bearbeiten"
          title={`Unvorhergesehenes-Zuschlag bearbeiten (${CONTINGENCY_MIN_PCT}–${CONTINGENCY_MAX_PCT} %)`}
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <a
          href={`/api/projects/${projectId}/estimates/${estimate.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-subtext hover:text-accent-2 transition-colors"
          hrefLang={locale}
        >
          <FileDown className="size-3.5" aria-hidden />
          Kostenschätzungs-PDF
        </a>
      </div>

      {(t.warnings.length > 0 || estimate.staleWarnings.length > 0) && (
        <ul className="text-xs text-warning space-y-0.5">
          {t.warnings.map((w, i) => (
            <li key={`t${i}`}>· {w}</li>
          ))}
          {estimate.staleWarnings.map((w, i) => (
            <li key={`s${i}`}>· {w.message}</li>
          ))}
        </ul>
      )}

      {editingPct && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end rounded-xl border border-hairline bg-paper-2/40 p-3">
          <label className="block sm:w-52">
            <span className="text-xs font-medium text-subtext">
              {`Unvorhergesehenes (%) — ${CONTINGENCY_MIN_PCT}–${CONTINGENCY_MAX_PCT}`}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={CONTINGENCY_MIN_PCT}
              max={CONTINGENCY_MAX_PCT}
              step="0.5"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="mt-1 tabular-nums"
              aria-label="Unvorhergesehenes-Zuschlag"
            />
          </label>
          <Button
            size="sm"
            type="button"
            onClick={handleSavePct}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Speichern
          </Button>
        </div>
      )}

      {/* Lines */}
      {estimate.lines.length > 0 && (
        <ul className="divide-y divide-hairline">
          {estimate.lines.map((l) => (
            <li
              key={l.id}
              className="py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-sm"
            >
              <div className="flex-1 min-w-0 text-ink break-words">
                {l.position}
                <span className="text-xs text-subtext">
                  {l.din276Group ? ` · KG ${l.din276Group}` : ''}
                  {l.sourceSymbol ? ` · Menge aus ${l.sourceSymbol}` : ''}
                  {l.priceSource
                    ? ` · ${l.priceSource}${l.priceDate ? ` (${l.priceDate})` : ''}`
                    : ' · Preis manuell'}
                </span>
              </div>
              <div className="sm:w-28 sm:shrink-0 tabular-nums text-ink">
                {`${fmtNum(l.quantity, 3)}${l.unit ? ` ${l.unit}` : ''}`}
              </div>
              <div className="sm:w-56 sm:shrink-0 tabular-nums text-subtext">
                {`${fmtEur(Number(l.quantity) * Number(l.priceLowEur))} / ${fmtEur(Number(l.quantity) * Number(l.priceLikelyEur))} / ${fmtEur(Number(l.quantity) * Number(l.priceHighEur))}`}
              </div>
              <button
                type="button"
                onClick={() => run(() => deleteEstimateLine(l.id))}
                disabled={isPending}
                className="self-start sm:self-center shrink-0 rounded-lg p-1.5 text-subtext hover:bg-paper-2 hover:text-error transition-colors disabled:opacity-50"
                aria-label="Position löschen"
                title="Position löschen"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Line add-row */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block sm:w-64">
            <span className="text-xs font-medium text-subtext">Aus Katalog</span>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink"
              aria-label="Katalog-Position"
            >
              <option value="">— manuell erfassen —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.position}${c.unit ? ` (€/${c.unit})` : ''} · ${c.source}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-subtext">
              {selectedItem ? 'Position (Vorgabe: Katalogname)' : 'Position'}
            </span>
            <Input
              value={linePos}
              onChange={(e) => setLinePos(e.target.value)}
              placeholder={selectedItem?.position ?? 'z. B. Zisterne 6–8 m³ liefern + setzen'}
              className="mt-1"
              aria-label="Position"
            />
          </label>
          <label className="block sm:w-28">
            <span className="text-xs font-medium text-subtext">Menge</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={lineQty}
              onChange={(e) => setLineQty(e.target.value)}
              placeholder="0"
              className="mt-1 tabular-nums"
              aria-label="Menge"
            />
          </label>
          <label className="block sm:w-36">
            <span className="text-xs font-medium text-subtext">Wert-Symbol</span>
            <Input
              value={lineSymbol}
              onChange={(e) => setLineSymbol(e.target.value)}
              placeholder="z. B. V_storage"
              className="mt-1"
              aria-label="Design-Wert-Symbol"
            />
          </label>
        </div>
        {!selectedItem && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block sm:w-24">
              <span className="text-xs font-medium text-subtext">Einheit</span>
              <Input
                value={lineUnit}
                onChange={(e) => setLineUnit(e.target.value)}
                placeholder="m³"
                className="mt-1"
                aria-label="Einheit"
              />
            </label>
            <label className="block sm:w-32">
              <span className="text-xs font-medium text-subtext">Preis niedrig (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={priceLow}
                onChange={(e) => setPriceLow(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis niedrig"
              />
            </label>
            <label className="block sm:w-32">
              <span className="text-xs font-medium text-subtext">Preis wahrsch. (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={priceLikely}
                onChange={(e) => setPriceLikely(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis wahrscheinlich"
              />
            </label>
            <label className="block sm:w-32">
              <span className="text-xs font-medium text-subtext">Preis hoch (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={priceHigh}
                onChange={(e) => setPriceHigh(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis hoch"
              />
            </label>
            <label className="block sm:w-28">
              <span className="text-xs font-medium text-subtext">KG (DIN 276)</span>
              <Input
                value={lineKg}
                onChange={(e) => setLineKg(e.target.value)}
                placeholder="41x"
                className="mt-1"
                aria-label="DIN-276-Kostengruppe"
              />
            </label>
          </div>
        )}
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={handleAddLine}
          disabled={isPending || !canAddLine}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
          Position
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

/** Catalog mini-manager: add item (source + date REQUIRED), stale amber chip. */
function CatalogManager({
  orgId,
  catalog,
}: {
  orgId: string;
  catalog: CostItemView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState('');
  const [unit, setUnit] = useState('');
  const [low, setLow] = useState('');
  const [likely, setLikely] = useState('');
  const [high, setHigh] = useState('');
  const [source, setSource] = useState('');
  const [priceDate, setPriceDate] = useState('');
  const [kg, setKg] = useState('');

  const pricesOk = [low, likely, high].every(
    (p) => p.trim() !== '' && Number.isFinite(parseDecimal(p)) && parseDecimal(p) >= 0,
  );
  const canAdd =
    position.trim() !== '' && source.trim() !== '' && priceDate.trim() !== '' && pricesOk;

  function handleAdd() {
    if (!canAdd) return;
    setError(null);
    startTransition(async () => {
      try {
        await addCostItem({
          orgId,
          position: position.trim(),
          unit: unit.trim() !== '' ? unit.trim() : undefined,
          priceLowEur: parseDecimal(low),
          priceLikelyEur: parseDecimal(likely),
          priceHighEur: parseDecimal(high),
          source: source.trim(),
          priceDate,
          din276Group: kg.trim() !== '' ? kg.trim() : undefined,
        });
        setPosition('');
        setUnit('');
        setLow('');
        setLikely('');
        setHigh('');
        setSource('');
        setPriceDate('');
        setKg('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="rounded-xl border border-hairline bg-paper-2/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-subtext">
          {`Einheitspreis-Katalog (Org) — ${catalog.length} Positionen`}
        </span>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen((v) => !v)}>
          <Plus aria-hidden />
          Katalog-Position
        </Button>
      </div>

      {catalog.length === 0 && (
        <p className="text-xs text-subtext italic">
          Katalog ist leer — Preise wachsen aus echten Angeboten/Abrechnungen, nie erfunden.
        </p>
      )}

      {catalog.length > 0 && (
        <ul className="divide-y divide-hairline">
          {catalog.map((c) => (
            <li
              key={c.id}
              className="py-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-sm"
            >
              <div className="flex-1 min-w-0 text-ink break-words">
                {c.position}
                <span className="text-xs text-subtext">
                  {c.din276Group ? ` · KG ${c.din276Group}` : ''}
                  {` · ${c.source}`}
                </span>
              </div>
              <div className="sm:w-48 sm:shrink-0 tabular-nums text-subtext text-xs">
                {`${fmtEur(c.priceLowEur ?? '')} / ${fmtEur(c.priceLikelyEur ?? '')} / ${fmtEur(c.priceHighEur ?? '')}${c.unit ? ` je ${c.unit}` : ''}`}
              </div>
              <div className="sm:shrink-0">
                {isStale(c.priceDate) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning tabular-nums">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden />
                    {`Stand ${c.priceDate}`}
                  </span>
                ) : (
                  <span className="text-[11px] text-subtext tabular-nums">{`Stand ${c.priceDate}`}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    try {
                      await deactivateCostItem(c.id);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  });
                }}
                disabled={isPending}
                className="self-start sm:self-center shrink-0 rounded-lg p-1.5 text-subtext hover:bg-paper-2 hover:text-error transition-colors disabled:opacity-50"
                aria-label="Katalog-Position deaktivieren"
                title="Katalog-Position deaktivieren"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-xs font-medium text-subtext">Position</span>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="z. B. Zisterne 6–8 m³ liefern + setzen"
                className="mt-1"
                aria-label="Katalog-Position"
              />
            </label>
            <label className="block sm:w-24">
              <span className="text-xs font-medium text-subtext">Einheit</span>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="m³"
                className="mt-1"
                aria-label="Einheit"
              />
            </label>
            <label className="block sm:w-28">
              <span className="text-xs font-medium text-subtext">KG (DIN 276)</span>
              <Input
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                placeholder="41x"
                className="mt-1"
                aria-label="DIN-276-Kostengruppe"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block sm:w-28">
              <span className="text-xs font-medium text-subtext">niedrig (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={low}
                onChange={(e) => setLow(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis niedrig"
              />
            </label>
            <label className="block sm:w-28">
              <span className="text-xs font-medium text-subtext">wahrsch. (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={likely}
                onChange={(e) => setLikely(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis wahrscheinlich"
              />
            </label>
            <label className="block sm:w-28">
              <span className="text-xs font-medium text-subtext">hoch (€)</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                className="mt-1 tabular-nums"
                aria-label="Preis hoch"
              />
            </label>
            <label className="block flex-1">
              <span className="text-xs font-medium text-subtext">
                Quelle (Pflicht — nie erfunden)
              </span>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="z. B. Angebot Fa. Muster 2026-07, BKI 2026, eigene Abrechnung"
                className="mt-1"
                aria-label="Preisquelle"
              />
            </label>
            <label className="block sm:w-40">
              <span className="text-xs font-medium text-subtext">Preisstand (Pflicht)</span>
              <Input
                type="date"
                value={priceDate}
                onChange={(e) => setPriceDate(e.target.value)}
                className="mt-1"
                aria-label="Preisstand"
              />
            </label>
            <Button
              size="sm"
              type="button"
              onClick={handleAdd}
              disabled={isPending || !canAdd}
              className="shrink-0"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
              Aufnehmen
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export function CostEstimatePanel({
  projectId,
  locale,
  data,
}: {
  projectId: string;
  locale: string;
  data: ListEstimatesResult;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [standardCode, setStandardCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canCreate = title.trim() !== '';

  function handleCreate() {
    if (!canCreate) return;
    setError(null);
    startTransition(async () => {
      try {
        await createEstimate({
          projectId,
          title: title.trim(),
          standardCode: standardCode.trim() !== '' ? standardCode.trim() : undefined,
        });
        setTitle('');
        setStandardCode('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5 space-y-4">
      <p className="text-xs text-subtext">
        Baukosten des Auftraggebers als Liefergegenstand — Spannen statt
        Punktwerte, struktureller Unvorhergesehenes-Zuschlag
        {` (${CONTINGENCY_MIN_PCT}–${CONTINGENCY_MAX_PCT} %, Vorgabe ${CONTINGENCY_DEFAULT_PCT} %), `}
        jede Preiszeile mit Quelle und Preisstand.
      </p>

      <CatalogManager orgId={data.orgId} catalog={data.catalog} />

      {/* Create form */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-xs font-medium text-subtext">Titel</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Kostenschätzung Versickerungsanlage"
            className="mt-1"
            aria-label="Titel"
          />
        </label>
        <label className="block sm:w-48">
          <span className="text-xs font-medium text-subtext">
            Regelwerk-Code (optional)
          </span>
          <Input
            value={standardCode}
            onChange={(e) => setStandardCode(e.target.value)}
            placeholder="z. B. DWA-A-138-1"
            className="mt-1"
            aria-label="Regelwerk-Code"
          />
        </label>
        <Button
          size="sm"
          type="button"
          onClick={handleCreate}
          disabled={isPending || !canCreate}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden />}
          Schätzung anlegen
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Estimate list */}
      {data.estimates.length === 0 ? (
        <p className="text-[11px] text-subtext py-2 italic">
          Noch keine Kostenschätzung angelegt.
        </p>
      ) : (
        <div className="space-y-3">
          {data.estimates.map((e) => (
            <EstimateCard
              key={e.id}
              estimate={e}
              projectId={projectId}
              locale={locale}
              catalog={data.catalog}
            />
          ))}
        </div>
      )}
    </div>
  );
}
