/**
 * §C1 fix — deterministic server-side materialization of engine-derived
 * scalar outputs.
 *
 * `materializeDerivedOutputs` runs the same whitelisted engine the report
 * path uses (`evaluateWorksheetEquations`) and returns the derived own-field
 * values to UPSERT into project_parameters with source_type='derived'. This
 * is what makes A_C_preliminary / A_C / Q_zu durable so downstream consumers
 * inherit a real row instead of null.
 *
 * Contract under test:
 *   - computed output → { fieldId, valueNumber } (only OWN number fields)
 *   - displayOnly outputs (ΣSealed/ΣUnsealed/C_m) are NEVER materialized
 *     (they would clobber a primary writer / engineer iteration variable)
 *   - intra-worksheet derived chains resolve via a fixpoint (Q_zu reads the
 *     A_C that this same pass derives)
 *   - non-computable output → null (clears any stale derived value)
 *   - inherited input fields are never emitted as outputs
 */
import { describe, it, expect } from 'vitest';
import {
  materializeDerivedOutputs,
  type ReportEquation,
  type ReportField,
  type ReportParameter,
} from '../evaluate-for-report';

// Real production equation ids + whitelist keys.
const A_C_PRELIM_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0'; // A138-07 Gl.2 prelim
const A_C_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3'; // A138-10 Gl.2 A_C
const Q_ZU_ID = 'b39dda00-9a90-46cc-a045-543047ec6498'; // A138-10 Gl.3 Q_zu
const SIGMA_SEALED_ID = 'd1a38110-0000-0000-0000-000000000001'; // displayOnly

const MIXED_ROWS = {
  rows: [
    { id: 'r1', label: 'Dach', surface_type: 'dach', area_m2: 400, c_i: 0.9, c_s: 1.0 },
    { id: 'r2', label: 'Asphalt', surface_type: 'asphalt', area_m2: 200, c_i: 0.9, c_s: 1.0 },
    { id: 'r3', label: 'Rasen', surface_type: 'rasen', area_m2: 100, c_i: 0.1, c_s: 0.3 },
    { id: 'r4', label: 'Kies', surface_type: 'kies', area_m2: 300, c_i: 0.3, c_s: 0.5 },
  ],
};
const EXPECTED_AC = 640;

function num(fieldId: string, valueNumber: number | null): ReportParameter {
  return {
    fieldId,
    valueNumber,
    valueText: null,
    valueEnum: null,
    valueBoolean: null,
    valueDate: null,
    valueJson: null,
  };
}
function json(fieldId: string, value: unknown): ReportParameter {
  return {
    fieldId,
    valueNumber: null,
    valueText: null,
    valueEnum: null,
    valueBoolean: null,
    valueDate: null,
    valueJson: value,
  };
}

describe('materializeDerivedOutputs — A138-07 A_C_preliminary', () => {
  const fields: ReportField[] = [
    { id: 'f.inv', symbol: 'surface_inventory', unit: null, dataType: 'json' },
    { id: 'f.acp', symbol: 'A_C_preliminary', unit: 'm²', dataType: 'number' },
  ];
  const equations: ReportEquation[] = [
    { id: A_C_PRELIM_ID, equationNumber: '2', formula: 'aggregator', inputSymbols: [], outputSymbol: 'A_C_preliminary', outputUnit: 'm²' },
  ];
  const own = new Set(['f.acp']); // surface_inventory is inherited from A138-07's carrier

  it('materializes A_C_preliminary = 640 from the surface inventory carrier', () => {
    const out = materializeDerivedOutputs('A138-07', equations, fields, [json('f.inv', MIXED_ROWS)], own);
    const acp = out.find((o) => o.fieldId === 'f.acp');
    expect(acp).toBeDefined();
    expect(acp!.valueNumber).toBeCloseTo(EXPECTED_AC, 6);
  });

  it('clears to null when the carrier is missing (no stale derived value)', () => {
    const out = materializeDerivedOutputs('A138-07', equations, fields, [], own);
    const acp = out.find((o) => o.fieldId === 'f.acp');
    expect(acp).toBeDefined();
    expect(acp!.valueNumber).toBeNull();
  });
});

