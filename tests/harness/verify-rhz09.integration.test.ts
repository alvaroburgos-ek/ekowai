/**
 * VERIFY worksheet FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-09 (Einbau der Abdichtung in
 * Prüfgefäße, §7.1). Boots its own disposable embedded PG, seeds the WHOLE
 * FLL-TP-RHIZOM standard from the committed manifest, then drives RHZ-09 through
 * the REAL saveWorksheet path and exercises its 3 block gates (REQ-11/12/13) via
 * the REAL checkApprovalGate in both a PASS and a FAIL state.
 *
 * PDF-attested values (SR-1, quoted this run from TP-Rhizom.txt §7.1):
 *   - lower VTS "(20 ±5) mm"       → band [15,25]  (line 758)
 *   - upper VTS "(150 ±5) mm"      → band [145,155](line 778)
 *   - "um 45° versetzt"            → 45            (line 764)
 *   - "zwei Längsnähte erforderlich"→ 2            (line 765)
 *   - "vier Wand-Eck-Nähte, zwei Boden-Eck-Nähte und ein mittig verlaufende
 *      T-Naht"                     → 4/2/1         (§7.1 lines 746-747)
 *   - "Zeitabstand ... mindestens 12 Stunden"→ 12  (lines 753-755)
 *   - Standrohr "∅ 50 mm"          → 50            (§3.5 line 390)
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';

const USER_ID = '00000000-0000-4000-8000-0000000000f1'; // must match BYPASS_AUTH_USER_ID

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
}, 180_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

/** helper: set ist_bahnenartig on RHZ-02 via the real save path. */
async function setBahnenartig(val: boolean) {
  const { saveWorksheet } = await import('@/lib/actions/worksheet');
  const w02 = fixture.byCode['FLLTP-RHZ-02'];
  const r = await saveWorksheet({
    instanceId: w02.instanceId,
    values: { [w02.fieldIds['ist_bahnenartig']]: { type: 'boolean', value: val } },
  });
  expect(r.ok).toBe(true);
}

/** helper: persist the full PDF-attested §7.1 compliant state on RHZ-09. */
async function persistCompliantRhz09() {
  const { saveWorksheet } = await import('@/lib/actions/worksheet');
  const w = fixture.byCode['FLLTP-RHZ-09'];
  const save = await saveWorksheet({
    instanceId: w.instanceId,
    values: {
      [w.fieldIds['vts_untere_schicht_dicke_mm']]: { type: 'number', value: 20 },
      [w.fieldIds['vts_obere_schicht_dicke_mm']]: { type: 'number', value: 150 },
      [w.fieldIds['naht_anzahl_wand_eck']]: { type: 'number', value: 4 },
      [w.fieldIds['naht_anzahl_boden_eck']]: { type: 'number', value: 2 },
      [w.fieldIds['naht_anzahl_t_naht']]: { type: 'number', value: 1 },
      [w.fieldIds['naht_anzahl_laengs_2_pruefmuster']]: { type: 'number', value: 2 },
      [w.fieldIds['arbeitsfuge_zeitabstand_h']]: { type: 'number', value: 12 },
      [w.fieldIds['pruefmuster_2_versatz_grad']]: { type: 'number', value: 45 },
      [w.fieldIds['standrohr_durchmesser_mm']]: { type: 'number', value: 50 },
    },
  });
  expect(save.ok).toBe(true);
  return save;
}

