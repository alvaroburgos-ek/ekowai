/**
 * Plan 3 Task 18 — DWA-M-820-1 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * in this session (line in the comment), and the edition / policy cues.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tabD1AsTable, anhB23AsTable, s81036AsTable, s39VgvAsTable, anhB11AsTable, e141UmsatzAsTable, m8201SeedTables,
  TABD1_BANDS, ANHB23_ORGANISATIONEN, ANHB23_VERORDNUNG, ANHB23_GUELTIG_AB, S8_10_3_6_ROWS, S3_9_VGV_ROWS, E1_4_1_UMSATZ_ROWS, M820_1_EDITION,
} from '../regulation-tables-seed-m820_1';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-820-1';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/m820_1.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);

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
  expect(t.edition).toBe(M820_1_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
}

describe('DWA-M-820-1 Plan-3 seed tables', () => {
  it('six tables in the live set; registered as SEED_BUILDERS.m820_1 (ts 20260917101800); the fallback resolves each; edition 2020', () => {
    const tables = m8201SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABD1', 'ANHB23', 'S8_10_3_6', 'S3_9_VGV', 'ANHB11', 'E1_4_1_UMSATZ']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.m820_1).toEqual({ build: m8201SeedTables, ts: '20260917101800', slugFile: 'm820_1' });
    expect(liveSeedSlugs()).toContain('m820_1');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(M820_1_EDITION).toBe('2020'); // title page L9 "März 2020", imprint L48 "© DWA, 1. Auflage, Hennef 2020" = prod standards.version 'März 2020'
    // every displayed cell is legible in the transcript ⇒ md_verified on all six (amendment F)
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('md_verified');
  });

  it('TABD1 (L1465–L1470): the six printed bands with their two Deckungssummen; anhaltswert (L1629 / L1454); no row above 50 Mio. € (J-2)', () => {
    const t = tabD1AsTable();
    expect(t.key_columns).toEqual(['baukosten_band']);
    expect(t.rows.map((r) => [r.keys.baukosten_band, r.values.baukosten_max_mio, r.values.personen_mio, r.values.sonstige_mio, r.values.band_gedruckt])).toEqual([
      ['le0_5', 0.5, 1.5, 0.25, 'bis 0,5 Mio. €'], // L1465
      ['le1_5', 1.5, 1.5, 0.5, 'bis 1,5 Mio. €'],  // L1466
      ['le4', 4.0, 1.5, 1.0, 'bis 4,0 Mio. €'],    // L1467
      ['le10', 10, 2.0, 2.0, 'bis 10 Mio. €'],     // L1468
      ['le25', 25, 3.0, 3.0, 'bis 25 Mio. €'],     // L1469
      ['le50', 50, 3.0, 5.0, 'bis 50 Mio. €'],     // L1470
    ]);
    expect(TABD1_BANDS).toHaveLength(6);
    expect(t.rows.find((r) => r.row_key === 'gt50')).toBeUndefined();
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Anhaltspunkt für die Höhe der geforderten Versicherungssumme kann Tabelle D. 1 in Anhang D geben.');
    expect(t.override_quote).toContain('empfiehlt das für das Bauwesen zuständige Bundesministerium');
    const lookup = makeTableLookup(STD);
    expect(lookup('TABD1', ['le10'])?.personen_mio).toBe(2.0); // makeTableLookup returns the row's VALUES object (RED on my own pin, code untouched)
    expect(lookup('TABD1', ['le50'])?.sonstige_mio).toBe(5.0);
    expect(lookup('TABD1', ['gt50'])).toBeUndefined();
  });

  it('ANHB23 (L1327–L1330): keyed by the six prod client_organization_type tokens (G-A3); bundesbehoerde → 139.000 €, every other → 214.000 € (J-3); locked; the printed regulation / date travel with every row (J-1)', () => {
    const t = anhB23AsTable();
    expect(t.key_columns).toEqual(['organisation']);
    expect(t.rows.map((r) => r.keys.organisation)).toEqual(enumValues('M820-01 client_organization_type'));
    expect(t.rows.map((r) => r.keys.organisation)).toEqual(['municipality', 'utility', 'association', 'bundesbehoerde', 'sonstige_auftraggeber', 'other']);
    expect(t.rows.find((r) => r.row_key === 'bundesbehoerde')?.values.schwellenwert_eur).toBe(139000); // L1329
    for (const r of t.rows.filter((r) => r.row_key !== 'bundesbehoerde')) expect(r.values.schwellenwert_eur, r.row_key).toBe(214000); // L1330
    expect(t.rows.find((r) => r.row_key === 'bundesbehoerde')?.verbatim_quote).toContain('139.000');
    expect(t.rows.find((r) => r.row_key === 'municipality')?.verbatim_quote).toContain('für alle anderen');
    for (const r of t.rows) {
      expect(r.values.verordnung).toBe(ANHB23_VERORDNUNG);
      expect(r.values.gueltig_ab).toBe(ANHB23_GUELTIG_AB);
    }
    expect(ANHB23_VERORDNUNG).toBe('Verordnung (EU) 2019/1828 vom 30.10.2019'); // L1327
    expect(ANHB23_GUELTIG_AB).toBe('01.01.2020'); // L1327
    expect(ANHB23_ORGANISATIONEN).toHaveLength(6);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('alle zwei Jahre festgesetzt'); // L1327
    expect(t.override_quote).toContain('alle zwei Jahre geprüft und durch Verordnung festgelegt'); // L1255
  });

  it('S8_10_3_6 (L1064): 15 / 10 Kalendertage keyed on the stringified boolean electronic_transmission; locked', () => {
    const t = s81036AsTable();
    expect(prior['M820-23 electronic_transmission'].data_type).toBe('boolean');
    expect(t.key_columns).toEqual(['uebermittlung']);
    expect(t.rows.map((r) => [r.keys.uebermittlung, r.values.frist_tage])).toEqual([['false', 15], ['true', 10]]);
    expect(S8_10_3_6_ROWS).toHaveLength(2);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('§ 134 Abs. 2 GWB');
  });

  it('S3_9_VGV (L1366): 80000 EUR / 1 Million EUR ("unter", strict) / 20 Prozent ("nicht übersteigt"); locked', () => {
    const t = s39VgvAsTable();
    expect(t.key_columns).toEqual(['konstante']);
    expect(t.rows.map((r) => [r.keys.konstante, r.values.wert, r.values.unit, r.values.comparator])).toEqual([
      ['los_dienstleistung', 80000, 'EUR', '<'],
      ['los_bau', 1000000, 'EUR', '<'],
      ['anteil_pct', 20, '%', '<='],
    ]);
    expect(S3_9_VGV_ROWS).toHaveLength(3);
    expect(t.override_policy).toBe('locked');
    for (const r of t.rows) expect(r.verbatim_quote).toContain('unter 80000 Euro und bei Bauleistungen unter 1 Million Euro');
  });

  it('ANHB11 (L1255): the two-year review interval; E1_4_1_UMSATZ (L1623): 2 (§ 45 Abs. 2 VgV, "darf … nicht mehr") / 1,5 ("sollte") keyed on the stringified boolean large_long_project; anhaltswert (O-1)', () => {
    const b = anhB11AsTable();
    expect(b.rows.map((r) => [r.keys.konstante, r.values.wert, r.values.unit])).toEqual([['pruefintervall_jahre', 2, 'Jahre']]);
    expect(b.override_policy).toBe('locked');
    const u = e141UmsatzAsTable();
    expect(prior['M820-13 large_long_project'].data_type).toBe('boolean');
    expect(u.key_columns).toEqual(['grossprojekt']);
    expect(u.rows.map((r) => [r.keys.grossprojekt, r.values.faktor_max])).toEqual([['false', 2], ['true', 1.5]]);
    expect(u.rows.find((r) => r.row_key === 'true')?.values.modal).toBe('sollte … nicht überschreiten');
    expect(u.rows.find((r) => r.row_key === 'false')?.values.modal).toBe('darf … nicht mehr als … verlangen');
    expect(u.rows.find((r) => r.row_key === 'true')?.verbatim_quote).toContain('den Faktor 1,5 nicht überschreiten');
    expect(u.rows.find((r) => r.row_key === 'false')?.verbatim_quote).toContain('das Zweifache des geschätzten Auftragswerts');
    expect(E1_4_1_UMSATZ_ROWS).toHaveLength(2);
    expect(u.override_policy).toBe('anhaltswert');
  });
});
