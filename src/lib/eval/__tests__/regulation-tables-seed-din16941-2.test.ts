/**
 * Plan 3 Task 15 — DIN-EN-16941-2 seed tables: shape pins, key-token pins
 * against the captured prod enums (G-A3), the printed values read from the
 * transcript in this session (line in the comment), the informative ranges of
 * Tab. A.2 / A.3 as hints (SR-2 — never limits), the Anhang-D Richtwerte per
 * printed column and the D.3 / D.4 status bands.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tabA1AsTable, tabA2AsTable, tabA3AsTable, gl1LegendeAsTable, tabD1AsTable, tabD2AsTable, tabD3AsTable, tabD4AsTable, anhangBAsTable,
  din169412SeedTables, RICHTWERT_SPALTEN, GL1_QUELLEN, TABA2_QUELLEN, TABA3_BEDARF, DIN16941_2_EDITION, Q,
} from '../regulation-tables-seed-din16941_2';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DIN-EN-16941-2';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/din16941_2.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);
const table = makeTableLookup(STD);

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(DIN16941_2_EDITION);
}

describe('DIN-EN-16941-2 Plan-3 seed tables', () => {
  it('nine tables in the live set; registered as SEED_BUILDERS.din16941_2 (ts 20260917101500); the fallback resolves each; edition token printed (EN 16941-2:2021)', () => {
    const tables = din169412SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABA1', 'TABA2', 'TABA3', 'GL1_LEGENDE', 'TABD1', 'TABD2', 'TABD3', 'TABD4', 'ANHANGB']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.din16941_2).toEqual({ build: din169412SeedTables, ts: '20260917101500', slugFile: 'din16941_2' });
    expect(liveSeedSlugs()).toContain('din16941_2');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(DIN16941_2_EDITION).toBe('2021'); // L5 / L101 "EN 16941-2:2021" = prod standards.version 'EN 16941-2:2021'
    expect(Q.L5).toContain('(EN 16941-2:2021)');
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(4 + 5 + 3 + 6 + 4 + 4 + 3 + 2 + 5);
    expect(tables.filter((t) => t.verification_status === 'md_verified').map((t) => t.table_code)).toEqual(tables.map((t) => t.table_code));
  });

  it('TABA1 (L741): 1 Person — Ertrag 60 / WC 35 / Wäsche 15 / Andere 10 l/(p·d) with the footnotes a / b / c; anhaltswert (L547 "Beispiele für typische …")', () => {
    const t = tabA1AsTable();
    expect(t.rows.map((r) => [r.keys.posten, r.values.l_pd])).toEqual([['ertrag', 60], ['bedarf_wc', 35], ['bedarf_waesche', 15], ['bedarf_andere', 10]]);
    expect(String(t.rows[0].values.fussnote)).toContain('Ertrag von Dusche, Badewanne und/oder Waschbecken'); // L743
    expect(String(t.rows[2].values.fussnote)).toContain('Waschmaschinen üblicherweise 30 l bis 60 l je Zyklus'); // L744
    expect(String(t.rows[3].values.fussnote)).toContain('Zum Beispiel Gartenbewässerung'); // L745
    expect(t.rows[1].values.fussnote).toBeNull();
    expect(t.rows.every((r) => r.verbatim_quote === Q.L739_745)).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Beispiele für typische durchschnittliche tägliche Grauwassererträge und Bedarfsmengen');
    expect(table('TABA1', ['ertrag'])?.l_pd).toBe(60);
  });

  it('TABA2 (L762–L766): five sources with the printed Größenordnungen as min/max HINTS (SR-2), keys ⊂ prod grauwasser_herkunft; Waschbecken has no printed row', () => {
    const t = tabA2AsTable();
    expect(t.rows.map((r) => [r.keys.quelle, r.values.min, r.values.max, r.values.unit])).toEqual([
      ['dusche', 5, 15, 'l/min'], ['badewanne', 70, 200, 'l'], ['waschmaschine', 30, 60, 'l/Zyklus'], ['kuechenspuele', 5, 15, 'l/min'], ['geschirrspueler', 10, 20, 'l'],
    ]);
    expect(t.rows.map((r) => r.values.groessenordnung)).toEqual(['5 bis 15', '70 bis 200', '30 bis 60', '5 bis 15', '10 bis 20']);
    const herkunft = enumValues('DIN-EN-16941-2-01 grauwasser_herkunft');
    expect(herkunft).toEqual(['dusche', 'badewanne', 'waschbecken', 'waschmaschine', 'kuechenspuele', 'geschirrspueler']);
    for (const r of t.rows) expect(herkunft).toContain(r.keys.quelle);
    expect(TABA2_QUELLEN.map((q) => q.value)).not.toContain('waschbecken');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('typische Größenordnungen des Wasserverbrauchs'); // L753
    expect(table('TABA2', ['badewanne'])?.max).toBe(200);
  });

  it('TABA3 (L776–L778): WC 3–8 l/Spülung, Urinal 1–2, Waschmaschine 30–60 l/Waschvorgang — hints only', () => {
    const t = tabA3AsTable();
    expect(t.rows.map((r) => [r.keys.bedarf, r.values.min, r.values.max, r.values.unit])).toEqual([['wc', 3, 8, 'l/Spülung'], ['urinal', 1, 2, 'l/Spülung'], ['waschmaschine', 30, 60, 'l/Waschvorgang']]);
    expect(TABA3_BEDARF.map((b) => b.value)).toEqual(['wc', 'urinal', 'waschmaschine']);
    expect(t.override_policy).toBe('anhaltswert');
  });

  it('GL1_LEGENDE (L569–L587): six Gl.-1 sources = prod grauwasser_herkunft tokens; Dusche / Waschbecken / Küchenspüle are flow-based (Q in l/min with a duration t), the others volume-based (V in l); locked (L557 "muss")', () => {
    const t = gl1LegendeAsTable();
    expect(t.rows.map((r) => r.keys.quelle)).toEqual(enumValues('DIN-EN-16941-2-01 grauwasser_herkunft'));
    expect(t.rows.map((r) => [r.keys.quelle, r.values.groesse, r.values.unit_qv, r.values.mit_dauer])).toEqual([
      ['dusche', 'Q', 'l/min', 1], ['badewanne', 'V', 'l', 0], ['waschbecken', 'Q', 'l/min', 1], ['waschmaschine', 'V', 'l', 0], ['kuechenspuele', 'Q', 'l/min', 1], ['geschirrspueler', 'V', 'l', 0],
    ]);
    expect(GL1_QUELLEN.filter((q) => q.mit_dauer).map((q) => q.value)).toEqual(['dusche', 'waschbecken', 'kuechenspuele']);
    expect(String(t.rows[0].values.legende_t)).toContain('die Dauer je Duschvorgang in Minuten (min)'); // L570
    expect(t.rows[1].values.legende_t).toBeNull();
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Die folgende Gleichung (1) muss zur Bestimmung des Grauwasserertrags');
    expect(table('GL1_LEGENDE', ['kuechenspuele'])?.mit_dauer).toBe(1);
  });

  it('TABD1 (L852–L855): Richtwerte per printed column — E. coli / Enterokokken "Nicht nachweisbar" for Sprüh and Reinigung, 250 / 100 for WC and Garten; Legionella 10 only for Sprüh; Coliforme 10 / 1000 / 1000 / 10; locked (L681 Mindestanforderungen)', () => {
    const t = tabD1AsTable();
    expect(t.rows.map((r) => r.keys.nutzung)).toEqual(RICHTWERT_SPALTEN.map((s) => s.value));
    expect(RICHTWERT_SPALTEN.map((s) => s.value)).toEqual(['sprueh', 'wc_spuelung', 'gartenbewaesserung', 'reinigung_waschmaschine']);
    expect(enumValues('DIN-EN-16941-2-01 vorgesehene_nutzung')).toEqual(['wc_spuelung', 'gartenbewaesserung', 'waesche', 'reinigung']); // the two shared tokens are spelled identically
    expect(t.rows.map((r) => [r.values.e_coli_g, r.values.e_coli_text])).toEqual([[null, 'Nicht nachweisbar'], [250, '250'], [250, '250'], [null, 'Nicht nachweisbar']]);
    expect(t.rows.map((r) => [r.values.enterokokken_g, r.values.enterokokken_text])).toEqual([[null, 'Nicht nachweisbar'], [100, '100'], [100, '100'], [null, 'Nicht nachweisbar']]);
    expect(t.rows.map((r) => [r.values.legionella_g, r.values.legionella_text])).toEqual([[10, '10'], [null, 'N/A'], [null, 'N/A'], [null, 'N/A']]);
    expect(t.rows.map((r) => [r.values.coliforme_g, r.values.coliforme_text])).toEqual([[10, '10'], [1000, '1000'], [1000, '1000'], [10, '10']]);
    expect(t.rows.map((r) => r.values.verfahren_e_coli)).toEqual(['EN ISO 9308-1', 'EN ISO 9308-3', 'EN ISO 9308-3', 'EN ISO 9308-3']);
    expect(t.rows.every((r) => r.verbatim_quote === Q.L850_858)).toBe(true);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Die Beispiele in Anhang D sind Mindestanforderungen');
    expect(table('TABD1', ['wc_spuelung'])?.coliforme_g).toBe(1000);
  });

  it('TABD2 (L870–L873): Trübung < 10 (N/A for Garten), pH 5 bis 9,5, Rest-Chlor < 2,0 (Garten < 0,5), Rest-Brom 0,0 / < 5,0 / 0,0 / < 5,0', () => {
    const t = tabD2AsTable();
    expect(t.rows.map((r) => [r.values.truebung_max, r.values.truebung_text])).toEqual([[10, '< 10'], [10, '< 10'], [null, 'N/A'], [10, '< 10']]);
    expect(t.rows.map((r) => [r.values.ph_min, r.values.ph_max, r.values.ph_text])).toEqual([[5, 9.5, '5 bis 9,5'], [5, 9.5, '5 bis 9,5'], [5, 9.5, '5 bis 9,5'], [5, 9.5, '5 bis 9,5']]);
    expect(t.rows.map((r) => [r.values.rest_chlor_max, r.values.rest_chlor_text])).toEqual([[2, '< 2,0'], [2, '< 2,0'], [0.5, '< 0,5'], [2, '< 2,0']]);
    expect(t.rows.map((r) => [r.values.rest_brom_max, r.values.rest_brom_text])).toEqual([[0, '0,0'], [5, '< 5,0'], [0, '0,0'], [5, '< 5,0']]);
    expect(t.rows[0].values.verfahren_ph).toBe('EN ISO 10523');
    expect(t.override_policy).toBe('locked');
  });

  it('TABD3 (L884–L886) / TABD4 (L900–L901): the status bands with codes 1 / 2 / 3 and the printed Auswertung; the coliform footnote b and the pH note travel as override_quote', () => {
    const d3 = tabD3AsTable();
    expect(d3.rows.map((r) => [r.keys.band, r.values.status, r.values.code])).toEqual([['lt_g', 'gruen', 1], ['g_bis_10g', 'gelb', 2], ['gt_10g', 'rot', 3]]);
    expect(d3.rows.map((r) => r.values.auswertung)).toEqual(['System unter Kontrolle', 'erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs', 'Nutzung des Grauwassers ausschließen, bis Problem gelöst ist']);
    expect(d3.override_quote).toContain('Bei Abwesenheit von E. coli, intestinalen Enterokokken und Legionella'); // L889 footnote b
    const d4 = tabD4AsTable();
    expect(d4.rows.map((r) => [r.keys.band, r.values.status, r.values.code])).toEqual([['lt_g', 'gruen', 1], ['gt_g', 'gelb', 2]]);
    expect(d4.override_quote).toContain('Bei der Überwachung des pH-Werts'); // L902
    expect(d3.override_policy).toBe('locked');
    expect(d4.override_policy).toBe('locked');
  });

  it('ANHANGB (L788–L806): five system types keyed on the prod anlagentyp tokens; only the direct-use type carries the printed use restriction (L794); anhaltswert (informativ)', () => {
    const t = anhangBAsTable();
    expect(t.rows.map((r) => r.keys.anlagentyp)).toEqual(enumValues('DIN-EN-16941-2-01 anlagentyp'));
    expect(t.rows.map((r) => r.values.bezeichnung)).toEqual([
      'Anlagen für die direkte Nutzung (ohne Behandlung)', 'Anlagen mit kurzzeitiger Rückhaltung', 'einfache physikalische/chemische Anlagen', 'biologische Anlagen', 'biologisch-mechanische Anlagen',
    ]);
    expect(String(t.rows[0].values.nutzungsbeschraenkung)).toContain('auf unterirdische Bewässerung und Anwendungen ohne Versprühen beschränkt');
    expect(t.rows.slice(1).every((r) => r.values.nutzungsbeschraenkung === null)).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('können nach der Art der Behandlung wie folgt klassifiziert werden'); // L787
  });
});
