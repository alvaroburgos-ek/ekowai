import { describe, it, expect } from 'vitest';
import {
  normalizeRiskCarrier,
  newRiskEntry,
  sampleStats,
  probabilityStats,
  impactStats,
  riskProducts,
  riskStats,
  hasDivergence,
  isRiskRowComplete,
  summarizeRiskRegister,
  ASSESSORS,
  RISK_GROUPS,
  RISK_GROUP_LABELS,
  PROBABILITY_ANCHORS,
  IMPACT_ANCHORS,
  SCORE_EXAMPLE_LABELS,
  type RiskEntry,
} from '../risk-register';

/** Rounds like the UI's one-decimal display (Tab. A.1 prints one decimal). */
function round1(v: number | null): number | null {
  return v == null ? null : Math.round(v * 10) / 10;
}

function entryWithRatings(
  ratings: Partial<Record<(typeof ASSESSORS)[number], { probability: number | null; impact: number | null }>>,
  patch: Partial<RiskEntry> = {},
): RiskEntry {
  const e = newRiskEntry();
  return {
    ...e,
    risk: 'X',
    ...patch,
    ratings: { ...e.ratings, ...ratings },
  };
}

describe('risk-register — guideline data (DWA-M 820-1 Tab. A.1)', () => {
  it('encodes all 11 printed Risikogruppen in order', () => {
    expect(RISK_GROUP_LABELS).toEqual([
      'Rahmenbedingungen des Projekts',
      'Projektumfeld',
      'Umwelt, Ökologie',
      'Rechtliche Aspekte',
      'Projektvorgaben',
      'Beteiligte und Betroffene',
      'Betrieb',
      'Projektorganisation',
      'Projektablauf',
      'Technik',
      'Sicherheit',
    ]);
  });

  it('every group carries at least one printed example risk', () => {
    for (const g of RISK_GROUPS) expect(g.examples.length).toBeGreaterThan(0);
  });

  it('probability/impact anchors and score labels match the printed values', () => {
    expect(PROBABILITY_ANCHORS[0]).toMatch(/tritt nicht ein/);
    expect(PROBABILITY_ANCHORS[10]).toMatch(/Hohe Wahrscheinlichkeit/);
    expect(IMPACT_ANCHORS[10]).toMatch(/Katastrophe/);
    // The three printed EXAMPLE score points (not band boundaries).
    expect(SCORE_EXAMPLE_LABELS[0]).toBe('Kein Risiko');
    expect(SCORE_EXAMPLE_LABELS[25]).toBe('Mittleres Risiko');
    expect(SCORE_EXAMPLE_LABELS[100]).toBe('Sehr großes Risiko');
  });

  it('names the three printed assessors', () => {
    expect(ASSESSORS).toEqual(['bauherr', 'planer', 'betrieb']);
  });
});

describe('sampleStats — M-Wert + S-Abweichung (SAMPLE stdev, n−1)', () => {
  it('reproduces the printed worked example row "Einsprachen/Auflagen"', () => {
    // Tab. A.1 (S. 44): prob {8,8,9} → M 8,3 / S 0,6.
    const p = sampleStats([8, 8, 9]);
    expect(p.mean).toBeCloseTo(8.3333, 3);
    expect(round1(p.mean)).toBe(8.3);
    expect(p.sdev).toBeCloseTo(0.5774, 3);
    expect(round1(p.sdev)).toBe(0.6); // population stdev would round to 0,5 — wrong

    // Schaden {2,2,2} → M 2,0 / S 0,0.
    const i = sampleStats([2, 2, 2]);
    expect(i.mean).toBe(2);
    expect(i.sdev).toBe(0);

    // Risiko {16,16,18} → M 16,7 / S 1,2.
    const r = sampleStats([16, 16, 18]);
    expect(r.mean).toBeCloseTo(16.6667, 3);
    expect(round1(r.mean)).toBe(16.7);
    expect(r.sdev).toBeCloseTo(1.1547, 3);
    expect(round1(r.sdev)).toBe(1.2); // population stdev would round to 0,9 — wrong
  });

  it('handles empty and single-value inputs honestly', () => {
    expect(sampleStats([])).toEqual({ mean: null, sdev: null, n: 0 });
    const s = sampleStats([7]);
    expect(s.mean).toBe(7);
    expect(s.sdev).toBeNull(); // n−1 undefined for n=1 — never invent a spread
    expect(s.n).toBe(1);
  });
});

