import { describe, it, expect } from 'vitest';
import { inflateSync, inflateRawSync } from 'node:zlib';
import { renderToBuffer } from '@react-pdf/renderer';
import { StandardReportDocument } from '@/components/pdf/standard-report-document';
import type { StandardReportData, ReportEquation } from '@/lib/pdf/load-standard-report';

/**
 * Extract text from PDF content streams by finding every "stream\n…endstream"
 * block whose dictionary advertises /FlateDecode, then decompressing each.
 *
 * @react-pdf serialises text positioning operators as `(Hello) Tj` etc. The
 * literal characters of placed text appear unescaped inside the inflated
 * stream, which is exactly what our content-contract assertions need.
 *
 * This is not a general PDF text extractor — it intentionally returns the
 * concatenation of all stream payloads, including position operators. The
 * load-bearing strings we search for are unique enough that PDF operator
 * noise doesn't generate false positives.
 */
function extractAllText(buf: Buffer): string {
  const raw = buf.toString('binary');
  let out = '';
  // Find every "stream\n…endstream" block.
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const payload = Buffer.from(m[1], 'binary');
    let decompressed: Buffer | null = null;
    try {
      decompressed = inflateSync(payload);
    } catch {
      try {
        decompressed = inflateRawSync(payload);
      } catch {
        decompressed = null;
      }
    }
    const blob = decompressed
      ? decompressed.toString('latin1')
      : payload.toString('latin1');
    out += blob + '\n';
    // Standard 14 fonts (Helvetica, Courier) carry their glyph codes inline
    // as hex literals — e.g. `<536569> Tj` = "Sei". Decode every hex literal
    // and append the result so substring matching works on rendered text.
    const hexRe = /<([0-9A-Fa-f]+)>/g;
    let hm: RegExpExecArray | null;
    while ((hm = hexRe.exec(blob)) !== null) {
      const hex = hm[1];
      if (hex.length === 0 || hex.length % 2 !== 0) continue;
      try {
        // The Helvetica encoding for our use is essentially latin1 / WinAnsi
        // — single-byte codepoints map to printable ASCII / Latin-1.
        const decoded = Buffer.from(hex, 'hex').toString('latin1');
        out += decoded;
      } catch {
        // ignore
      }
    }
    out += '\n';
  }
  return out;
}

/**
 * Render-snapshot test for the PDF compliance report.
 *
 * The fixture exercises:
 *   - Two worksheets in `order_index` order
 *   - Engine three-state mixin per worksheet (computed, manual_required, error)
 *   - Citations on fields → present in the citation index
 *   - Compliance reqs in pass / fail / pending / manual states
 *   - Audit excerpt with a manual_override entry carrying its reason
 *
 * Asserts:
 *   - renderToBuffer doesn't throw
 *   - PDF size > 1 KB (sanity threshold — an empty failed render is < 200 B)
 *   - The PDF byte-stream contains the strings that PROVE the three-state
 *     contract was honored in the output. These strings come straight out of
 *     EngineVerdict and are stable parts of the visual contract:
 *
 *       "rechnerisch bestätigt"            → computed verdict text
 *       "rechnerisch NICHT bestätigt"      → manual_required verdict text
 *       "Engine konnte nicht verifizieren" → footer text on warn cards
 *
 * If a refactor ever causes the engine to print a bare number instead of the
 * warning box for `manual_required`, this test fails because the warn string
 * disappears from the output.
 */
