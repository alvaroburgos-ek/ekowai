/**
 * VDI 2163:2006-03 ("Innenraumlufthygiene — Raumluftqualität in Abfallbehandlungsanlagen durch
 * Raumlufttechnik") — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-vdi2163.ts header). VDI 2163 is
 * an INDOOR-AIR-HYGIENE / occupational-health requirements guideline: NO calculations, ZERO
 * equations (§4.4.2 states no simple design equations exist; prod equations rows = 0). There is
 * nothing to symbol-verify. The guideline's normative chapters §1–§6 map to the 8 worksheets:
 * registration §1/§2 (WS01), exposure assessment §3.1-3.3 (WS02), climate/acoustics §3.4 (WS03),
 * organisational measures §4.1/4.2 (WS04), structural §4.3 (WS05), RLT/ventilation §4.4 (WS06),
 * PPE §4.5 (WS07), operation/maintenance/control-values §5/§6 (WS08).
 *
 * This harness is the EXECUTION half: it PROVES the standard's 32 live BLOCK gates (severity='block'
 * + non-empty condition, CR-01…CR-32) by driving each through the REAL enforcement chain against a
 * disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block condition
 *                                      against the SAVED values and lists the ones that
 *                                      definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the `engineer_approve`
 * transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING only when shown BOTH
 * ways: a persisted state where it does NOT block, and a persisted state where it DOES (the F-4
 * lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (32 gates, all severity='block'):
 *   - boolean equality `== true` (single): CR-01/02/03/04/06/08/13/18/19
 *   - boolean `== true` AND-chain: CR-07 (5), CR-09 (2), CR-17 (2) — one operand false ⇒ AND fails
 *   - boolean `== false OR boolean == true` (OR): CR-12 — both operands false ⇒ OR fails
 *   - numeric threshold `field OP literal`: CR-10 (>=40), CR-14 (>=1), CR-16 (<=12), CR-22 (<=1e5),
 *       CR-23 (<50), CR-24 (<=1000), CR-25 (<=1), CR-31 (>=65), CR-32 (>=20)
 *   - numeric AND-chain: CR-20 (3-way), CR-21 (2-way)
 *   - numeric field-vs-field (acompare, trap-1 fix): CR-05 `schalldruckpegel <= beurteilungspegel`
 *   - enum equality `field == enumval`: CR-15 (AND boolean), CR-26
 *   - enum membership `IN {…}`: CR-11 (full-domain no-op at product level — see below), CR-27
 *   - existence `IS NOT NULL`: CR-28 (number), CR-29 (enum), CR-30 (enum)
 *
 * NO CROSS-WORKSHEET reads: every gate resolves entirely from its own home worksheet (verified
 * against prod). CR-05 reads two fields but both live on WS03. The project-wide fallback is never
 * consulted; no symbol collides across the 8 worksheets, so serial tests are independent.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod values this session): NONE of the 4 known
 * engine traps misfire. CR-05 (only field-vs-field ordering gate) routes through the numeric
 * `acompare` path (evaluate.ts L250-256) and enforces. CR-28/29/30 use the correct `IS NOT NULL`
 * (ZERO `!= ''` gates — not in migration 20260801510000 scope, none needed). All enum `IN`/`==`
 * literals match the stored enum casing exactly. No IF/THEN guard. NO literal-`TRUE` gate exists in
 * VDI-2163 (the prior corpus scan's "1 TRUE no-op" flag does NOT reproduce → R-5 reversal, sign-off).
 *
 * FULL-DOMAIN NO-OP (reported, NOT fixed): CR-11 `filterklasse_zuluft IN {F7,F8,F9}` — the field's
 * enum domain is exactly {F7,F8,F9}, so no user-selectable value violates it (product-level no-op,
 * analog of `boolean IN {true,false}`). It IS a real membership check at the evaluator level: it
 * fails for any out-of-domain value, which the save path can persist (no enum-membership validation
 * on save). Proven both ways here at the engine level (F7 pass / F5 out-of-domain fail). Tightening
 * the domain is an enforcement change → owner ruling.
 */
// @vitest-environment node
import './_harness-env-vdi2163'; // top-level-await: PG + seedVDI2163 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getVDI2163Harness } from './_harness-env-vdi2163';
import { VDI2163_GATES } from './seed-vdi2163';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getVDI2163Harness();

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

