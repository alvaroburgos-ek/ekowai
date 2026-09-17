/**
 * Plan 3 Task 0 — the slug-driven seed-builder map, shared by the Node-only
 * emitter CLI (`scripts/regulation-tables/emit-seed-sql.ts <slug>`) and the
 * deploy-before-seed fallback (`regulation-tables-fallback.ts`), which
 * iterates every LIVE builder here so a standard's tables resolve while its
 * seed migration is still unapplied. Pure: no fs, no DB.
 *
 * `ts` is the migration timestamp (Plan-3 convention: Task NN owns
 * `202609171NN00`; A138 keeps its Plan-1 stamp), `slugFile` the file-name
 * token: `scripts/migrations/<ts>_regulation_tables_seed_<slugFile>.sql` and
 * `scripts/rollback-<ts>-regulation-tables-seed-<slugFile with - for _>.sql`.
 * Each standard task appends exactly one line.
 *
 * `supersedes` (Plan 3 Task 1): a later builder for the SAME standard names
 * the earlier slug it replaces. The earlier builder stays in the map (its
 * migration file remains byte-pinned and its rows are what the superseding
 * rollback re-emits) but is NOT part of `allSeedTables()` — the runtime
 * fallback serves the superseding set only, so no table code is served twice.
 */
import type { RegulationTable } from './regulation-tables';
import { a138Plan1SeedTables, a138SeedTables } from './regulation-tables-seed-a138';
import { din19891SeedTables } from './regulation-tables-seed-din1989_1';

export type SeedBuilder = { build: () => RegulationTable[]; ts: string; slugFile: string; supersedes?: string };

export const SEED_BUILDERS: Record<string, SeedBuilder> = {
  a138: { build: a138Plan1SeedTables, ts: '20260911110000', slugFile: 'a138' },   // Plan-1 file names preserved; FROZEN (superseded by a138_p3)
  a138_p3: { build: a138SeedTables, ts: '20260917100100', slugFile: 'a138_p3', supersedes: 'a138' }, // Plan 3 Task 1: the live A138 set (nine tables)
  din1989_1: { build: din19891SeedTables, ts: '20260917100200', slugFile: 'din1989_1' }, // Plan 3 Task 2: DIN-1989-1 (seven tables)
  // Plan-3 tasks append one line each, e.g. a262e: { build: a262eSeedTables, ts: '20260917100300', slugFile: 'a262e' }
};

/** Slugs that no other builder supersedes — the set the runtime fallback serves. */
export function liveSeedSlugs(): string[] {
  const superseded = new Set(Object.values(SEED_BUILDERS).map((b) => b.supersedes).filter((s): s is string => s != null));
  return Object.keys(SEED_BUILDERS).filter((slug) => !superseded.has(slug));
}

/** Every seeded table across every LIVE builder (deploy-before-seed fallback set). */
export function allSeedTables(): RegulationTable[] {
  return liveSeedSlugs().flatMap((slug) => SEED_BUILDERS[slug].build());
}
