/**
 * VDI 3814 Blatt 2.1:2019-01 ("Gebäudeautomation (GA); Planung; Bedarfsplanung, Betreiberkonzept
 * und Lastenheft") — REAL save-path gate-execution proof.
 *
 * (C) GATE EXECUTION — drives the standard's 28 live BLOCK gates through the REAL enforcement chain
 *     against a disposable embedded Postgres:
 *       saveWorksheet(instance, values) → values persist to project_parameters
 *       checkApprovalGate(instance)     → the engineer-approve gate replays every block condition
 *                                         against the SAVED values and lists definite `fail`s.
 *     `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 *     `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING
 *     only when shown BOTH ways: a persisted passing state (not blocked) and a persisted violating
 *     state (definite fail) — the F-4 lesson.
 *
 *     26 substantive gates are driven both ways (existence IS NOT NULL/EMPTY, boolean == true).
 *     CR-12 (membership over the FULL enum domain) is driven both ways at the ENGINE level using an
 *     out-of-domain value (present-not-in-set ⇒ definite fail) — but is an enum-full-domain NO-OP in
 *     UI-constrained use (the UI only offers the 3 domain values, so it can never fail in practice).
 *     CR-28 (condition 'TRUE') is a NO-OP block gate driven to demonstrate it NEVER blocks.
 *
 * (B) EQUATIONS — this standard has ZERO equations in prod (re-confirmed this session). Nothing to
 *     symbol-verify; NR-for-execution.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-vdi3814-2-1'; // top-level-await: PG + seedVDI3814_2_1 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getVDI3814Harness } from './_harness-env-vdi3814-2-1';
import { VDI3814_GATES } from './seed-vdi3814-2-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getVDI3814Harness();

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

/** Every gate code the test actually drives — asserted to cover all 28 at the end. */
const DRIVEN = new Set<string>();

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
  DRIVEN.add(code);
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

