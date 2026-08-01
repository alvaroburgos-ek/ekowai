import { describe, it, expect } from 'vitest';
import {
  assembleStandardReport,
  type AssemblerInput,
} from '../assemble-standard-report';

/**
 * Stage-5 edition lifecycle â€” pure assembler contract for `supersededBy`.
 *
 *   1. Pass-through: when the loader supplies `supersededBy`, the report's
 *      standard object carries it unchanged (the PDF cover renders the
 *      "Norm ersetzt â€” Ausgabe prÃ¼fen" warning from it).
 *   2. Backward compat: pre-edition fixtures that omit the key entirely
 *      normalise to `null` â€” never `undefined`, never a crash.
 *
 * No DB needed: the assembler is pure.
 */
const minimalInput = (
  standard: AssemblerInput['standard'],
): AssemblerInput => ({
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
  standard,
  templates: [],
  instances: [],
  sections: [],
  fields: [],
  equations: [],
  compliance: [],
  parameters: [],
  documents: [],
  approvals: [],
  audits: [],
  now: new Date('2026-08-01T00:00:00.000Z'),
});

describe('edition lifecycle â€” supersededBy flag', () => {
  it('passes supersededBy through to the report standard object', () => {
    const out = assembleStandardReport(
      minimalInput({
        id: 'std-old',
        code: 'DWA-A 138',
        titleDe: 'Versickerung (VorgÃ¤ngerausgabe)',
        version: '2005-04',
        supersededBy: 'std-new',
      }),
    );
    expect(out.standard.supersededBy).toBe('std-new');
    // Untouched neighbours stay intact.
    expect(out.standard.id).toBe('std-old');
    expect(out.standard.version).toBe('2005-04');
  });

  it('passes explicit null through unchanged (current edition)', () => {
    const out = assembleStandardReport(
      minimalInput({
        id: 'std-1',
        code: 'DWA-A 138-1',
        titleDe: 'Versickerung',
        version: '2024-08',
        supersededBy: null,
      }),
    );
    expect(out.standard.supersededBy).toBeNull();
  });

  it('normalises a fixture WITHOUT the key to null (backward compat)', () => {
    const out = assembleStandardReport(
      minimalInput({
        id: 'std-1',
        code: 'DWA-A 138-1',
        titleDe: 'Versickerung',
        version: '2024-08',
        // supersededBy deliberately omitted â€” pre-edition fixture shape.
      }),
    );
    expect(out.standard.supersededBy).toBeNull();
  });
});

describe('monitoring journal pass-through (Betrieb & Monitoring PDF section)', () => {
  it('normalises entries to yyyy-mm-dd and passes fields through', () => {
    const input = minimalInput({ id: 'std-1', code: 'X', titleDe: 'X', version: '1' });
    input.monitoring = [
      { entryDate: '2026-08-01T10:00:00Z', category: 'laborbericht', note: 'kf-Probe', documentTitle: 'Labor-2026-08.pdf' },
      { entryDate: new Date('2026-07-15T00:00:00Z'), category: 'begehung', note: null, documentTitle: null },
    ];
    const data = assembleStandardReport(input);
    expect(data.monitoringEntries).toEqual([
      { entryDate: '2026-08-01', category: 'laborbericht', note: 'kf-Probe', documentTitle: 'Labor-2026-08.pdf' },
      { entryDate: '2026-07-15', category: 'begehung', note: null, documentTitle: null },
    ]);
  });

  it('omitted monitoring input â†’ empty array (fixtures stay valid)', () => {
    expect(assembleStandardReport(minimalInput({ id: 'std-1', code: 'X', titleDe: 'X', version: '1' })).monitoringEntries).toEqual([]);
  });
});
