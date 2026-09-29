/**
 * Disposable proof for FLL-GAR-2023 coverage block 2a/2b (NO prod, NO credentials).
 * 1. Boots the harness embedded Postgres with the FULL Drizzle schema (tests/harness/embedded-pg.ts).
 * 2. Seeds the standard, the touched worksheet templates + section C, the one field the label repair
 *    touches and the seven gates the 2b UPDATEs touch (with their CURRENT prod conditions, read 2026-09-29).
 * 3. Applies 2a twice (idempotent), 2b twice, reads back, then rolls both back → seed state.
 * 4. Drives every new/changed gate condition through the REAL evaluator (src/lib/compliance/evaluate.ts)
 *    three ways: no values (must be pending/manual, never a parse error), a passing state, a failing state.
 * Run: pnpm exec tsx scripts/verification/loadtest-fll-gar-block2.ts
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { startHarness } from '../../tests/harness/embedded-pg';
import { evaluateCondition } from '@/lib/compliance/evaluate';

type V = number | string | boolean;
const M = (p: string) => readFileSync(p, 'utf8');
const A = 'scripts/migrations/20260929210000_fll_gar_2023_fields_coverage_block2a.sql';
const B = 'scripts/migrations/20260929210100_fll_gar_2023_gates_coverage_block2b.sql';
const RA = 'scripts/migrations/rollback-20260929210000_fll_gar_2023_fields_coverage_block2a.sql';
const RB = 'scripts/migrations/rollback-20260929210100_fll_gar_2023_gates_coverage_block2b.sql';

async function main() {
const h = await startHarness();
const sql = h.sql;
// apply-migration.mjs semantics: one dedicated connection (max: 1) so a file with its own BEGIN/COMMIT is accepted.
const raw = postgres(h.databaseUrl, { max: 1, prepare: false });
const apply = (p: string) => raw.unsafe(M(p));
let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
  if (!ok) failures++;
};
try {
  // Prod carries audit columns that the Drizzle model does not declare (added by SQL migrations; read from information_schema 2026-09-29).
  await sql.unsafe("ALTER TABLE fields ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS requires_attestation boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text, ADD COLUMN IF NOT EXISTS audit_status text; ALTER TABLE equations ADD COLUMN IF NOT EXISTS source_quote text, ADD COLUMN IF NOT EXISTS source_anchor text;");
  // ---- seed ----
  const [std] = await sql`insert into standards (code, title_de, version) values ('FLL-GAR-2023', 'FLL Gewässerabdichtungsrichtlinien', '2023-12') returning id`;
  const codes = ['FLL-GAR-05', 'FLL-GAR-06', 'FLL-GAR-07', 'FLL-GAR-08', 'FLL-GAR-09', 'FLL-GAR-10', 'FLL-GAR-16', 'FLL-GAR-18', 'FLL-GAR-20', 'FLL-GAR-22', 'FLL-GAR-23', 'FLL-GAR-24', 'FLL-GAR-27'];
  const wt: Record<string, string> = {};
  for (const c of codes) {
    const [r] = await sql`insert into worksheet_templates (standard_id, code, title_de) values (${std.id}, ${c}, ${c}) returning id`;
    wt[c] = r.id;
    await sql`insert into worksheet_sections (worksheet_template_id, code, title_de) values (${r.id}, 'C', 'Worksheet-Specific Content')`;
  }
  const oldEnum = [{ value: 'ja', label_de: 'werkseitig vorkonfektio- nierten Bahnen für gering beanspruchte Nutzungen (z. B. Gartenteiche) sind Bahnendicken ≥ 1,0 mm zulässig. Abdichtungen mit Kunststoff- und Elastomerbahnen sind i. d. R. einlagig.', order_index: 1 }, { value: 'nein', label_de: 'nein — Regelfall (Mindestdicke 1,2 mm)', order_index: 2 }];
  await sql`insert into fields (worksheet_template_id, symbol, label_de, data_type, widget, enum_values) values (${wt['FLL-GAR-16']}, 'bahn_vorkonfektioniert', 'x', 'enum', 'select_one', ${sql.json(oldEnum)})`;
  const gates: [string, string, string, string][] = [
    ['FLL-GAR-10', 'REQ-12', 'block', 'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97'],
    ['FLL-GAR-10', 'REQ-18', 'block', 'IF abdichtungs_art == bahn_kunststoff_elastomer THEN bahnendicke_mm >= 1.2'],
    ['FLL-GAR-10', 'REQ-20', 'block', 'IF abdichtungs_art == bahn_pe THEN peeh_dichte_g_cm3 > 0.940 AND peeh_mfr >= 1.0 AND peeh_mfr <= 3.0 AND peeh_russgehalt_pct >= 2 AND peeh_russgehalt_pct <= 3'],
    ['FLL-GAR-10', 'REQ-22', 'warn', 'IF abdichtungs_art == alkalisilikat THEN schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20'],
    ['FLL-GAR-22', 'REQ-11', 'warn', ''],
    ['FLL-GAR-22', 'REQ-24', 'warn', ''],
    ['FLL-GAR-23', 'REQ-23', 'warn', 'freibord_zu_gelaende_cm >= 5 AND freibord_zu_bauwerk_cm >= 30'],
  ];
  for (const [w, code, sev, cond] of gates) await sql`insert into compliance_requirements (worksheet_template_id, code, title_de, condition, severity) values (${wt[w]}, ${code}, ${code}, ${cond}, ${sev})`;
  const counts = async () => {
    const [f] = await sql`select count(*)::int n from fields`;
    const [e] = await sql`select count(*)::int n from equations`;
    const [g] = await sql`select count(*)::int n from compliance_requirements`;
    return { fields: f.n, equations: e.n, gates: g.n };
  };
  const c0 = await counts();
  check('seed', c0.fields === 1 && c0.equations === 0 && c0.gates === 7, c0);

  // ---- 2a ----
  await apply(A);
  const c1 = await counts();
  await apply(A);
  const c1b = await counts();
  check('2a applied: 43 new fields, 1 equation', c1.fields === 44 && c1.equations === 1, c1);
  check('2a idempotent', JSON.stringify(c1) === JSON.stringify(c1b), c1b);
  const [lbl] = await sql`select enum_values->0->>'label_de' l from fields where symbol = 'bahn_vorkonfektioniert'`;
  check('2a label repair', String(lbl.l).startsWith('ja — werkseitig vorkonfektionierte'), lbl.l);
  const bad = await sql`select symbol from fields where section_id is null and symbol <> 'bahn_vorkonfektioniert'`;
  check('2a every new field landed in section C', bad.length === 0, bad.map((r) => r.symbol));
  const req = await sql`select count(*)::int n from fields where is_required = true`;
  check('2a no new field is required', req[0].n === 0);
  const perWs = await sql`select w.code, count(*)::int n, max(f.order_index) mx from fields f join worksheet_templates w on w.id = f.worksheet_template_id group by w.code order by w.code`;
  console.table(perWs);

  // ---- 2b ----
  await apply(B);
  const c2 = await counts();
  await apply(B);
  const c2b = await counts();
  check('2b applied: 10 new gates', c2.gates === 17, c2);
  check('2b idempotent', JSON.stringify(c2) === JSON.stringify(c2b), c2b);
  const hosts = await sql`select cr.code, w.code ws, cr.severity, length(cr.condition) len from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
  const host = (code: string) => hosts.find((r) => r.code === code);
  check('REQ-18 re-hosted to FLL-GAR-16', host('REQ-18')?.ws === 'FLL-GAR-16');
  check('REQ-22 re-hosted to FLL-GAR-20', host('REQ-22')?.ws === 'FLL-GAR-20');
  check('REQ-11 / REQ-24 now have conditions and severity block', host('REQ-11')?.len > 0 && host('REQ-24')?.len > 0 && host('REQ-11')?.severity === 'block' && host('REQ-24')?.severity === 'block');
  check('REQ-12 / REQ-20 / REQ-23 updated (guarded UPDATE matched)', host('REQ-12')!.len > 240 && host('REQ-20')!.len > 200 && host('REQ-23')!.len > 60, hosts.map((r) => `${r.code}@${r.ws}:${r.len}`));

  // ---- evaluator proof: every condition, three ways ----
  const conds = await sql`select cr.code, cr.condition from compliance_requirements cr order by cr.code`;
  const cases: Record<string, { pass: Record<string, V>; fail: Record<string, V>; na?: Record<string, V> }> = {
    'REQ-12': { pass: { abdichtungs_art: 'mineralisch_ohne_zusatzstoffe', kornanteil_unter_2micron: 20, organische_substanz_VGL: 3, kalkgehalt_VCA: 10, kf_abdichtung: 1e-10, verdichtungsgrad_Dpr: 98, w_pr_pct: 12, einbauwassergehalt_w_pct: 13, w_097pr_pct: 15, luftporenanteil_na_pct: 3 }, fail: { abdichtungs_art: 'mineralisch_ohne_zusatzstoffe', kornanteil_unter_2micron: 20, organische_substanz_VGL: 3, kalkgehalt_VCA: 10, kf_abdichtung: 1e-10, verdichtungsgrad_Dpr: 98, w_pr_pct: 12, einbauwassergehalt_w_pct: 20, w_097pr_pct: 15, luftporenanteil_na_pct: 3 }, na: { abdichtungs_art: 'bahn_pe' } },
    'REQ-18': { pass: { abdichtungs_art: 'bahn_kunststoff_elastomer', bahnendicke_mm: 1.0, bahnendicke_min_mm: 1.0 }, fail: { abdichtungs_art: 'bahn_kunststoff_elastomer', bahnendicke_mm: 1.0, bahnendicke_min_mm: 1.2 } },
    'REQ-20': { pass: { abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PEHD', peeh_dichte_g_cm3: 0.95, peeh_mfr: 2, peeh_russgehalt_pct: 2.5, peeh_russverteilung_kat: 2, peeh_massaenderung_pct: 1, peeh_nctl_h: 600, peeh_oit_min: 150, peeh_bbodschv_unbedenklich: true }, fail: { abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PEHD', peeh_dichte_g_cm3: 0.95, peeh_mfr: 2, peeh_russgehalt_pct: 2.5, peeh_russverteilung_kat: 2, peeh_massaenderung_pct: 1, peeh_nctl_h: 300, peeh_oit_min: 150, peeh_bbodschv_unbedenklich: true }, na: { abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PELD' } },
    'REQ-22': { pass: { abdichtungs_art: 'alkalisilikat', as_schichtdicke_cm: 30, feinkornanteil_063_pct: 25, as_lockerungstiefe_cm: 30 }, fail: { abdichtungs_art: 'alkalisilikat', as_schichtdicke_cm: 30, feinkornanteil_063_pct: 25, as_lockerungstiefe_cm: 20 } },
    'REQ-11': { pass: { mit_bepflanzung: true, abdichtungs_art: 'bahn_kunststoff_elastomer', wurzelfestigkeit_testat_quecken: true, pflanzen_aggressiv_count: 0 }, fail: { mit_bepflanzung: true, abdichtungs_art: 'bahn_kunststoff_elastomer', wurzelfestigkeit_testat_quecken: true, pflanzen_aggressiv_count: 2, rhizomfestigkeit_gewaesser_pruefung: false }, na: { mit_bepflanzung: true, abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PEHD' } },
    'REQ-24': { pass: { sl_baugrund_groesstkorn_mm: 1.5, sl_ueberlappung_cm: 12 }, fail: { sl_baugrund_groesstkorn_mm: 5, sl_schutzlage_unten_dicke_cm: 3, sl_schutzlage_unten_sand_min_cm: 5, sl_ueberlappung_cm: 12 } },
    'REQ-23': { pass: { freibord_zu_gelaende_cm: 6, randbefestigung_angepasst: true, freibord_zu_bauwerk_cm: 16 }, fail: { freibord_zu_gelaende_cm: 6, randbefestigung_angepasst: false, freibord_zu_bauwerk_cm: 16 } },
    'REQ-31': { pass: { baugrund_ev2_mpa: 50, baugrund_ev2_ev1: 2.0 }, fail: { baugrund_ev2_mpa: 40, baugrund_ev2_ev1: 2.0 } },
    'REQ-32': { pass: { baugrund_dpr_pct: 98 }, fail: { baugrund_dpr_pct: 95 } },
    'REQ-33': { pass: { abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PELD', pe_nenndicke_mm: 1.0, peld_nenndicke_min_mm: 0.8 }, fail: { abdichtungs_art: 'bahn_pe', pe_werkstoff: 'PELD', pe_nenndicke_mm: 0.5, peld_nenndicke_min_mm: 0.8 } },
    'REQ-34': { pass: { abdichtungs_art: 'bahn_pe', boeschung_steilste_1m: 12, pe_querueberlappung_vermieden: true, pe_scherversuch_durchgefuehrt: true }, fail: { abdichtungs_art: 'bahn_pe', boeschung_steilste_1m: 8, pe_boeschung_strukturiert: false, pe_querueberlappung_vermieden: true, pe_scherversuch_durchgefuehrt: true } },
    'REQ-35': { pass: { abdichtungs_art: 'bahn_pe', pe_probeschweissung_durchgefuehrt: true, pe_nahtpruefung_protokoll: true }, fail: { abdichtungs_art: 'bahn_pe', pe_probeschweissung_durchgefuehrt: true, pe_nahtpruefung_protokoll: false } },
    'REQ-36': { pass: { abdichtungs_art: 'bahn_pe', naht_pe_ueberlappung_mm: 120 }, fail: { abdichtungs_art: 'bahn_pe', naht_pe_ueberlappung_mm: 80 } },
    'REQ-37': { pass: { abdichtungs_art: 'bahn_pe', neurissbildung: 'moeglich', pe_riss_entstehung_mm: 0.3, pe_riss_aufweitung_mm: 1.5, pe_riss_versatz_mm: 0.5 }, fail: { abdichtungs_art: 'bahn_pe', neurissbildung: 'moeglich', pe_riss_entstehung_mm: 0.8, pe_riss_aufweitung_mm: 1.5, pe_riss_versatz_mm: 0.5 }, na: { abdichtungs_art: 'bahn_pe', neurissbildung: 'ausgeschlossen' } },
    'REQ-38': { pass: { abdichtungs_art: 'alkalisilikat', as_dpr_pct: 98, as_kf_m_s: 5e-10, as_organische_substanz_VGL: 3, as_kalkgehalt_VCA: 10 }, fail: { abdichtungs_art: 'alkalisilikat', as_dpr_pct: 98, as_kf_m_s: 5e-9, as_organische_substanz_VGL: 3, as_kalkgehalt_VCA: 10 } },
    'REQ-39': { pass: { abdichtungs_art: 'bahn_kunststoff_elastomer', naht_verletzungen: 0 }, fail: { abdichtungs_art: 'bahn_kunststoff_elastomer', naht_verletzungen: 1 } },
    'REQ-40': { pass: { gewaesser_an_gebaeudeteilen: true, notueberlauf_vorhanden: true, notueberlauf_hoeher_als_regelueberlauf: true, notueberlauf_kapazitaet_l_s: 30, Q_NOT: 23.28 }, fail: { gewaesser_an_gebaeudeteilen: true, notueberlauf_vorhanden: true, notueberlauf_hoeher_als_regelueberlauf: true, notueberlauf_kapazitaet_l_s: 20, Q_NOT: 23.28 }, na: { gewaesser_an_gebaeudeteilen: false } },
  };
  const ev = (cond: string, vals: Record<string, V>) => evaluateCondition(cond, (s) => vals[s]);
  for (const { code, condition } of conds) {
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

  // ---- rollbacks ----
  await apply(RB);
  const c3 = await counts();
  check('2b rollback → 7 gates', c3.gates === 7, c3);
  const hosts2 = await sql`select cr.code, w.code ws, cr.severity, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
  check('2b rollback restores hosts + conditions', hosts2.every((r) => gates.some((g) => g[1] === r.code && g[0] === r.ws && g[3] === r.condition && g[2] === r.severity)), hosts2.map((r) => `${r.code}@${r.ws}`));
  await apply(RA);
  const c4 = await counts();
  check('2a rollback → seed state', JSON.stringify(c4) === JSON.stringify(c0), c4);
  const [lbl2] = await sql`select enum_values->0->>'label_de' l from fields where symbol = 'bahn_vorkonfektioniert'`;
  check('2a rollback restores the old label', String(lbl2.l).startsWith('werkseitig vorkonfektio- nierten'));
} finally {
  await raw.end({ timeout: 5 });
  await h.stop();
}
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
