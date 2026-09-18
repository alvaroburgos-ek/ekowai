/**
 * Plan 3 Task 25 — DIN-14021 seed tables: the claim-type map (CLAIMMAP, 23 rows = the
 * prod `selected_claim_type` tokens), the §6.5.3 a) – g) documentation items and the
 * §5.3 – §5.10 general-requirement clauses of the bilingual transcript, lifted by line
 * range in this session (German column), every cell asserted inside its span, every
 * table `md_verified` (every row quote lifted), the SEED_BUILDERS registration and the
 * fallback resolution. Transcript substring check when GUIDELINE_TRANSCRIPT_DIN14021
 * points at the file (skipped otherwise, never failing CI).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  din14021SeedTables, claimmapAsTable, s653AsTable, s53510AsTable, headingText, itemText,
  DIN14021_EDITION, CLAIMMAP_ROWS, S6_5_3_ROWS, S5_3_5_10_ROWS, NUMERIC_BLOCKS, COMPARATIVE_FRAGMENT,
} from '../regulation-tables-seed-din14021';
import { Q } from '../regulation-tables-quotes-din14021';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';
import { loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';
import { verifyQuotes } from '../../../../scripts/regulation-tables/verify-regulation-tables';
import { join } from 'node:path';

const STD = 'DIN-14021';
const ROOT = join(__dirname, '..', '..', '..', '..');
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const prior = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din14021.prior.json'));
const priorEnum = (key: string) => ((prior as unknown as Record<string, { enum_values: Array<{ value: string; label_de: string }> }>)[key]).enum_values;

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    expect(r.verbatim_quote).not.toContain('undefined');
    expect(r.label_de.trim().length).toBeGreaterThan(0);
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(DIN14021_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('DIN-14021 Plan-3 seed tables', () => {
  it('three tables in the live set; registered as SEED_BUILDERS.din14021 (ts 20260917102500); the fallback resolves each; edition 2016; EVERY table md_verified and locked; 38 rows', () => {
    const tables = din14021SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['CLAIMMAP', 'S6_5_3', 'S5_3_5_10']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.din14021).toEqual({ build: din14021SeedTables, ts: '20260917102500', slugFile: 'din14021' });
    expect(liveSeedSlugs()).toContain('din14021');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(DIN14021_EDITION).toBe('2016'); // title page L8–L9 "(ISO 14021:2016);" / "Deutsche und Englische Fassung EN ISO 14021:2016"; prod standards.version "2016 (ISO 14021:2016); EN ISO 14021:2016"
    expect(collapse(Q.L7_9)).toContain('(ISO 14021:2016); \\\\ Deutsche und Englische Fassung EN ISO 14021:2016');
    for (const t of tables) expect(t.verification_status, t.table_code).toBe('md_verified');
    for (const t of tables) expect(t.override_policy, t.table_code).toBe('locked');
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(38);
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
    // no English line leaked into a German span (the bilingual transcript interleaves the columns)
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k], k).not.toMatch(/\b(shall|claimant's|evaluation methodology)\b/);
  });

  it('CLAIMMAP: 23 rows keyed on the prod selected_claim_type tokens in prod order (D-1 / G-A3), label = the printed term, condition_text = the row quote, numeric_block ∈ the structural list, comparative_by_clause = the printed "Anforderungen von 6.3" fragment on exactly the five comparative types', () => {
    const t = claimmapAsTable();
    const prod = priorEnum('DIN-14021-01 selected_claim_type');
    expect(t.rows.map((r) => r.keys.claim_type)).toEqual(prod.map((e) => e.value));
    expect(t.rows).toHaveLength(23);
    expect(t.key_columns).toEqual(['claim_type']);
    expect(t.value_columns.map((c) => c.name)).toEqual(['clause', 'numeric_block', 'condition_text', 'comparative_by_clause']);
    for (const r of t.rows) {
      expect(r.values.condition_text).toBe(collapse(r.verbatim_quote));
      expect(NUMERIC_BLOCKS).toContain(r.values.numeric_block as string);
      expect(typeof r.values.comparative_by_clause).toBe('boolean');
      expect(r.values.comparative_by_clause).toBe(collapse(r.verbatim_quote).includes(COMPARATIVE_FRAGMENT));
    }
    const by = (k: string) => t.rows.find((r) => r.row_key === k)!;
    expect(t.rows.filter((r) => r.values.comparative_by_clause).map((r) => r.row_key)).toEqual(['extended_life_product', 'reduced_energy_consumption', 'reduced_resource_use', 'reduced_water_consumption', 'waste_reduction']);
    // the numeric blocks (structure): 7.6 R/E/P, 7.8 A/P (incl. the two waste terms — J-1), 7.10 I/N, 7.14 / 7.15 shares, 7.17 carbon
    expect(t.rows.filter((r) => r.values.numeric_block === 'recovered_energy').map((r) => r.row_key)).toEqual(['recovered_energy']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'recycled_content').map((r) => r.row_key)).toEqual(['recycled_content', 'pre_consumer_material', 'post_consumer_material']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'reduced_resource').map((r) => r.row_key)).toEqual(['reduced_resource_use']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'renewable_material').map((r) => r.row_key)).toEqual(['renewable_material']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'renewable_energy').map((r) => r.row_key)).toEqual(['renewable_energy']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'carbon').map((r) => r.row_key)).toEqual(['product_carbon_footprint', 'carbon_neutral']);
    expect(t.rows.filter((r) => r.values.numeric_block === 'none')).toHaveLength(14);
    // the printed conditions (lines cited in the quotes module)
    expect(by('recovered_energy').verbatim_quote).toBe(Q.L1296_1298);
    expect(Q.L1297).toBe('a) Die Aussage darf nur erfolgen, wenn $R-E>0$.');
    expect(by('recycled_content').verbatim_quote).toBe(Q.L1449_1450);
    expect(by('renewable_material').verbatim_quote).toBe(Q.L1719_1721);
    expect(collapse(Q.L1719_1721)).toContain('Eine uneingeschränkte Aussage zur Erneuerbarkeit ist nur zulässig, wenn das Produkt zu 100 \\% aus erneuerbarem Material besteht');
    expect(by('renewable_energy').verbatim_quote).toBe(Q.L1763);
    expect(Q.L1763).toContain('nur zulässig, wenn 100 \\% der Energie erneuerbar ist');
    expect(by('carbon_neutral').verbatim_quote).toBe(Q.L1856);
    expect(Q.L1856).toBe('Eine uneingeschränkte Aussage zu „CO2-neutral“ darf nicht gemacht werden.');
    expect(by('sustainable').verbatim_quote).toBe(Q.L1801);
    expect(by('reusable').verbatim_quote).toBe(Q.L1646_1648);
    expect(by('refillable').verbatim_quote).toBe(Q.L1646_1648);
    expect(collapse(Q.L1646_1648)).toContain('darf nur erfolgen, wenn: a) ein Programm zum Sammeln');
    expect(by('designed_for_disassembly').verbatim_quote).toBe(Q.L1192);
    expect(by('other').verbatim_quote).toBe(Q.L757);
    expect(Q.L757).toContain('oder eine sonstige Umweltaussage');
    expect(by('other').values.clause).toBe('5.1');
    // labels: the printed terms (§7.1 NOTE list L1063–L1074 / the printed headings); prod's ASCII-folded labels differ only in umlauts
    expect(by('compostable').label_de).toBe('kompostierbar');
    expect(by('recovered_energy').label_de).toBe('zurückgewonnene Energie');
    expect(by('renewable_material').label_de).toBe('Erneuerbares Material');
    expect(by('pre_consumer_material').label_de).toBe('1) Abfall vor Gebrauch');
    expect(by('reusable').label_de).toBe('Wiederverwendbar');
    expect(by('product_carbon_footprint').label_de).toBe('„Carbon Footprint“ eines Produktes');
    expect(headingText('\\subsection*{7.14 Erneuerbares Material}')).toBe('7.14 Erneuerbares Material');
    expect(() => headingText('7.14 Erneuerbares Material')).toThrow(/not a heading line/);
    expect(Q.L1063_1074.split('\n')).toHaveLength(12); // 7.2 … 7.13, no English line
    expect(Q.L1063_1074.split('\n')[0]).toBe('7.2 kompostierbar');
    expect(Q.L1063_1074.split('\n')[11]).toBe('7.13 Abfallminderung');
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(`${Q.L1059} — ${Q.L1297}`);
    expect(Q.L1059).toContain('darf nicht durch Verwendung ähnlicher Begriffe abgeschwächt werden');
    const lookup = makeTableLookup(STD);
    expect(lookup('CLAIMMAP', ['recovered_energy'])?.numeric_block).toBe('recovered_energy');
    expect(lookup('CLAIMMAP', ['extended_life_product'])?.comparative_by_clause).toBe(true);
    expect(lookup('CLAIMMAP', ['compostable'])?.comparative_by_clause).toBe(false);
    expect(lookup('CLAIMMAP', ['nope'])).toBeUndefined();
    expect(CLAIMMAP_ROWS).toHaveLength(23);
  });

  it('S6_5_3: the seven items a) – g) (L1033–L1038, g) at L1054 after the English column), text = the printed item without its marker; locked ("müssen Folgendes enthalten")', () => {
    const t = s653AsTable();
    expect(t.rows.map((r) => r.keys.item)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(S6_5_3_ROWS).toHaveLength(7);
    for (const r of t.rows) {
      expect(r.values.letter).toBe(`${r.keys.item})`);
      expect(collapse(r.verbatim_quote)).toBe(`${r.keys.item}) ${r.values.text}`);
      expect(r.label_de).toBe(`${r.keys.item}) ${r.values.text}`);
    }
    expect(t.rows[0].values.text).toBe('Angabe der angewendeten Norm oder des angewendeten Verfahrens;');
    expect(t.rows[3].values.text).toBe('bei Prüfung durch eine unabhängige Prüfstelle, deren Name und Adresse;');
    expect(t.rows[6].verbatim_quote).toBe(Q.L1054);
    expect(Q.L1054).toMatch(/^g\) Nachweis, dass die Bewertung des Antragstellers/);
    expect(() => itemText('b', Q.L1033)).toThrow(/does not start with "b\)"/);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(Q.L1032);
    expect(Q.L1032).toContain('müssen Folgendes enthalten');
  });

  it('S5_3_5_10: the eight clauses 5.3 … 5.10 with the printed heading + one binding sentence each (5.8.5 / 5.9.2 / 5.10.2.4 for the symbol clauses — J-3); locked', () => {
    const t = s53510AsTable();
    expect(t.rows.map((r) => r.keys.clause)).toEqual(['5_3', '5_4', '5_5', '5_6', '5_7', '5_8', '5_9', '5_10']);
    expect(S5_3_5_10_ROWS).toHaveLength(8);
    expect(t.rows.map((r) => r.values.heading)).toEqual([
      '5.3 Unbestimmte oder unspezifische Aussagen', '5.4 Aussagen von „... frei“', '5.5 Aussagen zur Nachhaltigkeit', '5.6 Anwendung von ergänzenden Erklärungen',
      '5.7 Besondere Anforderungen', '5.8 Verwendung von Symbolen für Umweltaussagen', '5.9 Sonstige Informationen oder Aussagen', '5.10 Spezifische Symbole',
    ]);
    for (const r of t.rows) {
      expect(r.label_de).toBe(r.values.heading);
      expect(r.values.requirement_text).toBe(collapse(r.verbatim_quote));
      expect(r.values.heading).toMatch(new RegExp(`^${(r.values.clause_printed as string).replace('.', '\\.')} `));
    }
    expect(t.rows[0].verbatim_quote).toBe(Q.L783);
    expect(Q.L783).toContain('darf nicht gemacht werden');
    expect(t.rows[1].verbatim_quote).toBe(Q.L789);
    expect(Q.L789).toContain('darf nur gemacht werden, wenn');
    expect(t.rows[5].verbatim_quote).toBe(Q.L878);
    expect(Q.L878).toMatch(/^5\.8\.5 Gegenstände aus der Natur dürfen nur abgebildet werden/);
    expect(t.rows[6].verbatim_quote).toBe(Q.L884);
    expect(t.rows[7].verbatim_quote).toBe(Q.L910);
    expect(Q.L910).toContain('darf nur für Aussagen von Recyclatgehalt und Recyclingfähigkeit verwendet werden');
    expect(t.override_policy).toBe('locked');
  });

  it('every verbatim_quote occurs in the transcript when GUIDELINE_TRANSCRIPT_DIN14021 points at it (skipped otherwise)', () => {
    const path = process.env.GUIDELINE_TRANSCRIPT_DIN14021;
    if (!path || !existsSync(path)) return;
    const results = verifyQuotes(din14021SeedTables(), readFileSync(path, 'utf8'));
    expect(results.filter((r) => !r.ok)).toEqual([]);
    expect(results).toHaveLength(38);
  });
});
