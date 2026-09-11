import { describe, expect, it } from 'vitest';
import { validateWorkbook } from '../_pass3c-validate';
import type { ParsedWorkbook } from '../_pass3c-types';

// Minimal parsed-workbook fixture matching the real ParsedWorkbook shape
// (see scripts/_pass3c-types.ts): `standard` is a single object (not an
// array), worksheets use `title_de`/`title_en`, etc.
// One standard, two worksheets, one CR pointing at a bogus worksheet.
function fixture(worksheetCode: string | null): ParsedWorkbook {
  return {
    standard: {
      standard_code: 'TST', title_de: 'T', title_en: null,
      issuer: null, edition: '1', domain: null, status: null, notes: null,
    },
    worksheets: [
      {
        worksheet_code: 'TST-01', standard_code: 'TST', title_de: 'A', title_en: null,
        phase: 1, archetype: null, section_refs: null, equation_refs: null,
        order_index: 1, description: null, verification_status: null,
      },
      {
        worksheet_code: 'TST-02', standard_code: 'TST', title_de: 'B', title_en: null,
        phase: 1, archetype: null, section_refs: null, equation_refs: null,
        order_index: 2, description: null, verification_status: null,
      },
    ],
    sections: [],
    fields: [],
    enumValues: [],
    equations: [],
    complianceRequirements: [{
      requirement_code: 'TST-CR-01', standard_code: 'TST', worksheet_code: worksheetCode,
      title: 'x', description: null, evaluation_type: null, required_field_symbols: 'A',
      evaluation_expression: 'A IS NOT NULL', pass_condition: null, severity: 'block',
      regulation_reference: null, phase: 1, order_index: 1, verification_status: null,
    }],
  };
}

describe('compliance worksheet_code validation', () => {
  it('unknown worksheet_code is an import ERROR, not a silent fallback', () => {
    const errs = validateWorkbook(fixture('TST-99'));
    expect(errs.map((e) => e.message).join('\n')).toMatch(
      /unknown worksheet_code "TST-99" on TST-CR-01/,
    );
  });
  it('valid worksheet_code passes', () => {
    const errs = validateWorkbook(fixture('TST-02'));
    expect(errs.map((e) => e.message).join('\n')).not.toMatch(/worksheet_code/);
  });
  it('absent worksheet_code stays valid (legacy path)', () => {
    const errs = validateWorkbook(fixture(null));
    expect(errs.map((e) => e.message).join('\n')).not.toMatch(/worksheet_code/);
  });
});
