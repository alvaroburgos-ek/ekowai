import { describe, it, expect } from 'vitest';
import {
  assembleStandardReport,
  type AssemblerInput,
} from '../assemble-standard-report';

/**
 * Stage-5 edition lifecycle — pure assembler contract for `supersededBy`.
 *
 *   1. Pass-through: when the loader supplies `supersededBy`, the report's
 *      standard object carries it unchanged (the PDF cover renders the
 *      "Norm ersetzt — Ausgabe prüfen" warning from it).
 *   2. Backward compat: pre-edition fixtures that omit the key entirely
 *      normalise to `null` — never `undefined`, never a crash.
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

describe('edition lifecycle — supersededBy flag', () => {
  it('passes supersededBy through to the report standard object', () => {
    const out = assembleStandardReport(
      minimalInput({
        id: 'std-old',
        code: 'DWA-A 138',
        titleDe: 'Versickerung (Vorgängerausgabe)',
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
        // supersededBy deliberately omitted — pre-edition fixture shape.
      }),
    );
    expect(out.standard.supersededBy).toBeNull();
  });
});
