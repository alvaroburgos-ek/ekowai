/**
 * Kostenschätzung pure-core tests (Slice E2).
 *
 * Covers the DIN-276-grouped range totals, the structural contingency rule
 * (null / < 5 % NEVER computes silently — always a warning), stale-price
 * warnings (> 365 d and missing dates), the Wertetabelle quantity helper,
 * and the zod schemas (source + priceDate required, contingency 5–15 bound).
 */
import { describe, it, expect } from 'vitest';
import {
  buildEstimateTotals,
  stalePriceWarnings,
  quantityFromValuetable,
  addCostItemSchema,
  addEstimateLineSchema,
  createEstimateSchema,
  updateContingencySchema,
  addContractorBidSchema,
  contingencyPctSchema,
  CONTINGENCY_MIN_PCT,
  CONTINGENCY_MAX_PCT,
  SCHAETZUNG_BOUNDARY_SENTENCE,
} from '../estimate';

const UUID = '11111111-2222-4333-8444-555555555555';

const line = (
  quantity: number,
  low: number,
  likely: number,
  high: number,
  din276Group: string | null = null,
) => ({
  quantity,
  priceLowEur: low,
  priceLikelyEur: likely,
  priceHighEur: high,
  din276Group,
});

describe('buildEstimateTotals — group subtotals and ranges', () => {
  it('groups lines by DIN-276 Kostengruppe with per-group range subtotals', () => {
    const t = buildEstimateTotals(
      [
        line(6.5, 100, 150, 200, '41x'), // Zisterne per m³
        line(2, 50, 60, 70, '41x'),
        line(18, 30, 40, 60, '5xx'), // Mulde per m²
      ],
      10,
    );
    expect(t.groups).toHaveLength(2);
    const kg41 = t.groups.find((g) => g.din276Group === '41x')!;
    expect(kg41.lineCount).toBe(2);
    expect(kg41.subtotal.low).toBeCloseTo(6.5 * 100 + 2 * 50);
    expect(kg41.subtotal.likely).toBeCloseTo(6.5 * 150 + 2 * 60);
    expect(kg41.subtotal.high).toBeCloseTo(6.5 * 200 + 2 * 70);
    const kg5 = t.groups.find((g) => g.din276Group === '5xx')!;
    expect(kg5.subtotal.likely).toBeCloseTo(18 * 40);
  });

  it('lines without a Kostengruppe land in the null group, sorted last', () => {
    const t = buildEstimateTotals(
      [line(1, 10, 10, 10, null), line(1, 10, 10, 10, '41x'), line(1, 10, 10, 10, '')],
      10,
    );
    expect(t.groups.map((g) => g.din276Group)).toEqual(['41x', null]);
    expect(t.groups[1].lineCount).toBe(2); // null and '' fold together
  });

  it('contingency math: subtotal × pct, grand total = subtotal + contingency (ranges)', () => {
    const t = buildEstimateTotals([line(10, 100, 150, 200)], 10);
    expect(t.subtotal).toEqual({ low: 1000, likely: 1500, high: 2000 });
    expect(t.contingencyPct).toBe(10);
    expect(t.contingency.low).toBeCloseTo(100);
    expect(t.contingency.likely).toBeCloseTo(150);
    expect(t.contingency.high).toBeCloseTo(200);
    expect(t.grandTotal.low).toBeCloseTo(1100);
    expect(t.grandTotal.likely).toBeCloseTo(1650);
    expect(t.grandTotal.high).toBeCloseTo(2200);
    expect(t.warnings).toHaveLength(0);
  });

  it('null contingency NEVER computes silently — 0 applied + warning', () => {
    const t = buildEstimateTotals([line(10, 100, 150, 200)], null);
    expect(t.contingencyPct).toBe(0);
    expect(t.contingency).toEqual({ low: 0, likely: 0, high: 0 });
    expect(t.grandTotal.likely).toBeCloseTo(1500);
    expect(t.warnings.some((w) => w.includes('Contingency'))).toBe(true);
  });

  it('contingency below the 5 % minimum warns (but still computes with it)', () => {
    const t = buildEstimateTotals([line(10, 100, 150, 200)], 3);
    expect(t.contingencyPct).toBe(3);
    expect(t.contingency.likely).toBeCloseTo(45);
    expect(t.warnings.some((w) => w.includes('unter dem'))).toBe(true);
  });

  it('an empty estimate warns instead of pretending zero cost is a result', () => {
    const t = buildEstimateTotals([], 10);
    expect(t.subtotal).toEqual({ low: 0, likely: 0, high: 0 });
    expect(t.warnings.some((w) => w.includes('leer'))).toBe(true);
  });
});

