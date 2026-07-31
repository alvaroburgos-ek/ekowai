/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-18 (Bewertung Rhizomfestigkeit (Gate)).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-18 through the REAL
 * saveWorksheet path.
 *
 * PDF provenance (this run, TP-Rhizom.txt):
 *   §3.11 Prüfergebnis (line 474): "Ein Produkt gilt als rhizomfest, wenn in allen
 *     Prüfgefäßen nach Ablauf der Prüfdauer keine Rhizomeindringungen ... sowie
 *     keine Rhizomdurchdringungen ... festzustellen sind."
 *   §9 Prüfbericht (line 924): "dass sich das Produkt als nicht rhizomfest nach
 *     FLL erwiesen hat."
 *   §3.12 Vorzeitiger Abbruch (line 485-491): "Bei erkennbaren Durchdringungen ...
 *     Die Prüfung kann abgebrochen werden." / "Wird im Prüfungsverlauf keine
 *     ausreichende Wuchsleistung der Testpflanzen erzielt (s. 2.7), ist die Prüfung
 *     abzubrechen."
 *
 * FLLTP-RHZ-18 has 0 equations and 0 compliance_requirements on prod despite being
 * titled "(Gate)". So there is NO derived-materialize chain and NO enforcing gate —
 * only the data-collection save path for the two fields (enum result + free-text
 * abort reason). The "not rhizomfest" and "terminated early" outcomes save without
 * any block (see FINDINGS in the JSON detail: a gate worksheet with no gate).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-18'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(symbol: string): Promise<string | number | boolean | null> {
  const fieldId = ws.fieldIds[symbol];
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_enum: string | null;
      value_date: string | null;
    }[]
  >`SELECT value_text, value_number, value_boolean, value_enum, value_date
    FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  if (!row) return null;
  if (row.value_boolean !== null) return row.value_boolean;
  if (row.value_number !== null) return Number(row.value_number);
  if (row.value_enum !== null) return row.value_enum;
  if (row.value_date !== null) return row.value_date;
  return row.value_text;
}

describe('VERIFY FLLTP-RHZ-18 — Bewertung Rhizomfestigkeit (Gate) save', () => {
  it('exposes exactly the 2 prod fields with the right types + enum options', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldTypes['pruefergebnis_rhizomfest']).toBe('enum');
    expect(ws.fieldTypes['abbruchsgrund']).toBe('text');
  });

  it('drives a PASS state (rhizomfest) through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pruefergebnis_rhizomfest']]: { type: 'enum', value: 'rhizomfest' },
        [ws.fieldIds['abbruchsgrund']]: { type: 'text', value: '' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-18 PASS save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);
    const result = await persisted('pruefergebnis_rhizomfest');
    // eslint-disable-next-line no-console
    console.log('RHZ-18 PASS persisted pruefergebnis:', JSON.stringify(result));
    expect(result).toBe('rhizomfest');
  });

  it('drives a FAIL state (nicht_rhizomfest) — no gate blocks it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pruefergebnis_rhizomfest']]: { type: 'enum', value: 'nicht_rhizomfest' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-18 FAIL save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    // Despite the "(Gate)" title, there is NO compliance_requirement on this
    // worksheet, so a "not rhizomfest" verdict still saves without any block.
    expect(save.ok).toBe(true);
    const result = await persisted('pruefergebnis_rhizomfest');
    // eslint-disable-next-line no-console
    console.log('RHZ-18 FAIL persisted pruefergebnis:', JSON.stringify(result));
    expect(result).toBe('nicht_rhizomfest');
  });

  it('drives an ABORT state (vorzeitig_abgebrochen + abbruchsgrund text) — §3.12', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const grund = 'Keine ausreichende Wuchsleistung der Testpflanzen (§3.12 / §2.7)';
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pruefergebnis_rhizomfest']]: { type: 'enum', value: 'vorzeitig_abgebrochen' },
        [ws.fieldIds['abbruchsgrund']]: { type: 'text', value: grund },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-18 ABORT save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);
    const result = await persisted('pruefergebnis_rhizomfest');
    const reason = await persisted('abbruchsgrund');
    // eslint-disable-next-line no-console
    console.log('RHZ-18 ABORT persisted pruefergebnis:', JSON.stringify(result), ' abbruchsgrund:', JSON.stringify(reason));
    expect(result).toBe('vorzeitig_abgebrochen');
    expect(reason).toBe(grund);
  });

  it('confirms there are 0 equations and 0 compliance_requirements on RHZ-18 (gate worksheet with no gate)', async () => {
    const [{ count: eqCount }] = await sql<{ count: string }[]>`
      SELECT count(*) FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ count: crCount }] = await sql<{ count: string }[]>`
      SELECT count(*) FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    // eslint-disable-next-line no-console
    console.log('RHZ-18 equations:', eqCount, ' compliance_requirements:', crCount);
    expect(Number(eqCount)).toBe(0);
    expect(Number(crCount)).toBe(0);
  });
});
