import { describe, it, expect } from 'vitest';
import {
  computeEs1Candidates,
  computeInvertedTagCandidates,
  computeTwinCandidates,
} from '../_pass3c-scans';
import type { ParsedWorkbook, FieldRow, EquationRow } from '../_pass3c-types';

function field(p: Partial<FieldRow> & { symbol: string; origin_worksheet: string }): FieldRow {
  return {
    symbol: p.symbol, label_de: p.symbol, label_en: null, unit: p.unit ?? null,
    data_type: p.data_type ?? 'number', kind: null, origin_worksheet: p.origin_worksheet,
    origin_section: null, consumer_worksheets: null, equation_refs: null, required: null,
    validation_rules: null, regulation_reference: p.regulation_reference ?? null,
    description: null, verification_status: null, notes: null, owner: null, xbrl_element_id: null,
  };
}
function eq(p: Partial<EquationRow> & { equation_number: string; formula: string; used_in_worksheet: string }): EquationRow {
  return {
    equation_number: p.equation_number, standard_code: 'X', description_de: null, description_en: null,
    formula: p.formula, input_symbols: p.input_symbols ?? null, output_symbol: p.output_symbol ?? null,
    regulation_reference: null, used_in_worksheet: p.used_in_worksheet, verification_status: null, notes: null,
  };
}
function wb(fields: FieldRow[], equations: EquationRow[]): ParsedWorkbook {
  return {
    standard: { standard_code: 'X', title_de: 'X', title_en: null, issuer: null, edition: '1', domain: null, status: null, notes: null },
    worksheets: [], sections: [], fields, enumValues: [], equations, complianceRequirements: [],
  };
}

describe('ES-1 (inequality-as-producer)', () => {
  it('flags an inequality producing a real number field as harmful', () => {
    const w = wb(
      [field({ symbol: 'g_prime', origin_worksheet: 'W1', data_type: 'number' })],
      [eq({ equation_number: '2b', formula: 'g_prime >= (Delta_u * gamma_A) / cos(beta)', output_symbol: 'g_prime', used_in_worksheet: 'W1' })],
    );
    const r = computeEs1Candidates(w);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ key: 'W1:2b', outputSymbol: 'g_prime', harmful: true });
  });

  it('flags a boolean-check output as ES-1 but NOT harmful', () => {
    const w = wb(
      [field({ symbol: 'sealing_required', origin_worksheet: 'W1', data_type: 'boolean' })],
      [eq({ equation_number: 'F-18', formula: 'k_f_boden >= 1e-8', output_symbol: 'sealing_required', used_in_worksheet: 'W1' })],
    );
    const r = computeEs1Candidates(w);
    expect(r).toHaveLength(1);
    expect(r[0].harmful).toBe(false);
  });

  it('does NOT flag a real assignment, nor a boolean-check with `=` before the comparison', () => {
    const w = wb(
      [field({ symbol: 'y', origin_worksheet: 'W1' })],
      [
        eq({ equation_number: '1', formula: 'y = a + b', output_symbol: 'y', used_in_worksheet: 'W1' }),
        eq({ equation_number: '2', formula: 'check = x >= 5', output_symbol: 'check', used_in_worksheet: 'W1' }),
      ],
    );
    expect(computeEs1Candidates(w)).toHaveLength(0);
  });
});

describe('inverted clause tag (S12) — FLL-GAR-27 shape', () => {
  it('flags a Gl-tagged unconsumed decoy that has a consumed same-quantity twin', () => {
    const w = wb(
      [
        field({ symbol: 'A', origin_worksheet: 'GAR-27', regulation_reference: 'Anhang 1' }),           // consumed input
        field({ symbol: 'A_einzugsflaeche', origin_worksheet: 'GAR-27', regulation_reference: '§Gl.1' }), // decoy, tagged Gl, unconsumed
      ],
      [eq({ equation_number: '1', formula: 'Q = A * C', output_symbol: 'Q', input_symbols: 'A, C', used_in_worksheet: 'GAR-27' })],
    );
    const r = computeInvertedTagCandidates(w);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ decoy: 'A_einzugsflaeche', tag: '§Gl.1', consumedTwin: 'A' });
  });

  it('does NOT flag a Gl-tagged field that IS consumed, nor one without a consumed twin', () => {
    const w = wb(
      [
        field({ symbol: 'A', origin_worksheet: 'GAR-27', regulation_reference: '§Gl.1' }),        // consumed → not a decoy
        field({ symbol: 'B_ref', origin_worksheet: 'GAR-27', regulation_reference: '§Gl.2' }),     // decoy but no consumed twin
      ],
      [eq({ equation_number: '1', formula: 'Q = A', output_symbol: 'Q', input_symbols: 'A', used_in_worksheet: 'GAR-27' })],
    );
    expect(computeInvertedTagCandidates(w)).toHaveLength(0);
  });
});

describe('twin fields (#15b, low precision)', () => {
  it('reports symbol-prefix twins on the same worksheet', () => {
    const w = wb(
      [
        field({ symbol: 'A', origin_worksheet: 'W1' }),
        field({ symbol: 'A_einzugsflaeche', origin_worksheet: 'W1' }),
        field({ symbol: 'B', origin_worksheet: 'W1' }),
      ],
      [],
    );
    const r = computeTwinCandidates(w);
    expect(r).toEqual([{ worksheet: 'W1', base: 'A', twin: 'A_einzugsflaeche' }]);
  });
});
