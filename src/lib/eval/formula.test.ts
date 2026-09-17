import { describe, it, expect } from 'vitest';
import { evaluateFormula, type EvalRequest } from './formula';
import { prepareRegisterRows } from './register-rows';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from './register-configs';
import { makeTableLookup, makeTableRows } from './regulation-tables-fallback';

// A138-07 producer IDs (moved from A138-10 as of Plan 2)
const A138_07_A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';

// Plan 2a: aggregator retired — the A_C producer is a formula string over the
// `surface_inventory` register; the request carries the prepared register and
// the (un-migrated Σ) DB text so the rewrite bridge is exercised.
const SURFACE_CFG = REGISTER_CONFIGS_FALLBACK.surface_inventory;
const TABLE = makeTableLookup('DWA-A-138-1');
function a138_07_gl2_req(rows: { id: string; label: string; tab9_value: string | null; area_m2: number | null; c_i: number | null; c_s: number | null; coeff_override: boolean }[]): EvalRequest {
  return {
    equationId: A138_07_A_C_ID,
    formula: 'A_C = Σ(A_E,i · C_i)   (Flächenverzeichnis, Tab. 9)',
    inputSymbols: ['surface_inventory'],
    outputSymbol: 'A_C',
    inputs: [],
    registers: {
      surface_inventory: prepareRegisterRows(
        { rows },
        SURFACE_CFG.columns,
        { table: TABLE, tableRows: makeTableRows('DWA-A-138-1') },
        {
          legacyMap: SURFACE_CFG.legacy_map,
          flagKeys: registerFlagKeys('surface_inventory', SURFACE_CFG),
          overrideFlagKey: SURFACE_CFG.override?.flag_key,
          overrideAppliesTo: SURFACE_CFG.override?.applies_to,
        },
      ),
    },
    tableLookup: TABLE,
  };
}

describe('evaluateFormula — A138-07 Gl. 2 (surface_inventory producer)', () => {
  it('uniform C — reproduces hand calc (3786.8 + 1575.9) * 0.9 = 4826.43 m²', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(4826.43, 2);
    // Plan 2a: aggregator retired — register formulas carry no Σ-keys in substituted
    // (the sealed/unsealed split is pinned by Gl. 2f/2g in surface-aggregators.test.ts).
    expect(r.substituted).toEqual({});
    expect(r.rewrite?.from).toBe('A_C_preliminary = Σ_i (A_E,i · C_i)');
  });

  it('mixed surface types — paved rows produce A_C_sealed, unpaved A_C_unsealed', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 200, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(380, 6); // 400*0.9 + 200*0.1 = 360 + 20
    // Plan 2a: aggregator retired — register formulas carry no Σ-keys in substituted
  });

  it('weighted sum with unequal areas — differs from naive arithmetic mean', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Steildach', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: 'park_flach', area_m2: 900, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ]),
    );
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    // Area-weighted: 100*0.9 + 900*0.1 = 90 + 90 = 180 m²
    // Naive arithmetic mean: (0.9 + 0.1) / 2 = 0.5 → 1000 * 0.5 = 500 m² (clearly different)
    expect(r.value).toBeCloseTo(180, 6);
    // Plan 2a: aggregator retired — register formulas carry no Σ-keys in substituted
  });

  it('excludes incomplete row from sum but still computes from the complete rows', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Unbestimmt', tab9_value: null, area_m2: 300, c_i: 0.9, c_s: 1.0, coeff_override: false },
      ]),
    );
    // Row 2 has tab9_value=null → incomplete → excluded from sum, but row 1 is complete
    // Aggregator only counts complete rows, returns computed with only row 1's contribution
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBeCloseTo(360, 6); // only row 1 counted: 400 * 0.9
  });

  it('manual_required when all rows are incomplete', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([
        { id: '1', label: 'Dach', tab9_value: null, area_m2: 400, c_i: 0.9, c_s: 1.0, coeff_override: false },
        { id: '2', label: 'Rasen', tab9_value: null, area_m2: 300, c_i: 0.1, c_s: 0.2, coeff_override: false },
      ]),
    );
    // Both rows incomplete → no rows to sum → manual_required
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.reason).toMatch(/Keine Flächen|keine vollständigen/i);
  });

  it('manual_required when carrier is empty', () => {
    const r = evaluateFormula(
      a138_07_gl2_req([]),
    );
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    // Plan 2a: aggregator retired — the row function names the empty register
    expect(r.reason).toMatch(/Keine vollständigen Zeilen in "surface_inventory"/);
  });

  it('manual_required when no carrier is supplied at all', () => {
    const r = evaluateFormula({
      equationId: A138_07_A_C_ID,
      formula: 'A_C = Σ(A_E,i · C_i)',
      inputSymbols: ['surface_inventory'],
      outputSymbol: 'A_C',
      inputs: [],
    });
    expect(r.kind).toBe('manual_required');
  });
});