describe('per-entry derivations (Tab. A.1 structure)', () => {
  const example = entryWithRatings({
    bauherr: { probability: 8, impact: 2 },
    planer: { probability: 8, impact: 2 },
    betrieb: { probability: 9, impact: 2 },
  });

  it('probability/impact stats run over the three assessors', () => {
    expect(round1(probabilityStats(example).mean)).toBe(8.3);
    expect(round1(probabilityStats(example).sdev)).toBe(0.6);
    expect(impactStats(example).mean).toBe(2);
    expect(impactStats(example).sdev).toBe(0);
  });

  it('Risiko is computed per assessor (Pᵢ×Iᵢ), stats over the PRODUCTS', () => {
    expect(riskProducts(example)).toEqual({ bauherr: 16, planer: 16, betrieb: 18 });
    const rs = riskStats(example);
    expect(round1(rs.mean)).toBe(16.7);
    expect(round1(rs.sdev)).toBe(1.2);
    expect(rs.n).toBe(3);
  });

  it('an assessor with an incomplete pair contributes no Risiko product', () => {
    const partial = entryWithRatings({
      bauherr: { probability: 8, impact: 2 },
      planer: { probability: 8, impact: null },
      betrieb: { probability: null, impact: null },
    });
    expect(riskProducts(partial)).toEqual({ bauherr: 16, planer: null, betrieb: null });
    const rs = riskStats(partial);
    expect(rs.mean).toBe(16);
    expect(rs.sdev).toBeNull(); // only one product → no spread claimed
    // probability mean still uses both entered values
    expect(probabilityStats(partial).n).toBe(2);
  });

  it('hasDivergence is a factual non-unanimity flag (>0), no magnitude cutoff', () => {
    expect(hasDivergence(example)).toBe(true); // 8,8,9 differ
    const unanimous = entryWithRatings({
      bauherr: { probability: 5, impact: 4 },
      planer: { probability: 5, impact: 4 },
      betrieb: { probability: 5, impact: 4 },
    });
    expect(hasDivergence(unanimous)).toBe(false);
  });

  it('isRiskRowComplete requires a name plus all three assessors, both dims', () => {
    expect(isRiskRowComplete(example)).toBe(true);
    expect(isRiskRowComplete({ ...example, risk: '' })).toBe(false);
    expect(
      isRiskRowComplete(
        entryWithRatings({
          bauherr: { probability: 8, impact: 2 },
          planer: { probability: 8, impact: 2 },
          betrieb: { probability: 9, impact: null },
        }),
      ),
    ).toBe(false);
  });
});

describe('normalizeRiskCarrier — defensive parsing + legacy migration', () => {
  it('coerces a legacy free-text blob / unknown shape to an empty register', () => {
    expect(normalizeRiskCarrier('some old note')).toEqual({ rows: [] });
    expect(normalizeRiskCarrier(null)).toEqual({ rows: [] });
    expect(normalizeRiskCarrier({ foo: 1 })).toEqual({ rows: [] });
  });

  it('migrates a legacy single-value row: value replicated to all three assessors + flag', () => {
    const c = normalizeRiskCarrier({
      rows: [{ id: 'a', group: 'Betrieb', risk: 'x', probability: 6, impact: 3, mitigation: 'm' }],
    });
    const row = c.rows[0];
    for (const a of ASSESSORS) {
      expect(row.ratings[a]).toEqual({ probability: 6, impact: 3 });
    }
    expect(row.migratedFromSingle).toBe(true);
    // M-Wert preserved exactly; S-Abw 0 is the disclosed migration artifact.
    expect(riskStats(row).mean).toBe(18);
    expect(riskStats(row).sdev).toBe(0);
    expect(row.description).toBe('');
  });

  it('does not flag legacy rows that carried no values at all', () => {
    const c = normalizeRiskCarrier({
      rows: [{ id: 'a', group: '', risk: 'x', probability: null, impact: null, mitigation: '' }],
    });
    expect(c.rows[0].migratedFromSingle).toBe(false);
  });

  it('parses the new multi-assessor shape and clamps out-of-range values to null', () => {
    const c = normalizeRiskCarrier({
      rows: [
        {
          id: 'a',
          group: 'Betrieb',
          risk: 'x',
          description: 'Beschreibung',
          ratings: {
            bauherr: { probability: 42, impact: -3 }, // out of range → null
            planer: { probability: 6.6, impact: 3 }, // fractional → rounded
            betrieb: { probability: 9, impact: 2 },
          },
          migratedFromSingle: false,
        },
      ],
    });
    const row = c.rows[0];
    expect(row.ratings.bauherr).toEqual({ probability: null, impact: null });
    expect(row.ratings.planer).toEqual({ probability: 7, impact: 3 });
    expect(row.ratings.betrieb).toEqual({ probability: 9, impact: 2 });
    expect(row.description).toBe('Beschreibung');
  });
});

describe('summarizeRiskRegister — DERIVED aggregates (never hand-entered)', () => {
  it('counts, per-assessor completeness, max/mean Risiko M-Wert, max S-Abw', () => {
    const full = entryWithRatings(
      {
        bauherr: { probability: 8, impact: 2 },
        planer: { probability: 8, impact: 2 },
        betrieb: { probability: 9, impact: 2 },
      },
      { risk: 'A' },
    );
    const partial = entryWithRatings(
      { bauherr: { probability: 5, impact: 4 } },
      { risk: 'B' },
    );
    const unnamed = newRiskEntry(); // no name → not counted
    const s = summarizeRiskRegister({ rows: [full, partial, unnamed] });
    expect(s.count).toBe(2);
    expect(s.assessed).toBe(2); // both have ≥1 computable product
    expect(s.fullyAssessed).toBe(1); // only `full` has all three assessors
    expect(s.maxScore).toBe(20); // partial: 5×4=20 > 16,67
    expect(s.meanScore).toBeCloseTo((16.6667 + 20) / 2, 3);
    expect(round1(s.maxDivergence)).toBe(1.2); // from the worked-example row
  });

  it('empty register yields nulls, not zeros pretending to be scores', () => {
    const s = summarizeRiskRegister({ rows: [] });
    expect(s.count).toBe(0);
    expect(s.maxScore).toBeNull();
    expect(s.meanScore).toBeNull();
    expect(s.maxDivergence).toBeNull();
  });
});