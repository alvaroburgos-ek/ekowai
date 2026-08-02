/**
 * ISO 14064-1:2018 / EN ISO 14064-1:2019 ("Treibhausgase — Teil 1", organization-level GHG
 * quantification & reporting) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-iso14064-1.ts header).
 * The standard's normative structure maps to the 8 worksheets (registration/scope/principles
 * §1/§3/§4, org boundaries §5.1/Anhang A, reporting boundaries/categories §5.2, sources-sinks &
 * quantification approach §3/§6.1/§6.2, quantification CO2Äq §6.3/Anhang D/Anhang E, base year
 * §6.4, reduction/QM/uncertainty §7/§8, report & verification §9/§10). The 4 equations (all on
 * -05) are prose-derived, non-machine-evaluable representations of the AD×EF / mass×GWP /
 * location-based-electricity / 6-category-aggregation relationships — verified FAITHFUL against
 * the printed defined terms (§3.1.7 EF, §3.1.13 CO2Äq, §5.2.4 categories), NOT driven here. This
 * harness is the EXECUTION half: it PROVES the standard's 23 live BLOCK gates (severity='block'
 * + non-empty condition) by driving each through the REAL enforcement chain against a disposable
 * embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block condition
 *                                      against the SAVED values and lists the ones that
 *                                      definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING
 * only when shown BOTH ways: a persisted state where it does NOT block, and a persisted state
 * where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (23 gates, all severity='block'):
 *   - boolean equality `== true` (CR-018/019/025)              : documented/adopted flags
 *   - value comparison `GWP_gas > 0` (CR-010)                  : the sole numeric-value gate
 *   - membership IN {lowercase enum} (CR-002 3-value, CR-006 6-value): match prod enum_values exactly
 *   - existence IS NOT NULL (all remaining 17 gates)           : text/number/enum/boolean presence,
 *       incl. AND-chains (CR-009/012/013/017/022) — one operand cleared ⇒ AND fails
 *
 * CROSS-WORKSHEET FALLBACK proven: CR-009 (home -05) reads berichtszeitraum (home -01); CR-022
 * (home -08) reads E_co2e_total (home -05) — both from their own gate-home worksheets via the
 * conflict-free project-wide fallback. Each violating state flips a LOCAL field so shared operands
 * are never disturbed between serial tests; CR-009's violate clears its LOCAL E_co2e_total, which
 * the later CR-022 PASS phase re-establishes cross-ws.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4 known engine
 * traps present; ZERO `!= ''` gates; NO OR gate; NO IF/THEN guard; the only ordering-op gate
 * (CR-010 `GWP_gas > 0`) has a numeric-literal RHS. CR-021 + CR-024 are severity='warn' (filtered
 * out by the approval-gate severity='block' query) and not seeded. SEVERITY-REVIEW judgment items
 * CR-015/016/017 (block on §7 "should"/optional fields) are proven both ways for PRESENCE; the
 * severity debate is a sign-off item, not a source-settled fix. See seed header.
 */
// @vitest-environment node
import './_harness-env-iso14064-1'; // top-level-await: PG + seedISO140641 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO140641Harness } from './_harness-env-iso14064-1';
import { ISO140641_GATES } from './seed-iso14064-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO140641Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | Record<string, unknown> | unknown[];

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the REAL
 *  saveWorksheet. A null value clears the field. */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the CURRENT
 *  persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('ISO-14064-1 — seed sanity (topology matches the 23 prod block gates)', () => {
  it('seeds all 8 worksheet instances and 23 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'ISO-14064-1-01', 'ISO-14064-1-02', 'ISO-14064-1-03', 'ISO-14064-1-04',
      'ISO-14064-1-05', 'ISO-14064-1-06', 'ISO-14064-1-07', 'ISO-14064-1-08',
    ]);
    expect(ISO140641_GATES.length).toBe(23);
    expect(ISO140641_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('ISO-14064-1-01 — Registrierung, Anwendungsbereich & vorgesehene Nutzung (§1;§3;§4)', () => {
  it('CR-025  grundsaetze_eingehalten == true (Grundsätze der THG-Bilanzierung, §4)', async () => {
    await proveBothWays('ISO-14064-1-01', 'CR-025',
      [{ ws: 'ISO-14064-1-01', values: { grundsaetze_eingehalten: true } }],
      [{ ws: 'ISO-14064-1-01', values: { grundsaetze_eingehalten: false } }]);
  });
});

describe('ISO-14064-1-02 — Organisationsgrenzen & Zusammenfuehrungsansatz (§5.1;Anhang A)', () => {
  it('CR-001  organisationsgrenze_def IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-02', 'CR-001',
      [{ ws: 'ISO-14064-1-02', values: { organisationsgrenze_def: 'Konzerngrenze, operative Kontrolle' } }],
      [{ ws: 'ISO-14064-1-02', values: { organisationsgrenze_def: null } }]);
  });
  it('CR-002  zusammenfuehrungsansatz IN {kontrolle_finanziell,kontrolle_operativ,beteiligung} (membership)', async () => {
    await proveBothWays('ISO-14064-1-02', 'CR-002',
      [{ ws: 'ISO-14064-1-02', values: { zusammenfuehrungsansatz: 'kontrolle_operativ' } }],
      [{ ws: 'ISO-14064-1-02', values: { zusammenfuehrungsansatz: 'kein_gueltiger_ansatz' } }]); // outside set → fail
  });
});

