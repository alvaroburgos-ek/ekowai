/**
 * Plan 3 Task 0 — spec §9 risk 2: every seeded row's `verbatim_quote` must
 * occur, whitespace-normalised, in the standard's transcript. A FAIL row
 * means the quote is NOT verbatim (typed, paraphrased, or lifted from the
 * wrong file) — the task fixes the row or moves it to the sign-off sheet;
 * it never ships as `md_verified`.
 *
 * The transcript path is given explicitly on the CLI (amendment D: FLL
 * transcripts live under `Desktop\Supabase data\Guidelines knowledge
 * markdown\`, the others under the paths the plan's "Source transcripts"
 * section lists — each per-standard brief supplies its own). The executor
 * pastes the printed list into the task report.
 *
 *   tsx scripts/regulation-tables/verify-regulation-tables.ts <slug> "<transcript path>"
 */
import { readFileSync } from 'node:fs';
import type { RegulationTable } from '../../src/lib/eval/regulation-tables';
import { SEED_BUILDERS } from '../../src/lib/eval/regulation-tables-seed-index';

export type QuoteCheck = { table_code: string; row_key: string; ok: boolean };

/** Collapse every whitespace run (incl. line breaks) to one space and trim. */
export const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function verifyQuotes(tables: RegulationTable[], transcriptText: string): QuoteCheck[] {
  const text = norm(transcriptText);
  const out: QuoteCheck[] = [];
  for (const t of tables) {
    for (const r of t.rows) {
      const quote = norm(r.verbatim_quote);
      out.push({ table_code: t.table_code, row_key: r.row_key, ok: quote.length > 0 && text.includes(quote) });
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('verify-regulation-tables.ts')) {
  const [slug = '', transcriptPath] = process.argv.slice(2);
  const b = SEED_BUILDERS[slug];
  if (!b) throw new Error(`unknown seed slug ${JSON.stringify(slug)} — known: ${Object.keys(SEED_BUILDERS).join(', ')}`);
  if (!transcriptPath) throw new Error('usage: verify-regulation-tables.ts <slug> "<transcript path>"');
  const results = verifyQuotes(b.build(), readFileSync(transcriptPath, 'utf8'));
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.table_code}  ${r.row_key}`);
  }
  console.log(`${results.length - failed}/${results.length} quotes verbatim in ${transcriptPath}`);
  if (failed > 0) process.exit(1);
}
