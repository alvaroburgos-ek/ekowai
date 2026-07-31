/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-04 (Standort & Gewächshausbedingungen).
 *
 * Boots the whole standard on a disposable embedded Postgres, drives values
 * through the REAL saveWorksheet path, and fires each of the worksheet's 6
 * block-severity compliance gates (REQ-05 … REQ-10) via the REAL
 * checkApprovalGate in BOTH a passing and a failing state.
 *
 * REQ-05 references only RHZ-04-local temperature symbols.
 * REQ-06 … REQ-10 reference symbols that live on OTHER worksheets
 * (RHZ-05/06/07/08/11); checkApprovalGate resolves those via its conflict-free
 * project-wide fallback map, so we drive them on their host worksheets.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom';
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();

afterAll(async () => {
  await harness.stop();
});

type FV =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'boolean'; value: boolean | null };

/** Build a saveWorksheet values map (keyed by field_id) for a worksheet code. */
function values(code: string, bySymbol: Record<string, FV>): Record<string, FV> {
  const ws = fixture.byCode[code];
  if (!ws) throw new Error(`no worksheet ${code}`);
  const out: Record<string, FV> = {};
  for (const [sym, v] of Object.entries(bySymbol)) {
    const id = ws.fieldIds[sym];
    if (!id) throw new Error(`no field ${sym} on ${code}`);
    out[id] = v;
  }
  return out;
}