describe('evaluateFormula — non-aggregator, non-rewrite paths still work', () => {
  it('computes a plain numeric formula via the arithmetic evaluator', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a * b + 5',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 3, unit: null },
        { symbol: 'b', value: 4, unit: null },
      ],
    });
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(17);
  });

  it('returns manual_required when an arithmetic input is missing', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [{ symbol: 'a', value: 2, unit: null }],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.missing).toEqual(['b']);
  });

  it('returns manual_required on a unit conflict — never a number', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a + b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      expectedUnits: { a: 'm²', b: 'm²' },
      inputs: [
        { symbol: 'a', value: 1, unit: 'ha' },
        { symbol: 'b', value: 2, unit: 'm²' },
      ],
    });
    expect(r.kind).toBe('manual_required');
    if (r.kind !== 'manual_required') return;
    expect(r.unitConflicts).toEqual([{ symbol: 'a', expected: 'm²', actual: 'ha' }]);
    expect((r as { value?: number }).value).toBeUndefined();
  });

  it('returns error on a malformed formula', () => {
    const r = evaluateFormula({
      equationId: 'no-aggregator',
      formula: 'X = a +* b',
      inputSymbols: ['a', 'b'],
      outputSymbol: 'X',
      inputs: [
        { symbol: 'a', value: 1, unit: null },
        { symbol: 'b', value: 2, unit: null },
      ],
    });
    expect(r.kind).toBe('error');
  });
});

