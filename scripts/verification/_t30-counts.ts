// Task 30 close-out helper (READ-ONLY, throwaway): measure the per-standard OUTPUT counts
// straight from the committed modules, so the token-cost ratio cites code, not a report's prose.
import { SEED_BUILDERS } from '../../src/lib/eval/regulation-tables-seed-index';
import { FIELD_CONFIG_MODULES } from '../../src/lib/eval/field-configs/index';
import { EQUATION_MODULES } from '../../src/lib/eval/equations/index';

const SLUGS = ['a138','din1989_1','a262e','m277e','m1200_1','m1200_3','fll_gar','fll_naturteich','m820_3','din18130_1','m205','m187','din276','a178','din16941_2','m1200_2','din1989_2','m820_1','m820_2','iso5667_10','iso59020','iso46001','iso5667_6','vsme','din14021','iso14046','atv_a704e','iso5667_1','iso59004'];
const SEED_KEY: Record<string, string> = { a138: 'a138_p3' };

async function main() {
  const rows: string[] = [];
  rows.push(['slug','tables','rows','registers','select_one','select_many','lookup_fill','other_widgets','field_vw','section_vw','equations','created','out_total'].join('\t'));
  for (const slug of SLUGS) {
    const sk = SEED_KEY[slug] ?? slug;
    const b = SEED_BUILDERS[sk];
    const tabs = b ? b.build() : [];
    const tables = tabs.length;
    const trows = tabs.reduce((a, t) => a + t.rows.length, 0);
    const fcLoad = FIELD_CONFIG_MODULES[slug];
    const eqLoad = EQUATION_MODULES[slug];
    const fc = fcLoad ? await fcLoad() : { FIELD_CONFIGS: [], SECTION_VISIBILITY: [] };
    const eq = eqLoad ? await eqLoad() : { EQUATIONS: [] };
    const cfgs = fc.FIELD_CONFIGS as Array<{ widget: string; visible_when?: string | null; create?: unknown }>;
    const by = (w: string) => cfgs.filter((c) => c.widget === w).length;
    const registers = by('register');
    const s1 = by('select_one');
    const sm = by('select_many');
    const lf = by('lookup_fill');
    const other = cfgs.length - registers - s1 - sm - lf;
    const fieldVw = cfgs.filter((c) => c.visible_when != null && c.visible_when !== '').length;
    const secVw = (fc.SECTION_VISIBILITY as unknown[]).length;
    const equations = (eq.EQUATIONS as unknown[]).length;
    const created = cfgs.filter((c) => c.create != null).length;
    const out = tables + trows + registers + fieldVw + secVw + equations;
    rows.push([slug, tables, trows, registers, s1, sm, lf, other, fieldVw, secVw, equations, created, out].join('\t'));
  }
  console.log(rows.join('\n'));
}

void main();
