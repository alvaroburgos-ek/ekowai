// @vitest-environment node
/**
 * O-9 (UX follow-up 2026-10-14): the save path's stale-flag UPDATE wiring at unit level. The query-count tests
 * (`capture-tx*`) only count queries and the decision (`planStaleFlags`) is unit-tested on its own; here the pass that
 * `saveWorksheet` runs inside its SAVEPOINT (`runStaleFlagPass`) is driven against a recording fake client and every
 * statement is rendered to SQL with drizzle's PgDialect, so the tests pin
 *   - WHICH rows each UPDATE touches (field ids) and its scoping (project_id; the fast path also `is_stale = true`),
 *   - SET vs CLEAR (`is_stale` true / false),
 *   - the M-4 rule: the consumer pass reads the consumer instances of THIS project and skips locked templates,
 *   - the L-3 fast path (no rule, no consumer ⇒ no visibility load, one clearing UPDATE),
 *   - empty plans issue no UPDATE, and every statement goes through the savepoint client.
 * The decision itself is the real `planStaleFlags` over real `buildVisibilityArgs` — nothing about it is mocked.
 */
import { describe, it, expect } from 'vitest';
import { getTableName, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { runStaleFlagPass, type StalePassClient, type StalePassContext } from '../stale-pass';
import type { ParameterValueColumns } from '@/lib/projects/required-fields';
import { buildVisibilityArgs, type StandardVisibilityField, type StandardVisibilityMeta, type ProjectFieldRow } from '../approval-gate';

const dialect = new PgDialect();
const render = (cond: SQL | undefined) => (cond ? dialect.sqlToQuery(cond) : { sql: '', params: [] as unknown[] });

type Stmt =
  | { kind: 'update'; table: string; set: Record<string, unknown>; sql: string; params: unknown[] }
  | { kind: 'select'; table: string; sql: string; params: unknown[] };

/** Recording fake of the drizzle savepoint client: `update(t).set(v).where(c)` and `select(cols).from(t).where(c)`. */
function makeClient(selectRows: Record<string, Record<string, unknown>[]> = {}) {
  const log: Stmt[] = [];
  const client = {
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            where(cond: SQL) {
              const q = render(cond);
              log.push({ kind: 'update', table: getTableName(table as never), set: values, sql: q.sql, params: q.params });
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          const name = getTableName(table as never);
          return {
            where(cond: SQL) {
              const q = render(cond);
              log.push({ kind: 'select', table: name, sql: q.sql, params: q.params });
              return Promise.resolve(selectRows[name] ?? []);
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as StalePassClient, log };
}

const P = 'proj-1';
const empty: ParameterValueColumns = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
const fld = (o: Partial<StandardVisibilityField> & { id: string; symbol: string; templateId: string }): StandardVisibilityField => ({
  labelDe: o.symbol, dataType: 'boolean', isRequired: false, sectionId: null, visibleWhen: null,
  templateCode: o.templateId, unit: null, widget: null, uiConfig: null, consumerWorksheets: null, ...o,
});

/**
 * DWA-M 820-1 shape: T10 holds the procedure (enum) + an own question `bieterfragen` asked unless direct award;
 * T11 asks `leistungswettbewerb_only` unless direct award (consumer of T10's driver).
 */
const FIELDS = [
  fld({ id: 'f-proc', symbol: 'procurement_procedure', templateId: 'T10', dataType: 'enum' }),
  fld({ id: 'f-bf', symbol: 'bieterfragen', templateId: 'T10', visibleWhen: "procurement_procedure != 'direktvergabe'" }),
  fld({ id: 'f-note', symbol: 'note', templateId: 'T10', dataType: 'text' }),
  fld({ id: 'f-lw', symbol: 'leistungswettbewerb_only', templateId: 'T11', visibleWhen: "procurement_procedure != 'direktvergabe'" }),
];
const META: StandardVisibilityMeta = { standardCode: 'DWA-M-820-1', templateIds: ['T10', 'T11'], fields: FIELDS, sections: [] };
const PROJECT_FIELDS: ProjectFieldRow[] = FIELDS.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType, templateId: f.templateId, standardCode: 'DWA-M-820-1' }));

type Param = ParameterValueColumns & { fieldId: string; isStale?: boolean; sourceType?: string };
const enumP = (fieldId: string, v: string, o: Partial<Param> = {}): Param => ({ ...empty, fieldId, valueEnum: v, sourceType: 'entered', ...o });
const boolP = (fieldId: string, v: boolean, o: Partial<Param> = {}): Param => ({ ...empty, fieldId, valueBoolean: v, sourceType: 'entered', ...o });
const textP = (fieldId: string, v: string, o: Partial<Param> = {}): Param => ({ ...empty, fieldId, valueText: v, sourceType: 'entered', ...o });

function ctx(over: Partial<StalePassContext> & { params: Param[]; meta?: StandardVisibilityMeta | null }) {
  const calls = { getVisMeta: [] as unknown[], loadVisNow: [] as unknown[] };
  const meta = over.meta === undefined ? META : over.meta;
  const c: StalePassContext = {
    projectId: P,
    worksheetTemplateId: 'T10',
    savedTemplateCode: 'M820-10',
    writtenFieldIds: ['f-proc'],
    symbolById: new Map(FIELDS.map((f) => [f.id, f.symbol])),
    getVisMeta: async (client) => {
      calls.getVisMeta.push(client);
      return meta;
    },
    loadVisNow: async (client) => {
      calls.loadVisNow.push(client);
      if (!meta) return null;
      const args = buildVisibilityArgs(meta, PROJECT_FIELDS, over.params);
      return args ? { meta, args } : null;
    },
    ...over,
  };
  return { c, calls };
}

const updates = (log: Stmt[]) => log.filter((s): s is Extract<Stmt, { kind: 'update' }> => s.kind === 'update');
/** The WHERE of every flag UPDATE (rendered on its own; the SET value is asserted via `set`). */
const SCOPE = /^\("project_parameters"\."project_id" = \$1 and "project_parameters"\."field_id" in \(/;

describe('runStaleFlagPass — fast path (L-3: no rule on the sheet, nobody reads what was written)', () => {
  it('one clearing UPDATE scoped to project + written ids + is_stale = true; no visibility load, no instance read', async () => {
    const meta: StandardVisibilityMeta = { ...META, fields: [FIELDS[2]], templateIds: ['T10'] };
    const { client, log } = makeClient();
    const { c, calls } = ctx({ meta, params: [textP('f-note', 'x')], writtenFieldIds: ['f-note'] });
    await runStaleFlagPass(client, c);

    expect(calls.getVisMeta).toEqual([client]);
    expect(calls.loadVisNow).toEqual([]);
    expect(log.filter((s) => s.kind === 'select')).toEqual([]);
    const u = updates(log);
    expect(u).toHaveLength(1);
    expect(u[0].table).toBe('project_parameters');
    expect(u[0].set).toEqual({ isStale: false });
    expect(u[0].sql).toBe(
      '("project_parameters"."project_id" = $1 and "project_parameters"."field_id" in ($2) and "project_parameters"."is_stale" = $3)',
    );
    expect(u[0].params).toEqual([P, 'f-note', true]);
  });

  it('no standard metadata (standard unknown) ⇒ still only the clearing UPDATE', async () => {
    const { client, log } = makeClient();
    const { c, calls } = ctx({ meta: null, params: [], writtenFieldIds: ['f-a', 'f-b'] });
    await runStaleFlagPass(client, c);
    expect(calls.loadVisNow).toEqual([]);
    const u = updates(log);
    expect(u).toHaveLength(1);
    expect(u[0].set).toEqual({ isStale: false });
    expect(u[0].params).toEqual([P, 'f-a', 'f-b', true]);
  });
});

describe('runStaleFlagPass — own sheet (R-12)', () => {
  it('direct award: the hidden valued own answer is SET stale, the flagged visible written row is CLEARED; both scoped to the project', async () => {
    const params = [enumP('f-proc', 'direktvergabe'), boolP('f-bf', true), textP('f-note', 'n', { isStale: true })];
    const { client, log } = makeClient({ worksheet_instances: [] });
    const { c, calls } = ctx({ params, writtenFieldIds: ['f-proc', 'f-note'], worksheetTemplateId: 'T10' });
    await runStaleFlagPass(client, c);

    expect(calls.loadVisNow).toEqual([client]);
    const u = updates(log);
    expect(u).toHaveLength(2);
    const [set, clear] = u;
    expect(set.set).toEqual({ isStale: true });
    expect(set.sql).toMatch(SCOPE);
    expect(set.params).toEqual([P, 'f-bf']);
    expect(clear.set).toEqual({ isStale: false });
    expect(clear.sql).toMatch(SCOPE);
    // only a FLAGGED written row is cleared (f-proc carries no flag ⇒ not in the statement)
    expect(clear.params).toEqual([P, 'f-note']);
    // the hidden row is never cleared, the visible rows are never set
    expect(clear.params).not.toContain('f-bf');
    expect(set.params).not.toContain('f-note');
  });

  it('open procedure: nothing hidden ⇒ no SET statement at all; the flagged answer re-saved visible is cleared', async () => {
    const params = [enumP('f-proc', 'offen'), boolP('f-bf', true, { isStale: true })];
    const { client, log } = makeClient({ worksheet_instances: [] });
    const { c } = ctx({ params, writtenFieldIds: ['f-proc', 'f-bf'] });
    await runStaleFlagPass(client, c);
    const u = updates(log);
    expect(u.map((x) => x.set)).toEqual([{ isStale: false }]);
    expect(u[0].sql).toMatch(SCOPE);
    expect(u[0].params).toEqual([P, 'f-bf']);
  });

  it('a flagged visible answer that was NOT written in this save keeps its flag; an already flagged hidden row is not set again ⇒ no UPDATE', async () => {
    const params = [enumP('f-proc', 'offen'), boolP('f-bf', true, { isStale: true })];
    const { client, log } = makeClient({ worksheet_instances: [] });
    const { c } = ctx({ params, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);
    expect(updates(log)).toEqual([]);

    const hidden = [enumP('f-proc', 'direktvergabe'), boolP('f-bf', true, { isStale: true })];
    const r2 = makeClient({ worksheet_instances: [] });
    await runStaleFlagPass(r2.client, ctx({ params: hidden, writtenFieldIds: ['f-proc'] }).c);
    expect(updates(r2.log)).toEqual([]);
  });

  it('derived rows are never flagged', async () => {
    const params = [enumP('f-proc', 'direktvergabe'), boolP('f-bf', true, { sourceType: 'derived' })];
    const { client, log } = makeClient({ worksheet_instances: [] });
    const { c } = ctx({ params, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);
    expect(updates(log).filter((x) => x.set.isStale === true)).toEqual([]);
  });
});

describe('runStaleFlagPass — consumer sheets (R-13 + M-4)', () => {
  const params = [enumP('f-proc', 'direktvergabe'), boolP('f-lw', false)];

  it('the instance read is scoped to THIS project and the consumer templates; an editable consumer is flagged (SET only)', async () => {
    const { client, log } = makeClient({ worksheet_instances: [{ templateId: 'T11', status: 'draft' }] });
    const { c } = ctx({ params, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);

    const sel = log.filter((s) => s.kind === 'select');
    expect(sel).toHaveLength(1);
    expect(sel[0].table).toBe('worksheet_instances');
    expect(sel[0].sql).toMatch(/"worksheet_instances"\."project_id" = \$1 and "worksheet_instances"\."worksheet_template_id" in \(\$2\)/);
    expect(sel[0].params).toEqual([P, 'T11']);

    const u = updates(log);
    const set = u.filter((x) => x.set.isStale === true);
    expect(set).toHaveLength(1);
    expect(set[0].sql).toMatch(SCOPE);
    expect(set[0].params).toEqual([P, 'f-lw']);
    // a consumer row is never cleared from another sheet's save
    for (const x of u.filter((y) => y.set.isStale === false)) expect(x.params).not.toContain('f-lw');
  });

  it.each(['engineer_approved', 'final', 'deactivated'])('a %s consumer instance is skipped: nothing to write ⇒ no UPDATE', async (status) => {
    const { client, log } = makeClient({ worksheet_instances: [{ templateId: 'T11', status }] });
    const { c } = ctx({ params, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);
    expect(log.filter((s) => s.kind === 'select').map((s) => s.table)).toEqual(['worksheet_instances']);
    expect(updates(log)).toEqual([]);
  });

  it('a locked consumer is skipped while an editable one in the same save is flagged', async () => {
    const meta: StandardVisibilityMeta = {
      ...META,
      templateIds: ['T10', 'T11', 'T12'],
      fields: [...FIELDS, fld({ id: 'f-12', symbol: 'q12', templateId: 'T12', visibleWhen: "procurement_procedure != 'direktvergabe'" })],
    };
    const p2 = [...params, boolP('f-12', true)];
    const { client, log } = makeClient({
      worksheet_instances: [{ templateId: 'T11', status: 'engineer_approved' }, { templateId: 'T12', status: 'submitted_for_review' }],
    });
    const { c } = ctx({ meta, params: p2, writtenFieldIds: ['f-proc'] });
    // the meta's project fields must include T12 for buildVisibilityArgs
    c.loadVisNow = async () => {
      const pf: ProjectFieldRow[] = meta.fields.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType, templateId: f.templateId, standardCode: 'DWA-M-820-1' }));
      const args = buildVisibilityArgs(meta, pf, p2);
      return args ? { meta, args } : null;
    };
    await runStaleFlagPass(client, c);
    const sel = log.filter((s) => s.kind === 'select');
    expect(sel[0].params.slice(1).sort()).toEqual(['T11', 'T12']);
    const set = updates(log).filter((x) => x.set.isStale === true);
    expect(set.map((x) => x.params)).toEqual([[P, 'f-12']]);
  });

  it('a stale consumer answer that is VISIBLE again is not cleared by the driver sheet (only its own save clears it)', async () => {
    const p2 = [enumP('f-proc', 'offen'), boolP('f-lw', false, { isStale: true })];
    const { client, log } = makeClient({ worksheet_instances: [{ templateId: 'T11', status: 'draft' }] });
    const { c } = ctx({ params: p2, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);
    const u = updates(log);
    expect(u.filter((x) => x.set.isStale === true)).toEqual([]);
    expect(u.flatMap((x) => x.params)).not.toContain('f-lw');
  });

  it('every statement runs on the savepoint client handed in (no other client)', async () => {
    const { client } = makeClient({ worksheet_instances: [{ templateId: 'T11', status: 'draft' }] });
    const { c, calls } = ctx({ params, writtenFieldIds: ['f-proc'] });
    await runStaleFlagPass(client, c);
    expect(calls.getVisMeta.every((x) => x === client)).toBe(true);
    expect(calls.loadVisNow.every((x) => x === client)).toBe(true);
  });
});
