/**
 * Plan 3 Task 5 — DWA-M-1200-1 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * `Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.md` in this session (line
 * in the comment), and the tables kept `imported_unverified` (m1200_1-U-1…U-4:
 * OCR-damaged class columns in Tab. 8 / Tab. 27, the D-row image cell, the
 * "0" glyph of the Tab. 18 O row).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  m12001SeedTables, M12001_EDITION, GUETEKLASSE_TOKENS, FILTRATION_TOKENS, WAHRSCHEINLICHKEIT_TOKENS, SCHADENSAUSMASS_TOKENS, RISIKONIVEAU_TOKENS, SCHUTZGUT_CODES,
  WAHRSCHEINLICHKEIT_LABELS, SCHADENSAUSMASS_LABELS,
  tab8AsTable, tab8NoteFAsTable, tab7ClassAsTable, tab23AsTable, tab27AsTable, tab19AsTable, tab18AsTable,
} from '../regulation-tables-seed-m1200_1';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-1200-1';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/m1200_1.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);

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
  expect(t.edition).toBe(M12001_EDITION);
}

describe('DWA-M-1200-1 Plan-3 seed tables', () => {
  it('seven tables in the live set; registered as SEED_BUILDERS.m1200_1 (ts 20260917100500); edition 2025-07 (title page L9 "Juli 2025"); the fallback resolves each', () => {
    const tables = m12001SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB8', 'TAB8_NOTE_F', 'TAB7_CLASS', 'TAB23', 'TAB27', 'TAB19', 'TAB18']);
    for (const t of tables) expectWellFormed(t);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(6 + 8 + 6 + 25 + 6 + 3 + 9);
    expect(M12001_EDITION).toBe('2025-07');
    expect(SEED_BUILDERS.m1200_1).toEqual({ build: m12001SeedTables, ts: '20260917100500', slugFile: 'm1200_1' });
    expect(liveSeedSlugs()).toContain('m1200_1');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
  });

  it('G-A3: class / filtration / probability / severity / level tokens equal the captured prod enum value strings', () => {
    expect([...GUETEKLASSE_TOKENS]).toEqual(enumValues('M12001-08 gueteklasse_zugeordnet'));
    expect([...FILTRATION_TOKENS]).toEqual(enumValues('M12001-10 filtration_typ'));
    expect([...WAHRSCHEINLICHKEIT_TOKENS]).toEqual(enumValues('M12001-07 eintrittswahrscheinlichkeit'));
    expect([...SCHADENSAUSMASS_TOKENS]).toEqual(enumValues('M12001-07 schadensausmass'));
    expect([...RISIKONIVEAU_TOKENS]).toEqual(enumValues('M12001-07 risikoniveau_ausgangs'));
    expect([...RISIKONIVEAU_TOKENS]).toEqual(enumValues('M12001-07 restrisiko_niveau'));
    for (const t of [tab8AsTable(), tab7ClassAsTable(), tab27AsTable()]) expect(t.rows.map((r) => r.keys.klasse), t.table_code).toEqual([...GUETEKLASSE_TOKENS]);
    expect(tab8NoteFAsTable().rows.map((r) => r.keys.filtration_typ)).toEqual([...FILTRATION_TOKENS]);
    expect(tab18AsTable().rows.map((r) => r.keys.schutzgut_code)).toEqual([...SCHUTZGUT_CODES]);
  });

  it('TAB8 (L1156–L1211): limits per class as printed — E. coli 10/100/100/100/100/10.000, Enterokokken 100/100/100/400/400/–, chem-phys A…C-2, log10 targets A/B-1/C-1, note b) shares; locked; imported_unverified (U-1/U-3)', () => {
    const t = tab8AsTable();
    const v = (c: string) => t.rows.map((r) => r.values[c]);
    expect(v('e_coli_max')).toEqual([10, 100, 100, 100, 100, 10000]);        // L1156 "≤ 10", L1160 "≤ 100", L1165 "≤ 100", L1205 "≤ 10.000"
    expect(v('enterokokken_max')).toEqual([100, 100, 100, 400, 400, null]);   // L1156 / L1160 / L1165 / L1205 "－"
    expect(v('legionella_max')).toEqual([1000, 1000, 1000, 1000, 1000, 1000]); // L1157 "<1.000 KBE/L" (strict)
    expect(v('nematoden_max')).toEqual([1, 1, 1, 1, 1, 1]);                    // L1158 "≤ 1 Ei pro Liter"
    expect(v('bsb5_max')).toEqual([10, null, null, null, null, null]);         // L1159 "BSB5 ≤ 10 mg/l"; L1160 / L1165 "gemäß Richtlinie 91/271/EWG"; D image (U-3)
    expect(v('bsb5_note')).toEqual([null, 'gemäß Richtlinie 91／271／EWG', 'gemäß Richtlinie 91／271／EWG', 'gemäß Richtlinie 91／271／EWG', 'gemäß Richtlinie 91／271／EWG', null]);
    expect(v('afs_max')).toEqual([10, 10, 10, 10, 10, null]);
    expect(v('truebung_max')).toEqual([2, 2, 2, 2, 2, null]);                  // L1139 "Trübungswerte ≤ 2 NTU" for A, B, C
    expect(v('log10_e_coli')).toEqual([5, 5, null, 5, null, null]);            // L1135 "E. coli ≥5,0" for A, B-1, C-1
    expect(v('log10_somatische_coliphagen')).toEqual([6, 6, null, 6, null, null]);
    expect(v('log10_f_coliphagen')).toEqual([6, 6, null, 6, null, null]);
    expect(v('log10_clostridium')).toEqual([4, 4, null, 4, null, null]);
    expect(v('log10_sulfatreduzierer')).toEqual([5, 5, null, 5, null, null]);  // L1135 "sulfatreduzierende Sporenbildner ≥5,0" (the table cell prints "25，0" / "？5，0" — U-3)
    expect(v('leistungsziele')).toEqual([1, 1, 0, 1, 0, 0]);
    expect(v('validierung_pass_share_pct')).toEqual([90, 50, null, 50, null, null]); // L1215 note b)
    expect(v('routine_pass_share_pct')).toEqual([90, 90, 90, 90, 90, 90]);           // L1143
    expect(t.rows[0].values.legionella_bedingung).toBe('wenn das Risiko der Aerosol－ bildung besteht');           // L1157
    expect(t.rows[0].values.nematoden_bedingung).toBe('für die Bewäs－ serung von Weideflächen oder Futterpflanzen'); // L1158
    expect(t.rows.map((r) => r.group_label)).toEqual([null, 'B (B-1/B-2)', 'B (B-1/B-2)', 'C (C-1/C-2)', 'C (C-1/C-2)', null]);
    expect(t.rows[1].verbatim_quote).toBe(t.rows[2].verbatim_quote);
    expect(t.rows[3].verbatim_quote).toBe(t.rows[4].verbatim_quote);
    expect(t.rows[0].verbatim_quote).toContain(String.raw`$\leq 10^{\text {a）}}$ & $\leq 100$`);
    expect(t.rows[5].verbatim_quote).toContain(String.raw`$\leq 10.000^{\mathrm{a})}$ & －al，c）`);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Für die in Tabelle 7 spezifizierten Wassergüteklassen sind diese Mindestanforderungen in Tabelle 8 zusammengestellt.');
    expect(t.verification_status).toBe('imported_unverified');
    expect(makeTableLookup(STD)('TAB8', ['C-1'])?.enterokokken_max).toBe(400);
    expect(makeTableLookup(STD)('TAB8', ['D'])?.enterokokken_max).toBeNull();
  });

  it('TAB8_NOTE_F (L1219 / L1220): 2 / 5 / 10 NTU for Polstoff / Mikrosieb / Raumfilter, – / 0,2 / 0,5 NTU for the membrane tokens (E-2); anhaltswert; md_verified', () => {
    const t = tab8NoteFAsTable();
    expect(t.rows.map((r) => [r.values.ntu_avg_24h, r.values.ntu_5pct, r.values.ntu_never])).toEqual([
      [2, 5, 10], [2, 5, 10], [2, 5, 10], [null, 0.2, 0.5], [null, 0.2, 0.5], [null, 0.2, 0.5], [null, 0.2, 0.5], [null, 0.2, 0.5],
    ]);
    expect(t.rows[0].verbatim_quote).toContain('Bei Polstofffiltern，Mikrosieben und Raumfiltern sollten die Trübungswerte');
    expect(t.rows[3].verbatim_quote).toContain('Wird die Filtration durch Membranverfahren gewährleistet');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TAB7_CLASS (L984–L1105): rank = caption order A…D, methods, EU application sentences, Karenzzeit bullets, C-1 emitter 25 / 50 cm, lactating-cattle flags; locked (Tab. 4 note (*) L918); md_verified', () => {
    const t = tab7ClassAsTable();
    expect(t.rows.map((r) => r.values.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t.rows.map((r) => r.values.methode)).toEqual(['Alle Bewässerungsmethoden', 'Alle Bewässerungsmethoden', 'Alle Bewässerungsmethoden',
      'Tropfbewässerung oder eine andere Bewäs-serungsmethode, bei der ein unmittelbarer Kontakt mit dem essbaren Teil der Pflanze vermieden wird', 'Alle Bewässerungsmethoden', 'Alle Bewässerungsmethoden']); // L995 / L1008 / L1026 / L1040 / L1065 / L1077
    expect(t.rows[0].values.anwendungsbereich_eu).toBe('Alle roh verzehrten Nahrungsmittelpflanzen, deren essbarer Teil unmittelbar mit dem aufbereiteten Wasser in Kontakt kommt und Kulturen, deren unterirdisch im Boden wachsender Wurzelanteil roh verzehrt wird (z. B. Karotten, Zwiebeln, Rote Beete)'); // L986
    expect(t.rows[5].values.anwendungsbereich_eu).toBe('Industrie- und Energiepflanzen sowie Pflanzen zur Saatgutgewinnung'); // L1068
    expect(t.rows[2].values.anwendungsbereich_eu).toBeNull();
    expect(t.rows[0].values.karenzzeit_text).toBe('(Bewässerung ohne Einschränkungen und ohne Karenzzeit vor der Ernte)'); // L989
    expect(String(t.rows[1].values.karenzzeit_text)).toContain('Empfohlen wird ein Bewässerungsstopp mit aufbereitetem Wasser von 2 Wochen'); // L1006
    expect(String(t.rows[3].values.karenzzeit_text)).toContain('bis maximal 5 Tage vor dem Schnitt oder Weidegang durch nicht laktierendes Vieh'); // L1038
    expect(String(t.rows[5].values.karenzzeit_text)).toContain('bis 4 Wochen vor dem Schnitt oder Weidegang'); // L1074
    expect(String(t.rows[5].values.karenzzeit_text)).toContain('bis 30 Tage vor der Ernte'); // L1089
    expect(t.rows.map((r) => [r.values.emitter_tropf_cm, r.values.emitter_mikro_cm])).toEqual([[null, null], [null, null], [null, null], [25, 50], [null, null], [null, null]]); // L1035 / L1036
    expect(t.rows.map((r) => r.values.laktierend_ausgeschlossen)).toEqual([null, false, null, true, true, null]); // L1053 (C); L1006 (B-1); A / B-2 / D print nothing → null
    expect(t.rows.map((r) => r.values.laktierend_abtrocknung)).toEqual([null, true, null, null, null, null]);      // L1006
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe('(*) Wenn eine bewässerte Kulturpflanzenart in mehrere der oben genannten Kategorien fällt, gelten die Anforderungen der strengsten Kategorie.'); // L918
    expect(t.verification_status).toBe('md_verified');
    expect(makeTableLookup(STD)('TAB7_CLASS', ['C-1'])?.rank).toBe(4);
  });

  it('TAB23 (L2052–L2056): the 25 printed cells, prod level tokens, codes 1…5; locked (L2042); md_verified', () => {
    const t = tab23AsTable();
    expect(t.rows).toHaveLength(25);
    const cell = (w: string, s: string) => t.rows.find((r) => r.row_key === `${w}|${s}`)!.values;
    expect(['1', '2', '3', '4', '5'].map((s) => cell('A', s).risikoniveau_label)).toEqual(['Sehr niedrig', 'Sehr niedrig', 'Niedrig', 'Niedrig', 'Moderat']); // L2052
    expect(['1', '2', '3', '4', '5'].map((s) => cell('B', s).risikoniveau_label)).toEqual(['Sehr niedrig', 'Niedrig', 'Niedrig', 'Moderat', 'Hoch']);         // L2053
    expect(['1', '2', '3', '4', '5'].map((s) => cell('C', s).risikoniveau_label)).toEqual(['Niedrig', 'Niedrig', 'Moderat', 'Hoch', 'Hoch']);                 // L2054
    expect(['1', '2', '3', '4', '5'].map((s) => cell('D', s).risikoniveau_label)).toEqual(['Niedrig', 'Moderat', 'Hoch', 'Hoch', 'Sehr hoch']);               // L2055
    expect(['1', '2', '3', '4', '5'].map((s) => cell('E', s).risikoniveau_label)).toEqual(['Moderat', 'Hoch', 'Hoch', 'Sehr hoch', 'Sehr hoch']);             // L2056
    expect(cell('D', '4')).toEqual({ risikoniveau: 'hoch', risikoniveau_label: 'Hoch', risikoniveau_code: 4 });
    expect(cell('A', '1')).toEqual({ risikoniveau: 'sehr_niedrig', risikoniveau_label: 'Sehr niedrig', risikoniveau_code: 1 });
    expect(new Set(t.rows.map((r) => r.values.risikoniveau))).toEqual(new Set(RISIKONIVEAU_TOKENS));
    expect(t.override_quote).toBe('Risikoniveau $=$ Eintrittswahrscheinlichkeit × Schadensausmaß'); // L2042
    expect(t.verification_status).toBe('md_verified');
    expect(WAHRSCHEINLICHKEIT_LABELS).toEqual({ A: 'A – Selten', B: 'B – Unwahrscheinlich', C: 'C – Möglich', D: 'D – Wahrscheinlich', E: 'E – Sehr gewiss' }); // L2017–L2021
    expect(SCHADENSAUSMASS_LABELS).toEqual({ '1': '1 – Nicht signifikant', '2': '2 – Niedrig', '3': '3 – Moderat', '4': '4 – Ernst', '5': '5 – Katastrophal' }); // L2031–L2035
    expect(makeTableLookup(STD)('TAB23', ['C', '3'])?.risikoniveau_code).toBe(3);
  });

  it('TAB27 (L2383–L2386): frequencies as printed; class-C E. coli, C/D Trübung, D Legionella and D Enterokokken NOT seeded (null, U-2); locked; imported_unverified', () => {
    const t = tab27AsTable();
    const v = (c: string) => t.rows.map((r) => r.values[c]);
    const RL = 'Gemäß Richtlinie 91/271/EWG (Anhang I Abschnitt D)';
    expect(v('e_coli')).toEqual(['1x pro Woche', '1x pro Woche', '1x pro Woche', null, null, '2x pro Monat']);
    expect(v('enterokokken')).toEqual(['1x pro Woche', '1x pro Woche', '1x pro Woche', '2x pro Monat', '2x pro Monat', null]);
    expect(v('bsb5')).toEqual(['1x pro Woche', RL, RL, RL, RL, RL]);
    expect(v('afs')).toEqual(['1x pro Woche', RL, RL, RL, RL, RL]);
    expect(v('truebung')).toEqual(['konti-nuierlich', 'konti-nuierlich', 'konti-nuierlich', null, null, null]);
    expect(v('legionella')).toEqual(['2x pro Monat', '2x pro Monat', '2x pro Monat', '2x pro Monat', '2x pro Monat', null]);
    expect(new Set(v('nematoden'))).toEqual(new Set(['2x pro Monat oder wie vom Betreiber der Aufbereitungseinrichtung nach Anzahl der Eier festgelegt wird, die sich in dem in die Aufberei-tungseinrichtung einlaufenden Abwasser befinden']));
    expect(t.rows[3].verbatim_quote).toBe(String.raw`\hline & & 2x pro Monat & & & \multirow{2}{*}{} & & \\`); // L2385 — the E. coli cell is empty
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Mindesthäufigkeit der Routineüberwachung');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TAB19 (L1967–L1976): 9 + 5 substances, Gabapentin (*) note kept, PFAS-20 < 100 ng/l as text and number; anhaltswert; md_verified', () => {
    const t = tab19AsTable();
    expect(t.rows.map((r) => r.label_de)).toEqual(['Kategorie 1: einfach entfernbar', 'Kategorie 2: moderat entfernbar', 'Kategorie 3: Vorsorgescreening']);
    expect(t.rows[0].values.substanzen).toBe('Amisulprid, Carbamazepin, Citalopram, Clarithromycin, Diclofenac, Hydrochlorothiazid, Metoprolol, Venlafaxin, Valsartansäure');
    expect(t.rows[1].values.substanzen).toBe(String.raw`Benzotriazol, 4- und 5-Methylbenzotriazol, Gabapentin ${'$'}{ }^{(*)}$, Candesartan, Irbesartan`);
    expect(t.rows.map((r) => r.values.anzahl)).toEqual([9, 5, 0]);
    expect(t.rows[2].values).toMatchObject({ grenzwert_text: 'Summe PFAS-20<100 ng/l', grenzwert_ng_l: 100 });
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('md_verified');
    expect(makeTableLookup(STD)('TAB19', ['3'])?.grenzwert_ng_l).toBe(100);
  });

  it('TAB18 (L1891–L1899): nine Schutzgut rows parsed from the printed lines; O keyed by letter while the transcript prints "0" (U-4); B and K fixed "hoch"; anhaltswert; imported_unverified', () => {
    const t = tab18AsTable();
    expect(t.rows.map((r) => r.values.schutzgut)).toEqual(['Mensch', 'Mensch', 'Mensch', 'Boden', 'Nutztiere', 'angebaute Kulturen', 'Grundwasser', 'Oberflächenwasser', 'Schutzgebiet']);
    expect(t.rows.map((r) => r.values.bewertung_fest)).toEqual([null, null, null, 'hoch', null, 'hoch', null, null, null]);
    expect(t.rows[7].values.code_printed).toBe('0');
    expect(t.rows[7].keys.schutzgut_code).toBe('O');
    expect(t.rows[0].values.expositionsweg).toBe('Wasser - PflanzeMensch');
    expect(t.rows[2].values.darstellung).toBe('(Nur relevant bei TW-Schutzgebieten)');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('imported_unverified');
  });
});
