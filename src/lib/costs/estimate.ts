/**
 * Parametrische Kostenschätzung pure core (Slice E2 — the CLIENT's build cost).
 *
 * DIN-276-grouped range totals + contingency math + stale-price warnings +
 * zod validation, without any DB or session dependency (mirrors the
 * offers-margin pure/DB split). The `'use server'` module
 * (`src/lib/actions/costs.ts`) wraps these with auth + persistence.
 *
 * Honesty rules enforced here:
 * - ranges (low/likely/high), never point values;
 * - contingency is structural: null or < 5 % always yields a warning —
 *   an estimate without contingency renders WITH that warning, never silently;
 * - a price older than `maxAgeDays` (default 365) is flagged — the provenance
 *   doctrine applied to euros.
 */
import { z } from 'zod';
import type { ValuetableRow } from '@/lib/pdf/load-valuetable';

// =============================================================================
// Constants
// =============================================================================

/** Contingency bounds (addendum §2.3: per-project-type minimum 5–10 %). */
export const CONTINGENCY_MIN_PCT = 5;
export const CONTINGENCY_MAX_PCT = 15;
export const CONTINGENCY_DEFAULT_PCT = 10;

/** A catalog price older than this is stale (amber). */
export const STALE_PRICE_MAX_AGE_DAYS = 365;

/**
 * Accuracy-class boundary sentence (addendum §2, "Honest boundary" —
 * verbatim-adapted to German). Printed on the PDF and shown in the panel:
 * the liability difference between these words is real.
 */
export const SCHAETZUNG_BOUNDARY_SENTENCE =
  'Dieses Dokument ist eine Kostenschätzung nach DIN 276 — keine '
  + 'Kostenberechnung und kein Angebot. Der Haftungsunterschied zwischen '
  + 'diesen Genauigkeitsklassen ist real; verbindliche Preise entstehen erst '
  + 'durch Angebote ausführender Unternehmen.';

// =============================================================================
// Range totals (DIN-276 grouped) + contingency
// =============================================================================

/** A low/likely/high euro triple — the ONLY shape totals ever take. */
export type EurRange = { low: number; likely: number; high: number };

export type EstimateLineInput = {
  quantity: number;
  priceLowEur: number;
  priceLikelyEur: number;
  priceHighEur: number;
  /** DIN-276 Kostengruppe code (e.g. '41x'); null → "ohne Zuordnung". */
  din276Group: string | null;
};

export type EstimateGroupSubtotal = {
  /** null = lines without a Kostengruppe (rendered as "ohne KG-Zuordnung"). */
  din276Group: string | null;
  lineCount: number;
  subtotal: EurRange;
};

export type EstimateTotals = {
  groups: EstimateGroupSubtotal[];
  /** Σ over all lines, before contingency. */
  subtotal: EurRange;
  /** The pct actually applied (0 when contingencyPct was null). */
  contingencyPct: number;
  contingency: EurRange;
  grandTotal: EurRange;
  /** German, human-readable — panel and PDF show these verbatim. */
  warnings: string[];
};

function addRange(a: EurRange, b: EurRange): EurRange {
  return { low: a.low + b.low, likely: a.likely + b.likely, high: a.high + b.high };
}

function scaleRange(r: EurRange, factor: number): EurRange {
  return { low: r.low * factor, likely: r.likely * factor, high: r.high * factor };
}

function lineRange(l: EstimateLineInput): EurRange {
  const q = Number.isFinite(l.quantity) ? l.quantity : 0;
  const num = (v: number) => (Number.isFinite(v) ? v : 0);
  return {
    low: q * num(l.priceLowEur),
    likely: q * num(l.priceLikelyEur),
    high: q * num(l.priceHighEur),
  };
}

/**
 * Per-DIN-276-group subtotals + contingency + grand totals — all as ranges.
 *
 * Contingency rule (the Merma point, structural): `contingencyPct === null`
 * or below CONTINGENCY_MIN_PCT NEVER fails — it computes with what it has and
 * emits a warning the caller must render. Silence is the only forbidden state.
 */