// Plan 3 Task 1b (a138-I-1): enum/text field values reach formulas as strings.
describe('evaluateFormula — Task 1b: enum/text inputs reach formulas as strings', () => {
  // A138-08-D1 (src/lib/eval/equations/a138.ts) — Tab. 8 keyed by the Schutzkategorie select.
  const N_LIMIT = "n_limit = lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')";
  const nLimit = (inputs: EvalRequest['inputs'], extra?: Partial<EvalRequest>): EvalRequest => ({
    equationId: 't1b-n-limit',
    formula: N_LIMIT,
    inputSymbols: ['schutzkategorie', 'A_C'],
    outputSymbol: 'n_limit',
    inputs,
    tableLookup: TABLE,
    ...extra,
  });

  it('rule 1: a non-empty string input is PRESENT — passed verbatim to lookup() and recorded in substituted', () => {
    const r = evaluateFormula(nLimit([
      { symbol: 'schutzkategorie', value: 'gering', unit: null },
      { symbol: 'A_C', value: 500, unit: 'm²' },
    ]));
    expect(r.kind).toBe('computed');
    if (r.kind !== 'computed') return;
    expect(r.value).toBe(0.33);
    expect(r.substituted).toEqual({ schutzkategorie: 'gering', A_C: 500 });
    expect(typeof r.substituted.schutzkategorie).toBe('string');
  });

  it("rule 1: '' and null string inputs are MISSING (manual_required naming the symbol); numbers behave as before", () => {
    for (const value of ['', null] as const) {
      const r = evaluateFormula(nLimit([
        { symbol: 'schutzkategorie', value, unit: null },
        { symbol: 'A_C', value: 500, unit: 'm²' },
      ]));
      expect(r.kind).toBe('manual_required');
      if (r.kind !== 'manual_required') return;
      expect(r.missing).toEqual(['schutzkategorie']);
      expect(r.reason).toBe('Fehlende oder leere Eingaben: schutzkategorie');
    }
    const numMissing = evaluateFormula(nLimit([
      { symbol: 'schutzkategorie', value: 'gering', unit: null },
      { symbol: 'A_C', value: null, unit: 'm²' },
    ]));
    expect(numMissing.kind).toBe('manual_required');
    if (numMissing.kind === 'manual_required') expect(numMissing.missing).toEqual(['A_C']);
  });

  it('rule 1: an unknown enum token never yields a number — lookup() reports the missing row as manual_required', () => {
    const r = evaluateFormula(nLimit([
      { symbol: 'schutzkategorie', value: 'unbekannt', unit: null },
      { symbol: 'A_C', value: 500, unit: 'm²' },
    ]));
    expect(r.kind).toBe('manual_required');
    if (r.kind === 'manual_required') expect(r.reason).toMatch(/^lookup\(\): keine Zeile in TAB8/);
  });

  it('rule 1: unit-conflict checks skip string inputs; numeric inputs are still checked', () => {
    const ok = evaluateFormula(nLimit(
      [
        { symbol: 'schutzkategorie', value: 'gering', unit: 'foo' },
        { symbol: 'A_C', value: 500, unit: 'm²' },
      ],
      { expectedUnits: { schutzkategorie: 'bar', A_C: 'm²' } },
    ));
    expect(ok.kind).toBe('computed');
    const conflict = evaluateFormula(nLimit(
      [
        { symbol: 'schutzkategorie', value: 'gering', unit: null },
        { symbol: 'A_C', value: 500, unit: 'm²' },
      ],
      { expectedUnits: { A_C: 'ha' } },
    ));
    expect(conflict.kind).toBe('manual_required');
    if (conflict.kind === 'manual_required') {
      expect(conflict.unitConflicts).toEqual([{ symbol: 'A_C', expected: 'ha', actual: 'm²' }]);
    }
  });

  it('rule 2: a string reaching an arithmetic operator ⇒ manual_required with a German reason, never computed NaN', () => {
    const run = (formula: string) =>
      evaluateFormula({
        equationId: 't1b-nan-guard',
        formula,
        inputSymbols: ['x'],
        outputSymbol: 'y',
        inputs: [{ symbol: 'x', value: 'BK_I', unit: null }],
      });
    const plus = run('y = x + 1');
    expect(plus.kind).toBe('manual_required');
    if (plus.kind === 'manual_required') expect(plus.reason).toBe('Operand ist keine Zahl: BK_I');
    for (const f of ['y = x - 1', 'y = x * 2', 'y = 1 / x', 'y = x ^ 2', 'y = -x', 'y = sqrt(x)', 'y = max(x, 1)', 'y = x']) {
      const s = run(f);
      expect(s.kind, f).toBe('manual_required');
      expect((s as { value?: number }).value, f).toBeUndefined();
      if (s.kind === 'manual_required') expect(s.reason, f).toMatch(/keine Zahl|Nicht-endliches Ergebnis/);
    }
  });

  it('rule 2: a string is a legitimate if()/comparison operand — the enum branch computes', () => {
    const r = evaluateFormula({
      equationId: 't1b-enum-branch',
      formula: "y = if(bauklasse == 'BK_I', 10, 20) * a",
      inputSymbols: ['bauklasse', 'a'],
      outputSymbol: 'y',
      inputs: [
        { symbol: 'bauklasse', value: 'BK_I', unit: null },
        { symbol: 'a', value: 2, unit: null },
      ],
    });
    expect(r).toMatchObject({ kind: 'computed', value: 20, substituted: { bauklasse: 'BK_I', a: 2 } });
  });
});
