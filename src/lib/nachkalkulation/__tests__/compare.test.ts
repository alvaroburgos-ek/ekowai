/**
 * Nachkalkulation pure-core tests (Slice E3).
 *
 * Covers compareHours (matching, aggregation, residue row, totals, null Δ%),
 * compareBids (best-bid selection, project-level residue, totals) and
 * calibrationSuggestions (threshold, actual>0 guard, exact string format).
 * The DB-bound read actions (`src/lib/actions/nachkalkulation.ts`) mirror the
 * offers/costs pattern and are exercised through the app (pure/DB split).
 */
import { describe, it, expect } from 'vitest';
import {
  compareHours,
  compareBids,
  calibrationSuggestions,
  UNMATCHED_POSITION_LABEL,
  TOTALS_LABEL,
  PROJECT_LEVEL_BID_LABEL,
  CALIBRATION_THRESHOLD_PCT,
  type HoursCompareRow,
} from '../compare';

// =============================================================================
// compareHours
// =============================================================================

describe('compareHours — matching + arithmetic', () => {
  it('matches effort entries to positions case-insensitively and trimmed', () => {
    const r = compareHours(
      [{ position: 'Versickerungsnachweis DWA-A 138', estimatedHours: 10 }],
      [
        { position: '  versickerungsnachweis dwa-a 138 ', hours: 4 },
        { position: 'VERSICKERUNGSNACHWEIS DWA-A 138', hours: 3 },
      ],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toEqual({
      position: 'Versickerungsnachweis DWA-A 138',
      estimated: 10,
      actual: 7,
      deltaHours: -3,
      deltaPct: -30,
    });
  });

  it('aggregates duplicate position names (estimated summed, first name kept)', () => {
    const r = compareHours(
      [
        { position: 'Bericht', estimatedHours: 4 },
        { position: ' bericht ', estimatedHours: 2 },
      ],
      [{ position: 'Bericht', hours: 3 }],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].position).toBe('Bericht');
    expect(r.rows[0].estimated).toBe(6);
    expect(r.rows[0].actual).toBe(3);
  });

  it('aggregates unmatched effort entries into the residue row (last)', () => {
    const r = compareHours(
      [{ position: 'Nachweis', estimatedHours: 8 }],
      [
        { position: 'Nachweis', hours: 5 },
        { position: 'Telefonate', hours: 1.5 },
        { position: 'Fahrt', hours: 0.5 },
      ],
    );
    expect(r.rows).toHaveLength(2);
    const residue = r.rows[1];
    expect(residue.position).toBe(UNMATCHED_POSITION_LABEL);
    expect(residue.estimated).toBe(0);
    expect(residue.actual).toBe(2);
    expect(residue.deltaHours).toBe(2);
    expect(residue.deltaPct).toBeNull(); // estimated = 0 → no honest %
  });

  it('emits no residue row when every entry matches', () => {
    const r = compareHours(
      [{ position: 'Nachweis', estimatedHours: 8 }],
      [{ position: 'Nachweis', hours: 5 }],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows.some((x) => x.position === UNMATCHED_POSITION_LABEL)).toBe(false);
  });

  it('deltaPct is null (not Infinity) for a 0-h estimated position', () => {
    const r = compareHours(
      [{ position: 'Pauschale', estimatedHours: 0 }],
      [{ position: 'Pauschale', hours: 2 }],
    );
    expect(r.rows[0].deltaPct).toBeNull();
    expect(r.rows[0].deltaHours).toBe(2);
  });

  it('totals row sums all rows including the residue', () => {
    const r = compareHours(
      [
        { position: 'A', estimatedHours: 10 },
        { position: 'B', estimatedHours: 5 },
      ],
      [
        { position: 'A', hours: 12 },
        { position: 'Sonstiges', hours: 3 },
      ],
    );
    expect(r.totals.position).toBe(TOTALS_LABEL);
    expect(r.totals.estimated).toBe(15);
    expect(r.totals.actual).toBe(15);
    expect(r.totals.deltaHours).toBe(0);
    expect(r.totals.deltaPct).toBe(0);
  });

  it('handles empty inputs (no rows, totals all zero, Δ% null)', () => {
    const r = compareHours([], []);
    expect(r.rows).toEqual([]);
    expect(r.totals).toEqual({
      position: TOTALS_LABEL,
      estimated: 0,
      actual: 0,
      deltaHours: 0,
      deltaPct: null,
    });
  });

  it('positions without any effort entry show actual 0', () => {
    const r = compareHours(
      [{ position: 'Noch offen', estimatedHours: 6 }],
      [],
    );
    expect(r.rows[0].actual).toBe(0);
    expect(r.rows[0].deltaHours).toBe(-6);
    expect(r.rows[0].deltaPct).toBe(-100);
  });
});

