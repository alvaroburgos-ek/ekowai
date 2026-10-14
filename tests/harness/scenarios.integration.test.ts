// @vitest-environment node
import './_harness-env-scenarios';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getScenarioHarness } from './_harness-env-scenarios';
import { FIXTURE_SHEETS, ENTERED, K5 } from '@/lib/scenarios/__fixtures__/hellenthal-a138';
import type * as Actions from '@/lib/actions/scenarios';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';
import type { recomputeWorksheetEquations as Recompute } from '@/lib/actions/recompute-worksheet';
import type { checkApprovalGate as CheckGate } from '@/lib/actions/approval-gate';
import type { loadProjectReportData as LoadReport } from '@/lib/pdf/load-data';
import type { loadScenarioBaseline as LoadBaseline } from '@/lib/scenarios/load-baseline';
import type { runScenarioChain as Run } from '@/lib/eval/scenario-chain';

const { harness, fixture } = getScenarioHarness();
const sql = harness.sql;
let A: typeof Actions;
let saveWorksheet: typeof SaveWorksheet;
let recompute: typeof Recompute;
let checkApprovalGate: typeof CheckGate;
let loadProjectReportData: typeof LoadReport;
let loadScenarioBaseline: typeof LoadBaseline;
let runScenarioChain: typeof Run;

