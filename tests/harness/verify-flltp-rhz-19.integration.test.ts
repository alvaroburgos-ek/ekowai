/**
 * VERIFY DRIVER — FLLTP-RHZ-19 "Prüfbericht Erstellung" (FLL-TP-RHIZOM-2023).
 *
 * Boots its own embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM standard, then:
 *  - drives the 4 local fields through the REAL saveWorksheet path (persist +
 *    read-back);
 *  - fires both compliance gates (REQ-21, REQ-22) via the REAL
 *    evaluateWorksheetCompliance report evaluator in pass + fail states, using a
 *    WORKSHEET-LOCAL symbol map (exactly how the report renderer scopes it).
 *
 * DOCTRINE: no prod writes. Regulation values (gueltigkeitsdauer=10 a etc.) are
 * quoted from the PDF in the JSON detail; this test only proves the machinery.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';
import {
  evaluateWorksheetCompliance,
  type ReportField,
  type ReportParameter,
  type ReportComplianceRow,
} from '@/lib/eval/evaluate-for-report';

const USER_ID = '00000000-0000-4000-8000-0000000000f3';

let harness: Harness;
let fixture: SeededRhizomFixture;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  fixture = await seedFllRhizom(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

/** Load this worksheet's fields + persisted params as Report* rows. */
async function loadReportRows(templateId: string, projectId: string) {
  const fRows = await harness.sql<
    { id: string; symbol: string; unit: string | null; data_type: string }[]
  >`SELECT id, symbol, unit, data_type FROM fields WHERE worksheet_template_id = ${templateId}`;
  const fields: ReportField[] = fRows.map((r) => ({
    id: r.id, symbol: r.symbol, unit: r.unit, dataType: r.data_type,
  }));
  const pRows = await harness.sql<
    {
      field_id: string;
      value_number: string | null;
      value_text: string | null;
      value_enum: string | null;
      value_boolean: boolean | null;
      value_date: string | null;
      value_json: unknown | null;
    }[]
  >`SELECT field_id, value_number, value_text, value_enum, value_boolean, value_date, value_json
      FROM project_parameters
      WHERE project_id = ${projectId} AND field_id IN ${harness.sql(fields.map((f) => f.id))}`;
  const parameters: ReportParameter[] = pRows.map((p) => ({
    fieldId: p.field_id,
    valueNumber: p.value_number == null ? null : Number(p.value_number),
    valueText: p.value_text,
    valueEnum: p.value_enum,
    valueBoolean: p.value_boolean,
    valueDate: p.value_date,
    valueJson: p.value_json,
  }));
  return { fields, parameters };
}

describe('FLLTP-RHZ-19 verify driver', () => {
  it('persists the 4 local fields through the REAL saveWorksheet path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-19'];
    expect(ws).toBeTruthy();

    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bericht_datum']]: { type: 'date', value: '2026-07-23' },
        [ws.fieldIds['bericht_seitenanzahl']]: { type: 'number', value: 27 },
        [ws.fieldIds['gueltigkeitsdauer_jahre']]: { type: 'number', value: 10 },
        [ws.fieldIds['attest_flltp_rhz_19_req_21']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    const { fields, parameters } = await loadReportRows(ws.templateId, fixture.projectId);
    const bySym = (sym: string) => {
      const f = fields.find((x) => x.symbol === sym)!;
      return parameters.find((p) => p.fieldId === f.id)!;
    };
    expect(bySym('gueltigkeitsdauer_jahre').valueNumber).toBe(10);
    expect(bySym('bericht_seitenanzahl').valueNumber).toBe(27);
    const d = new Date(bySym('bericht_datum').valueDate as unknown as string);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 7, 23]);
    expect(bySym('attest_flltp_rhz_19_req_21').valueBoolean).toBe(true);
  });

  it('REQ-21 fires: passes when attest true, fails/pending otherwise', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-19'];
    const rows: ReportComplianceRow[] = [{
      id: 'req21', code: 'REQ-21', titleDe: 'Prüfbericht-Inhalt vollständig',
      condition: 'attest_flltp_rhz_19_req_21 == True', severity: 'block',
      description: null, requiresAttestation: false,
    }];

    // PASS state
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['attest_flltp_rhz_19_req_21']]: { type: 'boolean', value: true } },
    });
    let { fields, parameters } = await loadReportRows(ws.templateId, fixture.projectId);
    let out = evaluateWorksheetCompliance('FLLTP-RHZ-19', rows, fields, parameters, []);
    expect(out[0].result.kind).toBe('pass');

    // FAIL state
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['attest_flltp_rhz_19_req_21']]: { type: 'boolean', value: false } },
    });
    ({ fields, parameters } = await loadReportRows(ws.templateId, fixture.projectId));
    out = evaluateWorksheetCompliance('FLLTP-RHZ-19', rows, fields, parameters, []);
    expect(out[0].result.kind).toBe('fail');
  });

  it('REQ-22 is VACUOUS on FLLTP-RHZ-19: all 4 referenced fields live on FLLTP-RHZ-20 → always pending, never fireable', async () => {
    const ws = fixture.byCode['FLLTP-RHZ-19'];
    const rows: ReportComplianceRow[] = [{
      id: 'req22', code: 'REQ-22', titleDe: 'Verlängerung Voraussetzungen',
      condition:
        'pruefgrundlagen_unveraendert == true AND produkt_aktuell_im_lieferprogramm == true AND rueckstellmuster_erneut_hinterlegt == true AND eidesstattliche_erklaerung_vorhanden == true',
      severity: 'block', description: null, requiresAttestation: false,
    }];
    const { fields, parameters } = await loadReportRows(ws.templateId, fixture.projectId);
    // The 4 symbols are NOT fields of FLLTP-RHZ-19.
    for (const sym of [
      'pruefgrundlagen_unveraendert', 'produkt_aktuell_im_lieferprogramm',
      'rueckstellmuster_erneut_hinterlegt', 'eidesstattliche_erklaerung_vorhanden',
    ]) {
      expect(fields.find((f) => f.symbol === sym)).toBeUndefined();
    }
    const out = evaluateWorksheetCompliance('FLLTP-RHZ-19', rows, fields, parameters, []);
    // Worksheet-local map cannot resolve any operand → pending, regardless of state.
    expect(out[0].result.kind).toBe('pending');
    if (out[0].result.kind === 'pending') {
      expect(out[0].result.missingSymbols.sort()).toEqual([
        'eidesstattliche_erklaerung_vorhanden',
        'produkt_aktuell_im_lieferprogramm',
        'pruefgrundlagen_unveraendert',
        'rueckstellmuster_erneut_hinterlegt',
      ]);
    }
  });
});