describe('VDI-2163 — seed sanity (topology matches the 32 prod block gates)', () => {
  it('seeds all 8 worksheet instances and 32 block gates (0 warn, 0 no-op fabricated)', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'VDI-2163-01', 'VDI-2163-02', 'VDI-2163-03', 'VDI-2163-04',
      'VDI-2163-05', 'VDI-2163-06', 'VDI-2163-07', 'VDI-2163-08',
    ]);
    expect(VDI2163_GATES.length).toBe(32);
    expect(VDI2163_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('VDI-2163-01 — Registrierung und Geltungsbereich (§1;§2)', () => {
  it('CR-01  im_geltungsbereich == true (§1 scope)', async () => {
    await proveBothWays('VDI-2163-01', 'VDI-2163-CR-01',
      [{ ws: 'VDI-2163-01', values: { im_geltungsbereich: true } }],
      [{ ws: 'VDI-2163-01', values: { im_geltungsbereich: false } }]);
  });
});

describe('VDI-2163-02 — Gefahrstoff- und Bioaerosol-Expositionsbewertung (§3.1–3.3)', () => {
  it('CR-02  expositionsabschaetzung_vorhanden == true (§3.2)', async () => {
    await proveBothWays('VDI-2163-02', 'VDI-2163-CR-02',
      [{ ws: 'VDI-2163-02', values: { expositionsabschaetzung_vorhanden: true } }],
      [{ ws: 'VDI-2163-02', values: { expositionsabschaetzung_vorhanden: false } }]);
  });
  it('CR-03  arbeitsmed_vorsorge_angeboten == true (§3.3.1 BioStoffV §15)', async () => {
    await proveBothWays('VDI-2163-02', 'VDI-2163-CR-03',
      [{ ws: 'VDI-2163-02', values: { arbeitsmed_vorsorge_angeboten: true } }],
      [{ ws: 'VDI-2163-02', values: { arbeitsmed_vorsorge_angeboten: false } }]);
  });
  it('CR-04  impfangebot_viren == true (§3.3.6)', async () => {
    await proveBothWays('VDI-2163-02', 'VDI-2163-CR-04',
      [{ ws: 'VDI-2163-02', values: { impfangebot_viren: true } }],
      [{ ws: 'VDI-2163-02', values: { impfangebot_viren: false } }]);
  });
});

describe('VDI-2163-03 — Klimatische und akustische Einwirkungen (§3.4)', () => {
  it('CR-05  schalldruckpegel <= beurteilungspegel (numeric field-vs-field, acompare — trap-1 fix)', async () => {
    await proveBothWays('VDI-2163-03', 'VDI-2163-CR-05',
      [{ ws: 'VDI-2163-03', values: { schalldruckpegel: 80, beurteilungspegel: 85 } }], // 80 <= 85 → pass
      [{ ws: 'VDI-2163-03', values: { schalldruckpegel: 90 } }]);                       // 90 <= 85 → fail (beurteilungspegel stays 85)
  });
});

describe('VDI-2163-04 — Organisatorische Maßnahmen (§4.1;§4.2)', () => {
  it('CR-06  gefaehrdungsbeurteilung_vorhanden == true (§4.2 TRGS 403)', async () => {
    await proveBothWays('VDI-2163-04', 'VDI-2163-CR-06',
      [{ ws: 'VDI-2163-04', values: { gefaehrdungsbeurteilung_vorhanden: true } }],
      [{ ws: 'VDI-2163-04', values: { gefaehrdungsbeurteilung_vorhanden: false } }]);
  });
  it('CR-07  5-way organisational-plan AND-chain == true (§4.2)', async () => {
    await proveBothWays('VDI-2163-04', 'VDI-2163-CR-07',
      [{ ws: 'VDI-2163-04', values: {
        unterweisungen_durchgefuehrt: true, wartungsplan_vorhanden: true,
        hautschutzplan_vorhanden: true, hygieneplan_vorhanden: true, kennzeichnung_angebracht: true } }],
      [{ ws: 'VDI-2163-04', values: { kennzeichnung_angebracht: false } }]); // one false → AND fails
  });
  it('CR-08  rangfolge_eingehalten == true (§4.1 STOP-Rangfolge)', async () => {
    await proveBothWays('VDI-2163-04', 'VDI-2163-CR-08',
      [{ ws: 'VDI-2163-04', values: { rangfolge_eingehalten: true } }],
      [{ ws: 'VDI-2163-04', values: { rangfolge_eingehalten: false } }]);
  });
});

describe('VDI-2163-05 — Bauliche Maßnahmen (§4.3)', () => {
  it('CR-09  staubemission_vermieden AND abgaserfassung_entstehungsstelle == true (§4.3)', async () => {
    await proveBothWays('VDI-2163-05', 'VDI-2163-CR-09',
      [{ ws: 'VDI-2163-05', values: { staubemission_vermieden: true, abgaserfassung_entstehungsstelle: true } }],
      [{ ws: 'VDI-2163-05', values: { staubemission_vermieden: false } }]); // one false → AND fails
  });
});

describe('VDI-2163-06 — Lufttechnische Maßnahmen / RLT (§4.4)', () => {
  it('CR-10  aussenluftstrom_pro_person >= 40 (§4.4.2 ASR 5)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-10',
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_pro_person: 40 } }],
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_pro_person: 30 } }]);
  });
  it('CR-11  filterklasse_zuluft IN {F7,F8,F9} (§4.4.3; product-level full-domain no-op — engine both ways)', async () => {
    // Engine-level membership: F7 is in the set → pass; F5 (out of the enum domain, persistable via
    // the real save path which does NOT validate enum membership) → definite fail. NOTE: because the
    // field's UI enum domain == {F7,F8,F9}, no SELECTABLE value violates this gate — the product-level
    // no-op is a sign-off item, not fixed here.
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-11',
      [{ ws: 'VDI-2163-06', values: { filterklasse_zuluft: 'F7' } }],
      [{ ws: 'VDI-2163-06', values: { filterklasse_zuluft: 'F5' } }]);
  });
  it('CR-12  umluftbetrieb == false OR umluft_abluftreinigung_nachgewiesen == true (§4.4; OR gate)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-12',
      [{ ws: 'VDI-2163-06', values: { umluftbetrieb: false, umluft_abluftreinigung_nachgewiesen: false } }], // first operand true → OR pass
      [{ ws: 'VDI-2163-06', values: { umluftbetrieb: true } }]); // both false → OR fails (umluft_abluftreinigung stays false)
  });
  it('CR-13  zugaenglichkeit_inspektion == true (§4.4.4)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-13',
      [{ ws: 'VDI-2163-06', values: { zugaenglichkeit_inspektion: true } }],
      [{ ws: 'VDI-2163-06', values: { zugaenglichkeit_inspektion: false } }]);
  });
  it('CR-14  verdraengungsstrom_querschnitt >= 1 (§4.4.2 TRBA 211)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-14',
      [{ ws: 'VDI-2163-06', values: { verdraengungsstrom_querschnitt: 1 } }],
      [{ ws: 'VDI-2163-06', values: { verdraengungsstrom_querschnitt: 0.5 } }]);
  });
  it('CR-15  anlagenstatus == neuanlage AND hygiene_erstinspektion_durchgefuehrt == true (§4.4.4)', async () => {
    // New-facility branch driven both ways. (JUDGMENT: as a plain AND this gate blocks EVERY
    // existing facility — see sign-off; intent-faithful form is a guard. Not changed here.)
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-15',
      [{ ws: 'VDI-2163-06', values: { anlagenstatus: 'neuanlage', hygiene_erstinspektion_durchgefuehrt: true } }],
      [{ ws: 'VDI-2163-06', values: { hygiene_erstinspektion_durchgefuehrt: false } }]); // AND fails
  });
  it('CR-16  hygieneinspektion_intervall <= 12 (§4.4.4 jährlich)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-16',
      [{ ws: 'VDI-2163-06', values: { hygieneinspektion_intervall: 12 } }],
      [{ ws: 'VDI-2163-06', values: { hygieneinspektion_intervall: 18 } }]);
  });
  it('CR-31  aussenluftstrom_schwere_arbeit >= 65 (§4.4.2 schwere körperliche Arbeit)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-31',
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_schwere_arbeit: 65 } }],
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_schwere_arbeit: 50 } }]);
  });
  it('CR-32  aussenluftstrom_geruchszuschlag >= 20 (§4.4.2 Geruchszuschlag)', async () => {
    await proveBothWays('VDI-2163-06', 'VDI-2163-CR-32',
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_geruchszuschlag: 20 } }],
      [{ ws: 'VDI-2163-06', values: { aussenluftstrom_geruchszuschlag: 10 } }]);
  });
});

