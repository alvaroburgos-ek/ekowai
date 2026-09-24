/**
 * Plan 3 final wave A · defect 5 — a `lookup()` MISS inside a register
 * `derived` column now says so.
 *
 * Found by ISO-5667-1 (`iso5667_1-F-1`, confirmed by its reviewer):
 * `prepareRegisterRows` catches a RECOVERABLE `ExprError` and `continue`s, so
 * a derived cell whose `lookup()` found no row is silently `null`, the
 * register reports NOTHING, and an aggregate over that column degrades to
 * `Fehlende Eingabe für count_rows(): method_ok` — a message that names the
 * column but never the reason. The engineer reads it over a column they never
 * fill by hand and cannot act on it.
 *
 * TWO CHANNELS, because the corpus proved one is not enough. A missing table
 * row is the DESIGNED blank badge in five other standards (DIN-EN-16941-2
 * Tab. A.2, DWA-M-1200-2 Tab. 4/6, DWA-M-1200-3 Tab. 14, ISO-5667-10 §7.2.2.1,
 * DIN-276 Tab. 4 — each pins `diagnostics` empty on a healthy fixture), so
 * putting it in `diagnostics` would warn in amber on every healthy project:
 *   - `lookupMisses` — "the table has no row for these keys". Not a warning;
 *     the row functions cite it when an aggregate over the blanked column
 *     refuses.
 *   - `diagnostics`  — an authoring defect (`Spalte X nicht in T`). Unchanged
 *     channel, now also caught when the call sits inside an `if()` test, where
 *     the lenient condition path used to swallow it whole.
 *
 * The fail-safe outcome is untouched: the cell is still null, the row's
 * completeness is unchanged, and the aggregate is still `manual_required` —
 * never a phantom value.
 */
import { describe, it, expect } from 'vitest';
import { prepareRegisterRows } from '../register-rows';
import { evaluateFormula } from '../formula';
import type { RegisterColumn } from '../field-config';
import type { Scope, TableRowValues } from '@/lib/expr';

/** A two-row table: only `a|x` and `b|y` are printed. */
const TABLE: Record<string, TableRowValues> = {
  'a|x': { faktor: 2 },
  'b|y': { faktor: 5 },
};
const table: Scope['table'] = (code, keys) =>
  code === 'S21' ? TABLE[keys.map(String).join('|')] : undefined;

const COLUMNS: RegisterColumn[] = [
  { key: 'aspect', type: 'text', label: 'Aspekt', required: true },
  { key: 'method', type: 'text', label: 'Verfahren', required: true },
  { key: 'menge', type: 'number', label: 'Menge' },
  { key: 'method_ok', type: 'derived', label: 'Verfahren zulässig', expr: "if(lookup('S21', aspect, method, 'faktor') > 0, 1, 0)" },
];

const prep = (rows: unknown[]) => prepareRegisterRows({ rows }, COLUMNS, { table });

