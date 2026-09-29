/**
 * Disposable proof for FLL-Naturteich coverage block 3a/3b (NO prod, NO credentials) — same mechanism as
 * loadtest-fll-gar-block2.ts: harness embedded Postgres with the full Drizzle schema (+ prod-only audit columns),
 * seeded with the touched templates, EQ-05 and the two gates the 3b UPDATEs touch (current prod state, read 2026-09-29);
 * 3a ×2, 3b ×2, read-back, every new/changed condition through the REAL evaluator three ways, rollbacks.
 * Run: pnpm exec tsx scripts/verification/loadtest-fll-naturteich-block3.ts
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { startHarness } from '../../tests/harness/embedded-pg';
import { evaluateCondition } from '@/lib/compliance/evaluate';

type V = number | string | boolean;
const M = (p: string) => readFileSync(p, 'utf8');
const A = 'scripts/migrations/20260929220000_fll_naturteich_fields_coverage_block3a.sql';
const B = 'scripts/migrations/20260929220100_fll_naturteich_gates_coverage_block3b.sql';
const RA = 'scripts/migrations/rollback-20260929220000_fll_naturteich_fields_coverage_block3a.sql';
const RB = 'scripts/migrations/rollback-20260929220100_fll_naturteich_gates_coverage_block3b.sql';

async function main() {
  const h = await startHarness();
  const sql = h.sql;
  const raw = postgres(h.databaseUrl, { max: 1, prepare: false });
  const apply = (p: string) => raw.unsafe(M(p));
  let failures = 0;
  const check = (label: string, ok: boolean, detail?: unknown) => {
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
    if (!ok) failures++;
  };
  try {
    await sql.unsafe("ALTER TABLE fields ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS requires_attestation boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE equations ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text;");
    const [std] = await sql`insert into standards (code, title_de, version) values ('FLL-Naturteich', 'FLL Schwimm- und Badeteiche', '2017') returning id`;
    const codes = ['FLLNT-03', 'FLLNT-06', 'FLLNT-07', 'FLLNT-09', 'FLLNT-11', 'FLLNT-13'];
    const wt: Record<string, string> = {};
    for (const c of codes) {
      const [r] = await sql`insert into worksheet_templates (standard_id, code, title_de) values (${std.id}, ${c}, ${c}) returning id`;
      wt[c] = r.id;
      await sql`insert into worksheet_sections (worksheet_template_id, code, title_de) values (${r.id}, 'C', 'Worksheet-Specific Content')`;
    }
    await sql`insert into equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol) values (${wt['FLLNT-11']}, 'EQ-05', 'splash_water_tank_volume >= 150 * pool_underwater_surface', ${sql.array(['splash_water_tank_volume', 'pool_underwater_surface'])}, NULL)`;
    const gates: [string, string, string, string][] = [
      ['FLLNT-09', 'REQ-33', 'block', 'IF rigid_overflow_used == true THEN splash_water_tank_volume >= 150 * pool_underwater_surface'],
      ['FLLNT-13', 'REQ-26', 'block', 'acceptance_passed == true OR defects_noted IS EMPTY'],
    ];
    for (const [w, code, sev, cond] of gates) await sql`insert into compliance_requirements (worksheet_template_id, code, title_de, condition, severity) values (${wt[w]}, ${code}, ${code}, ${cond}, ${sev})`;
    const counts = async () => {
      const [f] = await sql`select count(*)::int n from fields`;
      const [e] = await sql`select count(*)::int n from equations`;
      const [g] = await sql`select count(*)::int n from compliance_requirements`;
      return { fields: f.n, equations: e.n, gates: g.n };
    };
    const c0 = await counts();
    check('seed', c0.fields === 0 && c0.equations === 1 && c0.gates === 2, c0);

    await apply(A);
    const c1 = await counts();
    await apply(A);
    const c1b = await counts();
    check('3a applied: 13 new fields, 1 new equation', c1.fields === 13 && c1.equations === 2, c1);
    check('3a idempotent', JSON.stringify(c1) === JSON.stringify(c1b), c1b);
    const bad = await sql`select symbol from fields where section_id is null or is_required = true`;
    check('3a all fields in section C and not required', bad.length === 0, bad.map((r) => r.symbol));

    await apply(B);
    const c2 = await counts();
    await apply(B);
    const c2b = await counts();
    check('3b applied: 9 new gates', c2.gates === 11, c2);
    check('3b idempotent', JSON.stringify(c2) === JSON.stringify(c2b), c2b);
    const [eq] = await sql`select formula, input_symbols from equations where equation_number = 'EQ-05'`;
    check('EQ-05 operand rewritten', eq.formula === 'splash_water_tank_volume >= 150 * overflow_connected_water_surface_m2' && (eq.input_symbols as string[]).includes('overflow_connected_water_surface_m2'), eq);
    const hosts = await sql`select cr.code, w.code ws, cr.severity, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
    const host = (code: string) => hosts.find((r) => r.code === code);
    check('REQ-33 re-hosted to FLLNT-11 with the new operand', host('REQ-33')?.ws === 'FLLNT-11' && String(host('REQ-33')?.condition).includes('overflow_connected_water_surface_m2'));
    check('REQ-26 tightened', host('REQ-26')?.condition === 'acceptance_passed == true');

    const cases: Record<string, { pass: Record<string, V>; fail: Record<string, V>; na?: Record<string, V> }> = {
      'REQ-33': { pass: { rigid_overflow_used: true, splash_water_tank_volume: 5000, overflow_connected_water_surface_m2: 30 }, fail: { rigid_overflow_used: true, splash_water_tank_volume: 4000, overflow_connected_water_surface_m2: 30 }, na: { rigid_overflow_used: false } },
      'REQ-26': { pass: { acceptance_passed: true }, fail: { acceptance_passed: false, defects_noted: '' } },
      'REQ-34': { pass: { natural_pool_type: 'type_II', surface_discharge_hours_per_day: 8 }, fail: { natural_pool_type: 'type_II', surface_discharge_hours_per_day: 10 }, na: { natural_pool_type: 'type_I' } },
      'REQ-35': { pass: { natural_pool_type: 'type_IV', feed_share_of_volume_pct: 90 }, fail: { natural_pool_type: 'type_III', feed_share_of_volume_pct: 20 }, na: { natural_pool_type: 'type_II' } },
      'REQ-36': { pass: { natural_pool_type: 'type_III', filter_operation_hours_per_day: 14, filter_max_downtime_h: 0.5 }, fail: { natural_pool_type: 'type_V', filter_operation_hours_per_day: 20 }, na: { natural_pool_type: 'type_I' } },
      'REQ-37': { pass: { natural_pool_type: 'type_I', submerged_hydrobot_share_calc: 60 }, fail: { natural_pool_type: 'type_II', submerged_hydrobot_share_calc: 40 }, na: { natural_pool_type: 'type_IV' } },
      'REQ-38': { pass: { sealing_type: 'EPDM', liner_on_concrete_base: false, crease_height_max_cm: 0.8, crease_length_max_m: 1.5, crease_min_distance_m: 2.5, creases_crossing: false }, fail: { sealing_type: 'PVC', liner_on_concrete_base: false, crease_height_max_cm: 1.5, crease_length_max_m: 1.5, crease_min_distance_m: 2.5, creases_crossing: false }, na: { sealing_type: 'clay_loam' } },
      'REQ-39': { pass: { entry_exit_point_count: 1 }, fail: { entry_exit_point_count: 0 } },
      'REQ-40': { pass: { overflow_tolerance_violations: 0 }, fail: { overflow_tolerance_violations: 2 } },
      'REQ-41': { pass: { overflow_edge_length_total: 0.4, overflow_edge_length: 0.3 }, fail: { overflow_edge_length_total: 0.2, overflow_edge_length: 0.3 } },
      'REQ-42': { pass: { completion_notice_days_advance: 3 }, fail: { completion_notice_days_advance: 2 } },
    };
    const ev = (cond: string, vals: Record<string, V>) => evaluateCondition(cond, (s) => vals[s]);
    for (const { code, condition } of hosts) {
      const cs = cases[code];
      if (!cs) { check(`${code} has an evaluator case`, false); continue; }
      const empty = ev(condition, {});
      const p = ev(condition, cs.pass);
      const f = ev(condition, cs.fail);
      const na = cs.na ? ev(condition, cs.na) : undefined;
      check(`${code} empty → ${empty.kind}`, empty.kind !== 'error' && empty.kind !== 'fail', empty);
      check(`${code} pass state → ${p.kind}`, p.kind === 'pass', p.kind === 'pass' ? undefined : p);
      check(`${code} fail state → ${f.kind}`, f.kind === 'fail', f.kind === 'fail' ? undefined : f);
      if (na) check(`${code} not-applicable state → ${na.kind}`, na.kind === 'pass', na.kind === 'pass' ? undefined : na);
    }
    // REQ-38 on concrete: the concrete declaration satisfies the gate without crease values
    const r38 = ev(host('REQ-38')!.condition, { sealing_type: 'EPDM', liner_on_concrete_base: true });
    check(`REQ-38 concrete base → ${r38.kind}`, r38.kind === 'pass', r38);

    await apply(RB);
    const c3 = await counts();
    check('3b rollback → 2 gates', c3.gates === 2, c3);
    const [eq2] = await sql`select formula from equations where equation_number = 'EQ-05'`;
    check('3b rollback restores EQ-05', eq2.formula === 'splash_water_tank_volume >= 150 * pool_underwater_surface');
    const hosts2 = await sql`select cr.code, w.code ws, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
    check('3b rollback restores hosts + conditions', hosts2.every((r) => gates.some((g) => g[1] === r.code && g[0] === r.ws && g[3] === r.condition)), hosts2.map((r) => `${r.code}@${r.ws}`));
    await apply(RA);
    const c4 = await counts();
    check('3a rollback → seed state', JSON.stringify(c4) === JSON.stringify(c0), c4);
  } finally {
    await raw.end({ timeout: 5 });
    await h.stop();
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