describe('materializeDerivedOutputs — A138-10 fixpoint (A_C → Q_zu)', () => {
  const fields: ReportField[] = [
    { id: 'f.inv', symbol: 'surface_inventory', unit: null, dataType: 'json' },
    { id: 'f.ac', symbol: 'A_C', unit: 'm²', dataType: 'number' },
    { id: 'f.ava', symbol: 'A_VA', unit: 'm²', dataType: 'number' },
    { id: 'f.rdn', symbol: 'r_D_n', unit: 'l/(s·ha)', dataType: 'number' },
    { id: 'f.qzu', symbol: 'Q_zu', unit: 'l/s', dataType: 'number' },
    { id: 'f.sealed', symbol: 'sigma_sealed', unit: 'm²', dataType: 'number' },
  ];
  const equations: ReportEquation[] = [
    { id: A_C_ID, equationNumber: '2', formula: 'aggregator', inputSymbols: [], outputSymbol: 'A_C', outputUnit: 'm²' },
    { id: Q_ZU_ID, equationNumber: '3', formula: 'Q_zu = r_D(n) * (A_C + A_VA) * 10^-4', inputSymbols: ['r_D(n)', 'A_C', 'A_VA'], outputSymbol: 'Q_zu', outputUnit: 'l/s' },
    { id: SIGMA_SEALED_ID, equationNumber: '2a', formula: 'aggregator', inputSymbols: [], outputSymbol: 'sigma_sealed', outputUnit: 'm²' },
  ];
  const own = new Set(['f.ac', 'f.ava', 'f.rdn', 'f.qzu', 'f.sealed']);

  it('derives A_C=640 from the carrier AND Q_zu=8.28 reading the same-pass A_C', () => {
    // A_VA = 50, r_D_n = 120 → Q_zu = 120 * (640 + 50) * 1e-4 = 8.28
    const params = [json('f.inv', MIXED_ROWS), num('f.ava', 50), num('f.rdn', 120)];
    const out = materializeDerivedOutputs('A138-10', equations, fields, params, own);

    const ac = out.find((o) => o.fieldId === 'f.ac');
    const qzu = out.find((o) => o.fieldId === 'f.qzu');
    expect(ac?.valueNumber).toBeCloseTo(640, 6);
    expect(qzu?.valueNumber).toBeCloseTo(8.28, 6);
  });

  it('does NOT materialize the displayOnly ΣSealed output', () => {
    const params = [json('f.inv', MIXED_ROWS), num('f.ava', 50), num('f.rdn', 120)];
    const out = materializeDerivedOutputs('A138-10', equations, fields, params, own);
    expect(out.find((o) => o.fieldId === 'f.sealed')).toBeUndefined();
  });

  it('Q_zu clears to null when r_D_n is absent (cannot derive)', () => {
    const params = [json('f.inv', MIXED_ROWS), num('f.ava', 50)]; // no r_D_n
    const out = materializeDerivedOutputs('A138-10', equations, fields, params, own);
    const qzu = out.find((o) => o.fieldId === 'f.qzu');
    expect(qzu).toBeDefined();
    expect(qzu!.valueNumber).toBeNull();
    // A_C still derives from the carrier
    expect(out.find((o) => o.fieldId === 'f.ac')?.valueNumber).toBeCloseTo(640, 6);
  });

  it('never emits an inherited input field (only own equation outputs)', () => {
    const params = [json('f.inv', MIXED_ROWS), num('f.ava', 50), num('f.rdn', 120)];
    const out = materializeDerivedOutputs('A138-10', equations, fields, params, own);
    // A_VA and r_D_n are inputs, not outputs of any whitelisted equation here
    expect(out.find((o) => o.fieldId === 'f.ava')).toBeUndefined();
    expect(out.find((o) => o.fieldId === 'f.rdn')).toBeUndefined();
    expect(out.find((o) => o.fieldId === 'f.inv')).toBeUndefined();
  });
});