describe('VERIFY FLLTP-RHZ-09 — REAL saveWorksheet + REAL gates', () => {
  it('CHAIN A — persists PDF-attested §7.1 installation values (bahnenartig PASS state)', async () => {
    const w = fixture.byCode['FLLTP-RHZ-09'];
    await persistCompliantRhz09();

    // Verify persisted live values
    const rows = await harness.sql<{ symbol: string; value_number: string | null }[]>`
      SELECT f.symbol, p.value_number
      FROM project_parameters p JOIN fields f ON f.id = p.field_id
      WHERE p.project_id = ${fixture.projectId}
        AND f.worksheet_template_id = ${w.templateId}
      ORDER BY f.symbol`;
    const by = Object.fromEntries(rows.map((r) => [r.symbol, r.value_number == null ? null : Number(r.value_number)]));
    expect(by['vts_untere_schicht_dicke_mm']).toBe(20);
    expect(by['vts_obere_schicht_dicke_mm']).toBe(150);
    expect(by['naht_anzahl_wand_eck']).toBe(4);
    expect(by['naht_anzahl_boden_eck']).toBe(2);
    expect(by['naht_anzahl_t_naht']).toBe(1);
    expect(by['naht_anzahl_laengs_2_pruefmuster']).toBe(2);
    expect(by['arbeitsfuge_zeitabstand_h']).toBe(12);
    expect(by['pruefmuster_2_versatz_grad']).toBe(45);
    expect(by['standrohr_durchmesser_mm']).toBe(50);
    console.log('CHAIN-A persisted:', JSON.stringify(by));
  }, 120_000);

  it('GATES PASS — bahnenartig=true, all §7.1 values compliant → no block failures', async () => {
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    await persistCompliantRhz09();
    await setBahnenartig(true);
    const w = fixture.byCode['FLLTP-RHZ-09'];
    const res = await checkApprovalGate(w.instanceId);
    console.log('GATES-PASS failingBlockConditions:', JSON.stringify(res.failingBlockConditions));
    // REQ-11 (seams satisfied), REQ-12 (bahnenartig=true → vacuous), REQ-13 (bands ok) → none fail
    expect(res.failingBlockConditions.map((c) => c.code)).not.toContain('REQ-11');
    expect(res.failingBlockConditions.map((c) => c.code)).not.toContain('REQ-12');
    expect(res.failingBlockConditions.map((c) => c.code)).not.toContain('REQ-13');
  }, 120_000);

  it('REQ-13 FAIL — VTS out of band fires the gate', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    const w = fixture.byCode['FLLTP-RHZ-09'];
    // Push lower VTS to 40 (> 25 upper bound of (20 ±5))
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['vts_untere_schicht_dicke_mm']]: { type: 'number', value: 40 } },
    });
    const res = await checkApprovalGate(w.instanceId);
    console.log('REQ-13-FAIL failingBlockConditions:', JSON.stringify(res.failingBlockConditions));
    expect(res.failingBlockConditions.map((c) => c.code)).toContain('REQ-13');
    // restore
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['vts_untere_schicht_dicke_mm']]: { type: 'number', value: 20 } },
    });
  }, 120_000);

  it('REQ-11 FAIL — bahnenartig=true but seams incomplete fires the gate', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    await persistCompliantRhz09();
    await setBahnenartig(true);
    const w = fixture.byCode['FLLTP-RHZ-09'];
    // wrong offset (30 instead of 45) → the ANDed group is false → REQ-11 fails
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['pruefmuster_2_versatz_grad']]: { type: 'number', value: 30 } },
    });
    const res = await checkApprovalGate(w.instanceId);
    console.log('REQ-11-FAIL failingBlockConditions:', JSON.stringify(res.failingBlockConditions));
    expect(res.failingBlockConditions.map((c) => c.code)).toContain('REQ-11');
    // restore
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['pruefmuster_2_versatz_grad']]: { type: 'number', value: 45 } },
    });
  }, 120_000);

  it('REQ-12 FAIL — bahnenartig=false and arbeitsfuge < 12 fires the gate', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    await persistCompliantRhz09();
    await setBahnenartig(false); // non-Bahn → REQ-12 becomes active, REQ-11 becomes vacuous-pass
    const w = fixture.byCode['FLLTP-RHZ-09'];
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['arbeitsfuge_zeitabstand_h']]: { type: 'number', value: 6 } },
    });
    const res = await checkApprovalGate(w.instanceId);
    console.log('REQ-12-FAIL failingBlockConditions:', JSON.stringify(res.failingBlockConditions));
    expect(res.failingBlockConditions.map((c) => c.code)).toContain('REQ-12');
    // With bahnenartig=false, REQ-11's guard left (== false) is TRUE → vacuous pass
    expect(res.failingBlockConditions.map((c) => c.code)).not.toContain('REQ-11');
    // restore
    await saveWorksheet({
      instanceId: w.instanceId,
      values: { [w.fieldIds['arbeitsfuge_zeitabstand_h']]: { type: 'number', value: 12 } },
    });
    await setBahnenartig(true);
  }, 120_000);
});
