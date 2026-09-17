/**
 * I-3 (final review, guideline-to-tool): `loadRegisterSources` replaces the
 * `surface_inventory`-only `loadSurfaceSource`. For a consumer worksheet it
 * returns EVERY register-widget field (DB `widget='register'` OR a TS fallback
 * symbol) on ANOTHER worksheet of the standard that this worksheet consumes —
 * directly (`consumer_worksheets` contains the current code) or transitively
 * (an equation of the owner turns the register into a symbol this worksheet
 * consumes: the A138-07 surface_inventory → A_C → A138-10 case, where the
 * carrier field itself declares no consumers) — each with the owner instance
 * status, the stored carrier, and the owner's {widget, uiConfig} so the form
 * resolves the config from the DB row first.
 *
 * DB fully mocked (src/test-shims/fake-drizzle.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fakeDb, ROWS } = await vi.hoisted(async () => {
  const { makeFakeDb } = await import('@/test-shims/fake-drizzle');
  const ROWS: Record<string, Record<string, unknown>[]> = { fields: [], equations: [], worksheet_instances: [], project_parameters: [] };
  return { fakeDb: makeFakeDb(ROWS), ROWS };
});
vi.mock('@/lib/db', () => ({ db: fakeDb }));

const UI_X = { title: 'Register X', columns: [{ key: 'a', type: 'text', label: 'A' }] };

beforeEach(() => {
  fakeDb.log.length = 0;
  // Fields on OTHER templates of the standard (the query excludes the current template's code).
  ROWS.fields = [
    // (1) DB register, directly consumed by X-10.
    { id: 'f-x', symbol: 'reg_x', dataType: 'json', widget: 'register', uiConfig: UI_X, consumerWorksheets: ['X-10'], ownerCode: 'X-07', templateId: 'tpl-07' },
    // (2) TS-fallback register (widget NULL), NOT directly consumed — but its owner's equation produces A_C, which X-10 consumes.
    { id: 'f-surf', symbol: 'surface_inventory', dataType: 'json', widget: null, uiConfig: null, consumerWorksheets: null, ownerCode: 'X-08', templateId: 'tpl-08' },
    { id: 'f-ac', symbol: 'A_C', dataType: 'number', widget: null, uiConfig: null, consumerWorksheets: ['X-10'], ownerCode: 'X-08', templateId: 'tpl-08' },
    // (3) DB register consumed by a DIFFERENT worksheet only ⇒ not returned.
    { id: 'f-y', symbol: 'reg_y', dataType: 'json', widget: 'register', uiConfig: UI_X, consumerWorksheets: ['X-11'], ownerCode: 'X-09', templateId: 'tpl-09' },
    // (4) a json field WITHOUT any register config, directly consumed ⇒ not a register source.
    { id: 'f-j', symbol: 'plain_json', dataType: 'json', widget: null, uiConfig: null, consumerWorksheets: ['X-10'], ownerCode: 'X-09', templateId: 'tpl-09' },
  ];
  ROWS.equations = [
    { templateId: 'tpl-08', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C' },
  ];
  ROWS.worksheet_instances = [
    { templateId: 'tpl-07', status: 'final' },
    { templateId: 'tpl-08', status: 'draft' },
  ];
  ROWS.project_parameters = [
    { fieldId: 'f-x', value: { rows: [{ id: '1', a: 'x' }] } },
    { fieldId: 'f-surf', value: { rows: [] } },
  ];
});

describe('loadRegisterSources(projectId, standardId, currentWorksheetCode)', () => {
  it('returns the directly AND transitively consumed register owners with status, carrier, widget and uiConfig', async () => {
    const { loadRegisterSources } = await import('../worksheet');
    const out = await loadRegisterSources('proj-1', 'std-1', 'X-10');
    expect(out).toEqual([
      { symbol: 'reg_x', ownerCode: 'X-07', status: 'final', carrier: { rows: [{ id: '1', a: 'x' }] }, widget: 'register', uiConfig: UI_X },
      { symbol: 'surface_inventory', ownerCode: 'X-08', status: 'draft', carrier: { rows: [] }, widget: null, uiConfig: null },
    ]);
    // One fields query, one equations query, then instances + params (batched, not per owner).
    expect(fakeDb.log).toEqual(['select:fields', 'select:equations', 'select:worksheet_instances', 'select:project_parameters']);
  });

  it('an owner without an instance row reports status draft and a null carrier when nothing is stored', async () => {
    ROWS.worksheet_instances = [];
    ROWS.project_parameters = [];
    const { loadRegisterSources } = await import('../worksheet');
    const out = await loadRegisterSources('proj-1', 'std-1', 'X-10');
    expect(out.map((s) => [s.symbol, s.status, s.carrier])).toEqual([['reg_x', 'draft', null], ['surface_inventory', 'draft', null]]);
  });

  it('nothing consumed ⇒ [] and no instance/param queries', async () => {
    ROWS.fields = [{ id: 'f-y', symbol: 'reg_y', dataType: 'json', widget: 'register', uiConfig: UI_X, consumerWorksheets: ['X-11'], ownerCode: 'X-09', templateId: 'tpl-09' }];
    ROWS.equations = [];
    const { loadRegisterSources } = await import('../worksheet');
    expect(await loadRegisterSources('proj-1', 'std-1', 'X-10')).toEqual([]);
    expect(fakeDb.log).not.toContain('select:worksheet_instances');
  });
});
