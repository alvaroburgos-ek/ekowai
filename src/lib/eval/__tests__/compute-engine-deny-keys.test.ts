import { describe, it, expect } from 'vitest';
import { computeEngineDenyKeys, shouldEngineEvaluate } from '../equation-manual-denylist';

/**
 * ENCODE-TIME faithfulness gate (class (i)) — the function the importer runs to
 * FEED the deny-set (single SSOT). Real DWA-A-138-1 shapes.
 */
describe('computeEngineDenyKeys — encode-time gate feeding the deny-set', () => {
  const f138 = new Set([
    's_F', 'b_R', 'h_R', 'az', 'd_a', 'd_i', 'r_D_n', 'A_C', 'A_VA', 'k_i',
    'f_ort', 'f_methode', 'A_E_ba', 'C_S',
  ]);

  const equations = [
    // Real mis-encoding → DENY: bare `d` resolves to no field.
    { worksheetCode: 'A138-18', equationNumber: '22',
      formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d^2/4) * ((1/s_F) - 1))',
      inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd'] },
    // Carrier aggregate (Σ) → EXEMPT (aggregator-handled), not denied.
    { worksheetCode: 'A138-07', equationNumber: '2',
      formula: 'A_C = Σ(A_E * C_i)', inputSymbols: ['A_E', 'C_i'] },
    // Carrier aggregate (SUM) → EXEMPT.
    { worksheetCode: 'A138-26', equationNumber: '10',
      formula: 'V_Rueck = ((r_D(T_n_Ue) * (SUM(A_E_b_a * C_S) + A_VA) / 10000))',
      inputSymbols: ['r_D(T_n_Ue)', 'A_E_b_a', 'C_S', 'A_VA'] },
    // Faithful (r_D(n) normalizes to r_D_n which resolves) → NOT denied.
    { worksheetCode: 'A138-10', equationNumber: '3',
      formula: 'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4', inputSymbols: ['r_D(n)', 'A_C', 'A_VA'] },
    // min() parse construct but all symbols resolve → NOT denied (routes via engine path + fail-safe).
    { worksheetCode: 'A138-11', equationNumber: '6',
      formula: 'f_K = min(f_ort * f_methode, 1)', inputSymbols: ['f_ort', 'f_methode'] },
  ];

  it('flags ONLY the symbol-resolution failure (A138-18:22 bare d); exempts aggregates; passes faithful + min()', () => {
    const keys = computeEngineDenyKeys(equations, f138).map((d) => d.key);
    expect(keys).toEqual(['A138-18:22']);
  });

  it('the flagged key carries a not-engine-verified reason', () => {
    const hit = computeEngineDenyKeys(equations, f138).find((d) => d.key === 'A138-18:22');
    expect(hit?.reason).toMatch(/nicht engine-verifiziert/i);
  });

  it('the flagged key is in the runtime deny-set SSOT → excluded from route-all', () => {
    // A138-18:22 is materialized into EQUATION_GATE_DENYLIST (fed by this gate).
    expect(shouldEngineEvaluate('A138-18', '22')).toBe(false);
    // A faithful/aggregate equation still routes.
    expect(shouldEngineEvaluate('A138-10', '3')).toBe(true);
    expect(shouldEngineEvaluate('A138-07', '2')).toBe(true);
  });
});
