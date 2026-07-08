import { describe, it, expect } from 'vitest';
import {
  assembleStandardReport,
  type AssemblerInput,
} from '../assemble-standard-report';

/**
 * Data-assembly test for the PDF compliance report.
 *
 * Exercises the same evaluator chain the production loader uses, against
 * fixture rows that mimic the drizzle row shapes. Two contracts are
 * asserted explicitly:
 *
 *   1. Three-state engine contract — a whitelisted equation with missing
 *      inputs MUST surface as `manual_required`, NOT as a computed number
 *      and NOT as a missing entry.
 *   2. Citation index — every distinct citation docId referenced by any
 *      field shows up in `citationIndex` with the document's full title.
 *
 * No DB needed: the assembler is pure.
 */
const baseInput = (): AssemblerInput => ({
  project: {
    id: 'proj-1',
    name: 'Demo-Projekt',
    projectCode: 'EW-2026-001',
    clientName: 'Stadtwerke X',
    location: 'X-Stadt',
    siteProfile: { site_bundesland: 'Bayern', k_f: 0.00001 },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  org: {
    id: 'org-1',
    name: 'Test Büro',
    logoUrl: null,
    addressLine1: 'Teststraße 1',
    addressLine2: null,
    postalCode: '12345',
    city: 'Teststadt',
    phone: '+49 0 0',
    email: 'test@buero.de',
    website: null,
  },
  standard: {
    id: 'std-1',
    code: 'DWA-A 138-1',
    titleDe: 'Versickerung',
    version: '2024-08',
  },
  templates: [
    { id: 'tpl-12', code: 'A138-12', titleDe: 'Versickerungsfläche', orderIndex: 2 },
    { id: 'tpl-01', code: 'A138-01', titleDe: 'Projektregistrierung', orderIndex: 1 },
  ],
  instances: [
    { id: 'inst-12', worksheetTemplateId: 'tpl-12', status: 'draft' },
    { id: 'inst-01', worksheetTemplateId: 'tpl-01', status: 'submitted_for_review' },
  ],
  sections: [
    { id: 'sec-12-1', worksheetTemplateId: 'tpl-12', titleDe: 'Eingaben', orderIndex: 1 },
    { id: 'sec-01-1', worksheetTemplateId: 'tpl-01', titleDe: 'Stammdaten', orderIndex: 1 },
  ],
  fields: [
    // A138-12 fields
    {
      id: 'f-ki',
      worksheetTemplateId: 'tpl-12',
      sectionId: 'sec-12-1',
      symbol: 'k_i',
      labelDe: 'Durchlässigkeitsbeiwert',
      unit: 'm/s',
      dataType: 'number',
      isRequired: true,
      clauseReference: '§5.3.3.6',
      orderIndex: 1,
    },
    {
      id: 'f-as',
      worksheetTemplateId: 'tpl-12',
      sectionId: 'sec-12-1',
      symbol: 'A_S',
      labelDe: 'Versickerungsfläche',
      unit: 'm²',
      dataType: 'number',
      isRequired: true,
      clauseReference: '§5.3.3.6',
      orderIndex: 2,
    },
    // A138-01 field
    {
      id: 'f-name',
      worksheetTemplateId: 'tpl-01',
      sectionId: 'sec-01-1',
      symbol: 'project_name',
      labelDe: 'Projektname',
      unit: null,
      dataType: 'text',
      isRequired: true,
      clauseReference: null,
      orderIndex: 1,
    },
  ],
  equations: [
    // Whitelisted — should evaluate. Gl. 4 needs k_i + A_S.
    {
      id: 'bd080331-d673-4a11-b12a-29e00bdbc939', // matches the real equation_profiles id for §5.3.3.6 Gl. 4
      worksheetTemplateId: 'tpl-12',
      equationNumber: '4',
      formula: 'Q_S = k_i * A_S * 1000',
      formulaLatex: null,
      inputSymbols: ['k_i', 'A_S'],
      outputSymbol: 'Q_S',
      outputUnit: 'l/s',
      clauseReference: '§5.3.3.6',
    },
    // Whitelisted — Gl. 7 — A_S_min and A_S_max NOT present → manual_required.
    {
      id: '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac',
      worksheetTemplateId: 'tpl-12',
      equationNumber: '7',
      formula: 'A_S_m = (A_S_min + A_S_max) / 2',
      formulaLatex: null,
      inputSymbols: ['A_S_min', 'A_S_max'],
      outputSymbol: 'A_S_m',
      outputUnit: 'm²',
      clauseReference: '§5.3.3.6',
    },
    // Not whitelisted — evalState should be null.
    {
      id: 'eq-unwired',
      worksheetTemplateId: 'tpl-12',
      equationNumber: '999',
      formula: 'X = 42',
      formulaLatex: null,
      inputSymbols: [],
      outputSymbol: 'X',
      outputUnit: null,
      clauseReference: null,
    },
  ],
  compliance: [
    {
      id: 'req-12',
      worksheetTemplateId: 'tpl-12',
      code: 'REQ-1',
      titleDe: 'k_i innerhalb gültigem Bereich',
      condition: 'k_i >= 1e-9 AND k_i <= 1e-2',
      severity: 'blocking',
      clauseReference: '§5.3.3',
    },
  ],
  parameters: [
    {
      fieldId: 'f-ki',
      valueNumber: '0.00001',
      valueText: null,
      valueEnum: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      sourceType: 'entered',
      citationSources: [
        { id: 'c1', docId: 'doc-buek50', page: 42, note: null },
      ],
    },
    {
      fieldId: 'f-as',
      valueNumber: 120,
      valueText: null,
      valueEnum: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      sourceType: 'entered',
      citationSources: [],
    },
    {
      fieldId: 'f-name',
      valueNumber: null,
      valueText: 'Erlangen-Nord Süd-Strang',
      valueEnum: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      sourceType: 'entered',
      citationSources: [
        { id: 'c2', docId: 'label:Auftragsvereinbarung 2025-03', page: null, note: null },
      ],
    },
  ],
  documents: [
    {
      id: 'doc-buek50',
      citationLabel: '[BÜK50:42]',
      title: 'BÜK 50 Gutachten 2025',
      kind: 'report',
      issuedAt: '2025-01-15T00:00:00.000Z',
    },
  ],
  approvals: [
    {
      occurredAt: '2026-05-20T10:00:00.000Z',
      actorRole: 'engineer',
      eventType: 'submit_for_review',
      fromStatus: 'draft',
      toStatus: 'submitted',
      comment: 'Bitte prüfen',
      worksheetCode: 'A138-01',
      actorName: 'M. Schmidt',
    },
  ],
  audits: [
    {
      occurredAt: '2026-05-15T14:30:00.000Z',
      actorRole: 'engineer',
      action: 'manual_override',
      changes: { reason: 'A_S_m manuell aus Bohrungen gemittelt' },
      tableName: 'project_parameters',
      actorName: 'M. Schmidt',
    },
  ],
  now: new Date('2026-05-31T12:00:00.000Z'),
});

describe('assembleStandardReport', () => {
  it('returns a fully-populated report header with project + standard + letterhead', () => {
    const out = assembleStandardReport(baseInput());
    expect(out.generatedAt).toBe('2026-05-31T12:00:00.000Z');
    expect(out.project.projectName).toBe('Demo-Projekt');
    expect(out.project.projectCode).toBe('EW-2026-001');
    expect(out.standard.code).toBe('DWA-A 138-1');
    expect(out.letterhead?.orgName).toBe('Test Büro');
    expect(out.letterhead?.email).toBe('test@buero.de');
  });

  it('orders worksheets by orderIndex ascending', () => {
    const out = assembleStandardReport(baseInput());
    expect(out.worksheets.map((w) => w.code)).toEqual(['A138-01', 'A138-12']);
    expect(out.worksheets[0].orderIndex).toBe(1);
    expect(out.worksheets[1].orderIndex).toBe(2);
  });

  it('groups fields into sections and sorts within section by field orderIndex', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.sections).toHaveLength(1);
    const sec = ws12.sections[0];
    expect(sec.id).toBe('sec-12-1');
    expect(sec.fields.map((f) => f.symbol)).toEqual(['k_i', 'A_S']);
    expect(sec.fields[0].value).toBe('0.00001');
    expect(sec.fields[1].value).toBe('120');
  });

  it('attaches citation chips to fields and dedupes them into a global index', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    const kiField = ws12.sections[0].fields.find((f) => f.symbol === 'k_i')!;
    expect(kiField.citations).toHaveLength(1);
    expect(kiField.citations[0].label).toBe('[BÜK50:42]');
    expect(kiField.citations[0].title).toBe('BÜK 50 Gutachten 2025');

    // Index contains both the project_document AND the synthetic label citation.
    const labels = out.citationIndex.map((c) => c.citationLabel).sort();
    expect(labels).toContain('[BÜK50:42]');
    expect(labels).toContain('Auftragsvereinbarung 2025-03');
  });

  it('PRESERVES three-state contract: whitelisted equation with all inputs → computed', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    const gl4 = ws12.equations.find((e) => e.equationNumber === '4')!;
    expect(gl4.evalState).not.toBeNull();
    expect(gl4.evalState!.kind).toBe('computed');
    if (gl4.evalState!.kind === 'computed') {
      // Q_S = 1e-5 * 120 * 1000 = 1.2
      expect(gl4.evalState!.value).toBeCloseTo(1.2, 6);
      expect(gl4.evalState!.substituted).toEqual({ k_i: 1e-5, A_S: 120 });
    }
  });

  it('PRESERVES three-state contract: whitelisted equation with missing inputs → manual_required (NEVER a number)', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    const gl7 = ws12.equations.find((e) => e.equationNumber === '7')!;
    expect(gl7.evalState).not.toBeNull();
    expect(gl7.evalState!.kind).toBe('manual_required');
    if (gl7.evalState!.kind === 'manual_required') {
      // No silent numeric value smuggled in.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gl7.evalState as any).value).toBeUndefined();
      expect(gl7.evalState!.missing).toEqual(expect.arrayContaining(['A_S_min', 'A_S_max']));
    }
  });

  it('non-whitelisted equation gets evalState = null (the PDF renderer marks it "nicht durch Engine geprüft")', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    const unwired = ws12.equations.find((e) => e.equationNumber === '999')!;
    expect(unwired.evalState).toBeNull();
  });

  it('compliance condition with all inputs satisfied → pass', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.compliance).toHaveLength(1);
    expect(ws12.compliance[0].result.kind).toBe('pass');
  });

  it('aggregated status reflects worksheet instance states', () => {
    const out = assembleStandardReport(baseInput());
    // One instance is submitted_for_review, one is draft → "submitted".
    expect(out.project.aggregatedStatus).toBe('submitted');
  });

  it('audit excerpt preserves the manual_override reason verbatim', () => {
    const out = assembleStandardReport(baseInput());
    const manualEntry = out.audit.find((a) => a.action === 'manual_override');
    expect(manualEntry).toBeDefined();
    expect(manualEntry!.detail).toBe('A_S_m manuell aus Bohrungen gemittelt');
  });

  it('site profile only includes keys that have values, in canonical order', () => {
    const out = assembleStandardReport(baseInput());
    const keys = out.siteProfile.rows.map((r) => r.key);
    expect(keys).toContain('site_bundesland');
    expect(keys).toContain('k_f');
    // SITE_PROFILE_ENTRIES order: site_bundesland comes before k_f.
    expect(keys.indexOf('site_bundesland')).toBeLessThan(keys.indexOf('k_f'));
  });

  it('letterhead degrades gracefully to null when org is missing', () => {
    const input = baseInput();
    input.org = null;
    const out = assembleStandardReport(input);
    expect(out.letterhead).toBeNull();
  });

  it('site_profile fallback resolves fields with no entered value', () => {
    const input = baseInput();
    // Add a field whose symbol exists in the site profile (k_f) and provide
    // no parameter row for it.
    input.fields.push({
      id: 'f-kf-fallback',
      worksheetTemplateId: 'tpl-01',
      sectionId: 'sec-01-1',
      symbol: 'k_f',
      labelDe: 'Durchlässigkeit',
      unit: 'm/s',
      dataType: 'number',
      isRequired: false,
      clauseReference: null,
      orderIndex: 2,
    });
    const out = assembleStandardReport(input);
    const ws01 = out.worksheets.find((w) => w.code === 'A138-01')!;
    const kfField = ws01.sections.flatMap((s) => s.fields).find((f) => f.symbol === 'k_f')!;
    expect(kfField.valueSource).toBe('site_profile');
    expect(kfField.value).toBe('0.00001');
  });

  // ---------------------------------------------------------------------------
  // Task 10: aSmProvenanceLine — manual A_S,m provenance in the PDF report
  // ---------------------------------------------------------------------------

  /**
   * Helper: push the two A138-12 method fields + parameters into an input
   * so that resolvedBySymbol sees them.
   */
  function withAsmMethod(
    method: string,
    provenance: string,
  ): AssemblerInput {
    const input = baseInput();
    // Add the enum field for a_s_m_determination_method on A138-12
    input.fields.push({
      id: 'f-asm-method',
      worksheetTemplateId: 'tpl-12',
      sectionId: 'sec-12-1',
      symbol: 'a_s_m_determination_method',
      labelDe: 'Bestimmungsmethode A_S,m',
      unit: null,
      dataType: 'enum',
      isRequired: false,
      clauseReference: null,
      orderIndex: 10,
    });
    // Add the text field for a_s_m_provenance on A138-12
    input.fields.push({
      id: 'f-asm-prov',
      worksheetTemplateId: 'tpl-12',
      sectionId: 'sec-12-1',
      symbol: 'a_s_m_provenance',
      labelDe: 'Herkunft A_S,m',
      unit: null,
      dataType: 'text',
      isRequired: false,
      clauseReference: null,
      orderIndex: 11,
    });
    // Parameters
    input.parameters.push({
      fieldId: 'f-asm-method',
      valueNumber: null,
      valueText: null,
      valueEnum: method,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      sourceType: 'entered',
      citationSources: [],
    });
    input.parameters.push({
      fieldId: 'f-asm-prov',
      valueNumber: null,
      valueText: provenance,
      valueEnum: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      sourceType: 'entered',
      citationSources: [],
    });
    return input;
  }

  it('aSmProvenanceLine: manual method + non-empty provenance → line set on A138-12', () => {
    const input = withAsmMethod('manual', 'Bohrprotokoll 2026-03-15, Anlage 4');
    const out = assembleStandardReport(input);
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBe(
      'A_S,m vorgegeben (nicht abgeleitet) — Herkunft: Bohrprotokoll 2026-03-15, Anlage 4',
    );
    // Other worksheets are unaffected
    const ws01 = out.worksheets.find((w) => w.code === 'A138-01')!;
    expect(ws01.aSmProvenanceLine).toBeNull();
  });

  it('aSmProvenanceLine: direct method → null (engine-derived, no provenance line)', () => {
    const input = withAsmMethod('direct', 'irgendwas');
    const out = assembleStandardReport(input);
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBeNull();
  });

  it('aSmProvenanceLine: geometry method → null', () => {
    const input = withAsmMethod('geometry', 'Muldengeometrie');
    const out = assembleStandardReport(input);
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBeNull();
  });

  it('aSmProvenanceLine: soil_estimate method → null', () => {
    const input = withAsmMethod('soil_estimate', 'Tab.13');
    const out = assembleStandardReport(input);
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBeNull();
  });

  it('aSmProvenanceLine: manual method but empty provenance → null (no misleading line)', () => {
    const input = withAsmMethod('manual', '   ');
    const out = assembleStandardReport(input);
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBeNull();
  });

  it('aSmProvenanceLine: no method field at all → null (base input has no asm fields)', () => {
    const out = assembleStandardReport(baseInput());
    const ws12 = out.worksheets.find((w) => w.code === 'A138-12')!;
    expect(ws12.aSmProvenanceLine).toBeNull();
  });
});