describe('ISO-14064-1-03 — Berichtsgrenzen, Kategorien & Wesentlichkeit (§5.2)', () => {
  it('CR-003  berichtsgrenze_def IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-03', 'CR-003',
      [{ ws: 'ISO-14064-1-03', values: { berichtsgrenze_def: 'Kategorien 1-6 nach 5.2.4' } }],
      [{ ws: 'ISO-14064-1-03', values: { berichtsgrenze_def: null } }]);
  });
  it('CR-005  wesentlichkeitskriterien IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-03', 'CR-005',
      [{ ws: 'ISO-14064-1-03', values: { wesentlichkeitskriterien: 'Schwelle 5 % je Kategorie' } }],
      [{ ws: 'ISO-14064-1-03', values: { wesentlichkeitskriterien: null } }]);
  });
  it('CR-006  kategorie_auswahl IN {6 categories 5.2.4 a)-f)} (membership)', async () => {
    await proveBothWays('ISO-14064-1-03', 'CR-006',
      [{ ws: 'ISO-14064-1-03', values: { kategorie_auswahl: 'indirekt_importierte_energie' } }],
      [{ ws: 'ISO-14064-1-03', values: { kategorie_auswahl: 'nicht_definierte_kategorie' } }]); // outside set → fail
  });
});

describe('ISO-14064-1-04 — Identifizierung Quellen/Senken & Quantifizierungsansatz (§3;§6.1;§6.2)', () => {
  it('CR-007  quelle_senke_id IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-04', 'CR-007',
      [{ ws: 'ISO-14064-1-04', values: { quelle_senke_id: 'Q-01 Erdgaskessel; S-01 Aufforstung' } }],
      [{ ws: 'ISO-14064-1-04', values: { quelle_senke_id: null } }]);
  });
  it('CR-008  quantifizierungsansatz IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-04', 'CR-008',
      [{ ws: 'ISO-14064-1-04', values: { quantifizierungsansatz: 'Berechnung AD × EF (6.2.3)' } }],
      [{ ws: 'ISO-14064-1-04', values: { quantifizierungsansatz: null } }]);
  });
});

describe('ISO-14064-1-05 — Quantifizierung der Emissionen & des Entzugs CO2Äq (§6.3;Anhang D;Anhang E)', () => {
  it('CR-004  E_co2e_gas IS NOT NULL (getrennt je Gas, §5.2.2)', async () => {
    await proveBothWays('ISO-14064-1-05', 'CR-004',
      [{ ws: 'ISO-14064-1-05', values: { E_co2e_gas: 1234.5 } }],
      [{ ws: 'ISO-14064-1-05', values: { E_co2e_gas: null } }]);
  });
  it('CR-009  E_co2e_total IS NOT NULL AND berichtszeitraum (-01, cross-ws) IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-05', 'CR-009',
      [{ ws: 'ISO-14064-1-01', values: { berichtszeitraum: '01.01.2024–31.12.2024' } }, // cross-ws home
       { ws: 'ISO-14064-1-05', values: { E_co2e_total: 1500 } }],
      [{ ws: 'ISO-14064-1-05', values: { E_co2e_total: null } }]); // local violate → AND fails
  });
  it('CR-010  GWP_gas > 0 (100-Jahre-Zeitrahmen, §6.3) — the sole numeric-value gate', async () => {
    await proveBothWays('ISO-14064-1-05', 'CR-010',
      [{ ws: 'ISO-14064-1-05', values: { GWP_gas: 28 } }],       // CH4 AR6 example → > 0
      [{ ws: 'ISO-14064-1-05', values: { GWP_gas: 0 } }]);       // 0 > 0 is false → fail (NOT cleared)
  });
  it('CR-011  biogen_co2 IS NOT NULL (Anhang D)', async () => {
    await proveBothWays('ISO-14064-1-05', 'CR-011',
      [{ ws: 'ISO-14064-1-05', values: { biogen_co2: 42 } }],
      [{ ws: 'ISO-14064-1-05', values: { biogen_co2: null } }]);
  });
  it('CR-012  strom_ansatz IS NOT NULL AND E_el IS NOT NULL (Anhang E, ortsbasiert)', async () => {
    await proveBothWays('ISO-14064-1-05', 'CR-012',
      [{ ws: 'ISO-14064-1-05', values: { strom_ansatz: 'ortsbasiert', E_el: 88.4 } }],
      [{ ws: 'ISO-14064-1-05', values: { E_el: null } }]); // clear one → AND fails
  });
});

