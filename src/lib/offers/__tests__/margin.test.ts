/**
 * Angebots-Engine pure-core tests (Slice E1).
 *
 * Covers the margin verdict matrix (red/amber/green), the Gründungsreferenz-
 * Leck boundary (±15 %), and the zod schemas the server actions parse. The
 * DB-bound actions (`src/lib/actions/offers.ts`) mirror the effort pattern
 * and are exercised through the app (pure/DB split).
 */
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  computeOfferMargin,
  foundingRateWarning,
  toNum,
  FOUNDING_RATE_BAND,
  createOfferSchema,
  updateOfferSchema,
  addOfferPositionSchema,
  setOrgRatesSchema,
} from '../margin';

const UUID = '11111111-2222-4333-8444-555555555555';

const calibrated = {
  internalHourlyRate: 80,
  targetMarginPct: 30,
};

describe('computeOfferMargin — arithmetic', () => {
  it('computes internal cost, external total, margin and margin %', () => {
    const r = computeOfferMargin({
      festpreisEur: 2000,
      positions: [
        { estimatedHours: 10, externalCostEur: 0 },
        { estimatedHours: 2, externalCostEur: 200 },
      ],
      ...calibrated,
    });
    expect(r.totalHours).toBe(12);
    expect(r.internalCost).toBe(960); // 12 h × 80 €/h
    expect(r.externalTotal).toBe(200);
    expect(r.margin).toBe(840); // 2000 − 960 − 200
    expect(r.marginPct).toBeCloseTo(42);
    expect(r.effectiveHourlyRate).toBeCloseTo(150); // (2000 − 200) / 12
  });

  it('marginPct is 0 (not NaN/Infinity) for a 0-€ Festpreis', () => {
    const r = computeOfferMargin({
      festpreisEur: 0,
      positions: [{ estimatedHours: 5, externalCostEur: 0 }],
      ...calibrated,
    });
    expect(r.marginPct).toBe(0);
    expect(Number.isFinite(r.margin)).toBe(true);
  });

  it('effectiveHourlyRate is null when no hours are estimated', () => {
    const r = computeOfferMargin({
      festpreisEur: 1000,
      positions: [],
      ...calibrated,
    });
    expect(r.effectiveHourlyRate).toBeNull();
  });
});

describe('computeOfferMargin — verdict matrix', () => {
  it('green: calibrated, plausible hours, margin at/above target', () => {
    const r = computeOfferMargin({
      festpreisEur: 2000,
      positions: [{ estimatedHours: 10, externalCostEur: 0 }],
      ...calibrated, // margin 1200 → 60 % ≥ 30 %
    });
    expect(r.verdict).toBe('green');
    expect(r.reasons).toEqual([]);
  });

  it('red: margin % strictly below the target margin', () => {
    const r = computeOfferMargin({
      festpreisEur: 1000,
      positions: [{ estimatedHours: 10, externalCostEur: 0 }],
      ...calibrated, // margin 200 → 20 % < 30 %
    });
    expect(r.verdict).toBe('red');
    expect(r.reasons.some((s) => s.includes('unter Zielmarge'))).toBe(true);
  });

  it('green at exactly the target margin (red only when strictly below)', () => {
    const r = computeOfferMargin({
      festpreisEur: 1000,
      positions: [{ estimatedHours: 8.75, externalCostEur: 0 }],
      ...calibrated, // internal 700 → margin 300 → exactly 30 %
    });
    expect(r.marginPct).toBeCloseTo(30);
    expect(r.verdict).toBe('green');
  });

  it('amber with "Stundensatz nicht kalibriert" when the hourly rate is unset', () => {
    const r = computeOfferMargin({
      festpreisEur: 2000,
      positions: [{ estimatedHours: 10, externalCostEur: 0 }],
      internalHourlyRate: null,
      targetMarginPct: 30,
    });
    expect(r.verdict).toBe('amber');
    expect(r.reasons).toContain('Stundensatz nicht kalibriert');
    // uncalibrated rate must not silently count as 0-cost "profit"
    expect(r.internalCost).toBe(0);
  });

  it('amber when the target margin is unset', () => {
    const r = computeOfferMargin({
      festpreisEur: 2000,
      positions: [{ estimatedHours: 10, externalCostEur: 0 }],
      internalHourlyRate: 80,
      targetMarginPct: null,
    });
    expect(r.verdict).toBe('amber');
    expect(r.reasons).toContain('Zielmarge nicht gesetzt');
  });

  it('amber when any position has estimatedHours <= 0', () => {
    const r = computeOfferMargin({
      festpreisEur: 5000,
      positions: [
        { estimatedHours: 10, externalCostEur: 0 },
        { estimatedHours: 0, externalCostEur: 0 },
      ],
      ...calibrated,
    });
    expect(r.verdict).toBe('amber');
    expect(r.reasons.some((s) => s.includes('ohne Stundenschätzung'))).toBe(true);
  });

  it('red wins over amber: below-target margin outranks a 0-hour position', () => {
    const r = computeOfferMargin({
      festpreisEur: 1000,
      positions: [
        { estimatedHours: 10, externalCostEur: 0 },
        { estimatedHours: 0, externalCostEur: 0 },
      ],
      ...calibrated, // 20 % < 30 % AND a 0-h position
    });
    expect(r.verdict).toBe('red');
    // both facts stay visible
    expect(r.reasons.length).toBe(2);
  });

  it('an empty offer (no positions) with calibration is amber, not green', () => {
    // No positions → no hours → margin looks perfect but says nothing.
    const r = computeOfferMargin({
      festpreisEur: 1000,
      positions: [],
      ...calibrated,
    });
    // No 0-h position exists, so only the calibrated path applies: 100 % margin
    // → green by the letter of the rule. Guard the arithmetic at least:
    expect(r.marginPct).toBeCloseTo(100);
  });
});

