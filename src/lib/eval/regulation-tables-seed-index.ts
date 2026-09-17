/**
 * Plan 3 Task 0 — the slug-driven seed-builder map, shared by the Node-only
 * emitter CLI (`scripts/regulation-tables/emit-seed-sql.ts <slug>`) and the
 * deploy-before-seed fallback (`regulation-tables-fallback.ts`), which
 * iterates every builder here so a standard's tables resolve while its seed
 * migration is still unapplied. Pure: no fs, no DB.
 *
 * `ts` is the migration timestamp (Plan-3 convention: Task NN owns
 * `202609171NN00`; A138 keeps its Plan-1 stamp), `slugFile` the file-name
 * token: `scripts/migrations/<ts>_regulation_tables_seed_<slugFile>.sql` and
 * `scripts/rollback-<ts>-regulation-tables-seed-<slugFile with - for _>.sql`.
 * Each standard task appends exactly one line.
 */
import type { RegulationTable } from './regulation-tables';
import { a138SeedTables } from './regulation-tables-seed-a138';

export type SeedBuilder = { build: () => RegulationTable[]; ts: string; slugFile: string };

export const SEED_BUILDERS: Record<string, SeedBuilder> = {
  a138: { build: a138SeedTables, ts: '20260911110000', slugFile: 'a138' },   // Plan-1 file names preserved
  // Plan-3 tasks append one line each, e.g. din1989_1: { build: din19891SeedTables, ts: '20260917100200', slugFile: 'din1989_1' }
};

/** Every seeded table across every builder (deploy-before-seed fallback set). */
export function allSeedTables(): RegulationTable[] {
  return Object.values(SEED_BUILDERS).flatMap((b) => b.build());
}