describe('ISO-14064-1-06 — Basisjahr & Neuberechnung (§6.4)', () => {
  it('CR-013  basisjahr IS NOT NULL AND basisjahr_bilanz IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-06', 'CR-013',
      [{ ws: 'ISO-14064-1-06', values: { basisjahr: '2018', basisjahr_bilanz: 12500 } }],
      [{ ws: 'ISO-14064-1-06', values: { basisjahr: null } }]); // clear one → AND fails
  });
  it('CR-014  neuberechnung_verfahren IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-06', 'CR-014',
      [{ ws: 'ISO-14064-1-06', values: { neuberechnung_verfahren: 'Schwelle 5 %, strukturelle Änderungen (6.4.2)' } }],
      [{ ws: 'ISO-14064-1-06', values: { neuberechnung_verfahren: null } }]);
  });
});

describe('ISO-14064-1-07 — Reduzierung, Qualitaetsmanagement & Unsicherheit (§7;§8)', () => {
  // CR-015/016/017 are SEVERITY-REVIEW judgment items (block in prod on §7 "should"/optional
  // fields) — proven both ways for PRESENCE here; the severity debate is a sign-off item.
  it('CR-015  reduzierungsinitiative IS NOT NULL (§7.1, severity-review item)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-015',
      [{ ws: 'ISO-14064-1-07', values: { reduzierungsinitiative: 'Umstellung auf Ökostrom 2024' } }],
      [{ ws: 'ISO-14064-1-07', values: { reduzierungsinitiative: null } }]);
  });
  it('CR-016  emissionsgutschrift IS NOT NULL (§7.2, severity-review item)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-016',
      [{ ws: 'ISO-14064-1-07', values: { emissionsgutschrift: 0 } }], // 0 is a value → IS NOT NULL passes
      [{ ws: 'ISO-14064-1-07', values: { emissionsgutschrift: null } }]);
  });
  it('CR-017  reduzierungsziel IS NOT NULL AND zielart IS NOT NULL (§7.3, severity-review item)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-017',
      [{ ws: 'ISO-14064-1-07', values: { reduzierungsziel: '-30 % bis 2030', zielart: 'absolut' } }],
      [{ ws: 'ISO-14064-1-07', values: { reduzierungsziel: null } }]); // clear one → AND fails
  });
  it('CR-018  info_management_verfahren == true (§8.1.1)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-018',
      [{ ws: 'ISO-14064-1-07', values: { info_management_verfahren: true } }],
      [{ ws: 'ISO-14064-1-07', values: { info_management_verfahren: false } }]);
  });
  it('CR-019  dokumentenaufbewahrung == true (§8.2)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-019',
      [{ ws: 'ISO-14064-1-07', values: { dokumentenaufbewahrung: true } }],
      [{ ws: 'ISO-14064-1-07', values: { dokumentenaufbewahrung: false } }]);
  });
  it('CR-020  unsicherheitsbewertung IS NOT NULL (§8.3)', async () => {
    await proveBothWays('ISO-14064-1-07', 'CR-020',
      [{ ws: 'ISO-14064-1-07', values: { unsicherheitsbewertung: 'Kategorieebene, ±12 %' } }],
      [{ ws: 'ISO-14064-1-07', values: { unsicherheitsbewertung: null } }]);
  });
});

describe('ISO-14064-1-08 — THG-Bericht & Verifizierung (§9;§10)', () => {
  it('CR-022  konformitaetserklaerung + gwp_quelle IS NOT NULL AND E_co2e_total (-05, cross-ws) IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-1-08', 'CR-022',
      [{ ws: 'ISO-14064-1-05', values: { E_co2e_total: 1500 } }, // cross-ws home — re-establish
       { ws: 'ISO-14064-1-08', values: { konformitaetserklaerung: true, gwp_quelle: 'IPCC AR6 (2021), 100 a' } }],
      [{ ws: 'ISO-14064-1-08', values: { gwp_quelle: null } }]); // local violate → AND fails
  });
  it('CR-023  gwp_quelle IS NOT NULL (§9.3.1 t)', async () => {
    await proveBothWays('ISO-14064-1-08', 'CR-023',
      [{ ws: 'ISO-14064-1-08', values: { gwp_quelle: 'IPCC AR6 (2021), 100 a' } }],
      [{ ws: 'ISO-14064-1-08', values: { gwp_quelle: null } }]);
  });
});