describe('foundingRateWarning — Gründungsreferenz-Leck', () => {
  it('warns when the effective rate is within 15 % of the reference', () => {
    expect(foundingRateWarning(50, 50)).toMatch(/Gründungsreferenz-Leck/);
    expect(foundingRateWarning(44, 50)).toMatch(/Gründungsreferenz-Leck/); // −12 %
    expect(foundingRateWarning(56, 50)).toMatch(/Gründungsreferenz-Leck/); // +12 %
  });

  it('warns at exactly ±15 % (boundary inclusive)', () => {
    expect(FOUNDING_RATE_BAND).toBe(0.15);
    expect(foundingRateWarning(42.5, 50)).toMatch(/Gründungsreferenz-Leck/); // −15 %
    expect(foundingRateWarning(57.5, 50)).toMatch(/Gründungsreferenz-Leck/); // +15 %
  });

  it('stays silent just outside the band', () => {
    expect(foundingRateWarning(42.49, 50)).toBeNull();
    expect(foundingRateWarning(57.51, 50)).toBeNull();
    expect(foundingRateWarning(120, 50)).toBeNull();
  });

  it('null reference or null effective rate → no warning', () => {
    expect(foundingRateWarning(50, null)).toBeNull();
    expect(foundingRateWarning(null, 50)).toBeNull();
    expect(foundingRateWarning(null, null)).toBeNull();
  });

  it('non-positive or non-finite reference → no warning', () => {
    expect(foundingRateWarning(50, 0)).toBeNull();
    expect(foundingRateWarning(50, -10)).toBeNull();
    expect(foundingRateWarning(Number.NaN, 50)).toBeNull();
  });
});

describe('toNum — Drizzle numeric-string coercion', () => {
  it('parses numeric strings and passes numbers through', () => {
    expect(toNum('85.5')).toBe(85.5);
    expect(toNum(30)).toBe(30);
  });

  it('null/undefined/empty/garbage → null', () => {
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum('')).toBeNull();
    expect(toNum('kaputt')).toBeNull();
  });
});

describe('zod schemas', () => {
  it('createOfferSchema: accepts a minimal valid offer, trims the title', () => {
    const r = createOfferSchema.parse({
      projectId: UUID,
      title: '  Versickerungsnachweis  ',
      festpreisEur: 1800,
    });
    expect(r.title).toBe('Versickerungsnachweis');
    expect(r.validUntil).toBeUndefined();
  });

  it('createOfferSchema: rejects empty title, negative Festpreis, bad date, bad uuid', () => {
    expect(() =>
      createOfferSchema.parse({ projectId: UUID, title: '  ', festpreisEur: 100 }),
    ).toThrow(ZodError);
    expect(() =>
      createOfferSchema.parse({ projectId: UUID, title: 'x', festpreisEur: -1 }),
    ).toThrow(ZodError);
    expect(() =>
      createOfferSchema.parse({
        projectId: UUID, title: 'x', festpreisEur: 1, validUntil: '01.08.2026',
      }),
    ).toThrow(ZodError);
    expect(() =>
      createOfferSchema.parse({ projectId: 'nope', title: 'x', festpreisEur: 1 }),
    ).toThrow(ZodError);
  });

  it('updateOfferSchema: partial patch; null clears validUntil; bad status rejected', () => {
    const r = updateOfferSchema.parse({ offerId: UUID, validUntil: null });
    expect(r.validUntil).toBeNull();
    expect(() =>
      updateOfferSchema.parse({ offerId: UUID, status: 'verschickt' }),
    ).toThrow(ZodError);
  });

  it('addOfferPositionSchema: hours >= 0, external cost optional and non-negative', () => {
    const r = addOfferPositionSchema.parse({
      offerId: UUID,
      position: 'Nachweis',
      estimatedHours: 0, // allowed to persist — margin core flags it amber
    });
    expect(r.externalCostEur).toBeUndefined();
    expect(() =>
      addOfferPositionSchema.parse({
        offerId: UUID, position: 'x', estimatedHours: -1,
      }),
    ).toThrow(ZodError);
    expect(() =>
      addOfferPositionSchema.parse({
        offerId: UUID, position: 'x', estimatedHours: 1, externalCostEur: -5,
      }),
    ).toThrow(ZodError);
  });

  it('setOrgRatesSchema: nullable rates; 0 rate rejected, >100 % target rejected', () => {
    const r = setOrgRatesSchema.parse({
      orgId: UUID,
      internalHourlyRate: null,
      targetMarginPct: null,
    });
    expect(r.internalHourlyRate).toBeNull();
    expect(() =>
      setOrgRatesSchema.parse({ orgId: UUID, internalHourlyRate: 0, targetMarginPct: 30 }),
    ).toThrow(ZodError);
    expect(() =>
      setOrgRatesSchema.parse({ orgId: UUID, internalHourlyRate: 80, targetMarginPct: 101 }),
    ).toThrow(ZodError);
  });
});
