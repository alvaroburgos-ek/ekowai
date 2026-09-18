/**
 * Plan 3 Task 26 — ISO-14046 seed tables: the §5.2.4.2 a) – j) data-quality items and
 * the §6.2 a) – g) third-party-report aspects of the SPANISH IDT transcript, lifted by
 * line range in this session, every cell asserted inside its span; S5_2_4_2_DQ
 * `md_verified` (every row quote lifted, every displayed cell legible, policy
 * anhaltswert — "deberían"), S6_2_TP `imported_unverified` (the printed OCR quirks
 * inside its displayed sub-items — U-1; policy locked — "debe cubrir"); the
 * SEED_BUILDERS registration and the fallback resolution. Transcript substring check
 * when GUIDELINE_TRANSCRIPT_ISO14046 points at the file (skipped otherwise, never
 * failing CI).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { iso14046SeedTables, s5242DqAsTable, s62TpAsTable, itemText, ISO14046_EDITION, S5_2_4_2_DQ_ROWS, S6_2_TP_ROWS, S6_2_TP_OCR_QUIRKS } from '../regulation-tables-seed-iso14046';
import { Q } from '../regulation-tables-quotes-iso14046';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';
import { verifyQuotes } from '../../../../scripts/regulation-tables/verify-regulation-tables';

const STD = 'ISO-14046';
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

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
  expect(t.edition).toBe(ISO14046_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(t.override_quote).not.toContain('undefined');
}

describe('ISO-14046 Plan-3 seed tables', () => {
  it('two text tables in the live set; registered as SEED_BUILDERS.iso14046 (ts 20260917102600); the fallback resolves each; edition 2014; 17 rows; S5_2_4_2_DQ md_verified + anhaltswert, S6_2_TP imported_unverified + locked; every span non-empty', () => {
    const tables = iso14046SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['S5_2_4_2_DQ', 'S6_2_TP']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.iso14046).toEqual({ build: iso14046SeedTables, ts: '20260917102600', slugFile: 'iso14046' });
    expect(liveSeedSlugs()).toContain('iso14046');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(ISO14046_EDITION).toBe('2014'); // title page L13–L15; prod standards.version "ISO 14046:2014"
    expect(collapse(Q.L13_15)).toBe('esta norma es una adopción idéntica \\\\ (IDT) por traducción de la norma ISO \\\\ 14046:2014.');
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(17);
    expect(tables.map((t) => [t.table_code, t.verification_status, t.override_policy])).toEqual([['S5_2_4_2_DQ', 'md_verified', 'anhaltswert'], ['S6_2_TP', 'imported_unverified', 'locked']]);
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k].trim().length, k).toBeGreaterThan(0);
    for (const k of Object.keys(Q)) expect((Q as Record<string, string>)[k], k).not.toContain('undefined');
  });

  it('S5_2_4_2_DQ: the ten items a) – j) (L596–L605), text = the printed item without its marker, label = the printed line; the lead-in prints the conditional "deberían tratar" (anhaltswert, L595) — the brief\'s "§5.2.2" is the printed 5.2.4.2 (J-4)', () => {
    const t = s5242DqAsTable();
    expect(t.rows.map((r) => r.keys.item)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    expect(S5_2_4_2_DQ_ROWS).toHaveLength(10);
    expect(t.key_columns).toEqual(['item']);
    expect(t.value_columns.map((c) => c.name)).toEqual(['letter', 'text']);
    for (const r of t.rows) {
      expect(r.values.letter).toBe(`${r.keys.item})`);
      expect(collapse(r.verbatim_quote)).toBe(`${r.keys.item}) ${r.values.text}`);
      expect(r.label_de).toBe(`${r.keys.item}) ${r.values.text}`);
    }
    expect(t.rows[0].values.text).toBe('cobertura relacionada con el tiempo: antigüedad de los datos y período de tiempo mínimo en el que se deberían recopilar los datos;');
    expect(t.rows[4].values.text).toBe('integridad: porcentaje de datos que se han medido o estimado;');
    expect(t.rows[9].verbatim_quote).toBe(Q.L605);
    expect(Q.L605).toBe('j) incertidumbre de la información (por ejemplo: datos, modelos y suposiciones).');
    expect(() => itemText('b', Q.L596)).toThrow(/does not start with "b\)"/);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L595);
    expect(Q.L595).toBe('Los requisitos para la calidad de los datos deberían tratar lo siguiente:');
    expect(Q.L595).not.toMatch(/\bdeben\b/);
    expect(t.clause_reference).toBe('§5.2.4.2');
    expect(t.verification_status).toBe('md_verified');
    const lookup = makeTableLookup(STD);
    expect(lookup('S5_2_4_2_DQ', ['e'])?.text).toBe('integridad: porcentaje de datos que se han medido o estimado;');
    expect(lookup('S5_2_4_2_DQ', ['k'])).toBeUndefined();
  });

  it('S6_2_TP: the seven aspects a) – g) (L910–L984), heading = the printed heading line, subitems = the printed 1) … / i) … lines joined verbatim incl. the OCR quirks (U-1: "Ias" L916 / L973, "ii)cualquier" L923, "$y$" L926, "iii)resultado" L927, the duplicated L940 / L941 line); locked ("debe cubrir"); imported_unverified', () => {
    const t = s62TpAsTable();
    expect(t.rows.map((r) => r.keys.item)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(S6_2_TP_ROWS).toHaveLength(7);
    expect(t.value_columns.map((c) => c.name)).toEqual(['letter', 'heading', 'subitems']);
    expect(t.rows.map((r) => r.values.heading)).toEqual([
      'aspectos generales:', 'objetivo del estudio:', 'alcance del estudio:', 'análisis del inventario de la huella de agua:',
      'evaluación de la huella de agua, cuando aplique:', 'interpretación:', 'revisión crítica, cuando aplique:',
    ]);
    for (const r of t.rows) {
      expect(r.label_de).toBe(`${r.keys.item}) ${r.values.heading}`);
      expect(collapse(r.verbatim_quote).startsWith(`${r.keys.item}) ${r.values.heading} `)).toBe(true);
      expect(collapse(r.verbatim_quote)).toBe(`${r.keys.item}) ${r.values.heading} ${r.values.subitems}`);
    }
    expect(t.rows[0].values.subitems).toBe('1) quién encarga y quién realiza el estudio (interno o externo); 2) fecha del informe; y 3) declaración de que el estudio se ha realizado de acuerdo con los requisitos de esta Norma Internacional;');
    expect(t.rows[6].values.subitems).toBe('1) nombre y afiliación de los revisores; 2) informes de revisión crítica; 3) respuestas a las recomendaciones.');
    expect(t.rows[3].values.subitems).toContain('8) inventario del período utilizado como línea base, cuando sea pertinente;');
    expect(Q.L955).toBe('8) inventario del período utilizado como línea base, cuando sea pertinente;');
    // the printed OCR quirks are kept verbatim (never corrected) — the reason the table stays imported_unverified (amendment F)
    expect(S6_2_TP_OCR_QUIRKS).toHaveLength(6);
    for (const q of S6_2_TP_OCR_QUIRKS) expect(t.rows.find((r) => r.keys.item === q.item)!.values.subitems, `${q.item} ${q.printed}`).toContain(q.printed);
    expect(t.rows[1].values.subitems).toContain('Ias aplicaciones previstas');
    expect(t.rows[1].values.subitems).not.toContain('las aplicaciones previstas');
    expect(t.rows[2].values.subitems).toContain('justificación de cualquier modificación hecha al alcance inicial- justificación de cualquier modificación hecha al alcance inicial;');
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(Q.L909);
    expect(Q.L909.endsWith('El informe de tercera parte debe cubrir los siguientes aspectos:')).toBe(true); // L909 is one paragraph: "… constituye un documento de referencia … El informe de tercera parte debe cubrir los siguientes aspectos:"
    expect(t.verification_status).toBe('imported_unverified');
    expect(t.clause_reference).toBe('§6.2');
    // the NOTA after f) 6) (L980) is NOT part of the f) span (f) is L972–L978)
    expect(Q.L972_978).not.toContain('NOTA');
    expect(Q.L981_984.startsWith('g) revisión crítica, cuando aplique:')).toBe(true);
  });

  it('every verbatim_quote occurs in the transcript when GUIDELINE_TRANSCRIPT_ISO14046 points at it (skipped otherwise)', () => {
    const path = process.env.GUIDELINE_TRANSCRIPT_ISO14046;
    if (!path || !existsSync(path)) return;
    const results = verifyQuotes(iso14046SeedTables(), readFileSync(path, 'utf8'));
    expect(results.filter((r) => !r.ok)).toEqual([]);
    expect(results).toHaveLength(17);
  });

  it('the committed seed migration equals a fresh emit is pinned by generated-sql-freshness (SEED_BUILDERS iteration); this file only pins the file names', () => {
    expect(existsSync(join(__dirname, '..', '..', '..', '..', 'scripts/migrations/20260917102600_regulation_tables_seed_iso14046.sql'))).toBe(true);
    expect(existsSync(join(__dirname, '..', '..', '..', '..', 'scripts/rollback-20260917102600-regulation-tables-seed-iso14046.sql'))).toBe(true);
  });
});