const STD = 'DWA-A-138-1';
const F = (k: string) => fixture.fieldIds[k];
const close = (a: unknown, b: number, rel = 1e-9) => expect(Math.abs(Number(a) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
async function stored(key: string): Promise<number | null> {
  const [r] = await sql<{ v: string | null }[]>`SELECT value_number::text AS v FROM project_parameters WHERE project_id = ${fixture.projectId} AND field_id = ${F(key)}`;
  return r?.v == null ? null : Number(r.v);
}
async function save(code: string, values: Record<string, unknown>) {
  const res = await saveWorksheet({ instanceId: fixture.instances[code], values: values as never });
  expect(res.ok, `saveWorksheet(${code}): ${JSON.stringify(res)}`).toBe(true);
}
async function fingerprint() {
  const one = async (t: string) => (await sql.unsafe(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h, count(*)::int AS n FROM ${t} x`))[0];
  return { pp: await one('project_parameters'), wi: await one('worksheet_instances'), ae: await one('approval_events'), al: await one('audit_log') };
}

beforeAll(async () => {
  A = await import('@/lib/actions/scenarios');
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ recomputeWorksheetEquations: recompute } = await import('@/lib/actions/recompute-worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
  ({ loadProjectReportData } = await import('@/lib/pdf/load-data'));
  ({ loadScenarioBaseline } = await import('@/lib/scenarios/load-baseline'));
  ({ runScenarioChain } = await import('@/lib/eval/scenario-chain'));

  // The record, built through the REAL save path: entered values per sheet in phase order …
  for (const s of FIXTURE_SHEETS) {
    const vals: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ENTERED)) if (k.startsWith(`${s.code}:`)) vals[F(k)] = v;
    if (Object.keys(vals).length > 0) await save(s.code, vals);
  }
  // … then the server recompute (MCP path) and the producer re-fires, twice, until the chain has settled.
  for (let i = 0; i < 2; i++) {
    for (const code of ['A138-11', 'A138-12', 'A138-13', 'A138-26']) await recompute(fixture.instances[code]);
    await save('A138-12', {});
    await save('A138-17', { [F('A138-17:h_M')]: { type: 'number', value: 0.3 } });
  }
  for (const code of ['A138-13', 'A138-26']) await recompute(fixture.instances[code]);
}, 120_000);

afterAll(async () => { await harness.stop(); });

describe('the record (real save path) carries the C4 hand values', () => {
  it('k_i, A_S,m, Q_S, V_VA, q_S,AC, V_M', async () => {
    close(await stored('A138-11:k_i'), 3e-8);
    close(await stored('A138-12:A_S_m'), 45);
    close(await stored('A138-12:Q_S'), 0.0015);
    close(await stored('A138-13:V_VA'), 70.0037505216);
    close(await stored('A138-13:q_S_AC'), 0.025655132309218457);
    close(await stored('A138-17:V_M'), 13.5);
  });
});

describe('Real = record (spec §6)', () => {
  it('the zero-override run reproduces every stored derived value it recomputes', async () => {
    const b = await loadScenarioBaseline(fixture.projectId, STD);
    expect(b).not.toBeNull();
    const real = runScenarioChain(b!, [], { caseId: 'real', approvalWithholding: 'bypass' });
    expect(real.mismatches, JSON.stringify(real.mismatches)).toEqual([]);
    expect(real.converged).toBe(true);
    // G-4: V_Rueck follows the aggregator's flood column (T 30 a today; T 100 a once fix/flood-check-t100 lands).
    expect([31.640062406400006, 55.30568077439999].some((x) => Math.abs((Number(real.values[F('A138-26:V_Rueck')]?.value)) - x) < 1e-6)).toBe(true);
    // … and whichever column it is, the Real run equals what the save path stored (never a hard-coded column).
    const storedVRueck = await stored('A138-26:V_Rueck');
    expect(storedVRueck).not.toBeNull();
    close(real.values[F('A138-26:V_Rueck')]?.value, storedVRueck!);
  });
});

describe('cases through the actions — isolation (spec §6)', () => {
  let before: Awaited<ReturnType<typeof fingerprint>>;
  let gateBefore: unknown;
  let reportBefore: unknown;
  let k5Id = '';
  beforeAll(async () => {
    before = await fingerprint();
    gateBefore = await checkApprovalGate(fixture.instances['A138-10']);
    reportBefore = await loadProjectReportData(fixture.projectId);
  });

  it('setting + K5 created with validated overrides; base values recorded', async () => {
    expect((await A.setScenariosEnabled(fixture.projectId, true)).ok).toBe(true);
    const c = await A.createScenario({ projectId: fixture.projectId, name: 'K5 – Feldversuch k_f 1e-5', reason: 'Feldversuch ausstehend' });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    k5Id = c.scenario.id;
    expect(c.scenario.slot).toBe(1);
    const raw: Record<string, unknown> = { 'A138-05:k_f': '1e-5', 'A138-03:f_methode': 1, 'A138-08:f_ort': '1', 'A138-12:a_s_m_determination_method': 'geometry' };
    expect(Object.keys(raw).sort()).toEqual(Object.keys(K5).sort());
    const s = await A.setScenarioOverrides(k5Id, Object.entries(raw).map(([k, value]) => ({ fieldId: F(k), value, note: 'Annahme Feldversuch' })));
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (s.ok) expect(s.scenario.overrides.find((o) => o.symbol === 'k_f')).toMatchObject({ baseValueAtCreation: { type: 'number', value: 1e-6 }, drift: false });
  });

  it('getScenarioResults: K5 → A_S,m 48.58 m², REQ-15 passes; Real unchanged', async () => {
    const r = await A.getScenarioResults(fixture.projectId, STD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const k5 = r.cases.find((c) => c.scenario.id === k5Id)!;
    close(k5.run.values[F('A138-12:A_S_m')].value, 48.57599051396648);
    expect(k5.run.sheets['A138-10'].compliance.find((c) => c.code === 'A138-REQ-15')?.result.kind).toBe('pass');
    close(r.real!.values[F('A138-12:A_S_m')].value, 45);
  });

  it('refuses a derived field, a server-materialised field, an invalid enum and a missing note — and writes nothing', async () => {
    const count = async () => (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenario_overrides WHERE scenario_id = ${k5Id}`)[0].n;
    const n0 = await count();
    const ki = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-11:k_i'), value: 1e-5, note: 'x' }]);
    expect(ki).toMatchObject({ ok: false, error: expect.stringMatching(/wird berechnet/) });
    const vm = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-17:V_M'), value: 20, note: 'x' }]);
    expect(vm).toMatchObject({ ok: false, error: expect.stringMatching(/vom Werkzeug berechnet|abgeleiteter Wert/) });
    const en = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-12:a_s_m_determination_method'), value: 'magic', note: 'x' }]);
    expect(en).toMatchObject({ ok: false, error: expect.stringMatching(/keine zulässige Auswahl/) });
    const no = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-05:k_f'), value: 2e-5, note: '  ' }]);
    expect(no).toMatchObject({ ok: false, error: expect.stringMatching(/Notiz/) });
    const mixed = await A.setScenarioOverrides(k5Id, [{ fieldId: F('A138-05:k_f'), value: 2e-5, note: 'ok' }, { fieldId: F('A138-11:k_i'), value: 1, note: 'x' }]);
    expect(mixed.ok).toBe(false); // all-or-nothing
    expect(await count()).toBe(n0);
  });

  it('limits: 6 active; concurrent create at the limit lets exactly one through; 7th refused; archive frees a slot', async () => {
    for (let i = 2; i <= 5; i++) expect((await A.createScenario({ projectId: fixture.projectId, name: `K${i}` })).ok).toBe(true);
    const race = await Promise.all([A.createScenario({ projectId: fixture.projectId, name: 'R1' }), A.createScenario({ projectId: fixture.projectId, name: 'R2' })]);
    expect(race.filter((x) => x.ok)).toHaveLength(1);
    const seventh = await A.createScenario({ projectId: fixture.projectId, name: 'K7' });
    expect(seventh).toEqual({ ok: false, error: expect.stringMatching(/Höchstens 6 aktive Fälle/) });
    const list = await A.listScenarios(fixture.projectId);
    expect(list.ok && list.scenarios.length).toBe(6);
    const victim = list.ok ? list.scenarios.find((s) => s.name === 'K3')! : null;
    expect((await A.archiveScenario(victim!.id)).ok).toBe(true);
    const again = await A.createScenario({ projectId: fixture.projectId, name: 'K8' });
    expect(again.ok && again.scenario.slot).toBe(victim!.slot);
  });

  it('archived ids are ignored (returned, never computed)', async () => {
    const all = await A.listScenarios(fixture.projectId, { includeArchived: true });
    const archived = all.ok ? all.scenarios.find((s) => s.archivedAt != null)! : null;
    const r = await A.getScenarioResults(fixture.projectId, STD, [archived!.id, k5Id]);
    expect(r.ok && r.ignoredScenarioIds).toEqual([archived!.id]);
    expect(r.ok && r.cases.map((c) => c.scenario.id)).toEqual([k5Id]);
  });

  it('nothing in the record changed: tables, gate, report data', async () => {
    expect(await fingerprint()).toEqual(before);
    expect(await checkApprovalGate(fixture.instances['A138-10'])).toEqual(gateBefore);
    expect(await loadProjectReportData(fixture.projectId)).toEqual(reportBefore);
  });
});

