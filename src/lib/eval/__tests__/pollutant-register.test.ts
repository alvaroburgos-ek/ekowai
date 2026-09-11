import { describe, it, expect } from 'vitest';
import {
  normalizePollutantCarrier,
  newPollutantRow,
  pollutantRowComplete,
  summarizePollutants,
  POLLUTANT_OUTPUT_SYMBOLS,
} from '../pollutant-register';
import { POLLUTANTS, lookupPollutant } from '@/lib/vsme/pollutants';

const NH3 = 'AmmoniaNH3Member';
const ZINC = 'ZincAndCompoundsZnMember';

function row(over: Partial<ReturnType<typeof newPollutantRow>>) {
  return { ...newPollutantRow(), ...over };
}

describe('generated E-PRTR pollutant list', () => {
  it('is the full taxonomy member set (94), unique, labeled', () => {
    expect(POLLUTANTS.length).toBe(94);
    expect(new Set(POLLUTANTS.map((p) => p.value)).size).toBe(94);
    for (const p of POLLUTANTS) {
      expect(p.labelEn.length).toBeGreaterThan(0);
      expect(p.labelDe.length).toBeGreaterThan(0);
    }
    expect(lookupPollutant(NH3)?.labelEn).toBe('Ammonia (NH3)');
  });
});

describe('normalizePollutantCarrier', () => {
  it('defaults for null/garbage/legacy shapes', () => {
    expect(normalizePollutantCarrier(null)).toEqual({ not_applicable: false, rows: [] });
    expect(normalizePollutantCarrier('x')).toEqual({ not_applicable: false, rows: [] });
    expect(normalizePollutantCarrier({ rows: 'nope' })).toEqual({ not_applicable: false, rows: [] });
  });

  it('preserves valid rows and nulls unknown pollutants/media', () => {
    const c = normalizePollutantCarrier({
      not_applicable: false,
      rows: [
        { id: 'r1', label: 'Lackieranlage', pollutant: NH3, medium: 'air', amount_t: 0.4 },
        { id: 'r2', label: '', pollutant: 'NotAPollutantMember', medium: 'lava', amount_t: '3' },
      ],
    });
    expect(c.rows).toHaveLength(2);
    expect(c.rows[0]).toEqual({ id: 'r1', label: 'Lackieranlage', pollutant: NH3, medium: 'air', amount_t: 0.4 });
    expect(c.rows[1].pollutant).toBeNull();
    expect(c.rows[1].medium).toBeNull();
    expect(c.rows[1].amount_t).toBeNull();
  });

  it('coerces not_applicable strictly to boolean true', () => {
    expect(normalizePollutantCarrier({ not_applicable: 'yes', rows: [] }).not_applicable).toBe(false);
    expect(normalizePollutantCarrier({ not_applicable: true, rows: [] }).not_applicable).toBe(true);
  });
});

describe('pollutantRowComplete', () => {
  it('requires pollutant, medium, and a finite non-negative amount', () => {
    expect(pollutantRowComplete(row({ pollutant: NH3, medium: 'air', amount_t: 0 }))).toBe(true);
    expect(pollutantRowComplete(row({ pollutant: NH3, medium: 'air', amount_t: -1 }))).toBe(false);
    expect(pollutantRowComplete(row({ pollutant: null, medium: 'air', amount_t: 1 }))).toBe(false);
    expect(pollutantRowComplete(row({ pollutant: NH3, medium: null, amount_t: 1 }))).toBe(false);
    expect(pollutantRowComplete(row({ pollutant: NH3, medium: 'air', amount_t: null }))).toBe(false);
  });
});

describe('summarizePollutants', () => {
  it('empty register without N/A asserts nothing (null sums)', () => {
    expect(summarizePollutants({ not_applicable: false, rows: [] })).toEqual({
      air: null, water: null, soil: null, complete: 0, total: 0,
    });
  });

  it('not_applicable is an explicit zero statement for all media', () => {
    const s = summarizePollutants({
      not_applicable: true,
      rows: [row({ pollutant: NH3, medium: 'air', amount_t: 5 })],
    });
    expect(s).toEqual({ air: 0, water: 0, soil: 0, complete: 0, total: 1 });
  });

  it('sums complete rows per medium; untouched media are 0 once something is asserted', () => {
    const s = summarizePollutants({
      not_applicable: false,
      rows: [
        row({ pollutant: NH3, medium: 'air', amount_t: 0.4 }),
        row({ pollutant: ZINC, medium: 'air', amount_t: 0.1 }),
        row({ pollutant: ZINC, medium: 'water', amount_t: 0.25 }),
        row({ pollutant: null, medium: 'soil', amount_t: 99 }), // incomplete → excluded
      ],
    });
    expect(s.air).toBeCloseTo(0.5, 10);
    expect(s.water).toBeCloseTo(0.25, 10);
    expect(s.soil).toBe(0);
    expect(s.complete).toBe(3);
    expect(s.total).toBe(4);
  });
});

describe('output symbol contract', () => {
  it('matches the VSME-B04.100 scalar field symbols', () => {
    expect(POLLUTANT_OUTPUT_SYMBOLS).toEqual({
      air: 'AmountOfEmissionToAir',
      water: 'AmountOfEmissionToWater',
      soil: 'AmountOfEmissionToSoil',
    });
  });
});
