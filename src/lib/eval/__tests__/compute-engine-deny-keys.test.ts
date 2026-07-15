import { describe, it, expect } from 'vitest';
import { computeEngineDenyKeys, shouldEngineEvaluate } from '../equation-manual-denylist';

/**
 * ENCODE-TIME faithfulness gate (class (i)) — the function the importer runs to
 * FEED the deny-set (single SSOT). Real DWA-A-138-1 shapes.
 *
 * FULL CIRCLE on A138-18:22: the gate caught the bare `d` → source-verified
 * (§6.4.2: d = d_i) → migration 20260713120000 fixed `d`→`d_i` → the gate now
 * RE-VERIFIES the corrected formula (no longer flagged), and A138-18:22 has left
 * the deny-set → it routes normally.
 */
describe('computeEngineDenyKeys — encode-time gate feeding the deny-set', () => {
  const f138 = new Set([
    's_F', 'b_R', 'h_R', 'az', 'd_a', 'd_i', 'r_D_n', 'A_C', 'A_VA', 'k_i',
    'f_ort', 'f_methode', 'A_E_ba', 'C_S',
  ]);

  const equations = [
    // CORRECTED A138-18:22 (migration applied: d → d_i) → RE-VERIFIED, not flagged.
    { worksheetCode: 'A138-18', equationNumber: '22',
      formula: 's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi * d_i^2/4) * ((1/s_F) - 1))',
      inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i'] },
    // Carrier aggregate (Σ) → EXEMPT.
    { worksheetCode: 'A138-07', equationNumber: '2',
      formula: 'A_C = Σ(A_E * C_i)', inputSymbols: ['A_E', 'C_i'] },
    // min() parse construct but all symbols resolve → NOT denied.
    { worksheetCode: 'A138-11', equationNumber: '6',
      formula: 'f_K = min(f_ort * f_methode, 1)', inputSymbols: ['f_ort', 'f_methode'] },
    // SYNTHETIC mis-encoding (mechanism proof): references an unresolved symbol.
    { worksheetCode: 'TEST-99', equationNumber: '1',
      formula: 'y = zzz * A_C', inputSymbols: ['zzz', 'A_C'] },
  ];

  it('RE-VERIFIES corrected A138-18:22 (not flagged); mechanism still catches a synthetic mis-encoding', () => {
    const keys = computeEngineDenyKeys(equations, f138).map((d) => d.key);
    expect(keys).not.toContain('A138-18:22'); // fixed → re-verified
    expect(keys).toEqual(['TEST-99:1']);       // only the synthetic unresolved-symbol case
  });

  it('FULL CIRCLE: A138-18:22 has left the deny-set → shouldEngineEvaluate is now true (routes)', () => {
    expect(shouldEngineEvaluate('A138-18', '22')).toBe(true);
  });

  it('the deny-set SSOT still blocks a class-(ii) manual-denied equation (A138-18:18, missing ×10³)', () => {
    expect(shouldEngineEvaluate('A138-18', '18')).toBe(false);
    expect(shouldEngineEvaluate('A138-10', '3')).toBe(true);  // faithful still routes
  });
});
