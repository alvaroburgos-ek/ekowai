import { describe, it, expect } from 'vitest';
import {
  tab9AsTable, tab5AsTable, tab6AsTable, tab7AsTable, tab8AsTable, tab11AsTable, tab13AsTable, tab14AsTable, s642QvsAsTable,
  a138SeedTables, a138Plan1SeedTables, tab9AsTablePlan1, tab5AsTablePlan1, tab6AsTablePlan1, tab13AsTablePlan1,
  TAB5_BK_TOKENS, TAB11_METHODS, TAB8_SCHUTZKATEGORIE, S6_4_2_SCHUETTMATERIAL,
} from '../regulation-tables-seed-a138';
import { getTab9Entries } from '../tab9';
import { FLAECHENGRUPPE_CODES, flaechengruppeToTier, tab6Limit } from '../tab6-loading';
import { computeSoilEstimate } from '../asm-source';
import type { RegulationTable } from '../regulation-tables';

/** Same full-precision de-DE formatter as the Plan-1 implementation (0.9 → "0,9", 0.25 → "0,25"). */
const de = (n: number): string => String(n).replace('.', ',');
const STD = 'DWA-A-138-1';

/** Row keys unique; every row_key equals its keys joined in key_columns order; verbatim_quote non-empty. */
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
  expect(t.edition).toBe('2024-10');
}

describe('A138 Plan-1 builders stay FROZEN (they reproduce the Plan-1 migration and the Plan-3 rollback)', () => {
  it('a138Plan1SeedTables(): TAB9, TAB5, TAB6, TAB13 with the synthesised quotes and imported_unverified', () => {
    const tables = a138Plan1SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB9', 'TAB5', 'TAB6', 'TAB13']);
    for (const t of tables) expect(t.verification_status).toBe('imported_unverified');
    expect(tab9AsTablePlan1().rows[0].verbatim_quote).toMatch(/^Tab\. 9: /);
    expect(tab5AsTablePlan1().rows[0].verbatim_quote).toBe('Tab. 5 Kurzzeichen D');
    expect(tab6AsTablePlan1().rows.map((r) => r.row_key)).toEqual(['tier2|thin', 'tier2|thick', 'tier3|thin', 'tier3|thick']);
    expect(tab6AsTablePlan1().value_columns.map((c) => c.name)).toEqual(['max']);
    expect(tab13AsTablePlan1().rows.map((r) => r.label_de)).toEqual(['Mittel-/Feinsand', 'schluffig']);
  });
});

