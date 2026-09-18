/**
 * Plan 3 Task 19 — DWA-M-820-2 seed tables: the two printed outlines (Anhang A
 * Statusbericht, Anhang B Projekthandbuch) lifted row by row from the transcript
 * in this session (line in the comment), the edition / policy cues, and the
 * SEED_BUILDERS registration.
 */
import { describe, it, expect } from 'vitest';
import { anhangAAsTable, anhangBAsTable, m8202SeedTables, ANHANGA_ROWS, ANHANGB_ROWS, outlineOption, M820_2_EDITION, Q_L663, Q_L681, Q_L367, Q_L375 } from '../regulation-tables-seed-m820_2';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-820-2';
/** The middle span of ANHANGA's composed policy quote (L2525) — read back from the table so the pin asserts the ORDER of the three spans. */
const Q_L2525_of = (t: RegulationTable) => (t.override_quote ?? '').split(' — ')[1];

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    expect(r.verbatim_quote).not.toContain('undefined');
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(M820_2_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
}

describe('DWA-M-820-2 Plan-3 seed tables', () => {
  it('two tables in the live set; registered as SEED_BUILDERS.m820_2 (ts 20260917101900); the fallback resolves each; edition 2023; both md_verified', () => {
    const tables = m8202SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['ANHANGA', 'ANHANGB']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.m820_2).toEqual({ build: m8202SeedTables, ts: '20260917101900', slugFile: 'm820_2' });
    expect(liveSeedSlugs()).toContain('m820_2');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(M820_2_EDITION).toBe('2023'); // title page L9 "April 2023", imprint L48 "© DWA, 1. Auflage, Hennef 2023" = prod standards.version 'April 2023'
    // every displayed cell (number + title) is legible in the transcript ⇒ md_verified on both (amendment F)
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('md_verified');
    // both are "Gliederungsvorschlag" outlines ⇒ anhaltswert — the brief's cue IS printed (L367 Anhang B, L375 Anhang A; fix round 1 retracted
    // the first commit's false "not printed" claim) and is composed into each override_quote beside L663 / L681
    for (const t of tables) expect(t.override_policy).toBe('anhaltswert');
    expect(anhangBAsTable().override_quote).toBe(`${Q_L663} — ${Q_L367}`);
    expect(Q_L663).toContain('Im Anhang B ist ein Gliederungsvorschlag enthalten.');
    expect(Q_L367).toBe('Ein erster Gliederungsvorschlag ist im Anhang B beigefügt.'); // L367
    expect(anhangAAsTable().override_quote).toBe(`${Q_L681} — ${Q_L2525_of(anhangAAsTable())} — ${Q_L375}`);
    expect(Q_L681).toContain('Gliederungsbeispiel siehe Anhang A');
    expect(Q_L375).toBe('Ein Gliederungsvorschlag und ein Beispiel sind im Anhang A beigefügt.'); // L375
  });

  it('ANHANGA (L2532–L2550 + L2556–L2557): the 19 printed sections in order with their numbers and the two annexes; keys a1…a9_2, anhang1, anhang2; group + ebene', () => {
    const t = anhangAAsTable();
    expect(t.key_columns).toEqual(['abschnitt']);
    expect(t.rows).toHaveLength(21);
    expect(ANHANGA_ROWS).toHaveLength(21);
    expect(t.rows.map((r) => [r.keys.abschnitt, r.values.nummer, r.values.titel, r.values.ebene])).toEqual([
      ['a1', '1', 'Einleitung', 1],                                  // L2532
      ['a2', '2', 'Organisation', 1],                                // L2533
      ['a3', '3', 'Stand der Arbeiten', 1],                          // L2534
      ['a3_1', '3.1', 'Planung und Ausschreibungen', 2],             // L2535
      ['a3_2', '3.2', 'Baufortschritt', 2],                          // L2536
      ['a3_3', '3.3', 'Spezielle Ereignisse', 2],                    // L2537
      ['a4', '4', 'Kostenübersicht', 1],                             // L2538
      ['a4_1', '4.1', 'Stand der Rechnungen und Zahlungen', 2],      // L2539
      ['a4_2', '4.2', 'Arbeitsvergaben', 2],                         // L2540
      ['a4_3', '4.3', 'Projektänderungen und Nachträge', 2],         // L2541
      ['a4_4', '4.4', 'Puffer (Reserven)', 2],                       // L2542
      ['a4_5', '4.5', 'Prognose', 2],                                // L2543
      ['a5', '5', 'Finanz- und Liquiditätsplan', 1],                 // L2544
      ['a6', '6', 'Termine', 1],                                     // L2545
      ['a7', '7', 'Öffentlichkeitsarbeit', 1],                       // L2546
      ['a8', '8', 'Qualitätsüberwachung', 1],                        // L2547
      ['a9', '9', 'Risikoanalyse und Arbeitssicherheit', 1],         // L2548
      ['a9_1', '9.1', 'Risikoanalyse', 2],                           // L2549
      ['a9_2', '9.2', 'Arbeitssicherheit', 2],                       // L2550
      ['anhang1', 'Anhang 1', 'Finanz- und Liquiditätsplan', 0],     // L2556
      ['anhang2', 'Anhang 2', 'Kosten-, Vertrags- und Zahlungsstand sowie Kostenprognose', 0], // L2557
    ]);
    // the tabular rows quote the printed \hline line; the two annexes quote the printed plain line
    expect(t.rows[0].verbatim_quote).toBe(String.raw`\hline 1 & Einleitung \\`);
    expect(t.rows[19].verbatim_quote).toBe('Anhang 1: Finanz- und Liquiditätsplan Stand:');
    expect(t.rows.map((r) => r.group_label)).toEqual([...Array(19).fill('Inhaltsverzeichnis'), 'Anhang', 'Anhang']);
    // the checklist option string = "<nummer> <titel>" / "Anhang n: <titel>"
    expect(t.rows.map((r) => r.values.gedruckt)).toEqual(ANHANGA_ROWS.map(outlineOption));
    expect(outlineOption(ANHANGA_ROWS[3])).toBe('3.1 Planung und Ausschreibungen');
    expect(outlineOption(ANHANGA_ROWS[20])).toBe('Anhang 2: Kosten-, Vertrags- und Zahlungsstand sowie Kostenprognose');
    const lookup = makeTableLookup(STD);
    expect(lookup('ANHANGA', ['a4_3'])?.titel).toBe('Projektänderungen und Nachträge'); // makeTableLookup returns the row's VALUES object
    expect(lookup('ANHANGA', ['a10'])).toBeUndefined();
  });

  it('ANHANGB (L2563–L2570): the eight printed chapters in order; keys b1…b8', () => {
    const t = anhangBAsTable();
    expect(t.key_columns).toEqual(['kapitel']);
    expect(ANHANGB_ROWS).toHaveLength(8);
    expect(t.rows.map((r) => [r.keys.kapitel, r.values.nummer, r.values.titel])).toEqual([
      ['b1', '1', 'Aufbau und Organisation des Organisationshandbuchs'], // L2563
      ['b2', '2', 'Projektinformationen'],                               // L2564
      ['b3', '3', 'Aufbauorganisation'],                                 // L2565
      ['b4', '4', 'Aufgabenbeschreibungen'],                             // L2566
      ['b5', '5', 'Projekt- und Planungsorganisation'],                  // L2567
      ['b6', '6', 'EDV-, CAD-, BIM-Regelungen'],                         // L2568
      ['b7', '7', 'Terminliche Abwicklung'],                             // L2569
      ['b8', '8', 'Kostenmanagement'],                                   // L2570
    ]);
    expect(t.rows.map((r) => r.verbatim_quote)).toEqual(t.rows.map((r) => `${r.values.nummer} ${r.values.titel}`));
    expect(t.rows.map((r) => r.values.gedruckt)).toEqual(ANHANGB_ROWS.map(outlineOption));
    expect(t.rows.every((r) => r.group_label === null)).toBe(true);
    expect(makeTableLookup(STD)('ANHANGB', ['b6'])?.gedruckt).toBe('6 EDV-, CAD-, BIM-Regelungen');
  });
});