// The two blocks mutate ONE shared project (single embedded PG), so they MUST
// run sequentially — concurrent execution leaks cross-worksheet state between
// the REQ-05 test and the fallback test. This is a harness-isolation constraint,
// not a product behaviour.
describe.sequential('FLLTP-RHZ-04 gates through the REAL save + approval-gate path', () => {
  it('REQ-05 fires pass and fail on the temperature envelope', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    const inst = fixture.byCode['FLLTP-RHZ-04'].instanceId;

    // PASS state: (18/16/22 ±3) °C midpoints, max 35.
    const pass = await saveWorksheet({
      instanceId: inst,
      values: values('FLLTP-RHZ-04', {
        gewaechshaus_id: { type: 'text', value: 'GH-1' },
        temp_tagsueber_C: { type: 'number', value: 18 },
        temp_nachts_C: { type: 'number', value: 16 },
        temp_lueftung_schwelle_C: { type: 'number', value: 22 },
        temp_max_C: { type: 'number', value: 35 },
        flaechenbedarf_pro_gefaess_m2: { type: 'number', value: 1.75 },
      }),
    });
    expect(pass.ok).toBe(true);
    const passGate = await checkApprovalGate(inst);
    const req05Fail = passGate.failingBlockConditions.find((c) => c.code === 'REQ-05');
    console.log('REQ-05 PASS-state failing?', JSON.stringify(passGate.failingBlockConditions.map((c) => c.code)));
    expect(req05Fail).toBeUndefined();

    // FAIL state: tagsüber 30 °C (> 21 upper bound) and max 40 (> 35).
    const fail = await saveWorksheet({
      instanceId: inst,
      values: values('FLLTP-RHZ-04', {
        temp_tagsueber_C: { type: 'number', value: 30 },
        temp_max_C: { type: 'number', value: 40 },
      }),
    });
    expect(fail.ok).toBe(true);
    const failGate = await checkApprovalGate(inst);
    const req05 = failGate.failingBlockConditions.find((c) => c.code === 'REQ-05');
    console.log('REQ-05 FAIL-state failing?', JSON.stringify(failGate.failingBlockConditions.map((c) => c.code)));
    expect(req05).toBeDefined();

    // restore RHZ-04 to a passing temp state for the cross-gate tests below.
    await saveWorksheet({
      instanceId: inst,
      values: values('FLLTP-RHZ-04', {
        temp_tagsueber_C: { type: 'number', value: 18 },
        temp_max_C: { type: 'number', value: 35 },
      }),
    });
  });

  it('REQ-06..REQ-10 fire via cross-worksheet fallback (pass + fail)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    const inst = fixture.byCode['FLLTP-RHZ-04'].instanceId;

    // ── PASS state: drive every cross-worksheet symbol to a compliant value ──
    // REQ-06 apparatus (RHZ-05)
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-05'].instanceId, values: values('FLLTP-RHZ-05', {
      gefaess_innenmass_l_mm: { type: 'number', value: 800 },
      gefaess_innenmass_b_mm: { type: 'number', value: 800 },
      gefaess_innenmass_h_mm: { type: 'number', value: 250 },
      anzahl_pruefgefaesse: { type: 'number', value: 8 },
      anzahl_kontrollgefaesse: { type: 'number', value: 3 },
      wasserablauf_durchmesser_mm: { type: 'number', value: 40 },
      widerlager_dicke_mm: { type: 'number', value: 10 },
    }) });
    // REQ-07 VTS (RHZ-06)
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-06'].instanceId, values: values('FLLTP-RHZ-06', {
      vts_ph_cacl2: { type: 'number', value: 6.5 },
      vts_salz_h2o_g_l: { type: 'number', value: 0.5 },
      vts_salz_caso4_g_l: { type: 'number', value: 0.3 },
      vts_n_cat_mg_l: { type: 'number', value: 40 },
      vts_p2o5_cat_mg_l: { type: 'number', value: 20 },
      vts_k2o_cat_mg_l: { type: 'number', value: 80 },
      vts_caco3_scheibler_prozent: { type: 'number', value: 5 },
    }) });
    // REQ-08 Dünger + REQ-09 Wasser (RHZ-07)
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-07'].instanceId, values: values('FLLTP-RHZ-07', {
      duenger_chloridarm: { type: 'boolean', value: true },
      duenger_spurelemente_vorhanden: { type: 'boolean', value: true },
      wasser_ammonium_mg_l: { type: 'number', value: 0.4 },
      wasser_eisen_mg_l: { type: 'number', value: 0.1 },
      wasser_p_gesamt_mg_l: { type: 'number', value: 0.02 },
      wasser_haerte_mmol_l: { type: 'number', value: 1.5 },
      wasser_leitfaehigkeit_uS_cm: { type: 'number', value: 800 },
      wasser_mangan_mg_l: { type: 'number', value: 0.03 },
      wasser_nitrat_mg_l: { type: 'number', value: 30 },
      wasser_ortho_phosphat_mg_l: { type: 'number', value: 0.008 },
      wasser_ph: { type: 'number', value: 7.5 },
      wasser_saurekapazitaet_mmol_l: { type: 'number', value: 2.5 },
    }) });
    // REQ-10 Testpflanze art (RHZ-08) + pflanzdichte (RHZ-11)
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-08'].instanceId, values: values('FLLTP-RHZ-08', {
      testpflanze_art: { type: 'enum', value: 'phragmites_australis' },
    }) });
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-11'].instanceId, values: values('FLLTP-RHZ-11', {
      pflanzdichte_pro_gefaess: { type: 'number', value: 8 },
    }) });

    const passGate = await checkApprovalGate(inst);
    console.log('CROSS PASS-state failing codes:', JSON.stringify(passGate.failingBlockConditions.map((c) => c.code)));
    for (const code of ['REQ-06', 'REQ-07', 'REQ-08', 'REQ-09', 'REQ-10']) {
      expect(passGate.failingBlockConditions.find((c) => c.code === code), `${code} should PASS`).toBeUndefined();
    }

    // ── FAIL state: break one operand of each of REQ-06..REQ-10 ──
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-05'].instanceId, values: values('FLLTP-RHZ-05', {
      anzahl_pruefgefaesse: { type: 'number', value: 7 }, // != 8
    }) });
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-06'].instanceId, values: values('FLLTP-RHZ-06', {
      vts_ph_cacl2: { type: 'number', value: 8.0 }, // > 7.5
    }) });
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-07'].instanceId, values: values('FLLTP-RHZ-07', {
      duenger_chloridarm: { type: 'boolean', value: false },
      wasser_nitrat_mg_l: { type: 'number', value: 60 }, // > 50
    }) });
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-08'].instanceId, values: values('FLLTP-RHZ-08', {
      testpflanze_art: { type: 'enum', value: 'typha_latifolia' }, // wrong species
    }) });
    await saveWorksheet({ instanceId: fixture.byCode['FLLTP-RHZ-11'].instanceId, values: values('FLLTP-RHZ-11', {
      pflanzdichte_pro_gefaess: { type: 'number', value: 6 }, // != 8
    }) });

    const failGate = await checkApprovalGate(inst);
    const failing = failGate.failingBlockConditions.map((c) => c.code);
    console.log('CROSS FAIL-state failing codes:', JSON.stringify(failing));
    for (const code of ['REQ-06', 'REQ-07', 'REQ-08', 'REQ-09', 'REQ-10']) {
      expect(failing, `${code} should FAIL`).toContain(code);
    }
  });
});