describe('A138 Plan-3 seed tables — value-parity pins against the TS constants', () => {
  it('TAB9: 30 printed rows (L1253–1306), values deep-equal getTab9Entries(); each lifted quote carries the printed C_m / C_s pair', () => {
    const t = tab9AsTable();
    expect(t.rows).toHaveLength(30); // 30 value rows printed in Tab. 9 (L1253–1258, L1269–1272, L1274–1279, L1281–1289, L1300–1302, L1304–1306)
    expectWellFormed(t);
    // a138-U-1 pin: any difference between the seeded values and tab9.ts is a STOP, never a silent re-derivation.
    expect(t.rows.map((r) => [r.row_key, r.values.cm, r.values.cs, r.values.kind, r.values.group]))
      .toEqual(getTab9Entries().map((e) => [e.value, e.cm, e.cs, e.kind, e.group]));
    for (const e of getTab9Entries()) {
      const r = t.rows.find((r) => r.row_key === e.value)!;
      expect(r.label_de).toBe(e.label);
      expect(r.verbatim_quote).not.toMatch(/^Tab\. 9: /); // lifted, no longer synthesised
      // Tab. 9 prints one decimal minimum ("1,0", "0,9") and keeps "0,25" at full precision.
      const printed = (n: number) => (Number.isInteger(n) ? `${n},0` : de(n));
      expect(r.verbatim_quote).toContain(`& ${printed(e.cm)} & ${printed(e.cs)} \\\\`);
    }
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('zum Beispiel gemäß Tabelle 9');
    // I-2 ruling still open (sign-off a138-O-1): stays imported_unverified.
    expect(t.verification_status).toBe('imported_unverified');
  });
  it('TAB9: verbundstein_sickerfuge quote states the full-precision cm 0,25 (not rounded to 0,3)', () => {
    const r = tab9AsTable().rows.find((r) => r.row_key === 'verbundstein_sickerfuge')!;
    expect(r.values.cm).toBe(0.25);
    expect(r.verbatim_quote).toContain('& 0,25 & 0,4');
  });
  it('TAB5: 19 Flächengruppe codes (L803–L863) → tier equals flaechengruppeToTier; bk tokens = prod belastungskategorie enum', () => {
    const t = tab5AsTable();
    expect(t.rows).toHaveLength(19);
    expectWellFormed(t);
    expect(t.rows.map((r) => r.row_key)).toEqual([...FLAECHENGRUPPE_CODES]);
    for (const c of FLAECHENGRUPPE_CODES) {
      const r = t.rows.find((r) => r.row_key === c)!;
      expect(r.values.tier).toBe(flaechengruppeToTier(c));
      expect(TAB5_BK_TOKENS).toContain(r.values.bk);
      expect(r.verbatim_quote).not.toMatch(/^Tab\. 5 Kurzzeichen/);
      // Every quote is the printed row that carries the Kurzzeichen (SV and SVW share the printed "SV bzw. SVW" row, L842).
      expect(r.verbatim_quote).toContain(c === 'SV' || c === 'SVW' ? '& SV bzw. SVW &' : `& ${c} &`);
    }
    // printed BK per row (L789 names I/II/III; multirow cells "।"/"1" = BK I, sign-off a138-U-5)
    const bk = Object.fromEntries(t.rows.map((r) => [r.row_key, r.values.bk]));
    expect(bk).toEqual({
      D: 'BK_I', VW1: 'BK_I', V1: 'BK_I', VW2: 'BK_II', V2: 'BK_II', V3: 'BK_III', BG1: 'BK_I', BF: 'BK_II', BL: 'BK_II', BG2: 'BK_II', BG3: 'BK_III',
      SD1: 'BK_II', SD2: 'BK_III', SV: 'BK_III', SVW: 'BK_III', SF: 'BK_III', SL: 'BK_III', SG: 'BK_III', SA: 'BK_III',
    });
    expect(t.value_columns.map((c) => c.name)).toEqual(['tier', 'bk']);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe('Von der Kategorisierung nach Tabelle 5 kann in begründeten Fällen abgewichen werden.');
    expect(t.verification_status).toBe('imported_unverified'); // two OCR-garbled BK cells (a138-U-5)
  });
  it('TAB6: 4 seeded rows (L920, L924) — max equals tab6Limit, n_m_max = 1 on every row, thickness labels are the printed heads', () => {
    const t = tab6AsTable();
    expect(t.rows).toHaveLength(4); // 2 printed limit rows × 2 printed thickness columns; (*)/empty/BG1 rows not seeded (a138-U-3)
    expectWellFormed(t);
    for (const tier of ['tier2', 'tier3'] as const) for (const [band, th] of [['thin', 0.2], ['thick', 0.3]] as const) {
      const lim = tab6Limit(tier, th);
      expect(lim.kind).toBe('limit');
      const r = t.rows.find((r) => r.row_key === `${tier}|${band}`)!;
      expect(r.values.max).toBe((lim as { max: number }).max);
      expect(r.values.n_m_max).toBe(1);
      expect(r.label_de).toContain(band === 'thin' ? '≥ 20 cm' : '≥ 30 cm');
      expect(r.verbatim_quote).toContain(`\\leqslant ${r.values.max}$`);
    }
    expect(t.value_columns.map((c) => c.name)).toEqual(['max', 'n_m_max']);
    expect(t.verification_status).toBe('md_verified');
  });
  it('TAB7: 3 printed value rows (L985, L1002, L1006) keyed by tier; (*) rows not seeded (a138-U-4)', () => {
    const t = tab7AsTable();
    expect(t.rows).toHaveLength(3);
    expectWellFormed(t);
    expect(Object.fromEntries(t.rows.map((r) => [r.row_key, [r.values.eta_afs63_min, r.values.eta_geloest_min]])))
      .toEqual({ tier1_none: [40, 50], tier2: [70, 65], tier3: [80, 75] });
    for (const r of t.rows) expect(r.verbatim_quote).toContain(`{${r.values.eta_afs63_min} \\%}`);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Kupfer und Zink');
    expect(t.verification_status).toBe('md_verified');
  });
  it('TAB8: 4 Schutzkategorien × 2 A_C bands = 8 rows (L1152–L1188); bounds as printed', () => {
    const t = tab8AsTable();
    expect(t.rows).toHaveLength(8);
    expectWellFormed(t);
    expect(TAB8_SCHUTZKATEGORIE.map((c) => c.value)).toEqual(['gering', 'maessig', 'stark', 'sehr_stark']);
    const v = Object.fromEntries(t.rows.map((r) => [r.row_key, [r.values.n_max, r.values.t_n_min, r.values.ueberflutung_n]]));
    expect(v).toEqual({
      'gering|le800': [0.33, null, 0.1], 'gering|gt800': [0.5, null, 0.1],
      'maessig|le800': [0.2, null, 0.05], 'maessig|gt800': [0.33, null, 0.05],
      'stark|le800': [0.2, 5, 0.033], 'stark|gt800': [0.2, 5, 0.033],
      'sehr_stark|le800': [0.1, 10, 0.02], 'sehr_stark|gt800': [0.1, 10, 0.02],
    });
    expect(t.rows.find((r) => r.row_key === 'gering|le800')!.verbatim_quote).toContain('( $\\leqslant 0,33 / a)$ & ( $\\leqslant 0,5 / \\mathrm{a}$ ) & (0,1/a)');
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });
  it('TAB11: 6 printed method rows (L1384–L1390) → f_Methode', () => {
    const t = tab11AsTable();
    expect(t.rows).toHaveLength(6);
    expectWellFormed(t);
    expect(t.rows.map((r) => [r.row_key, r.values.f_methode])).toEqual([
      ['feldversuch_grossflaechig', 1], ['feldversuch_kleine_testgrube', 0.9], ['doppelzylinder_infiltrometer', 0.9],
      ['open_end_test', 0.8], ['labor_ungestoert', 0.7], ['labor_gestoert_sieblinie', 0.1],
    ]);
    expect(TAB11_METHODS.map((m) => m.value)).toEqual(t.rows.map((r) => r.row_key));
    for (const r of t.rows) expect(r.verbatim_quote).toContain(`& ${de(r.values.f_methode as number)} \\\\`);
    expect(t.verification_status).toBe('md_verified');
  });
  it('TAB13: mittel_feinsand 0.10, schluffig 0.20 equals computeSoilEstimate; quotes lifted L1709/L1710', () => {
    const t = tab13AsTable();
    expect(t.rows).toHaveLength(2);
    expectWellFormed(t);
    expect(t.rows.find((r) => r.row_key === 'mittel_feinsand')!.values.factor).toBe(computeSoilEstimate(1, 'mittel_feinsand'));
    expect(t.rows.find((r) => r.row_key === 'schluffig')!.values.factor).toBe(computeSoilEstimate(1, 'schluffig'));
    expect(t.rows.map((r) => r.label_de)).toEqual(['Mittel-/Feinsand', 'schluffiger Sand, sandiger Schluff, Schluff']);
    expect(t.rows[0].verbatim_quote).toContain('Mittel-/Feinsand & 0,10');
    expect(t.rows[1].verbatim_quote).toContain('Schluff & 0,20');
    expect(t.verification_status).toBe('md_verified');
  });
  it('TAB14: 7 facility-type rows (the printed columns, L2252) keyed by the prod facility_type_selected tokens; "–" cells null', () => {
    const t = tab14AsTable();
    expect(t.rows).toHaveLength(7);
    expectWellFormed(t);
    expect(t.rows.map((r) => r.row_key)).toEqual(['flaeche', 'mulde', 'MRE', 'MRS', 'rigole', 'schacht', 'becken']);
    const v = Object.fromEntries(t.rows.map((r) => [r.row_key, r.values]));
    expect(v.flaeche).toEqual({ kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: 0, einstau_max_cm: 0, freibord_min_cm: null, boeschung_m_min: null, entleerung_max_h: null });
    expect(v.mulde).toEqual({ kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: null, boeschung_m_min: 1.5, entleerung_max_h: 84 });
    expect(v.MRE).toEqual({ kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: null, boeschung_m_min: 1.5, entleerung_max_h: 84 }); // Freibord cell printed empty (a138-U-6)
    expect(v.MRS).toEqual({ kf_min: null, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: 10, boeschung_m_min: 1.5, entleerung_max_h: 84 });
    expect(v.rigole).toEqual({ kf_min: 1e-6, bbz_min_cm: null, einstau_min_cm: null, einstau_max_cm: null, freibord_min_cm: null, boeschung_m_min: null, entleerung_max_h: null });
    expect(v.schacht).toEqual(v.rigole);
    expect(v.becken).toEqual({ kf_min: 1e-5, bbz_min_cm: 20, einstau_min_cm: 50, einstau_max_cm: null, freibord_min_cm: 35, boeschung_m_min: 1.5, entleerung_max_h: 84 });
    expect(new Set(t.rows.map((r) => r.verbatim_quote)).size).toBe(1); // one printed body for the transposed table
    expect(t.rows[0].verbatim_quote).toContain('Versickerungsfläche & Versickerungsmulde & Mulden-Rigolen-Element & Mulden-Rigolen-System & Rigole & Versickerungsschacht & Versickerungsbecken');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('imported_unverified'); // a138-U-6
  });
  it('S6_4_2_QVS: 2 printed rows (L1869, L1870) keyed by the proposed schuettmaterial enum; policy messwert', () => {
    const t = s642QvsAsTable();
    expect(t.rows).toHaveLength(2);
    expectWellFormed(t);
    expect(t.rows.map((r) => [r.row_key, r.values.q_vs])).toEqual([['kiessand', 0.2], ['kies', 5]]);
    expect(S6_4_2_SCHUETTMATERIAL.map((m) => m.value)).toEqual(['kiessand', 'kies']);
    expect(t.override_policy).toBe('messwert');
    expect(t.override_quote).toContain('Liegen keine Herstellerangaben');
    expect(t.verification_status).toBe('md_verified');
  });
  it('a138SeedTables(): nine tables, the Plan-1 four first in Plan-1 order, table codes unique', () => {
    const codes = a138SeedTables().map((t) => t.table_code);
    expect(codes).toEqual(['TAB9', 'TAB5', 'TAB6', 'TAB13', 'TAB7', 'TAB8', 'TAB11', 'TAB14', 'S6_4_2_QVS']);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('key-string equality (G-A3): TAB5 keys = flaechengruppe enum tokens, TAB14 keys = facility_type_selected tokens, TAB13 keys = soil_bodenart_tab13 tokens', () => {
    expect(tab5AsTable().rows.map((r) => r.keys.flaechengruppe)).toEqual([...FLAECHENGRUPPE_CODES]);
    expect(tab14AsTable().rows.map((r) => r.keys.facility_type)).toEqual(['flaeche', 'mulde', 'MRE', 'MRS', 'rigole', 'schacht', 'becken']);
    expect(tab13AsTable().rows.map((r) => r.keys.bodenart)).toEqual(['mittel_feinsand', 'schluffig']);
  });
});