describe('plan-3 wave A · defect 5 — a lookup() miss in a derived column is named', () => {
  it('the ISO-5667-1 shape: two hits + one unprinted combination ⇒ cells [1, 1, null] and ONE lookupMisses line naming table, keys and column', () => {
    const reg = prep([
      { id: 'f1', aspect: 'a', method: 'x' },
      { id: 'f2', aspect: 'b', method: 'y' },
      { id: 'f3', aspect: 'a', method: 'y' }, // no S21 row — §21.2 does not print this pair
    ]);
    expect(reg.rows.map((r) => r.values.method_ok)).toEqual([1, 1, null]);
    expect(reg.lookupMisses).toEqual(['method_ok: lookup(): keine Zeile in S21 für Schlüssel [a, y] (Spalte faktor)']);
    // NOT a warning: the amber diagnostics channel stays clean on a healthy register
    expect(reg.diagnostics).toBeUndefined();
  });

  it('THE POINT: the aggregate over the blanked column now says WHY it is manual_required', () => {
    const reg = prep([
      { id: 'f1', aspect: 'a', method: 'x' },
      { id: 'f3', aspect: 'a', method: 'y' },
    ]);
    const s = evaluateFormula({
      equationId: 'probe-F-1', formula: 'bad = count_rows(flow, method_ok == 0)',
      inputSymbols: ['flow'], outputSymbol: 'bad', inputs: [], registers: { flow: reg },
    });
    expect(s.kind).toBe('manual_required'); // outcome unchanged — never a phantom 0
    if (s.kind === 'manual_required') {
      expect(s.reason).toBe(
        'Fehlende Eingabe für count_rows(): method_ok — method_ok: lookup(): keine Zeile in S21 für Schlüssel [a, y] (Spalte faktor)',
      );
    }
  });

  it('a register with NO miss leaves the aggregate message exactly as it was', () => {
    const reg = prepareRegisterRows({ rows: [{ id: '1', aspect: 'a', method: 'x' }] }, [
      ...COLUMNS,
      { key: 'other', type: 'derived', label: 'O', expr: 'menge * 2' },
    ], { table });
    const s = evaluateFormula({
      equationId: 'probe', formula: 'bad = count_rows(flow, other == 0)',
      inputSymbols: ['flow'], outputSymbol: 'bad', inputs: [], registers: { flow: reg },
    });
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toBe('Fehlende Eingabe für count_rows(): other');
  });

  it('each distinct miss is recorded ONCE per register, not once per row', () => {
    const reg = prep([
      { id: '1', aspect: 'a', method: 'y' },
      { id: '2', aspect: 'a', method: 'y' },
      { id: '3', aspect: 'a', method: 'y' },
      { id: '4', aspect: 'c', method: 'z' }, // a DIFFERENT miss ⇒ its own line
    ]);
    expect(reg.lookupMisses).toEqual([
      'method_ok: lookup(): keine Zeile in S21 für Schlüssel [a, y] (Spalte faktor)',
      'method_ok: lookup(): keine Zeile in S21 für Schlüssel [c, z] (Spalte faktor)',
    ]);
  });

  it('the FAIL-SAFE outcome is unchanged: the cell stays null and the row keeps its completeness', () => {
    const reg = prep([{ id: '1', aspect: 'a', method: 'y', menge: 7 }]);
    expect(reg.rows[0].values.method_ok).toBeNull();
    expect(reg.rows[0].values.menge).toBe(7);
    expect(reg.rows[0].complete).toBe(true); // a derived column never decides completeness
  });

  it('an ordinary MISSING INPUT stays silent on BOTH channels — an unfilled cell is not a catalogue gap', () => {
    const cols: RegisterColumn[] = [
      { key: 'a', type: 'number', label: 'A' },
      { key: 'b', type: 'number', label: 'B' },
      { key: 'p', type: 'derived', label: 'A·B', expr: 'a * b' },
    ];
    const reg = prepareRegisterRows({ rows: [{ id: '1', a: 3 }] }, cols, { table });
    expect(reg.rows[0].values.p).toBeNull();
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.lookupMisses).toBeUndefined();
  });

  it('a register with no miss carries neither key (the absent-when-clean contract)', () => {
    const reg = prep([{ id: '1', aspect: 'a', method: 'x' }]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.lookupMisses).toBeUndefined();
  });

  it('an AUTHORING defect (column typo) is a WARNING on the diagnostics channel — bare call and nested in if() alike', () => {
    const bare: RegisterColumn[] = [
      { key: 'aspect', type: 'text', label: 'A' },
      { key: 'method', type: 'text', label: 'M' },
      { key: 'bad', type: 'derived', label: 'X', expr: "lookup('S21', aspect, method, 'faktr')" },
    ];
    const r1 = prepareRegisterRows({ rows: [{ id: '1', aspect: 'a', method: 'x' }] }, bare, { table });
    expect(r1.rows[0].values.bad).toBeNull();
    expect(r1.diagnostics).toEqual(['bad: lookup(): Spalte faktr nicht in S21']);
    expect(r1.lookupMisses).toBeUndefined();

    // nested inside an if() TEST — previously swallowed entirely by the lenient condition path
    const nested: RegisterColumn[] = [
      ...bare.slice(0, 2),
      { key: 'bad', type: 'derived', label: 'X', expr: "if(lookup('S21', aspect, method, 'faktr') > 0, 1, 0)" },
    ];
    const r2 = prepareRegisterRows({ rows: [{ id: '1', aspect: 'a', method: 'x' }] }, nested, { table });
    expect(r2.rows[0].values.bad).toBeNull();
    expect(r2.diagnostics).toEqual(['bad: lookup(): Spalte faktr nicht in S21']);
  });
});