export function buildEstimateTotals(
  lines: ReadonlyArray<EstimateLineInput>,
  contingencyPct: number | null,
): EstimateTotals {
  const zero: EurRange = { low: 0, likely: 0, high: 0 };

  // Group in first-appearance order; null group sorts last.
  const byGroup = new Map<string | null, { count: number; subtotal: EurRange }>();
  for (const line of lines) {
    const key = line.din276Group && line.din276Group.trim() !== '' ? line.din276Group : null;
    const acc = byGroup.get(key) ?? { count: 0, subtotal: zero };
    byGroup.set(key, { count: acc.count + 1, subtotal: addRange(acc.subtotal, lineRange(line)) });
  }
  const groups: EstimateGroupSubtotal[] = [...byGroup.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b, 'de');
    })
    .map(([din276Group, { count, subtotal }]) => ({
      din276Group,
      lineCount: count,
      subtotal,
    }));

  const subtotal = groups.reduce((sum, g) => addRange(sum, g.subtotal), zero);

  const warnings: string[] = [];
  const effectivePct =
    contingencyPct !== null && Number.isFinite(contingencyPct) ? contingencyPct : 0;
  if (contingencyPct === null || !Number.isFinite(contingencyPct)) {
    warnings.push(
      'Ohne Unvorhergesehenes-Zuschlag — eine Schätzung ohne Contingency ist unehrlich '
      + `(Vorgabe: ${CONTINGENCY_MIN_PCT}–${CONTINGENCY_MAX_PCT} %).`,
    );
  } else if (contingencyPct < CONTINGENCY_MIN_PCT) {
    warnings.push(
      `Unvorhergesehenes-Zuschlag ${fmtPct(contingencyPct)} % liegt unter dem `
      + `Minimum von ${CONTINGENCY_MIN_PCT} % — Bodenrisiken und Inbetriebnahme sind `
      + 'damit nicht ehrlich abgedeckt.',
    );
  }
  if (lines.length === 0) {
    warnings.push('Keine Positionen erfasst — die Schätzung ist leer.');
  }

  const contingency = scaleRange(subtotal, effectivePct / 100);
  const grandTotal = addRange(subtotal, contingency);

  return { groups, subtotal, contingencyPct: effectivePct, contingency, grandTotal, warnings };
}

function fmtPct(v: number): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

// =============================================================================
// Stale-price warnings
// =============================================================================

export type StalePriceInput = {
  position: string;
  /** ISO date (JJJJ-MM-TT) the price was valid; null = unknown provenance date. */
  priceDate: string | null;
};

export type StalePriceWarning = {
  position: string;
  priceDate: string | null;
  /** Whole days since priceDate; null when the date is missing/unparseable. */
  ageDays: number | null;
  message: string;
};

const MS_PER_DAY = 86_400_000;

/**
 * Flag every price whose date is older than `maxAgeDays` (default 365) or
 * missing entirely. A stale price is not an error — it is a visible doubt.
 */
export function stalePriceWarnings(
  lines: ReadonlyArray<StalePriceInput>,
  now: Date,
  maxAgeDays: number = STALE_PRICE_MAX_AGE_DAYS,
): StalePriceWarning[] {
  const warnings: StalePriceWarning[] = [];
  for (const line of lines) {
    if (line.priceDate === null || line.priceDate === '') {
      warnings.push({
        position: line.position,
        priceDate: null,
        ageDays: null,
        message: `„${line.position}“: Preis ohne Datum — Herkunft unklar.`,
      });
      continue;
    }
    const t = Date.parse(`${line.priceDate}T00:00:00Z`);
    if (Number.isNaN(t)) {
      warnings.push({
        position: line.position,
        priceDate: line.priceDate,
        ageDays: null,
        message: `„${line.position}“: Preisdatum „${line.priceDate}“ nicht lesbar.`,
      });
      continue;
    }
    const ageDays = Math.floor((now.getTime() - t) / MS_PER_DAY);
    if (ageDays > maxAgeDays) {
      warnings.push({
        position: line.position,
        priceDate: line.priceDate,
        ageDays,
        message:
          `„${line.position}“: Preisbasis ${line.priceDate} ist ${ageDays} Tage alt `
          + `(> ${maxAgeDays} Tage) — Preis prüfen.`,
      });
    }
  }
  return warnings;
}

// =============================================================================
// Quantity from the Wertetabelle (design-value provenance)
// =============================================================================

export type ValuetableQuantity = {
  symbol: string;
  value: number;
  unit: string | null;
  labelDe: string;
  worksheetCode: string;
};

/**
 * Parse a de-DE formatted Wertetabelle value ("6,5", "1.250", "5e-4 style
 * exponential with comma") back to a number. Returns null when non-numeric.
 */