describe('VDI-2163-07 — Personenbezogene Maßnahmen / PSA (§4.5)', () => {
  it('CR-17  psa_handschutz AND psa_koerperkleidung == true (§4.5 EN 420/EN 340)', async () => {
    await proveBothWays('VDI-2163-07', 'VDI-2163-CR-17',
      [{ ws: 'VDI-2163-07', values: { psa_handschutz: true, psa_koerperkleidung: true } }],
      [{ ws: 'VDI-2163-07', values: { psa_handschutz: false } }]); // one false → AND fails
  });
  it('CR-18  schutzkonzept_vorhanden == true (§4.5)', async () => {
    await proveBothWays('VDI-2163-07', 'VDI-2163-CR-18',
      [{ ws: 'VDI-2163-07', values: { schutzkonzept_vorhanden: true } }],
      [{ ws: 'VDI-2163-07', values: { schutzkonzept_vorhanden: false } }]);
  });
});

describe('VDI-2163-08 — Betrieb, Instandhaltung und Kontrollwerte (§5;§6)', () => {
  it('CR-19  dokumentation_betriebstagebuch == true (§5.1 VDI 3801)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-19',
      [{ ws: 'VDI-2163-08', values: { dokumentation_betriebstagebuch: true } }],
      [{ ws: 'VDI-2163-08', values: { dokumentation_betriebstagebuch: false } }]);
  });
  it('CR-20  3-way maintenance-interval AND-chain (§5.2 Tab.4: 12/6/12 Monate)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-20',
      [{ ws: 'VDI-2163-08', values: {
        aussenluftdurchlass_pruefintervall: 12, kammerzentrale_wasser_intervall: 6,
        filterwechsel_intervall_stufe1: 12 } }],
      [{ ws: 'VDI-2163-08', values: { kammerzentrale_wasser_intervall: 9 } }]); // 9 <= 6 false → AND fails
  });
  it('CR-21  rueckkuehlwerk_reinigung_intervall >= 2 AND gesamtkoloniezahl_umlaufwasser <= 10000 (§5.2.9)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-21',
      [{ ws: 'VDI-2163-08', values: { rueckkuehlwerk_reinigung_intervall: 2, gesamtkoloniezahl_umlaufwasser: 10000 } }],
      [{ ws: 'VDI-2163-08', values: { gesamtkoloniezahl_umlaufwasser: 20000 } }]); // > 10000 → AND fails
  });
  it('CR-22  tkw_schimmelpilzsporen <= 100000 (§6.2.4 TKW ≤ 2× 5·10⁴)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-22',
      [{ ws: 'VDI-2163-08', values: { tkw_schimmelpilzsporen: 50000 } }],
      [{ ws: 'VDI-2163-08', values: { tkw_schimmelpilzsporen: 200000 } }]);
  });
  it('CR-23  c_endotoxine_kontrollwert < 50 (§6.2.4 < 50 EU/m³)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-23',
      [{ ws: 'VDI-2163-08', values: { c_endotoxine_kontrollwert: 40 } }],
      [{ ws: 'VDI-2163-08', values: { c_endotoxine_kontrollwert: 60 } }]);
  });
  it('CR-24  gesamtkeimzahl_wasser <= 1000 (§6.2.4 ≤ 1000 KBE/ml)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-24',
      [{ ws: 'VDI-2163-08', values: { gesamtkeimzahl_wasser: 1000 } }],
      [{ ws: 'VDI-2163-08', values: { gesamtkeimzahl_wasser: 2000 } }]);
  });
  it('CR-25  legionellen_wasser <= 1 (§6.2.4 ≤ 1 KBE/ml)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-25',
      [{ ws: 'VDI-2163-08', values: { legionellen_wasser: 1 } }],
      [{ ws: 'VDI-2163-08', values: { legionellen_wasser: 5 } }]);
  });
  it('CR-26  zuluft_keimgehalt_verhaeltnis == kleiner_gleich_aussenluft (§6.2.4 enum-eq)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-26',
      [{ ws: 'VDI-2163-08', values: { zuluft_keimgehalt_verhaeltnis: 'kleiner_gleich_aussenluft' } }],
      [{ ws: 'VDI-2163-08', values: { zuluft_keimgehalt_verhaeltnis: 'groesser_aussenluft' } }]);
  });
  it('CR-27  klima_grenzbereich IN {behaglichkeit,ertraeglichkeit} (§6.3; ueberschreitung violates)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-27',
      [{ ws: 'VDI-2163-08', values: { klima_grenzbereich: 'behaglichkeit' } }],
      [{ ws: 'VDI-2163-08', values: { klima_grenzbereich: 'ueberschreitung' } }]); // 3rd domain option → not in set → fail
  });
  it('CR-28  luftfeuchte_zuluftleitung IS NOT NULL (§5.2.8; set → pass, cleared → fail)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-28',
      [{ ws: 'VDI-2163-08', values: { luftfeuchte_zuluftleitung: 85 } }],
      [{ ws: 'VDI-2163-08', values: { luftfeuchte_zuluftleitung: null } }]);
  });
  it('CR-29  messparameter_mikroorganismen IS NOT NULL (§6.2.2; set → pass, cleared → fail)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-29',
      [{ ws: 'VDI-2163-08', values: { messparameter_mikroorganismen: 'legionellen_wasser' } }],
      [{ ws: 'VDI-2163-08', values: { messparameter_mikroorganismen: null } }]);
  });
  it('CR-30  naehrboden_typ IS NOT NULL (§6.2.3; set → pass, cleared → fail)', async () => {
    await proveBothWays('VDI-2163-08', 'VDI-2163-CR-30',
      [{ ws: 'VDI-2163-08', values: { naehrboden_typ: 'caso_agar' } }],
      [{ ws: 'VDI-2163-08', values: { naehrboden_typ: null } }]);
  });
});
