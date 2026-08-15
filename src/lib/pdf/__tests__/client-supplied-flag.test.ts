import { describe, it, expect } from 'vitest';
import {
  assembleStandardReport,
  type AssemblerInput,
  type AssemblerParameter,
} from '../assemble-standard-report';

/**
 * Stage-5 client-supplied flagging — pure assembler contract for
 * `clientSupplied` (Kundenangabe, AGB input-error carve-out).
 *
 *   1. Pass-through: a parameter with clientSupplied:true surfaces on its
 *      ReportField as clientSupplied:true (the PDF FieldRow renders the
 *      " · Kundenangabe" marker from it).
 *   2. Backward compat: pre-flag fixtures that omit the key entirely
 *      normalise to `false` — never `undefined`, never a crash.
 *
 * No DB needed: the assembler is pure. (Same style as edition-flag.test.ts.)
 */
const baseParameter: AssemblerParameter = {
  fieldId: 'f-1',
  valueNumber: '12.5',
  valueText: null,
  valueEnum: null,
  valueDate: null,
  valueBoolean: null,
  valueJson: null,
  sourceType: 'entered',
  citationSources: [],
};

const minimalInput = (parameters: AssemblerParameter[]): AssemblerInput => ({
  project: {
    id: 'proj-1',
    name: 'Demo-Projekt',
    projectCode: 'EW-2026-001',
    clientName: null,
    location: null,
    siteProfile: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  org: null,
  standard: { id: 'std-1', code: 'DWA-A 138-1', titleDe: 'Versickerung', version: '2024-08' },
  templates: [{ id: 'tpl-1', code: 'A138-01', titleDe: 'Grundlagen', orderIndex: 1 }],
  instances: [],
  sections: [],
  fields: [
    {
      id: 'f-1',
      worksheetTemplateId: 'tpl-1',
      sectionId: null,
      symbol: 'A_C',
      labelDe: 'Angeschlossene Fläche',
      unit: 'm²',
      dataType: 'number',
      isRequired: false,
      clauseReference: null,
      orderIndex: 1,
    },
  ],
  equations: [],
  compliance: [],
  parameters,
  documents: [],
  approvals: [],
  audits: [],
  now: new Date('2026-08-01T00:00:00.000Z'),
});

const onlyField = (out: ReturnType<typeof assembleStandardReport>) =>
  out.worksheets[0].sections[0].fields[0];

describe('client-supplied flag — assembler pass-through', () => {
  it('parameter with clientSupplied:true → ReportField.clientSupplied true', () => {
    const out = assembleStandardReport(
      minimalInput([{ ...baseParameter, clientSupplied: true }]),
    );
    const f = onlyField(out);
    expect(f.clientSupplied).toBe(true);
    // Untouched neighbours stay intact.
    expect(f.symbol).toBe('A_C');
    expect(f.value).toBe('12.5');
  });

  it('parameter with clientSupplied:false → false', () => {
    const out = assembleStandardReport(
      minimalInput([{ ...baseParameter, clientSupplied: false }]),
    );
    expect(onlyField(out).clientSupplied).toBe(false);
  });

  it('parameter WITHOUT the key normalises to false (backward compat)', () => {
    const out = assembleStandardReport(minimalInput([{ ...baseParameter }]));
    expect(onlyField(out).clientSupplied).toBe(false);
  });

  it('field with no parameter row at all → false (never undefined)', () => {
    const out = assembleStandardReport(minimalInput([]));
    expect(onlyField(out).clientSupplied).toBe(false);
  });
});