describe('drift (spec §2)', () => {
  it('a later change of the real value shows „Realwert geändert"', async () => {
    const list0 = await A.listScenarios(fixture.projectId);
    const k5 = list0.ok ? list0.scenarios.find((s) => s.name.startsWith('K5'))! : null;
    await save('A138-05', { [F('A138-05:k_f')]: { type: 'number', value: 2e-6 } });
    const list1 = await A.listScenarios(fixture.projectId);
    const o = list1.ok ? list1.scenarios.find((s) => s.id === k5!.id)!.overrides.find((x) => x.symbol === 'k_f')! : null;
    expect(o).toMatchObject({ drift: true, baseValueAtCreation: { type: 'number', value: 1e-6 }, currentReal: { type: 'number', value: 2e-6 } });
    await save('A138-05', { [F('A138-05:k_f')]: { type: 'number', value: 1e-6 } });
  });
});

describe('access + scope hardening (Task 9 review additions)', () => {
  const NOT_FOUND = 'Fall nicht gefunden oder kein Zugriff.';
  const NO_ACCESS = 'Kein Zugriff auf dieses Projekt.';
  let foreignProjectId = '';
  let foreignCaseId = '';
  let clientProjectId = '';
  let clientCaseId = '';
  let siblingCaseId = '';
  let otherProjectFieldId = '';
  let deactivatedSheetFieldId = '';
  const caseRow = async (id: string) =>
    (await sql`SELECT name, reason, sort_order, include_in_report, archived_at, updated_at FROM project_scenarios WHERE id = ${id}`)[0];
  const overrideRows = async (id: string) =>
    sql`SELECT field_id, value, base_value_at_creation, note, updated_at FROM project_scenario_overrides WHERE scenario_id = ${id} ORDER BY field_id`;

  beforeAll(async () => {
    // (a) a project in an org the harness user does not belong to, with one case + one override.
    const [o1] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('Foreign Org', ${'scn-foreign-' + Date.now()}) RETURNING id`;
    const [p1] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${o1.id}, 'TEST-SCN-FOREIGN', ${fixture.userId}) RETURNING id`;
    foreignProjectId = p1.id;
    const [c1] = await sql<{ id: string }[]>`INSERT INTO project_scenarios (project_id, name, sort_order, created_by) VALUES (${p1.id}, 'Fremd', 1, ${fixture.userId}) RETURNING id`;
    foreignCaseId = c1.id;
    await sql`INSERT INTO project_scenario_overrides (scenario_id, field_id, value, note) VALUES (${c1.id}, ${F('A138-05:k_f')}, ${sql.json({ type: 'number', value: 3e-6 })}, 'fremd')`;
    // (b) a project of another org where the harness user is only a CLIENT collaborator, with one case.
    const [o2] = await sql<{ id: string }[]>`INSERT INTO orgs (name, slug) VALUES ('Client Org', ${'scn-client-' + Date.now()}) RETURNING id`;
    const [p2] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${o2.id}, 'TEST-SCN-CLIENT', ${fixture.userId}) RETURNING id`;
    clientProjectId = p2.id;
    await sql`INSERT INTO project_collaborators (project_id, user_id, role, invited_by) VALUES (${p2.id}, ${fixture.userId}, 'client', ${fixture.userId})`;
    const [c2] = await sql<{ id: string }[]>`INSERT INTO project_scenarios (project_id, name, sort_order, created_by) VALUES (${p2.id}, 'Kunde', 1, ${fixture.userId}) RETURNING id`;
    clientCaseId = c2.id;
    // (a') a second project of the harness user's OWN org with a case — results for the main project must not compute it.
    const [org] = await sql<{ org_id: string }[]>`SELECT org_id FROM projects WHERE id = ${fixture.projectId}`;
    const [p3] = await sql<{ id: string }[]>`INSERT INTO projects (org_id, name, created_by) VALUES (${org.org_id}, 'TEST-SCN-SIBLING', ${fixture.userId}) RETURNING id`;
    const [c3] = await sql<{ id: string }[]>`INSERT INTO project_scenarios (project_id, name, sort_order, created_by) VALUES (${p3.id}, 'Nachbar', 1, ${fixture.userId}) RETURNING id`;
    siblingCaseId = c3.id;
    // (c) fields of another standard: one sheet instantiated only in the foreign project, one sheet in the main
    // project but deactivated.
    const [std] = await sql<{ id: string }[]>`INSERT INTO standards (code, title_de, version) VALUES ('HARNESS-OTHER', 'Harness other', 'harness') RETURNING id`;
    const mk = async (code: string, projectId: string, status: string) => {
      const [t] = await sql<{ id: string }[]>`INSERT INTO worksheet_templates (standard_id, code, title_de, phase, order_index) VALUES (${std.id}, ${code}, ${code}, 1, 1) RETURNING id`;
      const [sec] = await sql<{ id: string }[]>`INSERT INTO worksheet_sections (worksheet_template_id, code, title_de) VALUES (${t.id}, ${'S-' + code}, ${'S-' + code}) RETURNING id`;
      await sql`INSERT INTO worksheet_instances (project_id, worksheet_template_id, status) VALUES (${projectId}, ${t.id}, ${status})`;
      const [f] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, is_required, order_index)
        VALUES (${t.id}, ${sec.id}, 'x_in', 'x_in', 'number', true, false, 1) RETURNING id`;
      return f.id;
    };
    otherProjectFieldId = await mk('OTHER-01', foreignProjectId, 'draft');
    deactivatedSheetFieldId = await mk('OTHER-02', fixture.projectId, 'deactivated');
  });

  it('(a) a case id of a project without access: every case action answers „Fall nicht gefunden oder kein Zugriff." and the case is untouched', async () => {
    const before = { row: await caseRow(foreignCaseId), ov: await overrideRows(foreignCaseId) };
    const nScen = async () => (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenarios WHERE project_id = ${foreignProjectId}`)[0].n;
    const n0 = await nScen();
    expect(await A.updateScenario(foreignCaseId, { name: 'gekapert', includeInReport: true })).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.archiveScenario(foreignCaseId)).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.setScenarioOverrides(foreignCaseId, [{ fieldId: F('A138-05:k_f'), value: 9e-6, note: 'x' }])).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.removeScenarioOverride(foreignCaseId, F('A138-05:k_f'))).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.duplicateScenario(foreignCaseId, 'Kopie')).toEqual({ ok: false, error: NOT_FOUND });
    // indistinguishable from a case that does not exist at all
    expect(await A.updateScenario('00000000-0000-4000-8000-0000000fffff', { name: 'x' })).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.listScenarios(foreignProjectId)).toEqual({ ok: false, error: NO_ACCESS });
    expect({ row: await caseRow(foreignCaseId), ov: await overrideRows(foreignCaseId) }).toEqual(before);
    expect(await nScen()).toBe(n0);
  });

  it('(a) foreign and sibling-project case ids passed to getScenarioResults are ignored, never computed', async () => {
    const r = await A.getScenarioResults(fixture.projectId, STD, [foreignCaseId, siblingCaseId]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ignoredScenarioIds).toEqual([foreignCaseId, siblingCaseId]);
    expect(r.cases).toEqual([]);
  });

  it('(b) a client collaborator (not an org member) is refused for read and write; nothing is written', async () => {
    const before = await caseRow(clientCaseId);
    expect(await A.listScenarios(clientProjectId)).toEqual({ ok: false, error: NO_ACCESS });
    expect(await A.getScenarioResults(clientProjectId, STD)).toEqual({ ok: false, error: NO_ACCESS });
    expect(await A.searchOverridableFields(clientProjectId, 'k_f')).toEqual({ ok: false, error: NO_ACCESS });
    expect(await A.createScenario({ projectId: clientProjectId, name: 'Kunde 2' })).toEqual({ ok: false, error: NO_ACCESS });
    expect(await A.setScenariosEnabled(clientProjectId, true)).toEqual({ ok: false, error: NO_ACCESS });
    expect(await A.updateScenario(clientCaseId, { name: 'x' })).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.setScenarioOverrides(clientCaseId, [{ fieldId: F('A138-05:k_f'), value: 9e-6, note: 'x' }])).toEqual({ ok: false, error: NOT_FOUND });
    expect(await A.archiveScenario(clientCaseId)).toEqual({ ok: false, error: NOT_FOUND });
    expect(await caseRow(clientCaseId)).toEqual(before);
    expect((await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenarios WHERE project_id = ${clientProjectId}`)[0].n).toBe(1);
    expect((await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenario_settings WHERE project_id = ${clientProjectId}`)[0].n).toBe(0);
    expect((await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenario_overrides WHERE scenario_id = ${clientCaseId}`)[0].n).toBe(0);
  });

  it('(c) a field of another project or of a deactivated sheet is refused, also inside a mixed batch — nothing is written', async () => {
    const list = await A.listScenarios(fixture.projectId);
    const k2 = list.ok ? list.scenarios.find((s) => s.name === 'K2')! : null;
    expect(k2).toBeTruthy();
    const before = await overrideRows(k2!.id);
    const other = await A.setScenarioOverrides(k2!.id, [{ fieldId: otherProjectFieldId, value: 1, note: 'x' }]);
    expect(other).toMatchObject({ ok: false, error: expect.stringMatching(/gehört zu keinem Arbeitsblatt dieses Projekts/) });
    const deact = await A.setScenarioOverrides(k2!.id, [{ fieldId: deactivatedSheetFieldId, value: 1, note: 'x' }]);
    expect(deact).toMatchObject({ ok: false, error: expect.stringMatching(/gehört zu keinem Arbeitsblatt dieses Projekts/) });
    const mixed = await A.setScenarioOverrides(k2!.id, [
      { fieldId: F('A138-05:k_f'), value: 2e-5, note: 'ok' },
      { fieldId: otherProjectFieldId, value: 1, note: 'x' },
    ]);
    expect(mixed.ok).toBe(false);
    expect(await overrideRows(k2!.id)).toEqual(before);
    expect((await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM project_scenario_overrides WHERE field_id IN (${otherProjectFieldId}, ${deactivatedSheetFieldId})`)[0].n).toBe(0);
  });

  it('(d) an archived case is frozen: removing (or setting) an override is refused and the overrides stay', async () => {
    const list = await A.listScenarios(fixture.projectId);
    const k5 = list.ok ? list.scenarios.find((s) => s.name.startsWith('K5'))! : null;
    expect(k5).toBeTruthy();
    const before = await overrideRows(k5!.id);
    expect(before.length).toBe(4);
    expect((await A.archiveScenario(k5!.id)).ok).toBe(true);
    expect(await A.removeScenarioOverride(k5!.id, F('A138-05:k_f'))).toEqual({ ok: false, error: 'Ein archivierter Fall kann nicht geändert werden.' });
    expect(await A.setScenarioOverrides(k5!.id, [{ fieldId: F('A138-05:k_f'), value: 3e-5, note: 'x' }])).toEqual({ ok: false, error: 'Ein archivierter Fall kann nicht geändert werden.' });
    expect(await overrideRows(k5!.id)).toEqual(before);
  });
});

describe('tables absent (migration not applied) — code tolerates it (spec §7)', () => {
  it('reads say unavailable, writes refuse, results still give the Real run', async () => {
    await sql.unsafe('DROP TABLE project_scenario_overrides, project_scenarios, project_scenario_settings CASCADE');
    expect(await A.listScenarios(fixture.projectId)).toEqual({ ok: true, available: false, enabled: false, scenarios: [] });
    expect(await A.createScenario({ projectId: fixture.projectId, name: 'X' })).toEqual({ ok: false, error: expect.stringMatching(/nicht eingerichtet/) });
    const r = await A.getScenarioResults(fixture.projectId, STD);
    expect(r.ok && r.available).toBe(false);
    expect(r.ok && r.real).toBeTruthy();
    const { loadScenariosEnabled } = await import('@/lib/scenarios/load-baseline');
    expect(await loadScenariosEnabled(fixture.projectId)).toBe(false);
  });
});
