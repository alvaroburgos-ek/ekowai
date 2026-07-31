/**
 * VERIFY FLL-GAR-01 (Projektregistrierung) — real-save-path integration.
 *
 * FLL-GAR-01 is a `registration` archetype: 7 admin text/date fields, 0 equations.
 * Its "chain" is pure persistence — save the 7 registration fields through the
 * REAL saveWorksheet and read them back. There is no worked example in the PDF
 * (registration data), so the chain is sanity-checked (round-trip fidelity) = VC.
 *
 * Its 2 compliance_requirements (REQ-02 baurechtliche Genehmigungen, REQ-03 WHG-
 * Einleitung) reference symbols `lbo_genehmigung_erforderlich` /
 * `whg_einleitung_genehmigung` — which live on FLL-GAR-03, NOT on this worksheet.
 * The wizard gate evaluator (compliance-block.tsx) builds its symbol lookup ONLY
 * from the CURRENT worksheet's fields, so on GAR-01 both symbols resolve to
 * undefined. We exercise both gates through the real evaluateCondition with the
 * GAR-01-local lookup (fail state) AND with an off-worksheet lookup that supplies
 * the symbol (pass state) to prove the condition grammar itself is well-formed —
 * the defect is topology (wrong home), not grammar.
 */
// @vitest-environment node
import './_harness-env-fll-gar'; // top-level-await: PG up + seeded BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGarHarness } from './_harness-env-fll-gar';
import { saveWorksheet } from '@/lib/actions/worksheet';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllGarHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

const WS = fixture.worksheets['FLL-GAR-01'];

// GAR-01-local lookup: only the 7 registration symbols exist. Mirrors the
// worksheet-local lookup ComplianceBlock builds from props.fields.
const localSymbols = new Set(Object.keys(WS.fields));
const localLookupEmpty = (sym: string) => (localSymbols.has(sym) ? '' : undefined);

// REQ-02 / REQ-03 conditions verbatim from prod.
const REQ_02_COND = 'lbo_genehmigung_erforderlich IS NOT NULL';
const REQ_03_COND = 'whg_einleitung_genehmigung IS NOT NULL';

describe('VERIFY FLL-GAR-01 — Projektregistrierung', () => {
  it('CHAIN: persists the 7 registration fields through real saveWorksheet + reads back', async () => {
    const f = WS.fields;
    const res = await saveWorksheet({
      instanceId: WS.instanceId,
      values: {
        [f['project_code']]: { type: 'text', value: 'FLL-2024-001' },
        [f['project_name']]: { type: 'text', value: 'Naturteich Musterhausen' },
        [f['bauherr']]: { type: 'text', value: 'Familie Muster' },
        [f['planer']]: { type: 'text', value: 'Landschaftsarchitekt Beispiel' },
        [f['ausfuehrungsbetrieb']]: { type: 'text', value: 'GaLaBau Beispiel GmbH' },
        [f['project_date']]: { type: 'date', value: '2024-05-01' },
        [f['standort_address']]: { type: 'text', value: 'Musterweg 1, 47800 Krefeld' },
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.saved).toBe(7);

    // Read back through the DB — proves the round-trip persisted.
    const rows = await sql<{ symbol: string; value_text: string | null; value_date: string | null }[]>`
      SELECT fl.symbol, pp.value_text, pp.value_date::text AS value_date
      FROM project_parameters pp
      JOIN fields fl ON fl.id = pp.field_id
      WHERE pp.source_worksheet_instance_id = ${WS.instanceId}
      ORDER BY fl.order_index`;
    const bySym = Object.fromEntries(rows.map((r) => [r.symbol, r.value_text ?? r.value_date]));
    expect(bySym['project_code']).toBe('FLL-2024-001');
    expect(bySym['bauherr']).toBe('Familie Muster');
    expect(bySym['standort_address']).toBe('Musterweg 1, 47800 Krefeld');
    expect(bySym['project_date']).toBe('2024-05-01');
  });

  it('GATE REQ-02: is a permanent FAIL on GAR-01 (symbol lives on GAR-03, not here)', () => {
    // FAIL state — GAR-01-local lookup: symbol absent → IS NOT NULL → fail.
    const failRes = evaluateCondition(REQ_02_COND, localLookupEmpty);
    expect(failRes.kind).toBe('fail');

    // PASS state requires the symbol be present — but it can ONLY be present on a
    // lookup that includes GAR-03's field. On GAR-01 that never happens.
    const offWorksheetLookup = (sym: string) =>
      sym === 'lbo_genehmigung_erforderlich' ? 'true' : undefined;
    const passRes = evaluateCondition(REQ_02_COND, offWorksheetLookup);
    expect(passRes.kind).toBe('pass');
  });

  it('GATE REQ-03: is a permanent FAIL on GAR-01 (symbol lives on GAR-03, not here)', () => {
    const failRes = evaluateCondition(REQ_03_COND, localLookupEmpty);
    expect(failRes.kind).toBe('fail');

    const offWorksheetLookup = (sym: string) =>
      sym === 'whg_einleitung_genehmigung' ? 'true' : undefined;
    const passRes = evaluateCondition(REQ_03_COND, offWorksheetLookup);
    expect(passRes.kind).toBe('pass');
  });

  it('TOPOLOGY: neither gate symbol is among GAR-01 fields (proves the vacuity)', () => {
    expect(localSymbols.has('lbo_genehmigung_erforderlich')).toBe(false);
    expect(localSymbols.has('whg_einleitung_genehmigung')).toBe(false);
    // The 7 real GAR-01 symbols:
    expect([...localSymbols].sort()).toEqual(
      [
        'ausfuehrungsbetrieb',
        'bauherr',
        'planer',
        'project_code',
        'project_date',
        'project_name',
        'standort_address',
      ].sort(),
    );
  });
});
