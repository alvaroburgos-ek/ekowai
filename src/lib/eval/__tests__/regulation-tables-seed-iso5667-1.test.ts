/**
 * Plan 3 Task 28 — ISO-5667-1 seed builders: shape, key uniqueness, printed row counts, the
 * VERBATIM pins of the one printed numeric table (§16.4 K) and of the two printed sentence rules
 * (§8.6 25 mm, §12.1.2 50 mm), the §21 method catalogue against prod's own enum tokens, and the
 * freshness pin of the committed migration + rollback.
 *
 * SR-1/SR-3: the quotes come from the IN-SESSION `pdftotext -layout` extraction of the standard's own
 * PDF (see `regulation-tables-quotes-iso5667_1.ts`). The extraction is NOT committed; the substring
 * check against it runs on demand via `GUIDELINE_TRANSCRIPT_ISO5667_1` (skipped otherwise, never
 * failing CI) — the committed row-by-row proof is the `verify-regulation-tables.ts` output pasted in
 * the task report (33/33 PASS).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  iso56671SeedTables, s164KAsTable, s21AsTable, s86AsTable, s1212AsTable,
  S16_4_K_ROWS, S21_ROWS, ISO5667_1_EDITION,
} from '../regulation-tables-seed-iso5667_1';
import { Q } from '../regulation-tables-quotes-iso5667_1';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { rowKeyFor } from '../regulation-tables';
import { emitSeedSqlFor, seedFilesFor } from '../../../../scripts/regulation-tables/emit-seed-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const TABLES = iso56671SeedTables();

describe('ISO-5667-1 regulation-table seed (Plan 3 Task 28)', () => {
  it('four tables, registered under the slug, live (nothing supersedes them), edition 1980, every table imported_unverified (iso5667_1-J-2)', () => {
    expect(TABLES.map((t) => t.table_code)).toEqual(['S16_4_K', 'S21', 'S8_6', 'S12_1_2']);
    expect(SEED_BUILDERS.iso5667_1).toBeDefined();
    expect(SEED_BUILDERS.iso5667_1.ts).toBe('20260917102800');
    expect(SEED_BUILDERS.iso5667_1.supersedes).toBeUndefined();
    expect(liveSeedSlugs()).toContain('iso5667_1');
    expect(ISO5667_1_EDITION).toBe('1980');
    for (const t of TABLES) {
      expect(t.standard_code).toBe('ISO-5667-1');
      expect(t.edition).toBe('1980');
      // iso5667_1-J-2: PDF-derived (VA) but the corpus has no `pdf_verified` token — the fail-safe
      // lower token ships and the upgrade is a sign-off proposal. `md_verified` would be FALSE here
      // (there is no markdown transcript for this standard).
      expect(t.verification_status, t.table_code).toBe('imported_unverified');
      expect(t.override_quote, `${t.table_code} override_quote`).toBeTruthy();
      expect(t.page_ref, `${t.table_code} page_ref`).toMatch(/^PDF p/);
      const keys = new Set<string>();
      for (const r of t.rows) {
        expect(r.row_key, `${t.table_code} row_key`).toBe(rowKeyFor(r.keys, t.key_columns));
        expect(keys.has(r.row_key), `${t.table_code} duplicate ${r.row_key}`).toBe(false);
        keys.add(r.row_key);
        expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
        expect(r.verbatim_quote).not.toContain('undefined');
      }
    }
  });

  it('S16_4_K — the seven printed columns of the §16.4 table, keys equal prod `confidence_level`, values verbatim (2,58 / 2,33 / 1,96 / 1,64 / 1,28 / 1,00 / 0,67), policy locked', () => {
    const t = s164KAsTable();
    expect(t.rows).toHaveLength(7);
    expect(t.key_columns).toEqual(['confidence_level']);
    expect(t.override_policy).toBe('locked');
    expect(t.clause_reference).toBe('§16.4');
    // prod `confidence_level` enum_values, byte-identical (D-1 / G-A3)
    expect(S16_4_K_ROWS.map((r) => r.confidence_level)).toEqual(['99', '98', '95', '90', '80', '68', '50']);
    expect(t.rows.map((r) => r.values.k)).toEqual([2.58, 2.33, 1.96, 1.64, 1.28, 1.0, 0.67]);
    expect(t.rows.map((r) => r.values.k_printed)).toEqual(['2,58', '2,33', '1,96', '1,64', '1,28', '1,00', '0,67']);
    // every row quotes the WHOLE printed table span (the printed table is column-oriented: a header
    // line of levels over a line of K values, so a seeded ROW is a printed COLUMN)
    for (const r of t.rows) expect(r.verbatim_quote).toBe(Q.L844_846);
    // the span really contains the header and every printed pair
    expect(collapse(Q.L844_846)).toContain('Nivel de confianza');
    for (const r of S16_4_K_ROWS) {
      expect(collapse(Q.L844_846), `level ${r.confidence_level}`).toContain(r.confidence_level);
      expect(collapse(Q.L844_846), `K ${r.printed}`).toContain(r.printed);
    }
    // the policy quote is the printed sentence that makes K table-given
    expect(collapse(t.override_quote!)).toContain('donde K tiene el valor dado en la siguiente tabla, dependiendo del nivel de confianza adoptado');
  });

  it('S21 — 24 rows over the three printed aspects (5 direction / 9 velocity / 10 discharge), every method token is a prod `flow_measurement_method` value, all 15 covered, policy kann, the two cross-referenced discharge rows flagged', () => {
    const t = s21AsTable();
    expect(t.rows).toHaveLength(24);
    expect(t.key_columns).toEqual(['aspect', 'method']);
    expect(t.override_policy).toBe('kann');
    const byAspect = (a: string) => S21_ROWS.filter((r) => r.aspect === a).map((r) => r.method);
    expect(byAspect('direction')).toEqual(['drogue', 'float_trawl', 'chemical_tracer', 'microbiological_tracer', 'radioactive_tracer']);
    expect(byAspect('velocity')).toEqual(['drogue', 'float_trawl', 'chemical_tracer', 'microbiological_tracer', 'radioactive_tracer', 'current_meter', 'ultrasonic', 'electromagnetic', 'pneumatic']);
    expect(byAspect('discharge')).toEqual(['current_meter', 'pneumatic', 'mechanical', 'weir_level', 'venturi', 'orifice_plate', 'pumping_rate', 'electromagnetic', 'ultrasonic', 'dilution_gauging']);
    // prod's 15 `flow_measurement_method` tokens, every one printed somewhere in §21
    const PROD_METHODS = ['drogue', 'float_trawl', 'chemical_tracer', 'microbiological_tracer', 'radioactive_tracer', 'current_meter', 'ultrasonic', 'electromagnetic', 'pneumatic', 'weir_level', 'venturi', 'orifice_plate', 'pumping_rate', 'dilution_gauging', 'mechanical'];
    expect([...new Set(S21_ROWS.map((r) => r.method))].sort()).toEqual([...PROD_METHODS].sort());
    expect([...new Set(S21_ROWS.map((r) => r.aspect))]).toEqual(['direction', 'velocity', 'discharge']);
    for (const r of t.rows) expect(r.values.valid).toBe(1);
    // iso5667_1-J-4: exactly the two rows that rest on §21.4 a)'s cross-reference to §21.3 are flagged
    expect(t.rows.filter((r) => r.values.via_cross_reference === true).map((r) => r.row_key)).toEqual(['discharge|current_meter', 'discharge|pneumatic']);
    // a spot-check of the printed item text
    expect(collapse(String(t.rows.find((r) => r.row_key === 'discharge|dilution_gauging')!.values.printed_item)))
      .toBe('Calibrador de dilución, para medir en un sitio las descargas en los cursos de agua naturales.');
    expect(collapse(t.override_quote!)).toContain('La dirección y la velocidad se pueden medir utilizando');
    expect(collapse(t.override_quote!)).toContain('La descarga se puede determinar utilizando');
  });

  it('S8_6 / S12_1_2 — the two printed sentence rules: 25 mm (anhaltswert — "por ejemplo", iso5667_1-J-3) and 50 mm (locked — "debe tener al menos")', () => {
    const a = s86AsTable();
    expect(a.rows).toHaveLength(1);
    expect(a.rows[0].values.min_nominal_bore_mm).toBe(25);
    expect(a.override_policy).toBe('anhaltswert');
    expect(collapse(a.rows[0].verbatim_quote)).toContain('por ejemplo, al muestrear líquidos heterogéneos, de conducto nominal mínimo de 25 mm');
    const b = s1212AsTable();
    expect(b.rows).toHaveLength(1);
    expect(b.rows[0].values.min_diameter_mm).toBe(50);
    expect(b.override_policy).toBe('locked');
    expect(collapse(b.rows[0].verbatim_quote)).toContain('el conducto del muestreo debe tener al menos 50 mm de diámetro');
  });

  it('the committed seed migration + rollback equal a fresh emit (freshness pin); the rollback deletes all four tables (nothing superseded)', () => {
    const { up, down } = emitSeedSqlFor('iso5667_1');
    const files = seedFilesFor('iso5667_1');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/INSERT INTO regulation_table_rows/g) ?? []).length).toBe(33);
    expect((down.match(/DELETE FROM regulation_tables WHERE/g) ?? []).length).toBe(4);
    // a table shipping `imported_unverified` never emits the status-upgrade UPDATE
    expect(up).not.toContain('SET verification_status');
  });

  it('every verbatim_quote occurs in the transcript when GUIDELINE_TRANSCRIPT_ISO5667_1 points at the in-session extraction (skipped otherwise — the extraction is not committed)', () => {
    const path = process.env.GUIDELINE_TRANSCRIPT_ISO5667_1;
    if (!path || !existsSync(path)) return;
    const hay = collapse(readFileSync(path, 'utf8'));
    for (const t of TABLES) for (const r of t.rows) expect(hay, `${t.table_code} ${r.row_key}`).toContain(collapse(r.verbatim_quote));
  });
});
