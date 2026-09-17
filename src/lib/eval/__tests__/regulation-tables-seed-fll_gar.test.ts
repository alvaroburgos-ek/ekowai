/**
 * Plan 3 Task 7 — FLL-GAR-2023 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * `Desktop\Supabase data\Guidelines knowledge markdown\FLL-Gewässerabdichtungs-
 * richtlinien.md` in this session (line in the comment), and the two tables kept
 * `imported_unverified` (fll_gar-U-1: Tab. 26 column alignment left to the PDF;
 * fll_gar-U-4: the empty Tab.-28 cells of the printed row "0").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fllGarSeedTables, FLL_GAR_EDITION, ABDICHTUNGS_ART_TOKENS, MATERIAL_WORKSHEET, ANWENDUNGSFALL_CONCRETE_TOKENS, BAUTEIL_TOKENS, AUSFUEHRUNG_TOKENS, BENTONIT_TOKENS, AUFLAST_FUNKTION_TOKENS,
  W_KLASSE_TOKENS, R_KLASSE_TOKENS, S_KLASSE_TOKENS, FUEGEVERFAHREN_TOKENS, BAHN_MATERIAL_TOKENS, PE_BEANSPRUCHUNG_TOKENS, ABSCHLUSS_ANWENDUNGSFALL_TOKENS, BAUGRUND_KLASSE_TOKENS, SWK_TOKENS, MISCHGUTART_TOKENS, MINERAL_TYP_TOKENS,
  tab1AsTable, tab1AsphaltAsTable, tab4AsTable, tab5AsTable, tab6AsTable, tab7AsTable, tab8AsTable, tab12AsTable, tab13AsTable, tab16AsTable, tab18WAsTable, tab18RAsTable, tab18SAsTable,
  tab22AsTable, tab22UeberlappungAsTable, tab24AsTable, tab25AsTable, tab26AsTable, tab27AsTable, tab28AsTable, tab26Heads, slope, norm, deMd,
  Q_T1_10, Q_T8_W, Q_T12_2, Q_T22_HL, Q_T26_3, Q_T28_0, Q_L7, Q_L133,
} from '../regulation-tables-seed-fll_gar';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'FLL-GAR-2023';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/fll_gar.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);
const table = makeTableLookup(STD);
const row = (t: RegulationTable, key: string) => { const r = t.rows.find((x) => x.row_key === key); if (!r) throw new Error(`${t.table_code} ${key}`); return r; };

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
  expect(t.edition).toBe(FLL_GAR_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
}

describe('FLL-GAR-2023 Plan-3 seed tables', () => {
  it('twenty tables in the live set; registered as SEED_BUILDERS.fll_gar (ts 20260917100700); edition 2023-12 (L7 "Ausgabe 2023", L133 "Dezember 2023"); the fallback resolves each', () => {
    const tables = fllGarSeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB1', 'TAB1_ASPHALT', 'TAB4', 'TAB5', 'TAB6', 'TAB7', 'TAB8', 'TAB12', 'TAB13', 'TAB16', 'TAB18_W', 'TAB18_R', 'TAB18_S', 'TAB22', 'TAB22_UEBERLAPPUNG', 'TAB24', 'TAB25', 'TAB26', 'TAB27', 'TAB28']);
    for (const t of tables) expectWellFormed(t);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(8 + 3 + 2 + 1 + 2 + 5 + 8 + 3 + 2 + 4 + 3 + 4 + 2 + 12 + 2 + 7 + 4 + 20 + 3 + 12);
    expect(FLL_GAR_EDITION).toBe('2023-12');
    expect(norm(Q_L7)).toBe('Ausgabe 2023');
    expect(norm(Q_L133)).toContain('Dezember 2023');
    expect(SEED_BUILDERS.fll_gar).toEqual({ build: fllGarSeedTables, ts: '20260917100700', slugFile: 'fll_gar' });
    expect(liveSeedSlugs()).toContain('fll_gar');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length, t.table_code).toBe(t.rows.length);
    const status = Object.fromEntries(tables.map((t) => [t.table_code, t.verification_status]));
    expect(Object.entries(status).filter(([, s]) => s !== 'md_verified').map(([c]) => c)).toEqual(['TAB26', 'TAB28']);
  });

  it('G-A3: every prod-driven table keys on the captured enum value strings; boolean-keyed tables use String(boolean); TAB1 covers 8 of the 12 abdichtungs_art tokens (E-1)', () => {
    expect([...ABDICHTUNGS_ART_TOKENS]).toEqual(enumValues('FLL-GAR-09 abdichtungs_art'));
    expect(Object.keys(MATERIAL_WORKSHEET)).toEqual([...ABDICHTUNGS_ART_TOKENS]);
    expect(new Set(Object.values(MATERIAL_WORKSHEET)).size).toBe(12);
    expect(tab1AsTable().rows.map((r) => r.keys.abdichtungs_art)).toEqual(['mineralisch_ohne_zusatzstoffe', 'mineralisch_mit_zusatzstoffen', 'mineralisch_hydraulisch', 'verbundwerkstoff_gtd', 'bahn_bitumen', 'bahn_kunststoff_elastomer', 'fluessigkunststoff', 'bahn_pe']);
    expect(ABDICHTUNGS_ART_TOKENS.filter((t) => !tab1AsTable().rows.some((r) => r.keys.abdichtungs_art === t))).toEqual(['mineralisch_bitumen', 'stahl', 'alkalisilikat', 'gup']); // E-1
    expect(tab1AsphaltAsTable().rows.map((r) => r.keys.mischgutart)).toEqual([...MISCHGUTART_TOKENS]);
    expect(tab12AsTable().rows.map((r) => r.keys.mischgutart)).toEqual([...MISCHGUTART_TOKENS]);
    expect(tab4AsTable().rows.map((r) => r.keys.mineral_typ)).toEqual([...MINERAL_TYP_TOKENS]);
    expect([...ANWENDUNGSFALL_CONCRETE_TOKENS]).toEqual(enumValues('FLL-GAR-12 anwendungsfall_concrete'));
    expect(tab7AsTable().rows.map((r) => r.keys.anwendungsfall)).toEqual([...ANWENDUNGSFALL_CONCRETE_TOKENS]);
    expect([...BAUTEIL_TOKENS]).toEqual(enumValues('FLL-GAR-12 bauteil_type'));
    expect([...AUSFUEHRUNG_TOKENS]).toEqual(enumValues('FLL-GAR-12 beton_ausfuehrungsart'));
    expect(tab8AsTable().rows.map((r) => `${r.keys.bauteil}|${r.keys.ausfuehrung}`)).toEqual(BAUTEIL_TOKENS.flatMap((b) => AUSFUEHRUNG_TOKENS.map((a) => `${b}|${a}`)));
    expect([...BENTONIT_TOKENS]).toEqual(enumValues('FLL-GAR-14 bentonit_type'));
    expect(tab13AsTable().rows.map((r) => r.keys.bentonit_typ)).toEqual([...BENTONIT_TOKENS]);
    expect([...AUFLAST_FUNKTION_TOKENS]).toEqual(enumValues('FLL-GAR-14 gtd_auflast_funktion'));
    expect(prior['FLL-GAR-14 gtd_polyolefin_beschichtung'].data_type).toBe('boolean');
    expect(tab16AsTable().rows.map((r) => `${r.keys.beschichtung}|${r.keys.funktion}`)).toEqual(['false|quellgegendruck', 'false|austrocknung_frost', 'true|quellgegendruck', 'true|austrocknung_frost']);
    expect([...W_KLASSE_TOKENS]).toEqual(enumValues('FLL-GAR-05 wassereinwirkungsklasse'));
    expect([...R_KLASSE_TOKENS]).toEqual(enumValues('FLL-GAR-05 rissklasse'));
    expect([...S_KLASSE_TOKENS]).toEqual(enumValues('FLL-GAR-05 standortklasse'));
    expect(tab18WAsTable().rows.map((r) => r.keys.klasse)).toEqual([...W_KLASSE_TOKENS]);
    expect(tab18RAsTable().rows.map((r) => r.keys.klasse)).toEqual([...R_KLASSE_TOKENS]);
    expect(tab18SAsTable().rows.map((r) => r.keys.klasse)).toEqual([...S_KLASSE_TOKENS]);
    expect([...FUEGEVERFAHREN_TOKENS]).toEqual(enumValues('FLL-GAR-16 fuegeverfahren'));
    expect([...BAHN_MATERIAL_TOKENS]).toEqual(enumValues('FLL-GAR-16 bahn_material_naht'));
    expect(new Set(tab22AsTable().rows.map((r) => r.keys.material))).toEqual(new Set(BAHN_MATERIAL_TOKENS));
    expect(new Set(tab22AsTable().rows.map((r) => r.keys.fuegeverfahren))).toEqual(new Set(FUEGEVERFAHREN_TOKENS));
    expect(prior['FLL-GAR-16 polymerbitumen_beschichtung'].data_type).toBe('boolean');
    expect(tab22UeberlappungAsTable().rows.map((r) => r.keys.polymerbitumen)).toEqual(['false', 'true']);
    expect([...PE_BEANSPRUCHUNG_TOKENS]).toEqual(enumValues('FLL-GAR-18 pe_beanspruchung_klasse'));
    expect(tab25AsTable().rows.map((r) => r.keys.beanspruchung)).toEqual([...PE_BEANSPRUCHUNG_TOKENS]);
    expect([...ABSCHLUSS_ANWENDUNGSFALL_TOKENS]).toEqual(enumValues('FLL-GAR-23 abschluss_anwendungsfall'));
    expect(tab28AsTable().rows.map((r) => r.keys.anwendungsfall).slice(0, 3)).toEqual([...ABSCHLUSS_ANWENDUNGSFALL_TOKENS]);
    expect(tab26AsTable().rows.map((r) => r.keys.baugrund)).toEqual(BAUGRUND_KLASSE_TOKENS);
    expect(BAUGRUND_KLASSE_TOKENS).toHaveLength(20);
    expect(tab27AsTable().rows.map((r) => r.keys.swk)).toEqual([...SWK_TOKENS]);
  });

  it('TAB1 / TAB1_ASPHALT (L1398–L1410): the printed "≤ 1:m ≤ p %" pairs — 1:3/33, 1:2/50, 1:3/33, 1:5/20, 1:2/50, 1:3/33, 1:3/33, 1:1,5/66, 1:1/100, 1:1,5/66; m is a minimum (flatter = larger m)', () => {
    const v = (k: string) => { const r = row(tab1AsTable(), k); return [r.values.neigung_max_1m, r.values.gefaelle_max_pct, r.label_de]; };
    expect(v('mineralisch_ohne_zusatzstoffe')).toEqual([3, 33, 'rohe oder homogenisierte Grubentone/Lehm, vakuumverpresste Grubentone']); // L1398–L1399
    expect(v('mineralisch_mit_zusatzstoffen')).toEqual([3, 33, 'mit Bentonit/Tonmehl/Kunststoff vergütete Böden']);                    // L1400–L1401
    expect(v('mineralisch_hydraulisch')).toEqual([2, 50, 'Ortbeton (ohne Schalung)']);                                                // L1402
    expect(v('verbundwerkstoff_gtd')).toEqual([3, 33, 'Geosynthetische Tondichtungsbahnen (GTD)']);                                   // L1406
    expect(v('bahn_bitumen')).toEqual([3, 33, 'Bitumenbahnen']);                                                                       // L1407
    expect(v('bahn_kunststoff_elastomer')).toEqual([1.5, 66, 'Kunststoff- und Elastomerbahnen']);                                      // L1408
    expect(v('fluessigkunststoff')).toEqual([1, 100, 'Abdichtungen mit Flüssigkunststoffen']);                                        // L1409
    expect(v('bahn_pe')).toEqual([1.5, 66, 'Kunststoffbahnen aus PEHD']);                                                              // L1410 (J-7: printed for PEHD)
    const a = (k: string) => { const r = row(tab1AsphaltAsTable(), k); return [r.values.neigung_max_1m, r.values.gefaelle_max_pct]; };
    expect(a('asphaltmastix')).toEqual([3, 33]); expect(a('gussasphalt')).toEqual([5, 20]); expect(a('asphaltbeton')).toEqual([2, 50]); // L1403–L1405
    expect(slope(Q_T1_10)).toEqual({ m: 1.5, pct: 66 });
    expect(tab1AsTable().override_policy).toBe('anhaltswert');
    expect(tab1AsTable().override_quote).toContain('Die angegebenen Werte sind Richtwerte'); // L1391
    expect(tab1AsTable().override_quote).toContain('rechnerischen Überprüfung der Stand- und Gleitsicherheit'); // L1383–L1384
    expect(table('TAB1', ['bahn_kunststoff_elastomer'])?.neigung_max_1m).toBe(1.5);
  });

  it('TAB4 / TAB5 (L1931–L1953 / L2231–L2248): ≥ 30 cm in 2 Lagen 15–20 cm + Auflast ≥ 30 cm; industriell ≥ 10 / ≥ 20 cm; 10 % deviation cue', () => {
    const n = row(tab4AsTable(), 'natuerlich').values, i = row(tab4AsTable(), 'industriell').values, v = row(tab5AsTable(), 'verguetet').values;
    expect([n.abdichtung_min_cm, n.lagen_min, n.lage_min_cm, n.lage_max_cm, n.auflast_min_cm, n.eignungspruefung]).toEqual([30, 2, 15, 20, 30, true]); // L1937–L1944
    expect([i.abdichtung_min_cm, i.lagen_min, i.lage_min_cm, i.lage_max_cm, i.auflast_min_cm, i.eignungspruefung]).toEqual([10, null, null, null, 20, false]); // L1951
    expect([v.abdichtung_min_cm, v.lagen_min, v.lage_min_cm, v.lage_max_cm, v.auflast_min_cm]).toEqual([30, 2, 15, 20, 30]); // L2238–L2246
    expect(tab4AsTable().override_quote).toContain('Abweichungen von 10% der vorgegebenen Schichtdicken sind zulässig.'); // L1953
    expect(tab5AsTable().override_quote).toContain('Abweichungen von 10% der vorgegebenen Schichtdicken sind zulässig.'); // L2248
  });

  it('TAB6 / TAB7 / TAB8 (L2437–L2440 / L2523–L2556 / L2578–L2579): the concrete track', () => {
    expect(row(tab6AsTable(), 'le40').values).toMatchObject({ wz_max: 0.6, zement_min_kg_m3: 280, fck_min: 'C25/30' }); // L2437–L2439
    expect(row(tab6AsTable(), 'gt40').values).toMatchObject({ wz_max: 0.7, zement_min_kg_m3: null, fck_min: null });     // L2440
    const t7 = (k: string) => { const v = row(tab7AsTable(), k).values; return [v.festigkeitsklasse, v.festigkeit_wechselzone, v.expositionsklassen, v.feuchtigkeitsklasse, v.c_nom_mm]; };
    expect(t7('wasserbecken_teich')).toEqual(['C25/30', 'C35/45', 'XC4, XF1 (3) 1', 'WF', 40]);                    // L2523–L2524
    expect(t7('bachlauf')).toEqual(['C25/30', 'C35/45', 'XC4, XF1 (3) 1', 'WF', 40]);                              // L2525–L2526
    expect(t7('schwimmbecken_bade')).toEqual(['C25/30', 'C35/45', 'XC4, XF1 (3) 1', 'WF', 40]);                    // L2534
    expect(t7('schwimmbecken_sole')).toEqual(['C35/45', null, 'XC4, XF2, XD2, XS2 (3) je nach Salzgehalt', 'WA', 55]); // L2542–L2548
    expect(t7('pflanzenklaeranlage')).toEqual(['C35/45', null, 'XC4, XF3, XA1', 'WA', 40]);                       // L2556
    const t8 = (k: string) => { const v = row(tab8AsTable(), k).values; return [v.dicke_min_mm, v.fussnote]; };
    expect(norm(Q_T8_W)).toBe('3 Wände ≥ 240 ≥ 240 1 ≥ 200 ≥ 240 2'); // L2578
    expect(t8('waende|ortbeton')).toEqual([240, null]); expect(t8('waende|elementwand')).toEqual([240, '1']); expect(t8('waende|fertigteil')).toEqual([200, null]); expect(t8('waende|spritzbeton')).toEqual([240, '2']);
    expect(t8('bodenplatte|ortbeton')).toEqual([250, null]); expect(t8('bodenplatte|elementwand')).toEqual([null, null]); expect(t8('bodenplatte|fertigteil')).toEqual([200, null]); expect(t8('bodenplatte|spritzbeton')).toEqual([250, '2']); // L2579
    expect(table('TAB8', ['bodenplatte', 'ortbeton'])?.dicke_min_mm).toBe(250);
    expect(tab6AsTable().override_policy).toBe('locked'); expect(tab7AsTable().override_policy).toBe('locked'); expect(tab8AsTable().override_policy).toBe('locked');
  });

  it('TAB12 (L2920–L2925): Asphaltmastix 7/15/10 mm; Gussasphalt 25/40² mm; wasserdichter Asphaltbeton 40¹ mm with Hohlraumgehalt ≤ 3 Vol.-%', () => {
    expect(norm(Q_T12_2)).toBe('2 Asphaltmastix 7 mm 15 mm 10 mm');
    const v = (k: string) => { const r = row(tab12AsTable(), k).values; return [r.dicke_min_mm, r.dicke_max_mm, r.dicke_mittel_mm, r.hohlraum_max_pct, r.einlagig, r.fussnote]; };
    expect(v('asphaltmastix')).toEqual([7, 15, 10, null, false, null]);
    expect(v('gussasphalt')).toEqual([25, 40, null, null, true, '2']);
    expect(v('asphaltbeton')).toEqual([40, null, null, 3, false, '1']);
    expect(row(tab12AsTable(), 'asphaltbeton').label_de).toBe('wasserdichter Asphaltbeton');
  });

  it('TAB13 / TAB16 (L3124–L3128 / L3288–L3316): bentonite minima per Na/Ca; Auflast 0,30 / 0,60 m per coating × function (J-4)', () => {
    expect(row(tab13AsTable(), 'Na').values).toEqual({ mclay_min_g_m2: 3600, wassergehalt_max_pct: 15, quellvermoegen_min_ml: 24, montmorillonit_min_mg_g: 300 });
    expect(row(tab13AsTable(), 'Ca').values).toEqual({ mclay_min_g_m2: 8000, wassergehalt_max_pct: 15, quellvermoegen_min_ml: 8, montmorillonit_min_mg_g: 300 });
    const a = (k: string) => row(tab16AsTable(), k).values.auflast_min_m;
    expect([a('false|quellgegendruck'), a('false|austrocknung_frost'), a('true|quellgegendruck'), a('true|austrocknung_frost')]).toEqual([0.3, 0.6, 0.3, 0.6]);
    expect(row(tab16AsTable(), 'true|austrocknung_frost').label_de).toBe('Überdeckung für ausreichenden Schutz vor Frosteinwirkung'); // L3314–L3316 — the coated column prints Frost alone
    expect(row(tab16AsTable(), 'true|quellgegendruck').label_de).toContain('sowie für ausreichenden Schutz vor Austrocknung');         // L3310–L3311
    expect(tab16AsTable().override_policy).toBe('anhaltswert');
  });

  it('TAB18_W / _R / _S (L3673–L3696): ≤ 5 / ≤ 10 / > 10 m; R1–R3 0,2 / 0,5 / 1,0 mm (+ Versatz 0,5); the two Standort descriptions', () => {
    expect(tab18WAsTable().rows.map((r) => [r.values.fuellhoehe_max_m, r.values.fuellhoehe_gt_m])).toEqual([[5, null], [10, null], [null, 10]]);
    expect(tab18RAsTable().rows.map((r) => [r.values.rissbreite_max_mm, r.values.rissversatz_max_mm])).toEqual([[null, null], [0.2, null], [0.5, null], [1, 0.5]]);
    expect(row(tab18RAsTable(), 'R0-B').values.beschreibung).toBe('keine Rissbreitenveränderung bzw. Neurissbildung');
    expect(row(tab18SAsTable(), 'S1-B').values.mit_bauwerk_verbunden).toBe(false);
    expect(row(tab18SAsTable(), 'S2-B').values.beschreibung).toContain('sowie Behälter im Innenbereich');
  });

  it('TAB22 / TAB22_UEBERLAPPUNG (L4109–L4135 / L4098–L4100): widths zipped by position; overlap 40 / 60 mm', () => {
    const w = (k: string) => row(tab22AsTable(), k).values.nahtbreite_min_mm;
    expect([w('quellschweissen|EVA'), w('quellschweissen|PIB'), w('quellschweissen|PVC-P')]).toEqual([30, 30, 30]);
    expect(['ECB', 'EVA', 'PIB', 'FPO', 'PVC-P', 'TPE', 'EPDM'].map((m) => w(`heissluft_heizkeil|${m}`))).toEqual([20, 20, 20, 20, 20, 20, 30]);
    expect(w('heissvulkanisation|EPDM')).toBe(20);
    expect(w('heissluft_pbs|EPDM_PBS')).toBe(40);
    expect(Q_T22_HL.split('\n').map((l) => l.trim()).filter((l) => /^\d+$/.test(l)).map(Number)).toEqual([3, 20, 20, 20, 20, 20, 20, 30]); // the row number 3 + seven widths in print order
    expect(tab22AsTable().rows).toHaveLength(12);
    expect(table('TAB22', ['heissluft_heizkeil', 'EPDM'])?.nahtbreite_min_mm).toBe(30);
    expect(tab22UeberlappungAsTable().rows.map((r) => r.values.ueberlappung_min_mm)).toEqual([40, 60]);
  });

  it('TAB24 / TAB25 (L4471–L4498 / L4539–L4599): PEHD properties; Nenndicke per Beanspruchung and material', () => {
    const p = (k: string) => { const v = row(tab24AsTable(), k).values; return [v.min, v.min_strict, v.max, v.unit, v.norm]; };
    expect(p('dichte')).toEqual([0.94, true, null, 'g/cm3', 'DIN EN ISO 1183']);
    expect(p('mfr')).toEqual([1, false, 3, 'g/10 min', 'DIN EN ISO 1133']);
    expect(p('russgehalt')).toEqual([2, false, 3, '%', 'ASTM D 1603 ASTM D 4218']);
    expect(p('russverteilung')).toEqual([2, false, 3, 'Kategorie', 'ASTM D 5596']);
    expect(p('massaenderung')).toEqual([null, false, 2, '%', 'DIN EN 1107-2']);
    expect(p('nctl')).toEqual([500, true, null, 'h', 'ASTM D 5397 app.']);
    expect(p('oit')).toEqual([100, true, null, 'min (bei 200 °C)', 'DIN EN ISO 11357-6']);
    const d = (k: string) => { const v = row(tab25AsTable(), k).values; return [v.peld_min_mm, v.pehd_min_mm]; };
    expect([d('gering'), d('mittel'), d('hoch'), d('freiliegend')]).toEqual([[0.8, null], [1.5, 1], [null, 2], [null, 2.5]]);
    expect(row(tab25AsTable(), 'mittel').values.beispiele).toBe('öffentliche Zierteiche, Bachläufe');
    expect(row(tab25AsTable(), 'freiliegend').values.beispiele).toBe('Regenrückhaltebecken, Beschneiungsteiche');
    expect(tab25AsTable().override_policy).toBe('anhaltswert');
    expect(tab25AsTable().override_quote).toContain('obliegt dem Objektplanenden'); // L4534
  });

  it('TAB26 (L5384–L5389): five cells per printed row in head order; a group row seeded once per DIN 18196 class; imported_unverified (U-1)', () => {
    expect(norm(Q_T26_3)).toBe('3 GE, GW, GI 10 - - - x');
    const v = (k: string) => { const r = row(tab26AsTable(), k).values; return [r.sand_min_cm, r.vlies_ok, r.bautenschutzmatte_ok, r.kunststoffbahn_ok, r.beton_ok, r.schutzlage_erforderlich]; };
    expect(v('GE')).toEqual([10, false, false, false, true, true]);   // L5384
    expect(v('SW')).toEqual([null, false, false, false, false, false]); // L5385
    expect(v('GU*')).toEqual([10, false, false, false, true, true]);  // L5386
    expect(v('ST')).toEqual([5, false, true, true, true, true]);      // L5387
    expect(v('UA')).toEqual([5, true, true, true, true, true]);       // L5388
    expect(v('TL')).toEqual([5, true, true, true, true, true]);       // L5389
    expect(row(tab26AsTable(), 'GE').verbatim_quote).toBe(row(tab26AsTable(), 'GI').verbatim_quote);
    expect(row(tab26AsTable(), 'SE').values.werkstoffe_text).toBeNull();
    expect(row(tab26AsTable(), 'UL').values.werkstoffe_text).toContain('Vliesstoffe bzw. Geo- textilien ≥ 300 g/m2, GRK 5');
    expect(tab26Heads().werkstoffe[1]).toBe('Bautenschutz- matten und -platten aus Gummi- oder Polyethylen- granulat > 6 mm');
    expect(tab26AsTable().verification_status).toBe('imported_unverified');
    expect(deMd('GU\\* \\- \\> \\= 24\\.')).toBe('GU* - > = 24.');
  });

  it('TAB27 / TAB28 (L5430–L5456 / L5744–L5748): SWK 8,2 / 17,1 / 43,7 kN → 300 / 500 / 800 g; Tab. 28 cells X / (X) / -¹, the row "0" prints one cell (U-4)', () => {
    expect(tab27AsTable().rows.map((r) => [r.values.belastung_kn, r.values.flaechengewicht_min_g_m2, r.values.fahrzeug_max_t])).toEqual([[8.2, 300, null], [17.1, 500, 2.5], [43.7, 800, 16]]);
    const z = (k: string) => row(tab28AsTable(), k).values.zulaessig;
    expect([z('ge15|bauteil_bauwerk'), z('ge15|freiflaeche'), z('ge15|schwimmteich')]).toEqual(['x_bedingt', 'x', 'x']);   // L5744
    expect([z('ge10|bauteil_bauwerk'), z('ge10|freiflaeche'), z('ge10|schwimmteich')]).toEqual(['sonder', 'x', 'x']);      // L5745
    expect([z('ge5|bauteil_bauwerk'), z('ge5|freiflaeche'), z('ge5|schwimmteich')]).toEqual(['sonder', 'x', 'sonder']);    // L5746
    expect(norm(Q_T28_0)).toBe('5 0 - 1');
    expect([z('zero|bauteil_bauwerk'), z('zero|freiflaeche'), z('zero|schwimmteich')]).toEqual(['sonder', null, null]);   // L5747 — U-4
    expect(tab28AsTable().rows.every((r) => r.values.zulaessig !== 'nein')).toBe(true); // nothing prints "nicht zugelassen"
    expect(tab28AsTable().verification_status).toBe('imported_unverified');
    expect(table('TAB28', ['ge15', 'bauteil_bauwerk'])?.zulaessig).toBe('x_bedingt');
  });
});
