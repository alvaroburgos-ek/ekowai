import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { ValuetableDocument } from '@/components/pdf/valuetable-document';
import type { ValuetableData } from '@/lib/pdf/load-valuetable';

function data(rows: ValuetableData['rows']): ValuetableData {
  return {
    project: { id: 'p', name: 'TEST-A138-BESS-Mulde', projectCode: null },
    standard: { code: 'DWA-A-138-1', titleDe: 'x', version: '2024' },
    rows, snapshotId: null, snapshotTakenAt: null, generatedAt: '2026-09-30T00:00:00Z',
  };
}
const LONG = 'q_S,AC = 6,6e-7 x 250 x 1000 / 162,2 x 1e4 = 10,2 l/(s ha) >= 2 (Gl. 9); 2 < q <= 5 nicht erfuellt, f_Z = 1,2 dennoch auf der sicheren Seite gewaehlt; MHGW-Abstand >= 2,7 m (LANUK-Bound 42,6 m NHN, Sohle ca. 45,6 m NHN); Entleerungszeit 28,6 h < 84 h (Information, im Einfachen Verfahren nicht gefordert, 6.3.2).';
const UUID = '4e080a11-527e-4a51-ac40-683c57643818';

describe('valuetable render repro', () => {
  it('short rows', async () => {
    const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-13', symbol: 'V_VA', labelDe: 'Speichervolumen', value: '16,9833', unit: 'm³', clauseReference: '§5.3.3.7' }])} />);
    expect(buf.length).toBeGreaterThan(100);
  });
  it('uuid text row', async () => {
    const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-13', symbol: 'rainfall_table_ref', labelDe: 'Quelle', value: UUID, unit: null, clauseReference: null }])} />);
    expect(buf.length).toBeGreaterThan(100);
  });
  it('long text row', async () => {
    const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-25', symbol: 'verification_notes', labelDe: 'Anmerkungen', value: LONG, unit: null, clauseReference: '§5.3.3.7' }])} />);
    expect(buf.length).toBeGreaterThan(100);
  });
});

describe('valuetable render repro — unbreakable strings', () => {
  it('300-char unbreakable text row', async () => {
    const v = 'x'.repeat(300);
    const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-01', symbol: 'url', labelDe: 'Quelle', value: v, unit: null, clauseReference: null }])} />);
    expect(buf.length).toBeGreaterThan(100);
  });
  it('60-char unbreakable text row', async () => {
    const v = 'https://www.example.org/pfad/zu/einer/sehr/langen/adresse/ohne/leerzeichen';
    const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-01', symbol: 'url', labelDe: 'Quelle', value: v, unit: null, clauseReference: null }])} />);
    expect(buf.length).toBeGreaterThan(100);
  });
});

describe('valuetable render repro — many rows (multi-page)', () => {
  it('200 short rows', async () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({ worksheetCode: `A138-${String((i % 28) + 1).padStart(2, '0')}`, symbol: `sym_${i}`, labelDe: `Bezeichnung ${i}`, value: String(i), unit: 'm³', clauseReference: '§5' }));
    const buf = await renderToBuffer(<ValuetableDocument data={data(rows)} />);
    expect(buf.length).toBeGreaterThan(100);
  });
  it('60 rows incl. long text rows', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ worksheetCode: `A138-${String((i % 28) + 1).padStart(2, '0')}`, symbol: `sym_${i}`, labelDe: `Bezeichnung ${i}`, value: i % 7 === 0 ? LONG : String(i), unit: null, clauseReference: '§5' }));
    const buf = await renderToBuffer(<ValuetableDocument data={data(rows)} />);
    expect(buf.length).toBeGreaterThan(100);
  });
});

describe('valuetable render repro — non-WinAnsi glyphs in standard fonts', () => {
  const cases: Array<[string, string, string | null]> = [
    ['arrow', 'Abweichung A_C vorläufig↔final', '%'],
    ['sigma', 'Σ befestigte Fläche A_E,b,a', 'm²'],
    ['eta', 'Erforderlicher Gesamtwirkungsgrad η_AFS63 (Tab. 7)', '%'],
    ['geq', 'Anlage erfüllt q_S,AC ≥ 2 l/(s·ha)', null],
    ['leq', 'MHGW-Abstand ≥ 1 m erfüllt ≤ x', null],
    ['degree', 'Geographische Länge', '°E'],
    ['sub3', 'Zufluss', 'l/(s·ha)'],
    ['symbol-arrow', 'x', null],
  ];
  for (const [name, label, unit] of cases) {
    it(name, async () => {
      const sym = name === 'symbol-arrow' ? 'A_C→final' : 'sym';
      const buf = await renderToBuffer(<ValuetableDocument data={data([{ worksheetCode: 'A138-27', symbol: sym, labelDe: label, value: '0', unit, clauseReference: '§5.3.3.5' }])} />);
      expect(buf.length).toBeGreaterThan(100);
    });
  }
});


describe('valuetable render repro — prod-like long symbols/enums', () => {
  const rows: ValuetableData['rows'] = [
    { worksheetCode: 'A138-24', symbol: 'attest_a138_24_a138_req_20', labelDe: 'Nachweis: 5.3.3.7', value: 'ja', unit: null, clauseReference: null },
    { worksheetCode: 'A138-23', symbol: 'facility_specific_dimensioning_complete', labelDe: 'Anlagen-spezifische Bemessung abgeschlossen', value: 'nein', unit: null, clauseReference: '§6' },
    { worksheetCode: 'A138-27', symbol: 'preliminary_vs_final_storage_dev_pct', labelDe: 'Abweichung Speichervolumen vorläufig↔final', value: '0', unit: '%', clauseReference: '§5.3.3.7' },
    { worksheetCode: 'A138-02', symbol: 'building_clearance_status', labelDe: 'Bauwerksabstand', value: 'not_met_protection_possible', unit: null, clauseReference: '§5.1.2' },
    { worksheetCode: 'A138-28', symbol: 'final_compliance_verdict', labelDe: 'Endgültige Konformität', value: 'compliant_with_conditions', unit: null, clauseReference: '§1, §5, §6' },
    { worksheetCode: 'A138-06', symbol: 'a138_tier', labelDe: 'Anforderungsstufe nach Tabelle 6 (Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone)', value: 'tier1_none', unit: null, clauseReference: '§5.2.3.2, Tab. 6' },
    { worksheetCode: 'A138-12', symbol: 'ac_as_ratio_check_reason', labelDe: 'Prüfung — Begründung', value: 'Tab.6: behördlich abzustimmen (*) (Anmerkung, Zeile 936).', unit: null, clauseReference: null },
    { worksheetCode: 'A138-11', symbol: 'k_i', labelDe: 'Bemessungsrelevante Infiltrationsrate k_i', value: '6,600e-7', unit: 'm/s', clauseReference: '§5.3.3.6' },
    { worksheetCode: 'A138-01', symbol: 'site_lon', labelDe: 'Geographische Länge', value: '7,3', unit: '°E', clauseReference: '§5.1.1' },
  ];
  for (const r of rows) {
    it(`${r.worksheetCode} ${r.symbol}`, async () => {
      const buf = await renderToBuffer(<ValuetableDocument data={data([r])} />);
      expect(buf.length).toBeGreaterThan(100);
    });
  }
  it('all together', async () => {
    const buf = await renderToBuffer(<ValuetableDocument data={data(rows)} />);
    expect(buf.length).toBeGreaterThan(100);
  });
});
