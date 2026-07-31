/**
 * VERIFY FLLTP-RHZ-21 — certification/attestation final worksheet.
 *
 * FLLTP-RHZ-21 has 0 equations and 0 compliance_requirements; it is a pure
 * data-capture worksheet with 6 fields (the final Rhizomfestigkeit conformity
 * verdict + the Prüfbericht/Bescheinigung attestation fields). The only
 * "computable chain" is therefore the persistence chain: drive source-attested
 * values through the REAL saveWorksheet path and assert every field lands with
 * the right typed column + audit trail.
 *
 * Source-attested inputs (SR-1, verbatim from the FLL-TP-Rhizom 2023 PDF):
 *   - final_rhizom_conformity = 'rhizomfest'  (§3.11 "Ein Produkt gilt als
 *     rhizomfest, wenn ...")
 *   - bescheinigung_ausgestellt_durch = 'Prüfinstitut'  (§9 / cert template
 *     ">> Prüfinstitut <<")
 *   - Gültigkeitsdauer 10 Jahre (§9 line 945/1040) → gültig-bis = ausstellung +10y
 *   - signatur eingeholt = true  (cert template "Name und Unterschrift des
 *     Bearbeiters")
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level-await: PG up + seeded BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

describe('VERIFY FLLTP-RHZ-21 — attestation persistence through REAL saveWorksheet', () => {
  it('persists all 6 certification fields with correct typed columns', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-21'];
    expect(ws).toBeTruthy();

    const values = {
      [ws.fieldIds['final_rhizom_conformity']]: { type: 'enum' as const, value: 'rhizomfest' },
      [ws.fieldIds['bescheinigung_gueltig_bis']]: { type: 'date' as const, value: '2036-07-23' },
      [ws.fieldIds['bescheinigung_ausgestellt_durch']]: { type: 'text' as const, value: 'Prüfinstitut' },
      [ws.fieldIds['bescheinigung_pruefnummer']]: { type: 'text' as const, value: 'Ber.-Nr. 2026-001' },
      [ws.fieldIds['bescheinigung_ausstellung_datum']]: { type: 'date' as const, value: '2026-07-23' },
      [ws.fieldIds['pruefer_signatur_eingeholt']]: { type: 'boolean' as const, value: true },
    };

    const res = await saveWorksheet({ instanceId: ws.instanceId, values });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.saved).toBe(6);

    const rows = await sql<
      {
        field_id: string;
        value_enum: string | null;
        value_text: string | null;
        value_date: string | null;
        value_boolean: boolean | null;
        source_type: string;
      }[]
    >`
      SELECT field_id, value_enum, value_text, value_date::text AS value_date, value_boolean, source_type
      FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN (
          ${ws.fieldIds['final_rhizom_conformity']},
          ${ws.fieldIds['bescheinigung_gueltig_bis']},
          ${ws.fieldIds['bescheinigung_ausgestellt_durch']},
          ${ws.fieldIds['bescheinigung_pruefnummer']},
          ${ws.fieldIds['bescheinigung_ausstellung_datum']},
          ${ws.fieldIds['pruefer_signatur_eingeholt']}
        )`;
    const by = (sym: string) => rows.find((r) => r.field_id === ws.fieldIds[sym]);

    expect(by('final_rhizom_conformity')?.value_enum).toBe('rhizomfest');
    expect(by('bescheinigung_gueltig_bis')?.value_date).toBe('2036-07-23');
    expect(by('bescheinigung_ausgestellt_durch')?.value_text).toBe('Prüfinstitut');
    expect(by('bescheinigung_pruefnummer')?.value_text).toBe('Ber.-Nr. 2026-001');
    expect(by('bescheinigung_ausstellung_datum')?.value_date).toBe('2026-07-23');
    expect(by('pruefer_signatur_eingeholt')?.value_boolean).toBe(true);

    // all six are engineer-entered (no equation produces any of them → none derived)
    for (const r of rows) expect(r.source_type).toBe('entered');
    expect(rows).toHaveLength(6);
  });

  it('accepts the terminated-early verdict enum value (§3.12)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-21'];
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['final_rhizom_conformity']]: { type: 'enum' as const, value: 'vorzeitig_abgebrochen' },
      },
    });
    expect(res.ok).toBe(true);
    const [row] = await sql<{ value_enum: string | null }[]>`
      SELECT value_enum FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fieldIds['final_rhizom_conformity']}`;
    expect(row?.value_enum).toBe('vorzeitig_abgebrochen');
  });
});