describe('stalePriceWarnings', () => {
  const now = new Date('2026-08-01T12:00:00Z');

  it('flags prices older than 365 days with their age', () => {
    const w = stalePriceWarnings(
      [
        { position: 'Zisterne', priceDate: '2025-07-01' }, // 396 d → stale
        { position: 'Mulde', priceDate: '2026-06-01' }, // fresh
      ],
      now,
    );
    expect(w).toHaveLength(1);
    expect(w[0].position).toBe('Zisterne');
    expect(w[0].ageDays).toBe(396);
    expect(w[0].message).toContain('396 Tage');
  });

  it('does NOT flag a price exactly at the age limit', () => {
    const w = stalePriceWarnings([{ position: 'Aushub', priceDate: '2025-08-01' }], now);
    expect(w).toHaveLength(0); // 365 d — at the limit, not over it
  });

  it('flags missing price dates as unknown provenance', () => {
    const w = stalePriceWarnings([{ position: 'Manuell', priceDate: null }], now);
    expect(w).toHaveLength(1);
    expect(w[0].ageDays).toBeNull();
    expect(w[0].message).toContain('ohne Datum');
  });

  it('respects a custom maxAgeDays', () => {
    const w = stalePriceWarnings([{ position: 'X', priceDate: '2026-06-01' }], now, 30);
    expect(w).toHaveLength(1);
  });
});

describe('quantityFromValuetable', () => {
  const rows = [
    {
      worksheetCode: 'A138-07',
      symbol: 'V_storage',
      labelDe: 'Speichervolumen',
      value: '6,5',
      unit: 'm³',
      clauseReference: '5.2',
    },
    {
      worksheetCode: 'A138-07',
      symbol: 'A_infiltration',
      labelDe: 'Versickerungsfläche',
      value: '1.250',
      unit: 'm²',
      clauseReference: null,
    },
    {
      worksheetCode: 'A138-01',
      symbol: 'boden_typ',
      labelDe: 'Bodenart',
      value: 'Sand',
      unit: null,
      clauseReference: null,
    },
  ];

  it('parses de-DE decimal values back to numbers with unit + provenance', () => {
    const q = quantityFromValuetable(rows, 'V_storage');
    expect(q).not.toBeNull();
    expect(q!.value).toBeCloseTo(6.5);
    expect(q!.unit).toBe('m³');
    expect(q!.worksheetCode).toBe('A138-07');
  });

  it('parses de-DE thousands separators', () => {
    expect(quantityFromValuetable(rows, 'A_infiltration')!.value).toBe(1250);
  });

  it('returns null for a non-numeric value (never invents a quantity)', () => {
    expect(quantityFromValuetable(rows, 'boden_typ')).toBeNull();
  });

  it('returns null for an absent symbol', () => {
    expect(quantityFromValuetable(rows, 'Q_zu')).toBeNull();
  });
});

