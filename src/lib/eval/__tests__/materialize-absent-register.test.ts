// M820 follow-up 1 (item 4, finding F2 of 21_Fill-Run_M820-2_C1_2026-10-06): an "+ row" register that was never saved
// ("absent") must give the SAME counter result on the save path (materializeDerivedOutputs) as on every read path
// (evaluateWorksheetEquations = report / PDF / MCP recompute; the client hook and snapshot use the same buildRegisters rule):
//   - absent register        → not computed ("Fehlende oder leere Eingaben: <register>"), output written as null
//   - empty register {rows:[]} → count_rows = 0 on every path (a count of nothing is 0)
// Before the fix the save path turned an absent register into `{}` (= rows []) and persisted count_rows = 0 — but only when
// ANOTHER register of the same sheet was in the save batch — while every read path reported "not computed".
import { describe, it, expect } from 'vitest';
import { materializeDerivedOutputs } from '../materialize-derived';
import { evaluateWorksheetEquations } from '../evaluate-for-report';

const regUi = (key: string) => ({ title: key, columns: [{ key: 'nr', type: 'number', label: 'Nr.', required: true }, { key: 'erledigt', type: 'boolean', label: 'erledigt' }] });
const fields = [
  { id: 'f-op', symbol: 'offene_punkte', dataType: 'json', unit: null, widget: 'register', uiConfig: regUi('offene_punkte') },
  { id: 'f-sb', symbol: 'statusberichte', dataType: 'json', unit: null, widget: 'register', uiConfig: regUi('statusberichte') },
  { id: 'f-lop', symbol: 'lop_count', dataType: 'number', unit: null, widget: 'derived', uiConfig: null },
  { id: 'f-sbc', symbol: 'statusberichte_count', dataType: 'number', unit: null, widget: 'derived', uiConfig: null },
  { id: 'f-sbo', symbol: 'statusberichte_offen', dataType: 'number', unit: null, widget: 'derived', uiConfig: null },
];
const equations = [
  { id: 'eq-lop', equationNumber: '820-2-06-D1', formula: 'lop_count = count_rows(offene_punkte)', inputSymbols: ['offene_punkte'], outputSymbol: 'lop_count', outputUnit: null },
  { id: 'eq-sbc', equationNumber: '820-2-06-D3', formula: 'statusberichte_count = count_rows(statusberichte)', inputSymbols: ['statusberichte'], outputSymbol: 'statusberichte_count', outputUnit: null },
  { id: 'eq-sbo', equationNumber: 'T-4', formula: 'statusberichte_offen = count_rows(statusberichte, erledigt == false)', inputSymbols: ['statusberichte'], outputSymbol: 'statusberichte_offen', outputUnit: null },
];
const rowsOP = { rows: [{ id: 'a', nr: 1, erledigt: false }, { id: 'b', nr: 2, erledigt: true }] };

type J = { type: 'json'; value: unknown };
/** save path: the batch carries `offene_punkte`; `statusberichte` is whatever `sb` says (undefined = never saved). */
function save(sb: J | undefined) {
  const values: Record<string, J> = { 'f-op': { type: 'json', value: rowsOP } };
  if (sb) values['f-sb'] = sb;
  return materializeDerivedOutputs({ standardCode: 'DWA-M-820-2', worksheetCode: '820-2-06', equations, fields, valuesByFieldId: values });
}
/** read path (report / PDF / MCP recompute): the persisted parameters. */
function read(sb: unknown | undefined) {
  const p = (fieldId: string, valueJson: unknown) => ({ fieldId, valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson });
  const params = [p('f-op', rowsOP), ...(sb === undefined ? [] : [p('f-sb', sb)])];
  return evaluateWorksheetEquations('820-2-06', equations, fields, params, { standardCode: 'DWA-M-820-2' });
}
const saved = (r: ReturnType<typeof save>, s: string) => r.writes.find((w) => w.symbol === s)!;
const reported = (r: ReturnType<typeof read>, s: string) => r.find((e) => e.outputSymbol === s)!.state;

describe('absent vs empty register — one result on the save path and on the read path (M820 follow-up 1, F2)', () => {
  it('ABSENT register (never saved): save writes null (not 0) and the read path says "not computed" — the same verdict', () => {
    const s = save(undefined);
    const r = read(undefined);
    for (const sym of ['statusberichte_count', 'statusberichte_offen']) {
      expect(saved(s, sym).value, `${sym} saved`).toBeNull();
      expect(saved(s, sym).state.kind, `${sym} save state`).toBe('manual_required');
      expect(reported(r, sym).kind, `${sym} read state`).toBe('manual_required');
    }
    expect(saved(s, 'statusberichte_count').state).toMatchObject({ reason: 'Fehlende oder leere Eingaben: statusberichte' });
    expect(reported(r, 'statusberichte_count')).toMatchObject({ reason: 'Fehlende oder leere Eingaben: statusberichte' });
    // the sibling register in the batch is counted as before
    expect(saved(s, 'lop_count').value).toBe(2);
    expect(reported(r, 'lop_count')).toMatchObject({ kind: 'computed', value: 2 });
  });

  it('a json null carrier (cleared value) is absent too — null on both paths', () => {
    expect(saved(save({ type: 'json', value: null }), 'statusberichte_count').value).toBeNull();
    expect(reported(read(null), 'statusberichte_count').kind).toBe('manual_required');
  });

  it('EMPTY register {rows: []}: count_rows = 0 on the save path AND on the read path', () => {
    const s = save({ type: 'json', value: { rows: [] } });
    const r = read({ rows: [] });
    expect([saved(s, 'statusberichte_count').value, saved(s, 'statusberichte_offen').value]).toEqual([0, 0]);
    expect(reported(r, 'statusberichte_count')).toMatchObject({ kind: 'computed', value: 0 });
    expect(reported(r, 'statusberichte_offen')).toMatchObject({ kind: 'computed', value: 0 });
  });

  it('a HIDDEN register (visible_when) is no input: null, never a count of 0 (materialiser docblock: hidden ⇒ manual_required ⇒ null)', () => {
    const w = materializeDerivedOutputs({
      standardCode: 'DWA-M-820-2', worksheetCode: '820-2-06', equations, fields,
      valuesByFieldId: { 'f-op': { type: 'json', value: rowsOP }, 'f-sb': { type: 'json', value: { rows: [{ id: 'x', nr: 1, erledigt: false }] } } },
      hiddenSymbols: new Set(['statusberichte']),
    });
    expect(saved(w, 'statusberichte_count').value).toBeNull();
    expect(saved(w, 'lop_count').value).toBe(2);
  });

  it('an absent register still produces its write (null) so a stale counter is cleared, not left standing', () => {
    const s = save(undefined);
    expect(s.writes.map((w) => w.symbol).sort()).toEqual(['lop_count', 'statusberichte_count', 'statusberichte_offen']);
  });
});
