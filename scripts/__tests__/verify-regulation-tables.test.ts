/**
 * Plan 3 Task 0 — spec §9 risk 2: every seeded `verbatim_quote` must occur
 * (whitespace-normalised) in the transcript the CLI is pointed at.
 */
import { describe, it, expect } from 'vitest';
import { verifyQuotes } from '../regulation-tables/verify-regulation-tables';
import { tab13AsTable } from '@/lib/eval/regulation-tables-seed-a138';
describe('verifyQuotes', () => {
  it('normalises whitespace and reports each row', () => {
    const t = tab13AsTable();
    const text = t.rows.map((r) => r.verbatim_quote.replace(/ /g, '\n')).join('\n');
    expect(verifyQuotes([t], text).every((r) => r.ok)).toBe(true);
    expect(verifyQuotes([t], 'nothing here').every((r) => !r.ok)).toBe(true);
  });
});