describe('zod — addCostItemSchema (no price without provenance)', () => {
  const valid = {
    orgId: UUID,
    position: 'Zisterne 6–8 m³',
    unit: 'm³',
    priceLowEur: 900,
    priceLikelyEur: 1200,
    priceHighEur: 1600,
    source: 'Angebot Fa. Muster 2026-07',
    priceDate: '2026-07-15',
    din276Group: '41x',
  };

  it('accepts a fully-provenanced item', () => {
    expect(addCostItemSchema.parse(valid).source).toBe('Angebot Fa. Muster 2026-07');
  });

  it('REJECTS a missing source', () => {
    expect(() => addCostItemSchema.parse({ ...valid, source: undefined })).toThrow();
  });

  it('REJECTS an empty/whitespace source', () => {
    expect(() => addCostItemSchema.parse({ ...valid, source: '   ' })).toThrow();
  });

  it('REJECTS a missing priceDate', () => {
    expect(() => addCostItemSchema.parse({ ...valid, priceDate: undefined })).toThrow();
  });

  it('REJECTS a malformed priceDate', () => {
    expect(() => addCostItemSchema.parse({ ...valid, priceDate: '15.07.2026' })).toThrow();
  });

  it('REJECTS negative prices', () => {
    expect(() => addCostItemSchema.parse({ ...valid, priceLowEur: -1 })).toThrow();
  });
});

describe('zod — contingency 5–15 bound', () => {
  it('accepts the bounds themselves', () => {
    expect(contingencyPctSchema.parse(CONTINGENCY_MIN_PCT)).toBe(5);
    expect(contingencyPctSchema.parse(CONTINGENCY_MAX_PCT)).toBe(15);
  });

  it('rejects below 5 and above 15', () => {
    expect(() => contingencyPctSchema.parse(4.9)).toThrow();
    expect(() => contingencyPctSchema.parse(15.1)).toThrow();
  });

  it('updateContingencySchema cannot null the contingency', () => {
    expect(() =>
      updateContingencySchema.parse({ estimateId: UUID, contingencyPct: null }),
    ).toThrow();
  });

  it('createEstimateSchema bounds an explicit contingencyPct too', () => {
    expect(() =>
      createEstimateSchema.parse({ projectId: UUID, title: 'KS', contingencyPct: 2 }),
    ).toThrow();
    expect(
      createEstimateSchema.parse({ projectId: UUID, title: 'KS', contingencyPct: 10 })
        .contingencyPct,
    ).toBe(10);
  });
});

describe('zod — addEstimateLineSchema (frozen-copy contract)', () => {
  it('accepts a catalog-backed line without explicit prices', () => {
    const parsed = addEstimateLineSchema.parse({
      estimateId: UUID,
      costItemId: UUID,
      position: 'Zisterne',
      quantity: 6.5,
      sourceSymbol: 'V_storage',
    });
    expect(parsed.costItemId).toBe(UUID);
  });

  it('REJECTS a manual line without all three prices (no invented ranges)', () => {
    expect(() =>
      addEstimateLineSchema.parse({
        estimateId: UUID,
        position: 'Aushub',
        quantity: 42,
        priceLikelyEur: 35,
      }),
    ).toThrow();
  });

  it('accepts a manual line with the full low/likely/high range', () => {
    const parsed = addEstimateLineSchema.parse({
      estimateId: UUID,
      position: 'Aushub',
      quantity: 42,
      priceLowEur: 28,
      priceLikelyEur: 35,
      priceHighEur: 50,
    });
    expect(parsed.priceHighEur).toBe(50);
  });

  it('REJECTS zero/negative quantities', () => {
    expect(() =>
      addEstimateLineSchema.parse({
        estimateId: UUID,
        costItemId: UUID,
        position: 'X',
        quantity: 0,
      }),
    ).toThrow();
  });
});

describe('zod — addContractorBidSchema', () => {
  it('requires bidder + amount', () => {
    expect(
      addContractorBidSchema.parse({ projectId: UUID, bidder: 'Fa. Muster', amountEur: 12500 })
        .bidder,
    ).toBe('Fa. Muster');
    expect(() =>
      addContractorBidSchema.parse({ projectId: UUID, bidder: '', amountEur: 12500 }),
    ).toThrow();
  });
});

describe('boundary sentence', () => {
  it('names the accuracy class and both things this document is NOT', () => {
    expect(SCHAETZUNG_BOUNDARY_SENTENCE).toContain('Kostenschätzung nach DIN 276');
    expect(SCHAETZUNG_BOUNDARY_SENTENCE).toContain('keine Kostenberechnung');
    expect(SCHAETZUNG_BOUNDARY_SENTENCE).toContain('kein Angebot');
  });
});