describe('StandardReportDocument', () => {
  const fixture: StandardReportData = {
    generatedAt: '2026-05-31T12:00:00.000Z',
    project: {
      projectId: '11111111-1111-1111-1111-111111111111',
      projectName: 'Beispielprojekt Erlangen-Nord',
      projectCode: 'EW-2026-014',
      clientName: 'Stadtwerke Erlangen',
      location: 'Erlangen, Bayern',
      createdAt: '2026-03-01T00:00:00.000Z',
      aggregatedStatus: 'submitted',
    },
    letterhead: {
      orgName: 'Ingenieurbüro Wasser & Boden GmbH',
      logoUrl: null,
      addressLine1: 'Beispielstraße 12',
      addressLine2: null,
      postalCode: '91054',
      city: 'Erlangen',
      phone: '+49 9131 1234-0',
      email: 'kontakt@wasserbuero.de',
      website: 'https://wasserbuero.de',
    },
    standard: {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'DWA-A 138-1',
      titleDe: 'Versickerung von Niederschlagswasser',
      version: '2024-08',
      supersededBy: null,
    },
    siteProfile: {
      rows: [
        { key: 'site_bundesland', labelDe: 'Bundesland', value: 'Bayern' },
        { key: 'kostra_grid_cell', labelDe: 'KOSTRA Rasterzelle', value: 'A12-B34' },
        { key: 'k_f', labelDe: 'k_f', value: '0.00001', unit: 'm/s' },
        { key: 'mhgw', labelDe: 'MHGW', value: '297.4', unit: 'm NHN' },
      ],
    },
    worksheets: [
      // ---------- Worksheet 1 — all three engine states ----------
      {
        instanceId: 'aaaa1111-1111-1111-1111-111111111111',
        templateId: 'aaaa0000-0000-0000-0000-000000000000',
        code: 'A138-12',
        titleDe: 'Versickerungsfläche',
        status: 'submitted',
        orderIndex: 1,
        aSmProvenanceLine: null,
        sections: [
          {
            id: 'sec-12-1',
            titleDe: 'Grunddaten',
            orderIndex: 1,
            fields: [
              {
                id: 'f-12-kf',
                symbol: 'k_i',
                labelDe: 'Durchlässigkeitsbeiwert',
                unit: 'm/s',
                dataType: 'number',
                isRequired: true,
                value: '0.00001',
                valueSource: 'site_profile',
                citations: [
                  {
                    label: '[BÜK50:42]',
                    title: 'BÜK 50 Gutachten 2025',
                    docId: 'doc-buek50',
                    page: 42,
                    note: null,
                  },
                ],
                clauseReference: '§5.3.3.6',
              },
              {
                id: 'f-12-as',
                symbol: 'A_S',
                labelDe: 'Versickerungsfläche',
                unit: 'm²',
                dataType: 'number',
                isRequired: true,
                value: '120',
                valueSource: 'entered',
                citations: [],
                clauseReference: '§5.3.3.6',
              },
              {
                id: 'f-12-asmin',
                symbol: 'A_S_min',
                labelDe: 'Mindestversickerungsfläche',
                unit: 'm²',
                dataType: 'number',
                isRequired: false,
                value: null,
                valueSource: null,
                citations: [],
                clauseReference: '§5.3.3.6',
              },
            ],
          },
        ],
        equations: [
          // computed
          {
            id: 'eq-12-4',
            equationNumber: '4',
            formula: 'Q_S = k_i * A_S * 1000',
            formulaLatex: null,
            outputSymbol: 'Q_S',
            outputUnit: 'l/s',
            clauseReference: '§5.3.3.6',
            evalState: {
              kind: 'computed',
              value: 1.2,
              substituted: { k_i: 0.00001, A_S: 120 },
              formulaEvaluated: 'k_i * A_S * 1000',
            },
          } satisfies ReportEquation,
          // manual_required
          {
            id: 'eq-12-7',
            equationNumber: '7',
            formula: 'A_S_m = (A_S_min + A_S_max) / 2',
            formulaLatex: null,
            outputSymbol: 'A_S_m',
            outputUnit: 'm²',
            clauseReference: '§5.3.3.6',
            evalState: {
              kind: 'manual_required',
              reason: 'Fehlende oder leere Eingaben: A_S_min, A_S_max',
              missing: ['A_S_min', 'A_S_max'],
            },
          } satisfies ReportEquation,
          // error
          {
            id: 'eq-12-99',
            equationNumber: '99',
            formula: 'X = / 0',
            formulaLatex: null,
            outputSymbol: 'X',
            outputUnit: null,
            clauseReference: null,
            evalState: {
              kind: 'error',
              message: 'Konnte RHS nicht parsen',
            },
          } satisfies ReportEquation,
          // null (not on whitelist)
          {
            id: 'eq-12-unwired',
            equationNumber: '999',
            formula: 'Y = 42',
            formulaLatex: null,
            outputSymbol: 'Y',
            outputUnit: null,
            clauseReference: null,
            evalState: null,
          },
        ],
        compliance: [
          {
            id: 'req-12-a',
            code: 'REQ-1',
            titleDe: 'k_f innerhalb gültigem Bereich',
            condition: 'k_f >= 1e-9 AND k_f <= 1e-2',
            severity: 'blocking',
            clauseReference: '§5.3.3',
            result: { kind: 'pass' },
          },
          {
            id: 'req-12-b',
            code: 'REQ-2',
            titleDe: 'A_S liegt vor',
            condition: 'A_S IS NOT NULL',
            severity: 'warning',
            clauseReference: '§5.3.3.6',
            result: { kind: 'pending', missingSymbols: ['A_S_min'] },
          },
        ],
      },
      // ---------- Worksheet 2 — light, just to confirm ordering ----------
      {
        instanceId: 'bbbb1111-1111-1111-1111-111111111111',
        templateId: 'bbbb0000-0000-0000-0000-000000000000',
        code: 'A138-16',
        titleDe: 'Mulden- und Rinnenversickerung',
        status: 'draft',
        orderIndex: 2,
        aSmProvenanceLine: null,
        sections: [
          {
            id: 'sec-16-1',
            titleDe: 'Eingaben',
            orderIndex: 1,
            fields: [
              {
                id: 'f-16-ac',
                symbol: 'A_C',
                labelDe: 'Angeschlossene Fläche',
                unit: 'm²',
                dataType: 'number',
                isRequired: true,
                value: '500',
                valueSource: 'entered',
                citations: [
                  {
                    label: '[PLAN-EG-01]',
                    title: 'Lageplan Erlangen-Nord, Rev. 3',
                    docId: 'doc-plan',
                    page: null,
                    note: 'Bemaßung aus PLN-Layer',
                  },
                ],
                clauseReference: '§6.2.2',
              },
            ],
          },
        ],
        equations: [],
        compliance: [
          {
            id: 'req-16-a',
            code: 'REQ-3',
            titleDe: 'Engineer-Attestierung',
            condition: 'Engineer attestation',
            severity: 'blocking',
            clauseReference: '§6.2.2',
            result: { kind: 'manual' },
          },
        ],
      },
    ],
    citationIndex: [
      {
        docId: 'doc-buek50',
        citationLabel: '[BÜK50:42]',
        title: 'BÜK 50 Gutachten 2025',
        kind: 'report',
        issuedAt: '2025-01-15T00:00:00.000Z',
      },
      {
        docId: 'doc-plan',
        citationLabel: '[PLAN-EG-01]',
        title: 'Lageplan Erlangen-Nord, Rev. 3',
        kind: 'drawing',
        issuedAt: '2026-02-10T00:00:00.000Z',
      },
    ],
    audit: [
      {
        occurredAt: '2026-05-20T10:00:00.000Z',
        actorName: 'Dipl.-Ing. M. Schmidt',
        actorRole: 'engineer',
        action: 'submit_for_review',
        detail: 'draft → submitted · „Bereit zur Prüfung durch Wasserbehörde"',
        worksheetCode: 'A138-12',
      },
      {
        occurredAt: '2026-05-15T14:30:00.000Z',
        actorName: 'Dipl.-Ing. M. Schmidt',
        actorRole: 'engineer',
        action: 'manual_override',
        detail: 'A_S_m = 95 m² — gemittelt aus mehreren Bohrungen, vgl. Bohrprotokoll',
        worksheetCode: null,
      },
    ],
  };

  // Per-test timeout bumped because @react-pdf's renderToBuffer ships a
  // PDF generator that does font subsetting + Tj-positioned glyph layout
  // + FlateDecode compression. The work fits well under 5000ms in
  // isolation but timeouts flake under parallel suite load (other tests
  // contend for CPU). 15000ms gives consistent headroom.
  it('renders to a PDF buffer larger than 1 KB without throwing', async () => {
    const buffer = await renderToBuffer(<StandardReportDocument data={fixture} />);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(1024);
    // Sanity — should be a real PDF (header starts with %PDF-)
    const head = buffer.subarray(0, 5).toString('utf8');
    expect(head).toBe('%PDF-');
  }, 15000);

  it('three-state contract is preserved: prints distinct verdicts for computed / manual_required / error', async () => {
    const buffer = await renderToBuffer(<StandardReportDocument data={fixture} />);
    // @react-pdf writes Tj-positioned glyphs into FlateDecode-compressed
    // content streams; we inflate every stream so the visual contract
    // tokens are searchable.
    const text = extractAllText(buffer);

    // computed verdict — present. textTransform: uppercase means we look
    // for the uppercase form ("RECHNERISCH BESTÄTIGT" in the rendered PDF).
    expect(text).toMatch(/rechnerisch best/i);

    // manual_required verdict — present AND distinguishable from computed
    expect(text).toMatch(/NICHT best/i);

    // engine warn-card footer text — present for both manual_required and error
    expect(text).toMatch(/manuell zu best/i);

    // The error verdict surfaces its own banner
    expect(text).toMatch(/Fehler bei Engine/i);

    // not-evaluated note for non-whitelisted equations
    expect(text).toMatch(/nicht durch Engine/i);
  });

  it('citation index appears with the document labels referenced by fields', async () => {
    const buffer = await renderToBuffer(<StandardReportDocument data={fixture} />);
    const text = extractAllText(buffer);
    expect(text).toMatch(/Beleg-Verzeichnis/i);
    // BÜK50:42 is the citation chip — Tj positioning may insert spaces, so
    // we match the stable substring.
    expect(text).toMatch(/BÜK50/);
    expect(text).toMatch(/PLAN-EG-01/);
  });

  it('audit excerpt prints the manual_override reason verbatim', async () => {
    const buffer = await renderToBuffer(<StandardReportDocument data={fixture} />);
    const text = extractAllText(buffer);
    expect(text).toMatch(/Audit-Trail-Auszug/i);
    expect(text).toMatch(/manuelle/i);
    // The audit reason is a load-bearing audit guarantee
    expect(text).toMatch(/Bohrprotokoll/);
  });
});