// =============================================================================
// compareBids
// =============================================================================

describe('compareBids', () => {
  const lines = [
    { position: 'Zisterne liefern + setzen', priceLikelyEur: 8000 },
    { position: 'Mulde herstellen', priceLikelyEur: 2000 },
  ];

  it('picks the LOWEST bid per position (case-insensitive, trimmed match)', () => {
    const r = compareBids(lines, [
      { position: ' zisterne liefern + setzen ', bidder: 'Fa. Alpha', amountEur: 9000 },
      { position: 'ZISTERNE LIEFERN + SETZEN', bidder: 'Fa. Beta', amountEur: 7500 },
    ]);
    const row = r.rows[0];
    expect(row.bestBid).toBe(7500);
    expect(row.bidder).toBe('Fa. Beta');
    expect(row.deltaEur).toBe(-500);
    expect(row.deltaPct).toBeCloseTo(-6.25);
  });

  it('positions without any bid carry nulls (visible coverage gap)', () => {
    const r = compareBids(lines, [
      { position: 'Zisterne liefern + setzen', bidder: 'Fa. Alpha', amountEur: 9000 },
    ]);
    const mulde = r.rows[1];
    expect(mulde.bestBid).toBeNull();
    expect(mulde.bidder).toBeNull();
    expect(mulde.deltaEur).toBeNull();
    expect(mulde.deltaPct).toBeNull();
  });

  it('null-position and unmatched-position bids form the project-level row', () => {
    const r = compareBids(lines, [
      { position: null, bidder: 'Fa. Gesamt', amountEur: 11000 },
      { position: 'Position die es nicht gibt', bidder: 'Fa. Tippfehler', amountEur: 10500 },
    ]);
    expect(r.projectLevel).not.toBeNull();
    expect(r.projectLevel!.position).toBe(PROJECT_LEVEL_BID_LABEL);
    // compared against the WHOLE estimate likely total (8000 + 2000)
    expect(r.projectLevel!.likely).toBe(10000);
    // best (lowest) of the project-level bids wins
    expect(r.projectLevel!.bestBid).toBe(10500);
    expect(r.projectLevel!.bidder).toBe('Fa. Tippfehler');
    expect(r.projectLevel!.deltaEur).toBe(500);
    expect(r.projectLevel!.deltaPct).toBeCloseTo(5);
    // unmatched bids never leak into per-position rows
    expect(r.rows.every((x) => x.bestBid === null)).toBe(true);
  });

  it('projectLevel is null when every bid matches a position', () => {
    const r = compareBids(lines, [
      { position: 'Mulde herstellen', bidder: 'Fa. Alpha', amountEur: 1900 },
    ]);
    expect(r.projectLevel).toBeNull();
  });

  it('totals: estimate likely vs. Σ best bids per position', () => {
    const r = compareBids(lines, [
      { position: 'Zisterne liefern + setzen', bidder: 'A', amountEur: 7500 },
      { position: 'Mulde herstellen', bidder: 'B', amountEur: 2600 },
    ]);
    expect(r.totals.position).toBe(TOTALS_LABEL);
    expect(r.totals.likely).toBe(10000);
    expect(r.totals.bestBid).toBe(10100); // 7500 + 2600
    expect(r.totals.deltaEur).toBe(100);
    expect(r.totals.deltaPct).toBeCloseTo(1);
    expect(r.totals.bidder).toBeNull();
  });

  it('totals bestBid is null when no position has a bid', () => {
    const r = compareBids(lines, []);
    expect(r.totals.bestBid).toBeNull();
    expect(r.totals.deltaEur).toBeNull();
    expect(r.totals.deltaPct).toBeNull();
  });

  it('duplicate line positions aggregate their likely totals', () => {
    const r = compareBids(
      [
        { position: 'Aushub', priceLikelyEur: 1000 },
        { position: ' aushub ', priceLikelyEur: 500 },
      ],
      [{ position: 'Aushub', bidder: 'A', amountEur: 1400 }],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].likely).toBe(1500);
    expect(r.rows[0].deltaEur).toBe(-100);
  });

  it('deltaPct is null when likely is 0 even with a bid', () => {
    const r = compareBids(
      [{ position: 'Gratisposten', priceLikelyEur: 0 }],
      [{ position: 'Gratisposten', bidder: 'A', amountEur: 100 }],
    );
    expect(r.rows[0].deltaEur).toBe(100);
    expect(r.rows[0].deltaPct).toBeNull();
  });
});

