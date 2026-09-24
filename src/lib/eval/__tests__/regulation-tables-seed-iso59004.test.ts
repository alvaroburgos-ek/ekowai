/**
 * Plan 3 Task 29 — ISO-59004 seed builder: shape, key uniqueness, the six printed §5.2 principles
 * verbatim, the key tokens against prod's own `selected_principle` enum, the watermark normaliser, and
 * the freshness pin of the committed migration + rollback.
 *
 * SR-1/SR-3: the quotes come from the IN-SESSION `pdftotext -layout` extraction of the standard's own
 * FDIS PDF (see `regulation-tables-quotes-iso59004.ts`). The extraction is NOT committed; the substring
 * check against it runs on demand via `GUIDELINE_TRANSCRIPT_ISO59004` (skipped otherwise, never failing
 * CI) — the committed row-by-row proof is the `verify-regulation-tables.ts` output pasted in the task
 * report (6/6 PASS).
 *
 * The test also pins the NEGATIVE: Table 1 has NO seeded rows (iso59004-U-1) and this standard seeds no
 * table whose code is `TABLE1`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { iso59004SeedTables, s52AsTable, S5_2_ROWS, ISO59004_EDITION, WATERMARK_TOKENS, collapseNoWatermark } from '../regulation-tables-seed-iso59004';
import { Q } from '../regulation-tables-quotes-iso59004';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { rowKeyFor } from '../regulation-tables';
import { emitSeedSqlFor, seedFilesFor } from '../../../../scripts/regulation-tables/emit-seed-sql';
import { PRINCIPLE_TOKENS } from '../field-configs/iso59004';
import type { PriorSnapshot } from '../field-configs/types';

const ROOT = join(__dirname, '..', '..', '..', '..');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const TABLES = iso59004SeedTables();
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/iso59004.prior.json'), 'utf8')) as PriorSnapshot;
const prodPrincipleTokens = ((prior as unknown as Record<string, { enum_values: Array<{ value: string }> }>)['ISO-59004-04 selected_principle'].enum_values).map((e) => e.value);

describe('ISO-59004 regulation-table seed (Plan 3 Task 29)', () => {
  it('ONE table (S5_2), registered under the slug, live, edition "FDIS 2024", imported_unverified (iso59004-J-2); Table 1 is NOT seeded (iso59004-U-1)', () => {
    expect(TABLES.map((t) => t.table_code)).toEqual(['S5_2']);
    expect(TABLES.map((t) => t.table_code)).not.toContain('TABLE1');
    expect(SEED_BUILDERS.iso59004).toBeDefined();
    expect(SEED_BUILDERS.iso59004.ts).toBe('20260917102900');
    expect(SEED_BUILDERS.iso59004.supersedes).toBeUndefined();
    expect(liveSeedSlugs()).toContain('iso59004');
    expect(ISO59004_EDITION).toBe('FDIS 2024');
    for (const t of TABLES) {
      expect(t.standard_code).toBe('ISO-59004');
      expect(t.edition).toBe('FDIS 2024');
      // iso59004-J-2: PDF-derived (VA) but the corpus has no `pdf_verified` token — the fail-safe lower
      // token ships and the upgrade is a sign-off proposal. `md_verified` would be FALSE (no transcript).
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

  it('S5_2 — six rows in printed order, keys BYTE-IDENTICAL to prod `selected_principle` (G-A3/D-1), policy locked with the §5.1 sentence, page PDF p.23 / printed p.16', () => {
    const t = s52AsTable();
    expect(t.rows).toHaveLength(6);
    expect(t.key_columns).toEqual(['principle']);
    expect(t.rows.map((r) => r.row_key)).toEqual(prodPrincipleTokens);
    expect(t.rows.map((r) => r.row_key)).toEqual([...PRINCIPLE_TOKENS]);
    expect(t.value_columns.map((c) => c.name)).toEqual(['clause', 'title', 'text']);
    expect(t.override_policy).toBe('locked');
    expect(collapse(t.override_quote!)).toBe('The set of principles given in 5.2, which are interlinked and complementary, should be considered by an organization to transition towards a circular economy.');
    expect(t.page_ref).toBe('PDF p.23 (gedruckte S. 16)');
    expect(t.clause_reference).toBe('§5.2');
    expect(t.rows.map((r) => r.values.clause)).toEqual(['5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5', '5.2.6']);
  });

  it('S5_2 — the six printed headings and the six printed paragraphs, verbatim', () => {
    const t = s52AsTable();
    const byKey = (k: string) => t.rows.find((r) => r.row_key === k)!;
    expect(t.rows.map((r) => r.values.title)).toEqual(['Systems thinking', 'Value creation', 'Value sharing', 'Resource stewardship', 'Resource traceability', 'Ecosystem resilience']);
    expect(byKey('systems_thinking').values.text).toBe('Organizations take a life cycle perspective and apply a long-term approach when considering their impacts on environmental, social and economic systems.');
    expect(byKey('ecosystem_resilience').values.text).toBe('Organizations develop and implement practices and strategies that protect and contribute to the resilience and regeneration of ecosystems and their biodiversity, including preventing harmful losses and releases and taking into account planetary boundaries.');
    // every seeded cell really is printed inside its own span (the builder's own guard, re-asserted here)
    for (const r of S5_2_ROWS) {
      const hay = collapseNoWatermark(r.quote);
      expect(hay, `${r.principle} clause`).toContain(r.clause);
      expect(hay, `${r.principle} title`).toContain(r.title);
      expect(hay, `${r.principle} text`).toContain(r.text);
    }
  });

  it('iso59004-U-2: the watermark normaliser drops whole watermark-ONLY lines and NOTHING else — the two spans that need it (§5.2.3, §5.2.5) and one that does not', () => {
    expect([...WATERMARK_TOKENS]).toEqual(['Pr', 'oj', 'et', 'de', 'N', 'or', 'm', 'M', 'e', 'ar', 'oc', 'ai', 'n']);
    // §5.2.3 — the raw span carries the watermark lines "ar oc" and "ai"; the raw quote KEEPS them
    expect(Q.L1610_1617).toContain('ar oc');
    expect(collapse(Q.L1610_1617)).toContain('provision of a ai solution.');
    expect(collapseNoWatermark(Q.L1610_1617)).toContain('provision of a solution.');
    // §5.2.5 — the "e" line between the two body lines
    expect(collapse(Q.L1626_1629)).toContain('value chains and are e accountable');
    expect(collapseNoWatermark(Q.L1626_1629)).toContain('value chains and are accountable');
    // §5.2.1 needs no cleaning at all — the normaliser is a no-op there
    expect(collapseNoWatermark(Q.L1601_1604)).toBe(collapse(Q.L1601_1604));
    // a watermark token glued INSIDE a body line is NEVER touched (the Table-1 / §7.1.3 cases)
    expect(collapseNoWatermark(Q.L2570_2631)).toContain('deGenerate useful energy from recovered resources.');
    expect(collapseNoWatermark(Q.L2702_2716)).toContain('ojnongovernmental organization).');
  });

  it('iso59004-U-1 — the evidence that Table 1 is unseedable is COMMITTED: the printed header is Action / Description with no category column, and the interleaving is visible in the span', () => {
    const t1 = collapseNoWatermark(Q.L2570_2631);
    expect(t1).toContain('Table 1 — Guidance for resource management actions');
    expect(t1).toContain('Action');
    expect(t1).toContain('Description');
    // no printed category cue anywhere in the table span
    expect(t1.toLowerCase()).not.toContain('category');
    for (const token of ['create_added_value', 'value_retention', 'value_recovery', 'regenerate_ecosystems', 'support_transition']) expect(t1).not.toContain(token);
    // the physical interleaving: the "Recover energy" description sits on the "Re-mine" label line
    expect(t1).toContain('Re-mine deGenerate useful energy from recovered resources.');
    // …and the "Recycle" label sits INSIDE the cascade description
    expect(t1).toContain('Recycle material to the environment.');
    // the thirteen printed Action labels ARE unambiguous and ARE the prod tokens, in printed order
    const printedActions = ['Refuse', 'Rethink', 'Source', 'Reduce', 'Repair', 'Re-use', 'Refurbish', 'Remanufacture', 'Repurpose', 'Cascade', 'Recycle', 'Recover energy', 'Re-mine'];
    let at = -1;
    for (const label of printedActions) {
      const next = t1.indexOf(label, at + 1);
      expect(next, `printed action label ${label}`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('the committed seed migration + rollback equal a fresh emit (freshness pin); six row INSERTs, one table DELETE, no status upgrade', () => {
    const { up, down } = emitSeedSqlFor('iso59004');
    const files = seedFilesFor('iso59004');
    expect(files.migration).toBe('scripts/migrations/20260917102900_regulation_tables_seed_iso59004.sql');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/INSERT INTO regulation_table_rows/g) ?? []).length).toBe(6);
    expect((down.match(/DELETE FROM regulation_tables WHERE/g) ?? []).length).toBe(1);
    expect(up).not.toContain('SET verification_status');
  });

  it('every verbatim_quote occurs in the extraction when GUIDELINE_TRANSCRIPT_ISO59004 points at it (skipped otherwise — the extraction is not committed)', () => {
    const path = process.env.GUIDELINE_TRANSCRIPT_ISO59004;
    if (!path || !existsSync(path)) return;
    const hay = collapse(readFileSync(path, 'utf8'));
    for (const t of TABLES) for (const r of t.rows) expect(hay, `${t.table_code} ${r.row_key}`).toContain(collapse(r.verbatim_quote));
  });
});
