/**
 * A138-13 Gl. 8 — V_VA master sizing over the KOSTRA duration table.
 *
 *   V_VA(D) = (r_D(n) · (A_C + A_VA) · 10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³
 *
 * Acceptance gates (see audit-reports/DWA-A-138-1/_eval-reference-Gl8.md):
 *   - max V_VA = 18.684 m³ at governing D = 30 min, for the Heinsberg-like
 *     KOSTRA table + scalars.
 *   - Empty / incomplete carrier → manual_required, no number.
 *   - Wrong unit on the table → manual_required (silent-error trap), no
 *     number.
 *   - Missing scalar → manual_required, names it.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';
import type { KostraCarrier, Gl8Scalars } from './aggregators';

const GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const GL8_FORMULA = 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3';

const SCALARS: Gl8Scalars = {
  A_C: 1000,
  A_VA: 50,
  Q_S: 5,
  Q_Dr: 0,
  f_Z: 1.2,
  f_A: 1.0,
};

const KOSTRA: KostraCarrier = {
  rows: [
    { id: '5', D_min: 5, r_D_n: 300 },
    { id: '10', D_min: 10, r_D_n: 230 },
    { id: '15', D_min: 15, r_D_n: 195 },
    { id: '30', D_min: 30, r_D_n: 130 },
    { id: '60', D_min: 60, r_D_n: 80 },
    { id: '120', D_min: 120, r_D_n: 50 },
  ],
};

function req(
  o: {
    kostraTable?: KostraCarrier | null;
    gl8Scalars?: Partial<Gl8Scalars> | null;
    kostraUnit?: string | null;
  } = {},
): EvalRequest {
  const scalars = o.gl8Scalars === null ? null : { ...SCALARS, ...(o.gl8Scalars ?? {}) };
  return {
    equationId: GL8_ID,
    formula: GL8_FORMULA,
    inputSymbols: ['Q_zu', 'Q_S', 'Q_Dr', 'D', 'f_Z', 'f_A'],
    outputSymbol: 'V_VA',
    inputs: [],
    aggregator: {
      kostraTable: o.kostraTable === undefined ? KOSTRA : o.kostraTable,
      gl8Scalars: scalars as Gl8Scalars | null,
      kostraUnit: o.kostraUnit === undefined ? 'l/(s·ha)' : o.kostraUnit,
    },
  };
}

describe('A138-13 Gl. 8 — V_VA over KOSTRA', () => {
  it('reproduces the hand calc: max V_VA = 18.684 m³ at governing D = 30 min', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(r.substituted['MAX V_VA (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['Maßgebende Dauerstufe D (min)']).toBe(30);
  });

  it('surfaces a per-row contribution for each of the six durations', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // 6 row entries + 'MAX V_VA' + 'Maßgebende Dauerstufe D' = 8 keys
    expect(Object.keys(r.substituted)).toHaveLength(8);
    // Per-row magnitudes against the hand calc (precision 0.001)
    const byD: Record<number, number> = {};
    for (const [k, v] of Object.entries(r.substituted)) {
      const m = k.match(/^D = (\d+) min/);
      if (m) byD[Number(m[1])] = v as number;
    }
    expect(byD[5]).toBeCloseTo(9.54, 3);
    expect(byD[10]).toBeCloseTo(13.788, 3);
    expect(byD[15]).toBeCloseTo(16.713, 3);
    expect(byD[30]).toBeCloseTo(18.684, 3);
    expect(byD[60]).toBeCloseTo(14.688, 3);
    expect(byD[120]).toBeCloseTo(2.16, 3);
  });

  it('changing the table can change the governing duration (sanity)', () => {
    // Make a hypothetical case where D=15 wins (boost r_D at D=15, drop D=30)
    const r = evaluateFormula(
      req({
        kostraTable: {
          rows: [
            { id: '5', D_min: 5, r_D_n: 300 },
            { id: '15', D_min: 15, r_D_n: 300 }, // boosted
            { id: '30', D_min: 30, r_D_n: 80 }, // dropped
          ],
        },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.substituted['Maßgebende Dauerstufe D (min)']).toBe(15);
  });

  it('THE silent-error trap: wrong unit "m/s" on the table → manual_required, NO number', () => {
    const r = evaluateFormula(req({ kostraUnit: 'm/s' }));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([
      { symbol: 'r_D(n)', expected: 'l/(s·ha)', actual: 'm/s' },
    ]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('also rejects "mm/h" — engineer\'s frequent confusion', () => {
    const r = evaluateFormula(req({ kostraUnit: 'mm/h' }));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts?.[0].actual).toBe('mm/h');
  });

  it('empty table → manual_required, no number', () => {
    const r = evaluateFormula(req({ kostraTable: { rows: [] } }));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/mindestens eine Dauerstufe/);
  });

  it('incomplete row (D set, r_D missing) → manual_required naming the row', () => {
    const r = evaluateFormula(
      req({
        kostraTable: {
          rows: [
            { id: 'a', D_min: 15, r_D_n: 195 },
            { id: 'b', D_min: 30, r_D_n: null }, // missing r_D
          ],
        },
      }),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/D = 30 min/);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('missing scalar (f_Z) → manual_required naming it', () => {
    const r = evaluateFormula(req({ gl8Scalars: { f_Z: null } }));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toContain('f_Z');
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('no carrier at all → manual_required', () => {
    const r = evaluateFormula(req({ kostraTable: null }));
    expect(r.kind).toBe('manual_required');
  });

  it('no scalars at all → manual_required listing all six', () => {
    const r = evaluateFormula(req({ gl8Scalars: null }));
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A']);
  });
});
