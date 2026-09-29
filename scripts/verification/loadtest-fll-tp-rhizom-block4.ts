/**
 * Disposable proof for FLL-TP-RHIZOM-2023 coverage block 4a/4b (NO prod, NO credentials) — same mechanism as the
 * GAR/Naturteich proofs: harness embedded Postgres with the full Drizzle schema (+ prod-only audit columns), seeded with
 * the touched templates, the fields whose flags 4b changes and the four gates 4b updates (current prod state, read 2026-09-29);
 * 4a ×2, 4b ×2, read-back, every new/changed condition through the REAL evaluator three ways, rollbacks.
 * Run: pnpm exec tsx scripts/verification/loadtest-fll-tp-rhizom-block4.ts
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { startHarness } from '../../tests/harness/embedded-pg';
import { evaluateCondition } from '@/lib/compliance/evaluate';

type V = number | string | boolean;
const M = (p: string) => readFileSync(p, 'utf8');
const A = 'scripts/migrations/20260929230000_fll_tp_rhizom_fields_coverage_block4a.sql';
const B = 'scripts/migrations/20260929230100_fll_tp_rhizom_gates_coverage_block4b.sql';
const RA = 'scripts/migrations/rollback-20260929230000_fll_tp_rhizom_fields_coverage_block4a.sql';
const RB = 'scripts/migrations/rollback-20260929230100_fll_tp_rhizom_gates_coverage_block4b.sql';

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
    const [std] = await sql`insert into standards (code, title_de, version) values ('FLL-TP-RHIZOM-2023', 'FLL Prüfverfahren Rhizomfestigkeit', '2023') returning id`;
    const codes = ['FLLTP-RHZ-04', 'FLLTP-RHZ-05', 'FLLTP-RHZ-06', 'FLLTP-RHZ-09', 'FLLTP-RHZ-12', 'FLLTP-RHZ-17', 'FLLTP-RHZ-19', 'FLLTP-RHZ-20'];
    const wt: Record<string, string> = {};
    for (const c of codes) {
      const [r] = await sql`insert into worksheet_templates (standard_id, code, title_de) values (${std.id}, ${c}, ${c}) returning id`;
      wt[c] = r.id;
      for (const sc of ['C', 'D']) await sql`insert into worksheet_sections (worksheet_template_id, code, title_de) values (${r.id}, ${sc}, ${sc})`;
    }
    const seedFields: [string, string, string, boolean][] = [
      ['FLLTP-RHZ-05', 'widerlager_dicke_mm', 'number', true], ['FLLTP-RHZ-05', 'widerlager_material', 'text', true],
      ['FLLTP-RHZ-06', 'vts_gesamt_dicke_mm', 'number', false],
      ['FLLTP-RHZ-20', 'pruefgrundlagen_unveraendert', 'boolean', true], ['FLLTP-RHZ-20', 'produkt_aktuell_im_lieferprogramm', 'boolean', true],
      ['FLLTP-RHZ-20', 'rueckstellmuster_erneut_hinterlegt', 'boolean', true], ['FLLTP-RHZ-20', 'eidesstattliche_erklaerung_vorhanden', 'boolean', true],
      ['FLLTP-RHZ-20', 'verlangerung_zeitabschnitt_jahre', 'number', true],
    ];
    for (const [w, sym, t, req] of seedFields) await sql`insert into fields (worksheet_template_id, symbol, label_de, data_type, is_required) values (${wt[w]}, ${sym}, ${sym}, ${t}, ${req})`;
    const gates: [string, string, string, string][] = [
      ['FLLTP-RHZ-05', 'REQ-06', 'block', 'gefaess_innenmass_l_mm >= 800 AND gefaess_innenmass_b_mm >= 800 AND gefaess_innenmass_h_mm >= 250 AND anzahl_pruefgefaesse == 8 AND anzahl_kontrollgefaesse == 3 AND wasserablauf_durchmesser_mm == 40 AND widerlager_dicke_mm >= 9 AND widerlager_dicke_mm <= 11'],
      ['FLLTP-RHZ-04', 'REQ-10', 'block', "testpflanze_art == 'phragmites_australis' AND pflanzdichte_pro_gefaess == 8"],
      ['FLLTP-RHZ-12', 'REQ-14', 'block', 'wasserstand_max_ueber_vts_mm == 20 AND wasserstand_min_unter_vts_mm == 50 AND duenger_intervall_monate == 1 AND duenger_gabe_g == 5 AND duenger_loesung_l == 20 AND ersatz_pflanzen_periode_mon <= 3 AND halmschnitt_im_gruenen_zulaessig == false'],
      ['FLLTP-RHZ-20', 'REQ-22', 'block', 'pruefgrundlagen_unveraendert == true AND produkt_aktuell_im_lieferprogramm == true AND rueckstellmuster_erneut_hinterlegt == true AND eidesstattliche_erklaerung_vorhanden == true'],
    ];
    for (const [w, code, sev, cond] of gates) await sql`insert into compliance_requirements (worksheet_template_id, code, title_de, condition, severity) values (${wt[w]}, ${code}, ${code}, ${cond}, ${sev})`;
    const counts = async () => {
      const [f] = await sql`select count(*)::int n from fields`;
      const [e] = await sql`select count(*)::int n from equations`;
      const [g] = await sql`select count(*)::int n from compliance_requirements`;
      return { fields: f.n, equations: e.n, gates: g.n };
    };
    const c0 = await counts();
    check('seed', c0.fields === 8 && c0.equations === 0 && c0.gates === 4, c0);

    await apply(A);
    const c1 = await counts();
    await apply(A);
    const c1b = await counts();
    check('4a applied: 17 new fields, 3 equations', c1.fields === 25 && c1.equations === 3, c1);
    check('4a idempotent', JSON.stringify(c1) === JSON.stringify(c1b), c1b);
    const derivedSec = await sql`select f.symbol, ws.code sec from fields f join worksheet_sections ws on ws.id = f.section_id where f.widget = 'derived' order by 1`;
    const [vts] = await sql`select widget from fields where symbol = 'vts_gesamt_dicke_mm'`;
    check('4a derived fields in section D (new) / widget set on vts_gesamt_dicke_mm', derivedSec.filter((r) => r.symbol.startsWith('gefaess_')).every((r) => r.sec === 'D') && vts.widget === 'derived', { derivedSec, vts });
    const reqNew = await sql`select count(*)::int n from fields where is_required = true`;
    check('4a leaves the seeded required flags untouched (7)', reqNew[0].n === 7, reqNew[0]);

    await apply(B);
    const c2 = await counts();
    await apply(B);
    const c2b = await counts();
    check('4b applied: 4 new gates', c2.gates === 8, c2);
    check('4b idempotent', JSON.stringify(c2) === JSON.stringify(c2b), c2b);
    const flags = await sql`select symbol, is_required, visible_when from fields where symbol in ('widerlager_dicke_mm','widerlager_material','pruefgrundlagen_unveraendert','produkt_aktuell_im_lieferprogramm','rueckstellmuster_erneut_hinterlegt','eidesstattliche_erklaerung_vorhanden','verlangerung_zeitabschnitt_jahre') order by 1`;
    check('4b abutment + extension fields optional with visible_when', flags.length === 7 && flags.every((r) => r.is_required === false && r.visible_when), flags);
    const hosts = await sql`select cr.code, w.code ws, cr.severity, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
    const host = (code: string) => hosts.find((r) => r.code === code);
    check('REQ-06/-10/-14/-22 updated (guarded UPDATEs matched)', String(host('REQ-06')?.condition).includes('widerlager_eingebaut') && String(host('REQ-10')?.condition).includes('gefaess_skalierungsfaktor') && String(host('REQ-14')?.condition).includes('gefaess_skalierungsfaktor') && String(host('REQ-22')?.condition).startsWith('IF verlaengerung_beantragt'));

    const V6 = { gefaess_innenmass_l_mm: 800, gefaess_innenmass_b_mm: 800, gefaess_innenmass_h_mm: 250, anzahl_pruefgefaesse: 8, anzahl_kontrollgefaesse: 3, wasserablauf_durchmesser_mm: 40, kontrollgefaesse_wasserdicht: true };
    const cases: Record<string, { pass: Record<string, V>; fail: Record<string, V>; na?: Record<string, V> }> = {
      'REQ-06': { pass: { ...V6, widerlager_eingebaut: true, widerlager_dicke_mm: 10 }, fail: { ...V6, widerlager_eingebaut: true, widerlager_dicke_mm: 15 }, na: { ...V6, widerlager_eingebaut: false } },
      'REQ-10': { pass: { testpflanze_art: 'phragmites_australis', pflanzdichte_pro_gefaess: 13, gefaess_skalierungsfaktor: 1.5625 }, fail: { testpflanze_art: 'phragmites_australis', pflanzdichte_pro_gefaess: 8, gefaess_skalierungsfaktor: 1.5625 } },
      'REQ-14': { pass: { wasserstand_max_ueber_vts_mm: 20, wasserstand_min_unter_vts_mm: 50, duenger_intervall_monate: 1, duenger_gabe_g: 5, duenger_loesung_l: 20, gefaess_skalierungsfaktor: 1, ersatz_pflanzen_periode_mon: 3, halmschnitt_im_gruenen_zulaessig: false }, fail: { wasserstand_max_ueber_vts_mm: 20, wasserstand_min_unter_vts_mm: 50, duenger_intervall_monate: 1, duenger_gabe_g: 5, duenger_loesung_l: 20, gefaess_skalierungsfaktor: 1.5625, ersatz_pflanzen_periode_mon: 3, halmschnitt_im_gruenen_zulaessig: false } },
      'REQ-22': { pass: { verlaengerung_beantragt: true, pruefgrundlagen_unveraendert: true, produkt_aktuell_im_lieferprogramm: true, rueckstellmuster_erneut_hinterlegt: true, eidesstattliche_erklaerung_vorhanden: true, verlangerung_zeitabschnitt_jahre: 5 }, fail: { verlaengerung_beantragt: true, pruefgrundlagen_unveraendert: true, produkt_aktuell_im_lieferprogramm: false, rueckstellmuster_erneut_hinterlegt: true, eidesstattliche_erklaerung_vorhanden: true, verlangerung_zeitabschnitt_jahre: 5 }, na: { verlaengerung_beantragt: false } },
      'REQ-23': { pass: { rueckstellprobe_flaeche_m2: 0.6, rueckstellprobe_enthaelt_naht_je_fuegetechnik: true, rueckstellprobe_lager_temp_min_C: 8, rueckstellprobe_lager_temp_max_C: 22, rueckstellprobe_trocken_dunkel: true }, fail: { rueckstellprobe_flaeche_m2: 0.4, rueckstellprobe_enthaelt_naht_je_fuegetechnik: true, rueckstellprobe_lager_temp_min_C: 8, rueckstellprobe_lager_temp_max_C: 22, rueckstellprobe_trocken_dunkel: true } },
      'REQ-24': { pass: { gueltigkeitsdauer_jahre: 10 }, fail: { gueltigkeitsdauer_jahre: 5 } },
      'REQ-25': { pass: { standrohr_anzahl: 2, standrohr_durchmesser_mm: 50, standrohr_laenge_mm: 200 }, fail: { standrohr_anzahl: 1, standrohr_durchmesser_mm: 50, standrohr_laenge_mm: 200 } },
      'REQ-26': { pass: { vts_gesamt_dicke_mm: 170 }, fail: { vts_gesamt_dicke_mm: 150 } },
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

    await apply(RB);
    const c3 = await counts();
    check('4b rollback → 4 gates', c3.gates === 4, c3);
    const hosts2 = await sql`select cr.code, w.code ws, cr.condition from compliance_requirements cr join worksheet_templates w on w.id = cr.worksheet_template_id order by cr.code`;
    check('4b rollback restores conditions', hosts2.every((r) => gates.some((g) => g[1] === r.code && g[0] === r.ws && g[3] === r.condition)), hosts2.map((r) => r.code));
    const flags2 = await sql`select count(*)::int n from fields where is_required = true and visible_when is null`;
    check('4b rollback restores the 7 required flags', flags2[0].n === 7, flags2[0]);
    await apply(RA);
    const c4 = await counts();
    check('4a rollback → seed state', JSON.stringify(c4) === JSON.stringify(c0), c4);
  } finally {
    await raw.end({ timeout: 5 });
    await h.stop();
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