function parseDeNumber(s: string): number | null {
  const normalized = s.trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pull the quantity for a design-value symbol out of Wertetabelle rows
 * (the same rows `loadValuetableData` produces — the estimate prices exactly
 * what the approved calculation state says, no retyping). Returns null when
 * the symbol is absent or its value is not numeric.
 */
export function quantityFromValuetable(
  rows: ReadonlyArray<ValuetableRow>,
  sourceSymbol: string,
): ValuetableQuantity | null {
  const row = rows.find((r) => r.symbol === sourceSymbol);
  if (!row) return null;
  const value = parseDeNumber(row.value);
  if (value === null) return null;
  return {
    symbol: row.symbol,
    value,
    unit: row.unit,
    labelDe: row.labelDe,
    worksheetCode: row.worksheetCode,
  };
}

// =============================================================================
// Zod schemas (parsed by the server actions)
// =============================================================================

const uuidSchema = z.string().uuid();

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum');

const eurSchema = z
  .number('Betrag muss eine Zahl sein')
  .finite()
  .min(0, 'Betrag darf nicht negativ sein')
  .max(10_000_000, 'Betrag unplausibel hoch');

export const contingencyPctSchema = z
  .number('Zuschlag muss eine Zahl sein')
  .finite()
  .min(CONTINGENCY_MIN_PCT, `Unvorhergesehenes-Zuschlag mindestens ${CONTINGENCY_MIN_PCT} %`)
  .max(CONTINGENCY_MAX_PCT, `Unvorhergesehenes-Zuschlag höchstens ${CONTINGENCY_MAX_PCT} %`);

/** Catalog item — source + priceDate REQUIRED: no price without provenance. */
export const addCostItemSchema = z.object({
  orgId: uuidSchema,
  position: z.string().trim().min(1, 'Position erforderlich').max(200),
  unit: z.string().trim().max(40).optional(),
  priceLowEur: eurSchema,
  priceLikelyEur: eurSchema,
  priceHighEur: eurSchema,
  source: z.string().trim().min(1, 'Preisquelle erforderlich — Preise werden nie erfunden').max(500),
  priceDate: isoDateSchema,
  din276Group: z.string().trim().max(20).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type AddCostItemInput = z.infer<typeof addCostItemSchema>;

export const createEstimateSchema = z.object({
  projectId: uuidSchema,
  title: z.string().trim().min(1, 'Titel erforderlich').max(200),
  standardCode: z.string().trim().max(60).optional(),
  contingencyPct: contingencyPctSchema.optional(),
});
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;

export const addEstimateLineSchema = z
  .object({
    estimateId: uuidSchema,
    costItemId: uuidSchema.optional(),
    position: z.string().trim().min(1, 'Position erforderlich').max(200),
    quantity: z
      .number('Menge muss eine Zahl sein')
      .finite()
      .gt(0, 'Menge muss größer als 0 sein')
      .max(10_000_000, 'Menge unplausibel hoch'),
    unit: z.string().trim().max(40).optional(),
    sourceSymbol: z.string().trim().max(80).optional(),
    priceLowEur: eurSchema.optional(),
    priceLikelyEur: eurSchema.optional(),
    priceHighEur: eurSchema.optional(),
    din276Group: z.string().trim().max(20).optional(),
  })
  .refine(
    (v) =>
      v.costItemId !== undefined
      || (v.priceLowEur !== undefined
        && v.priceLikelyEur !== undefined
        && v.priceHighEur !== undefined),
    {
      message:
        'Ohne Katalog-Position müssen alle drei Preise (niedrig/wahrscheinlich/hoch) angegeben werden',
      path: ['priceLikelyEur'],
    },
  );
export type AddEstimateLineInput = z.infer<typeof addEstimateLineSchema>;

export const updateContingencySchema = z.object({
  estimateId: uuidSchema,
  contingencyPct: contingencyPctSchema,
});
export type UpdateContingencyInput = z.infer<typeof updateContingencySchema>;

export const addContractorBidSchema = z.object({
  projectId: uuidSchema,
  estimateId: uuidSchema.optional(),
  bidder: z.string().trim().min(1, 'Bieter erforderlich').max(200),
  position: z.string().trim().max(200).optional(),
  amountEur: eurSchema,
  bidDate: isoDateSchema.optional(),
  note: z.string().trim().max(1000).optional(),
});
export type AddContractorBidInput = z.infer<typeof addContractorBidSchema>;
