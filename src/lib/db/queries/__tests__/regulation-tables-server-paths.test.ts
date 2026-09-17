/**
 * C-1 (final review, guideline-to-tool): regulation tables must be registered
 * on EVERY server path that evaluates worksheet content — not only in
 * `saveWorksheet`. The snapshot builder, the standard report / Prüfmemo loader,
 * the project report loader and the approval gate all read
 * `makeTableLookup(standardCode)` → module-global registry → A138 TS seed
 * fallback. For a non-A138 standard the registry is empty in a fresh Node
 * process unless the caller loaded it, so a `lookup('TAB1', …)` derived column
 * or a `lookup_value` refill silently resolved to nothing in snapshot/PDF/
 * report unless the same warm process had previously SAVED that standard.
 *
 * Pins:
 *   (1) `transitionWorksheet` calls `ensureRegulationTablesLoaded(<code>)`
 *       BEFORE `db.transaction` opens (never inside — a global-pool query in
 *       the tx re-creates the Task 10b prod hang).
 *   (2) `checkApprovalGate` calls it (outside any tx — it runs before the
 *       transition tx).
 *   (3) `loadStandardReportData` calls it with the requested standard code.
 *   (4) `loadProjectReportData` calls it for every active standard of the
 *       project before evaluating equations.
 *   (5) pure: a `registerTables([...])`-registered NON-A138 table is visible to
 *       `makeTableLookup('X')` and drives a `lookup()` derived column through
 *       `evaluateWorksheetEquations` (the report evaluator).
 *
 * DB fully mocked (src/test-shims/fake-drizzle.ts); the loader spy replaces
 * `@/lib/db/queries/regulation-tables`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fakeDb, ensureSpy } = await vi.hoisted(async () => {
  const { makeFakeDb } = await import('@/test-shims/fake-drizzle');
  const ensureSpy = vi.fn<(code: string) => Promise<void>>(async () => {});
  const ROWS: Record<string, Record<string, unknown>[]> = {
    worksheet_instances: [{ id: 'inst-1', projectId: 'proj-1', status: 'draft', orgId: 'org-1', worksheetTemplateId: 'tpl-1', standardCode: 'X-1', wtid: 'tpl-1' }],
    worksheet_templates: [{ id: 'tpl-1', code: 'X-01', standardId: 'std-1', standardCode: 'X-1', titleDe: 'T', orderIndex: 0 }],
    standards: [{ id: 'std-1', code: 'X-1', titleDe: 'Standard X', version: '2026', activeSince: new Date('2026-01-01') }],
    projects: [{ id: 'proj-1', name: 'P', projectCode: 'P-1', clientName: null, location: null, siteProfile: null, siteLocation: null, createdAt: new Date(), org: null }],
    fields: [],
    worksheet_sections: [],
    equations: [],
    compliance_requirements: [],
    project_parameters: [],
    project_standards: [{ id: 'std-1', code: 'X-1', titleDe: 'Standard X', version: '2026', activeSince: new Date('2026-01-01') }],
    approval_events: [],
    audit_log: [],
    project_documents: [],
    monitoring_entries: [],
    calculation_snapshots: [{ id: 'snap-1' }],
  };
  return { fakeDb: makeFakeDb(ROWS), ensureSpy };
});

vi.mock('@/lib/db', () => ({ db: fakeDb }));
vi.mock('@/lib/db/queries/regulation-tables', () => ({
  ensureRegulationTablesLoaded: ensureSpy,
  loadRegulationTables: vi.fn(async () => []),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) } }),
}));
vi.mock('@/lib/snapshots/capture', () => ({ captureSnapshot: vi.fn(async () => 'snap-1') }));
vi.mock('@/lib/actions/finalize-gate', () => ({ checkFinalizeGate: vi.fn(async () => ({ ok: true })), formatFinalizeGateError: () => '' }));

const db = () => fakeDb;

beforeEach(() => {
  ensureSpy.mockClear();
  db().log.length = 0;
});

describe('C-1 — regulation tables are loaded on every server evaluation path', () => {
  it('transitionWorksheet loads the standard tables BEFORE db.transaction opens (submit)', async () => {
    const order: string[] = [];
    ensureSpy.mockImplementation(async (code: string) => { order.push(`ensure:${code}`); });
    const origTx = fakeDb.transaction;
    fakeDb.transaction = async <T,>(fn: (tx: typeof fakeDb) => Promise<T>): Promise<T> => {
      order.push('transaction:open');
      return origTx.call(fakeDb, fn) as Promise<T>;
    };
    const { transitionWorksheet } = await import('@/lib/actions/worksheet-transition');
    const res = await transitionWorksheet({ instanceId: 'inst-1', eventType: 'submit', comment: 'ok' });
    expect(res).toEqual({ ok: true, newStatus: 'submitted_for_review' });
    expect(ensureSpy).toHaveBeenCalledWith('X-1');
    expect(order.indexOf('ensure:X-1')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('ensure:X-1')).toBeLessThan(order.indexOf('transaction:open'));
    fakeDb.transaction = origTx;
  });

  it('checkApprovalGate loads the standard tables (outside any tx)', async () => {
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    const res = await checkApprovalGate('inst-1');
    expect(res.ok).toBe(true);
    expect(ensureSpy).toHaveBeenCalledWith('X-1');
    expect(db().log).not.toContain('transaction:open');
  });

  it('loadStandardReportData loads the requested standard tables before assembling', async () => {
    const { loadStandardReportData } = await import('@/lib/pdf/load-standard-report');
    await loadStandardReportData('proj-1', 'X-1');
    expect(ensureSpy).toHaveBeenCalledWith('X-1');
  });

  it('loadProjectReportData loads the tables of every active project standard', async () => {
    const { loadProjectReportData } = await import('@/lib/pdf/load-data');
    await loadProjectReportData('proj-1');
    expect(ensureSpy).toHaveBeenCalledWith('X-1');
  });
});

describe('C-1 — a registered non-A138 table is visible to the report evaluator (pure)', () => {
  it("makeTableLookup('X-1') resolves a registerTables()-registered TAB1 row and evaluateWorksheetEquations computes lookup('TAB1', …)", async () => {
    const { registerTables, clearTables } = await import('@/lib/eval/regulation-tables');
    const { makeTableLookup } = await import('@/lib/eval/regulation-tables-fallback');
    const { evaluateWorksheetEquations } = await import('@/lib/eval/evaluate-for-report');
    clearTables();
    expect(makeTableLookup('X-1')('TAB1', ['a'])).toBeUndefined();
    registerTables([{
      standard_code: 'X-1', edition: '2026', table_code: 'TAB1', title_de: 'Tab. 1', clause_reference: null, page_ref: null,
      key_columns: ['k'], value_columns: [{ name: 'v', type: 'number' }], override_policy: 'locked', override_quote: null, verification_status: 'x',
      rows: [{ row_key: 'a', keys: { k: 'a' }, group_label: null, label_de: 'A', order_index: 0, values: { v: 7 }, verbatim_quote: 'q' }],
    }]);
    expect(makeTableLookup('X-1')('TAB1', ['a'])).toEqual({ v: 7 });

    // The Plan-3 shape: a DB register on standard X-1 with a lookup_key → TAB1, a
    // lookup_value refilled from the row (stored null) and a derived column over
    // lookup(). Both the refill (7) and the derived cell (14) need the registry.
    const ui = {
      title: 'R',
      columns: [
        { key: 'k', type: 'lookup_key', label: 'K', required: true, lookup: { table_code: 'TAB1' } },
        { key: 'v', type: 'lookup_value', label: 'V', lookup: { table_code: 'TAB1', key_column: 'k', value: 'v' } },
        { key: 'd', type: 'derived', label: 'D', expr: "lookup('TAB1', k, 'v') * 2" },
      ],
    };
    const fields = [
      { id: 'f-reg', symbol: 'reg', dataType: 'json', unit: null, widget: 'register', uiConfig: ui },
      { id: 'f-out', symbol: 'out', dataType: 'number', unit: null },
    ];
    const params = [{ fieldId: 'f-reg', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: { rows: [{ id: '1', k: 'a', v: null }] } }];
    const eqs = [{ id: 'e1', equationNumber: '1', formula: 'out = sum_rows(reg, d) + sum_rows(reg, v)', inputSymbols: ['reg'], outputSymbol: 'out', outputUnit: null }];
    const results = evaluateWorksheetEquations('X-01', eqs, fields, params, { standardCode: 'X-1' });
    const r = results.find((x) => x.outputSymbol === 'out');
    expect(r?.state.kind).toBe('computed');
    expect(r?.state.kind === 'computed' ? r.state.value : null).toBe(21);
    clearTables();
    // Registry cleared ⇒ the same evaluation no longer resolves TAB1 (this is the
    // fresh-process state every server path is in before ensureRegulationTablesLoaded).
    const cold = evaluateWorksheetEquations('X-01', eqs, fields, params, { standardCode: 'X-1' }).find((x) => x.outputSymbol === 'out');
    expect(cold?.state.kind === 'computed' ? cold.state.value : null).not.toBe(21);
  });
});