// ────────────────────────────────────────────────────────────────────────────────────────────
// Seed sanity
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1 — seed sanity (topology matches prod: 7 worksheets, 28 block gates)', () => {
  it('seeds all 7 worksheet instances and 28 block gates (1 of them a TRUE no-op)', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'VDI-3814-Blatt-2-1-01', 'VDI-3814-Blatt-2-1-02', 'VDI-3814-Blatt-2-1-03',
      'VDI-3814-Blatt-2-1-04', 'VDI-3814-Blatt-2-1-05', 'VDI-3814-Blatt-2-1-06',
      'VDI-3814-Blatt-2-1-07',
    ]);
    expect(VDI3814_GATES.length).toBe(28);
    expect(VDI3814_GATES.every((g) => g.sev === 'block')).toBe(true);
    expect(VDI3814_GATES.filter((g) => g.cond === 'TRUE').map((g) => g.code))
      .toEqual(['VDI-3814-2-1-CR-28']);
    // No `!= ''` / `!= null` / `== null` remains in any condition (trap-2 repair confirmed).
    expect(VDI3814_GATES.some((g) => /!=\s*''|!=\s*null|==\s*null/i.test(g.cond))).toBe(false);
    // The 4 IS NOT EMPTY gates (3 migration-converted + 1 native) — the repair's targets.
    expect(VDI3814_GATES.filter((g) => /IS NOT EMPTY/.test(g.cond)).map((g) => g.code).sort())
      .toEqual(['VDI-3814-2-1-CR-01', 'VDI-3814-2-1-CR-03', 'VDI-3814-2-1-CR-11', 'VDI-3814-2-1-CR-22']);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS02 — Bedarfsplanung (§6): CR-01..07 substantive, CR-28 TRUE no-op
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-02 — Bedarfsplanung', () => {
  const WS = 'VDI-3814-Blatt-2-1-02';
  it('CR-01  projektname IS NOT EMPTY  [trap-2 repair: != \'\' → IS NOT EMPTY]', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-01',
      [{ ws: WS, values: { projektname: 'Neubau Verwaltungsgebäude' } }],
      [{ ws: WS, values: { projektname: null } }]); // cleared → exists=false → definite fail
  });
  it('CR-02  ag_name AND ag_organisationsform AND ag_vertreter AND ag_projektleiter IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-02',
      [{ ws: WS, values: { ag_name: 'AG GmbH', ag_organisationsform: 'GmbH', ag_vertreter: 'Frau X', ag_projektleiter: 'Herr Y' } }],
      [{ ws: WS, values: { ag_projektleiter: null } }]); // clear one → AND fails
  });
  it('CR-03  projektumfang IS NOT EMPTY  [trap-2 repair: != \'\' → IS NOT EMPTY]', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-03',
      [{ ws: WS, values: { projektumfang: 'GA-Planung LPH 1-9' } }],
      [{ ws: WS, values: { projektumfang: null } }]);
  });
  it('CR-04  ziel_beschreibung AND prioritaeten_matrix IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-04',
      [{ ws: WS, values: { ziel_beschreibung: 'Termin-/Kosten-/Qualitätsziele', prioritaeten_matrix: 'Q>K>T' } }],
      [{ ws: WS, values: { prioritaeten_matrix: null } }]);
  });
  it('CR-05  projektschnittstellen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-05',
      [{ ws: WS, values: { projektschnittstellen: 'Parallelprojekt Elektro' } }],
      [{ ws: WS, values: { projektschnittstellen: null } }]);
  });
  it('CR-06  nutzungsprozess_beschreibung IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-06',
      [{ ws: WS, values: { nutzungsprozess_beschreibung: 'Bürobetrieb Open Space' } }],
      [{ ws: WS, values: { nutzungsprozess_beschreibung: null } }]);
  });
  it('CR-07  bestandsdokumente IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-07',
      [{ ws: WS, values: { bestandsdokumente: 'Bestandspläne 2018' } }],
      [{ ws: WS, values: { bestandsdokumente: null } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS03 — Betreiberkonzept (§7): CR-08..14; CR-12 is the enum-full-domain membership gate
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-03 — Betreiberkonzept Gebäudeautomation', () => {
  const WS = 'VDI-3814-Blatt-2-1-03';
  it('CR-08  betreiberkonzept_ziele IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-08',
      [{ ws: WS, values: { betreiberkonzept_ziele: 'Verfügbarkeit + Energieeffizienz' } }],
      [{ ws: WS, values: { betreiberkonzept_ziele: null } }]);
  });
  it('CR-09  betreiberkonzept_nutzer IS NOT NULL (enum)', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-09',
      [{ ws: WS, values: { betreiberkonzept_nutzer: 'betreiber' } }],
      [{ ws: WS, values: { betreiberkonzept_nutzer: null } }]);
  });
  it('CR-10  zu_betreibende_objekte IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-10',
      [{ ws: WS, values: { zu_betreibende_objekte: 'Liegenschaft A, Gebäude 1-3' } }],
      [{ ws: WS, values: { zu_betreibende_objekte: null } }]);
  });
  it('CR-11  betreiberstruktur IS NOT EMPTY  [trap-2 repair: != \'\' → IS NOT EMPTY]', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-11',
      [{ ws: WS, values: { betreiberstruktur: 'FM-Abteilung, 8 MA' } }],
      [{ ws: WS, values: { betreiberstruktur: null } }]);
  });
  it('CR-12  betreibermodell IN {eigenbetreiben,fremdbetreiben,kombination} — engine both-ways via out-of-domain (enum-full-domain no-op in UI use)', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-12',
      [{ ws: WS, values: { betreibermodell: 'eigenbetreiben' } }],       // in-domain → membership pass
      [{ ws: WS, values: { betreibermodell: 'nicht_definiert_invalid' } }]); // present, out-of-domain → definite fail
  });
  it('CR-13  gebaeude_prioritaet AND anlagen_prioritaet IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-13',
      [{ ws: WS, values: { gebaeude_prioritaet: 'hoch', anlagen_prioritaet: 'hoch' } }],
      [{ ws: WS, values: { anlagen_prioritaet: null } }]);
  });
  it('CR-14  sla_definition IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-14',
      [{ ws: WS, values: { sla_definition: 'Reaktionszeit 4h' } }],
      [{ ws: WS, values: { sla_definition: null } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS04 — GA-Lastenheft: Allgemeines, Datenkommunikation, Störfallmanagement (§8.1..8.3)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-04 — GA-Lastenheft (Allg./Datenkomm./Störfall)', () => {
  const WS = 'VDI-3814-Blatt-2-1-04';
  it('CR-15  lastenheft_erstellt == true', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-15',
      [{ ws: WS, values: { lastenheft_erstellt: true } }],
      [{ ws: WS, values: { lastenheft_erstellt: false } }]);
  });
  it('CR-16  datenkommunikationsprotokoll AND datenschnittstellen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-16',
      [{ ws: WS, values: { datenkommunikationsprotokoll: 'bacnet', datenschnittstellen: 'BACnet/IP, OPC UA' } }],
      [{ ws: WS, values: { datenschnittstellen: null } }]);
  });
  it('CR-17  meldungsart AND meldungsempfaenger AND meldung_zustandsuebergang AND meldungsquittierung IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-17',
      [{ ws: WS, values: { meldungsart: 'stoerungsmeldung', meldungsempfaenger: 'Leitwarte', meldung_zustandsuebergang: 'kommend', meldungsquittierung: 'Quittierpflicht' } }],
      [{ ws: WS, values: { meldungsquittierung: null } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS05 — GA-Lastenheft: Geräte- und Infrastrukturanforderungen (§8.4..8.8)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-05 — GA-Lastenheft (Geräte/Infrastruktur)', () => {
  const WS = 'VDI-3814-Blatt-2-1-05';
  it('CR-18  feldgeraete_spezifikation AND automationseinrichtungen_spez AND verhalten_spannungsausfall IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-18',
      [{ ws: WS, values: { feldgeraete_spezifikation: 'Pt1000, 0-10V', automationseinrichtungen_spez: 'DDC BACnet B-BC', verhalten_spannungsausfall: 'sichere Stellung' } }],
      [{ ws: WS, values: { verhalten_spannungsausfall: null } }]);
  });
  it('CR-19  mbe_systemart AND mbe_anforderungen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-19',
      [{ ws: WS, values: { mbe_systemart: 'webbasiert', mbe_anforderungen: 'GUI, Trends, Backup' } }],
      [{ ws: WS, values: { mbe_anforderungen: null } }]);
  });
  it('CR-20  schaltschrank_anforderungen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-20',
      [{ ws: WS, values: { schaltschrank_anforderungen: 'IP54, Reserve 20%' } }],
      [{ ws: WS, values: { schaltschrank_anforderungen: null } }]);
  });
  it('CR-21  it_netzwerk_anforderungen AND it_sicherheit IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-21',
      [{ ws: WS, values: { it_netzwerk_anforderungen: 'VLAN, PoE', it_sicherheit: 'ISO 27001, Segmentierung' } }],
      [{ ws: WS, values: { it_sicherheit: null } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS06 — GA-Lastenheft: Funktionen, Energieeffizienz, Daten- & Systemfunktionen (§8.9..8.14)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-06 — GA-Lastenheft (Funktionen/Energieeffizienz/Systemfkt.)', () => {
  const WS = 'VDI-3814-Blatt-2-1-06';
  it('CR-22  energieeffizienzklasse IS NOT EMPTY  [trap-2 repair: != \'\' → IS NOT EMPTY]', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-22',
      [{ ws: WS, values: { energieeffizienzklasse: 'A (DIN EN 15232)' } }],
      [{ ws: WS, values: { energieeffizienzklasse: null } }]);
  });
  it('CR-23  historisierung_vorgaben IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-23',
      [{ ws: WS, values: { historisierung_vorgaben: '3 Jahre, Audit Trail' } }],
      [{ ws: WS, values: { historisierung_vorgaben: null } }]);
  });
  it('CR-24  cafm_schnittstellen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-24',
      [{ ws: WS, values: { cafm_schnittstellen: 'GEFMA 430 Export' } }],
      [{ ws: WS, values: { cafm_schnittstellen: null } }]);
  });
  it('CR-25  seven-way AND existence (Systemfunktionen §8.13)', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-25',
      [{ ws: WS, values: {
        systemselbstueberwachung: 'Watchdog', systemzeitverwaltung: 'NTP', datenimport_export: 'CSV/BACnet',
        zugriffsebene: 'ebene_2', aktivitaetenspeicher: 'Audit-Log', datensicherung_konzept: 'täglich inkrementell', fernzugriff: 'VPN',
      } }],
      [{ ws: WS, values: { fernzugriff: null } }]); // clear one of seven → AND fails
  });
  it('CR-26  gewerkespezifische_schnittstellen IS NOT NULL', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-26',
      [{ ws: WS, values: { gewerkespezifische_schnittstellen: 'RLT, Beleuchtung, Verschattung' } }],
      [{ ws: WS, values: { gewerkespezifische_schnittstellen: null } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// WS07 — Vollständigkeit, Pflege & Übergabe: CR-27
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1-07 — Vollständigkeit, Pflege & Übergabe', () => {
  const WS = 'VDI-3814-Blatt-2-1-07';
  it('CR-27  dokumente_gepflegt == true', async () => {
    await proveBothWays(WS, 'VDI-3814-2-1-CR-27',
      [{ ws: WS, values: { dokumente_gepflegt: true } }],
      [{ ws: WS, values: { dokumente_gepflegt: false } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// (C') THE 1 TRUE NO-OP BLOCK GATE — demonstrated NEVER to block (no-op, reported not fixed)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1 — TRUE no-op block gate (CR-28) never enforces', () => {
  it("CR-28 (condition 'TRUE') never appears in failingBlockConditions", async () => {
    DRIVEN.add('VDI-3814-2-1-CR-28');
    // No persisted state can make a literal-TRUE gate fail. Assert it does not block on the
    // (already heavily mutated) project state — the no-op. NOT fixed: TRUE→predicate = ruling.
    expect(await gateBlocks('VDI-3814-Blatt-2-1-02', 'VDI-3814-2-1-CR-28')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// Coverage — every one of the 28 block gates was driven (undriven list MUST be empty)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3814-Blatt-2-1 — all 28 block gates driven (no undriven gate)', () => {
  it('DRIVEN set covers every gate code in prod topology', () => {
    const allCodes = VDI3814_GATES.map((g) => g.code).sort();
    const driven = [...DRIVEN].sort();
    const undriven = allCodes.filter((c) => !DRIVEN.has(c));
    expect(undriven, `undriven gates: ${undriven.join(', ')}`).toEqual([]);
    expect(driven).toEqual(allCodes);
    expect(DRIVEN.size).toBe(28);
  });
});
