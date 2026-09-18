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
import { a262eSeedTables } from './regulation-tables-seed-a262e';
import { m277eSeedTables } from './regulation-tables-seed-m277e';
import { m12001SeedTables } from './regulation-tables-seed-m1200_1';
import { m12003SeedTables } from './regulation-tables-seed-m1200_3';
import { fllGarSeedTables } from './regulation-tables-seed-fll_gar';
import { fllNaturteichSeedTables } from './regulation-tables-seed-fll_naturteich';
import { m8203SeedTables } from './regulation-tables-seed-m820_3';
import { din181301SeedTables } from './regulation-tables-seed-din18130_1';
import { m205SeedTables } from './regulation-tables-seed-m205';
import { m187SeedTables } from './regulation-tables-seed-m187';
import { din276SeedTables } from './regulation-tables-seed-din276';
import { a178SeedTables } from './regulation-tables-seed-a178';
import { din169412SeedTables } from './regulation-tables-seed-din16941_2';
import { m12002SeedTables } from './regulation-tables-seed-m1200_2';
import { din19892SeedTables } from './regulation-tables-seed-din1989_2';
import { m8201SeedTables } from './regulation-tables-seed-m820_1';
import { m8202SeedTables } from './regulation-tables-seed-m820_2';
import { iso566710SeedTables } from './regulation-tables-seed-iso5667_10';

export type SeedBuilder = { build: () => RegulationTable[]; ts: string; slugFile: string; supersedes?: string };

export const SEED_BUILDERS: Record<string, SeedBuilder> = {
  a138: { build: a138Plan1SeedTables, ts: '20260911110000', slugFile: 'a138' },   // Plan-1 file names preserved; FROZEN (superseded by a138_p3)
  a138_p3: { build: a138SeedTables, ts: '20260917100100', slugFile: 'a138_p3', supersedes: 'a138' }, // Plan 3 Task 1: the live A138 set (nine tables)
  din1989_1: { build: din19891SeedTables, ts: '20260917100200', slugFile: 'din1989_1' }, // Plan 3 Task 2: DIN-1989-1 (seven tables)
  a262e: { build: a262eSeedTables, ts: '20260917100300', slugFile: 'a262e' }, // Plan 3 Task 3: DWA-A-262E (ten tables)
  m277e: { build: m277eSeedTables, ts: '20260917100400', slugFile: 'm277e' }, // Plan 3 Task 4: DWA-M-277E (nine tables)
  m1200_1: { build: m12001SeedTables, ts: '20260917100500', slugFile: 'm1200_1' }, // Plan 3 Task 5: DWA-M-1200-1 (seven tables)
  m1200_3: { build: m12003SeedTables, ts: '20260917100600', slugFile: 'm1200_3' }, // Plan 3 Task 6: DWA-M-1200-3 (ten tables)
  fll_gar: { build: fllGarSeedTables, ts: '20260917100700', slugFile: 'fll_gar' }, // Plan 3 Task 7: FLL-GAR-2023 (twenty tables)
  fll_naturteich: { build: fllNaturteichSeedTables, ts: '20260917100800', slugFile: 'fll_naturteich' }, // Plan 3 Task 8: FLL-Naturteich (eleven tables)
  m820_3: { build: m8203SeedTables, ts: '20260917100900', slugFile: 'm820_3' }, // Plan 3 Task 9: DWA-M-820-3 (ten QE catalogues, 193 items)
  din18130_1: { build: din181301SeedTables, ts: '20260917101000', slugFile: 'din18130_1' }, // Plan 3 Task 10: DIN-18130-1 (seven tables)
  m205: { build: m205SeedTables, ts: '20260917101100', slugFile: 'm205' }, // Plan 3 Task 11: DWA-M-205 (fifteen tables)
  m187: { build: m187SeedTables, ts: '20260917101200', slugFile: 'm187' }, // Plan 3 Task 12: DWA-M-187 (eleven tables)
  din276: { build: din276SeedTables, ts: '20260917101300', slugFile: 'din276' }, // Plan 3 Task 13: DIN-276 (four tables — Table 1 KG catalogue, Tables 2 / 3 / 4 reference units)
  a178: { build: a178SeedTables, ts: '20260917101400', slugFile: 'a178' }, // Plan 3 Task 14: DWA-A-178 (seven tables — Tab. 1 split η / η_VS, §6.1.4.5 h_FK, three text-limit tables, Tab. 2 indicators)
  din16941_2: { build: din169412SeedTables, ts: '20260917101500', slugFile: 'din16941_2' }, // Plan 3 Task 15: DIN-EN-16941-2 (nine tables — Tab. A.1 / A.2 / A.3, Gl.-1 legend, Tab. D.1 / D.2 / D.3 / D.4, Anhang B)
  m1200_2: { build: m12002SeedTables, ts: '20260917101600', slugFile: 'm1200_2' }, // Plan 3 Task 16: DWA-M-1200-2 (ten tables — Tab. 3, §3.3.3, Anhang C.1, Gl. C.2-1, Tab. 4, Tab. 6, Tab. B.2, §8.2, Tab. E.1 ×2)
  din1989_2: { build: din19892SeedTables, ts: '20260917101700', slugFile: 'din1989_2' }, // Plan 3 Task 17: DIN-1989-2 (five tables — Tab. 1 Filtertypen, Tab. 2 Prüfzeiten, Tab. 3 Prüfstoffe, Tab. 4 Quarzsand, Tab. 5 WPK)
  m820_1: { build: m8201SeedTables, ts: '20260917101800', slugFile: 'm820_1' }, // Plan 3 Task 18: DWA-M-820-1 (six tables — Tab. D.1, Anh. B.2.3 thresholds, § 134 GWB standstill, § 3 Abs. 9 VgV lots, Anh. B.1.1 interval, Anh. E.1.4.1 revenue factor)
  m820_2: { build: m8202SeedTables, ts: '20260917101900', slugFile: 'm820_2' }, // Plan 3 Task 19: DWA-M-820-2 (two outline catalogues — Anhang A Statusbericht 21 rows, Anhang B Projekthandbuch 8 rows)
  iso5667_10: { build: iso566710SeedTables, ts: '20260917102000', slugFile: 'iso5667_10' }, // Plan 3 Task 20: ISO-5667-10 (eight sentence-rule tables — §4.3.2 formula switch, §7.2.1 interval, §7.2.2.1 tube / pump, §7.2.2.4 CV, §3.4 qualified grab, §9.1 homogeniser, §5 site figures)
  // Plan-3 tasks append one line each, e.g. iso59020: { build: iso59020SeedTables, ts: '20260917102100', slugFile: 'iso59020' }
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
