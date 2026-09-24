/**
 * Plan 3 final wave B (defect 7) — the PDF path pin for the Task-13b quoted-literal rule.
 *
 * Task 13b (`din276-X-1`) ruled that a QUOTED string literal in a formula is always a
 * literal, never a symbol: before it, `if(status == 'rechnung', rechnung, auftrag)` on a
 * worksheet that also carries a `rechnung` FIELD compared `status` against that field's
 * VALUE and took the wrong branch. The rule has unit coverage in
 * `src/lib/expr/__tests__/quoted-literal.test.ts`, but the Task-1b review parked the one
 * place it was never pinned: the `@react-pdf` output path (backlog item 14).
 *
 * This drives the WHOLE chain — the pure assembler (which runs the real `evaluateFormula`)
 * → `StandardReportDocument` → `renderToBuffer` — and asserts the rendered bytes carry the
 * right branch's value AND the literal printed as a quoted token.
 */
import { describe, it, expect } from 'vitest';
import { inflateSync, inflateRawSync } from 'node:zlib';
import { renderToBuffer } from '@react-pdf/renderer';
import { StandardReportDocument } from '@/components/pdf/standard-report-document';
import { assembleStandardReport, type AssemblerInput } from '../assemble-standard-report';

/** Same extractor as render-standard-report.test.tsx (streams + inline hex glyph literals). */
function extractAllText(buf: Buffer): string {
  const raw = buf.toString('binary');
  let out = '';
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const payload = Buffer.from(m[1], 'binary');
    let decompressed: Buffer | null = null;
    try { decompressed = inflateSync(payload); } catch { try { decompressed = inflateRawSync(payload); } catch { decompressed = null; } }
    const blob = decompressed ? decompressed.toString('latin1') : payload.toString('latin1');
    out += blob + '\n';
    const hexRe = /<([0-9A-Fa-f]+)>/g;
    let hm: RegExpExecArray | null;
    while ((hm = hexRe.exec(blob)) !== null) {
      const hex = hm[1];
      if (hex.length === 0 || hex.length % 2 !== 0) continue;
      out += Buffer.from(hex, 'hex').toString('latin1');
    }
    out += '\n';
  }
  return out;
}

/** The DIN-276 collision shape: a quoted token that is ALSO a symbol of the worksheet. */
const input = (statusValue: string): AssemblerInput => ({
  project: {
    id: 'proj-q', name: 'Quoted-Literal-Projekt', projectCode: 'EW-2026-Q', clientName: 'Kunde',
    location: 'Ort', siteProfile: {}, createdAt: '2026-01-01T00:00:00.000Z',
  },
  org: {
    id: 'org-q', name: 'Test Büro', logoUrl: null, addressLine1: 'Teststraße 1', addressLine2: null,
    postalCode: '12345', city: 'Teststadt', phone: null, email: null, website: null,
  },
  standard: { id: 'std-q', code: 'DIN-276', titleDe: 'Kosten im Bauwesen', version: '2018-12' },
  templates: [{ id: 'tpl-q', code: 'DIN-276-09', titleDe: 'Kostenstand', orderIndex: 1 }],
  instances: [{ id: 'inst-q', worksheetTemplateId: 'tpl-q', status: 'draft' }],
  sections: [{ id: 'sec-q', worksheetTemplateId: 'tpl-q', titleDe: 'Beträge', orderIndex: 1 }],
  fields: [
    { id: 'f-status', worksheetTemplateId: 'tpl-q', sectionId: 'sec-q', symbol: 'status', labelDe: 'Belegart', unit: null, dataType: 'enum', isRequired: true, clauseReference: null, orderIndex: 1 },
    { id: 'f-rechnung', worksheetTemplateId: 'tpl-q', sectionId: 'sec-q', symbol: 'rechnung', labelDe: 'Rechnungsbetrag', unit: 'EUR', dataType: 'number', isRequired: false, clauseReference: null, orderIndex: 2 },
    { id: 'f-auftrag', worksheetTemplateId: 'tpl-q', sectionId: 'sec-q', symbol: 'auftrag', labelDe: 'Auftragsbetrag', unit: 'EUR', dataType: 'number', isRequired: false, clauseReference: null, orderIndex: 3 },
    { id: 'f-out', worksheetTemplateId: 'tpl-q', sectionId: 'sec-q', symbol: 'betrag_gewaehlt', labelDe: 'Maßgebender Betrag', unit: 'EUR', dataType: 'number', isRequired: false, clauseReference: null, orderIndex: 4 },
  ],
  equations: [{
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    worksheetTemplateId: 'tpl-q', equationNumber: 'DIN-276-09-D1',
    formula: "betrag_gewaehlt = if(status == 'rechnung', rechnung, auftrag)",
    formulaLatex: null, inputSymbols: ['status', 'rechnung', 'auftrag'],
    outputSymbol: 'betrag_gewaehlt', outputUnit: 'EUR', clauseReference: '§3.4',
  }],
  compliance: [],
  parameters: [
    { fieldId: 'f-status', valueNumber: null, valueText: null, valueEnum: statusValue, valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSources: [] },
    { fieldId: 'f-rechnung', valueNumber: 950, valueText: null, valueEnum: null, valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSources: [] },
    { fieldId: 'f-auftrag', valueNumber: 1000, valueText: null, valueEnum: null, valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSources: [] },
  ],
  documents: [], approvals: [], audits: [],
  now: new Date('2026-09-24T12:00:00.000Z'),
});

describe('PDF output path — a quoted literal is a literal (wave B defect 7, Task 13b)', () => {
  it('assembles the TRUE branch: status == \'rechnung\' compares against the token, never against the `rechnung` field value', () => {
    const data = assembleStandardReport(input('rechnung'));
    const eq = data.worksheets[0].equations[0];
    expect(eq.evalState?.kind).toBe('computed');
    expect(eq.evalState?.kind === 'computed' && eq.evalState.value).toBe(950);
    // the substituted input prints the token, quoted — not a number
    expect(eq.evalState?.kind === 'computed' && eq.evalState.substituted.status).toBe('rechnung');
  });

  it('takes the FALSE branch when the token does not match', () => {
    const data = assembleStandardReport(input('angebot'));
    const eq = data.worksheets[0].equations[0];
    expect(eq.evalState?.kind === 'computed' && eq.evalState.value).toBe(1000);
  });

  it('renders that value and the quoted token in the @react-pdf output', async () => {
    const data = assembleStandardReport(input('rechnung'));
    const buf = await renderToBuffer(<StandardReportDocument data={data} />);
    expect(buf.length).toBeGreaterThan(1000);
    const text = extractAllText(buf);
    // the computed verdict, the right branch's value, and the literal printed as a quoted token
    // the verdict caption renders through a small-caps style, so compare case-insensitively
    expect(text.toLowerCase()).toContain('rechnerisch bestätigt');
    expect(text).toContain('betrag_gewaehlt = 950');
    expect(text).toContain("status = 'rechnung'");
    // and NOT the wrong branch's value as the result
    expect(text).not.toContain('betrag_gewaehlt = 1.000');
  });
});
