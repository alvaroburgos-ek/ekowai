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
    expect(r.substituted['MAX V_VA brutto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_VA netto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['Maßgebende Dauerstufe D (min)']).toBe(30);
  });

  it('surfaces a per-row contribution for each of the six durations', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // 6 row entries + 'MAX V_VA brutto' + 'Maßgebende Dauerstufe D' + 'V_VA netto' = 9 keys
    // (no cistern fields entered → no Zisternen-Anrechnung rows).
    expect(Object.keys(r.substituted)).toHaveLength(9);
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

/**
 * Task 2 — warnings channel: boundary-limited governing duration.
 *
 * When the maximum V_VA occurs at the longest tabulated D (no interior
 * maximum), the basin aggregator must emit a non-blocking German caveat on
 * the `warnings` field of the computed EvalState (§5.3.3.7 / DWA-A 117).
 */
describe('Gl. 8 boundary-limited warnings (Task 2)', () => {
  it('emits a boundary-limited warning when governing D is the longest tabulated D', () => {
    // Monotonic-rising V_VA: r_D grows with D so the longest D (1440 min) wins.
    const r = evaluateFormula(
      req({
        kostraTable: {
          rows: [
            { id: '5',    D_min: 5,    r_D_n: 50  },
            { id: '60',   D_min: 60,   r_D_n: 80  },
            { id: '1440', D_min: 1440, r_D_n: 120 },
          ],
        },
        gl8Scalars: SCALARS,
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.substituted['Maßgebende Dauerstufe D (min)']).toBe(1440);
    expect(r.warnings?.[0]).toMatch(/eindeutiges Maximum|Tabellenrand/i);
  });

  it('emits no warning for an interior governing duration (witness shape unchanged)', () => {
    // Standard KOSTRA table — governing D = 30 min (interior, not the longest).
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.substituted['Maßgebende Dauerstufe D (min)']).toBe(30);
    expect(r.warnings).toBeUndefined();
  });
});

/**
 * Pile-8 — Zisternen-Anrechenbarkeit §6.1 L1596.
 *
 * Source quote (verbatim, §6.1 L1596): "Speicherräume können für eine
 * Rückhaltung des Niederschlagswassers rechnerisch nur angesetzt werden,
 * wenn sie ein zwangsentleertes Teilvolumen aufweisen …"
 *
 * Contract: V_Zisterne reduces V_VA only when zisterne_zwangsentleerung
 * === true. Otherwise V_VA is left unchanged (= brutto). Backwards-
 * compatible: missing/null cistern fields leave the engine's pre-Pile-8
 * behaviour unchanged.
 *
 * V_VA_brutto = 18.684 m³ for the default scalars + KOSTRA table.
 */
describe('Gl. 8 cistern crediting (Pile-8, §6.1 L1596)', () => {
  it('CREDITED — zwangsentleerung=true, V_Zisterne=5 → V_VA reduced to 13.684 m³', () => {
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: 5, zisterne_zwangsentleerung: true },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684 - 5, 3);
    expect(r.substituted['MAX V_VA brutto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_VA netto (m³)']).toBeCloseTo(13.684, 3);
    expect(r.substituted['V_Zisterne (m³, gemeldet)']).toBe(5);
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✓)'],
    ).toBe(-5);
    // The notice in the formulaEvaluated string makes the credit visible
    // in the audit trail.
    expect(r.formulaEvaluated).toMatch(/V_Zisterne.*Zwangsentleerung vorhanden/);
  });

  it('NOT CREDITED — zwangsentleerung=false, V_Zisterne=5 → V_VA unchanged at 18.684 m³', () => {
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: 5, zisterne_zwangsentleerung: false },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(r.substituted['MAX V_VA brutto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_VA netto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_Zisterne (m³, gemeldet)']).toBe(5);
    // The exclusion is explicit in the substituted map so the engineer
    // sees that the cistern was reported but not credited per §6.1.
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✗)'],
    ).toBe(0);
    expect(r.formulaEvaluated).toMatch(/V_Zisterne nicht angerechnet/);
  });

  it('NOT CREDITED — zwangsentleerung=null/missing, V_Zisterne=5 → treated as false', () => {
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: 5, zisterne_zwangsentleerung: null },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✗)'],
    ).toBe(0);
  });

  it('CLAMP — credit > brutto V_VA → V_VA clamped at 0 (cistern over-covers retention)', () => {
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: 30, zisterne_zwangsentleerung: true },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // 18.684 − 30 = −11.316 → clamped to 0
    expect(r.value).toBe(0);
    expect(r.substituted['MAX V_VA brutto (m³)']).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_VA netto (m³)']).toBe(0);
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✓)'],
    ).toBe(-30);
  });

  it('BACKWARDS-COMPAT — no cistern fields entered → identical to pre-Pile-8 output', () => {
    const r = evaluateFormula(req());
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_VA netto (m³)']).toBeCloseTo(18.684, 3);
    // No cistern-related keys when V_Zisterne is null.
    expect(r.substituted['V_Zisterne (m³, gemeldet)']).toBeUndefined();
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✓)'],
    ).toBeUndefined();
    expect(
      r.substituted['Zisternen-Anrechnung (m³, Zwangsentleerung ✗)'],
    ).toBeUndefined();
    // formulaEvaluated falls back to the pre-Pile-8 string with no
    // cistern annotation.
    expect(r.formulaEvaluated).not.toMatch(/V_Zisterne/);
  });

  it('IGNORED — V_Zisterne = 0 (engineer reports zero) → no credit even when flag is true', () => {
    // A zero cistern volume has no effect either way — same as not entering it.
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: 0, zisterne_zwangsentleerung: true },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_Zisterne (m³, gemeldet)']).toBeUndefined();
  });

  it('IGNORED — V_Zisterne = NaN/Infinity → no credit, no entry in substituted', () => {
    const r = evaluateFormula(
      req({
        gl8Scalars: { V_Zisterne: Infinity, zisterne_zwangsentleerung: true },
      }),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(18.684, 3);
    expect(r.substituted['V_Zisterne (m³, gemeldet)']).toBeUndefined();
  });
});