// =============================================================================
// calibrationSuggestions
// =============================================================================

describe('calibrationSuggestions', () => {
  const row = (over: Partial<HoursCompareRow>): HoursCompareRow => ({
    position: 'Nachweis',
    estimated: 10,
    actual: 14,
    deltaHours: 4,
    deltaPct: 40,
    ...over,
  });

  it('emits the exact suggestion format for |Δ%| ≥ threshold', () => {
    const s = calibrationSuggestions([row({})]);
    expect(s).toEqual(["Position 'Nachweis': Vorlage 10h → real 14h (Δ+40%)"]);
  });

  it('negative deviations keep their sign (no plus prefix)', () => {
    const s = calibrationSuggestions([
      row({ actual: 7, deltaHours: -3, deltaPct: -30 }),
    ]);
    expect(s).toEqual(["Position 'Nachweis': Vorlage 10h → real 7h (Δ-30%)"]);
  });

  it(`skips rows below the ${CALIBRATION_THRESHOLD_PCT} % threshold`, () => {
    expect(
      calibrationSuggestions([row({ actual: 11.5, deltaHours: 1.5, deltaPct: 15 })]),
    ).toEqual([]);
  });

  it('includes exactly the threshold value (>= not >)', () => {
    expect(
      calibrationSuggestions([row({ actual: 12, deltaHours: 2, deltaPct: 20 })]),
    ).toHaveLength(1);
    expect(
      calibrationSuggestions([row({ actual: 8, deltaHours: -2, deltaPct: -20 })]),
    ).toHaveLength(1);
  });

  it('skips rows without real work (actual = 0) even at −100 %', () => {
    expect(
      calibrationSuggestions([row({ actual: 0, deltaHours: -10, deltaPct: -100 })]),
    ).toEqual([]);
  });

  it('skips residue/0-estimate rows (deltaPct null — nothing to calibrate)', () => {
    expect(
      calibrationSuggestions([
        row({
          position: UNMATCHED_POSITION_LABEL,
          estimated: 0,
          actual: 5,
          deltaHours: 5,
          deltaPct: null,
        }),
      ]),
    ).toEqual([]);
  });

  it('formats fractional hours/percent de-DE with one decimal', () => {
    const s = calibrationSuggestions([
      row({ estimated: 2.5, actual: 3.25, deltaHours: 0.75, deltaPct: 30 }),
    ]);
    expect(s).toEqual(["Position 'Nachweis': Vorlage 2,5h → real 3,3h (Δ+30%)"]);
  });
});
