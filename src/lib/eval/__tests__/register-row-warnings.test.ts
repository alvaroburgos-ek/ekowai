import { describe, it, expect } from 'vitest';
import { prepareRegisterRows, registerRowWarnings, type RegisterRowsCtx } from '../register-rows';
import type { RegisterColumn } from '../field-config';
import type { RegulationRow } from '../regulation-tables';
import { evaluateFormula } from '../formula';
import { QE_CATALOGUES, qeCatalogueAsTable } from '../regulation-tables-seed-m820_3';

// QE-style register (DWA-M 820-3 shape): a required lookup_key `nr` bound to a catalogue + a required rating enum.
const qeColumns = (table: string): RegisterColumn[] => [
  { key: 'nr', label: 'Nr.', type: 'lookup_key', required: true, lookup: { table_code: table } },
  { key: 'kriterium', label: 'Kriterium', type: 'lookup_value', lookup: { table_code: table, key_column: 'nr', value: 'kriterium' } },
  { key: 'rating', label: 'Bewertung', type: 'enum', required: true, options: ['y', 'p', 'n', 'na'] },
  { key: 'evidence', label: 'Nachweis', type: 'text' },
];

/** A catalogue keyed by plain digit strings ("1", "2") — the shape the API caller assumed. */
const digitRows: RegulationRow[] = [
  { row_key: '1', keys: { nr: '1' }, group_label: null, label_de: '1', order_index: 0, values: { kriterium: 'K1' }, verbatim_quote: null },
  { row_key: '2', keys: { nr: '2' }, group_label: null, label_de: '2', order_index: 1, values: { kriterium: 'K2' }, verbatim_quote: null },
] as unknown as RegulationRow[];
const digitCtx: RegisterRowsCtx = {
  table: (code, keys) => (code === 'T' ? (digitRows.find((r) => r.row_key === String(keys[0]))?.values as never) : undefined),
  tableRows: (code) => (code === 'T' ? digitRows : undefined),
};

const countRows = (carrier: unknown, columns: RegisterColumn[], ctx: RegisterRowsCtx) => {
  const reg = prepareRegisterRows(carrier, columns, ctx);
  const r = evaluateFormula({ equationId: 't', formula: "n = count_rows(reg, rating == 'y')", inputSymbols: ['reg'], outputSymbol: 'n', inputs: [], registers: { reg } });
  return { reg, r };
};

describe('A — lookup_key coerce accepts a finite number as its string form', () => {
  it('nr: 1 and nr: "1" are both complete and both counted', () => {
    const { reg, r } = countRows({ rows: [{ id: 'a', nr: 1, rating: 'y' }, { id: 'b', nr: '1', rating: 'y' }] }, qeColumns('T'), digitCtx);
    expect(reg.rows.map((x) => x.values.nr)).toEqual(['1', '1']);
    expect(reg.rows.map((x) => x.complete)).toEqual([true, true]);
    expect(reg.rows[0].values.kriterium).toBe('K1');   // the numeric key refills like the string key
    expect(r).toMatchObject({ kind: 'computed', value: 2 });
  });
  it('NaN / Infinity / empty string stay null ⇒ incomplete, not counted', () => {
    const { reg, r } = countRows({ rows: [{ nr: NaN, rating: 'y' }, { nr: Infinity, rating: 'y' }, { nr: '', rating: 'y' }] }, qeColumns('T'), digitCtx);
    expect(reg.rows.map((x) => x.values.nr)).toEqual([null, null, null]);
    expect(reg.rows.every((x) => !x.complete)).toBe(true);
    expect(r).toMatchObject({ kind: 'computed', value: 0 });
  });
});

describe('B — registerRowWarnings (save-time warning, one line per register)', () => {
  const entscheidungen: RegisterColumn[] = [
    { key: 'nr', label: 'Nr.', type: 'number', required: true },
    { key: 'entscheidung', label: 'Entscheidung', type: 'text', required: true },
    { key: 'entscheider', label: 'Entscheider', type: 'text' },
  ];
  it('clean rows ⇒ null', () => {
    expect(registerRowWarnings('entscheidungen', { rows: [{ id: 'x', nr: 1, entscheidung: 'go', entscheider: 'AB' }] }, { columns: entscheidungen }, {})).toBeNull();
    expect(registerRowWarnings('entscheidungen', undefined, { columns: entscheidungen }, {})).toBeNull();
  });
  it('incomplete row + unknown column ⇒ one German+English line naming both', () => {
    const w = registerRowWarnings('entscheidungen', { rows: [
      { id: 'a', nr: 1, entscheidung: 'go', entschieden_von: 'AB' },
      { id: 'b', entscheidung: 'stop', entschieden_von: 'CD' },
    ] }, { columns: entscheidungen }, {});
    expect(w).toBe(
      'Register entscheidungen: Zeile 2 unvollständig (Pflichtspalte nr fehlt) — wird nicht gezählt; unbekannte Spalte entschieden_von (Zeilen 1–2) — wird ignoriert'
      + ' [EN] row 2 incomplete (required column nr missing) — not counted; unknown column entschieden_von (rows 1–2) — ignored',
    );
  });
  it('many incomplete rows are summarised in one clause (ranges), not one line per row', () => {
    const rows = Array.from({ length: 12 }, (_, i) => (i === 4 ? { nr: 5, entscheidung: 'ok' } : { entscheidung: 'x' }));
    const w = registerRowWarnings('entscheidungen', { rows }, { columns: entscheidungen }, {})!;
    expect(w.split('\n')).toHaveLength(1);
    expect(w).toContain('Zeilen 1–4, 6–12 unvollständig (Pflichtspalte nr fehlt)');
  });
  it('the incompleteness rule is the count_rows rule (number min/max too)', () => {
    const cols: RegisterColumn[] = [{ key: 'q', label: 'q', type: 'number', required: true, min: 0, max: 10 }];
    const w = registerRowWarnings('r', { rows: [{ q: -1 }, { q: 5 }, { q: 11 }, { q: '5' }] }, { columns: cols }, {})!;
    expect(w).toContain('Zeile 1 unvollständig (q unter Minimum)');
    expect(w).toContain('Zeile 3 unvollständig (q über Maximum)');
    expect(w).toContain('Zeile 4 unvollständig (Pflichtspalte q fehlt)');   // a numeric string is not a number cell
    expect(w).not.toContain('Zeile 2');
  });
  it('id, override flag and legacy_map source keys are legitimate row keys', () => {
    const cols: RegisterColumn[] = [
      { key: 'k', label: 'k', type: 'text', required: true },
      { key: 'ovr', label: 'ovr', type: 'boolean' },
    ];
    const w = registerRowWarnings('r', { rows: [{ id: '1', k: 'a', ovr: true, surface_type: 'asphalt' }] },
      { columns: cols, override: { flag_key: 'ovr', applies_to: ['k'] }, legacy_map: { surface_type: { asphalt: 'x' } } }, {});
    expect(w).toBeNull();
  });
  it('not a { rows: [...] } carrier ⇒ warning', () => {
    expect(registerRowWarnings('r', [{ k: 'a' }], { columns: entscheidungen }, {})).toContain('nicht die Form { rows: [...] }');
  });
  it('DWA-M 820-3 QE_B1: catalogue keys are "n1".., so nr: 1 is complete but names no table row ⇒ warned', () => {
    const t = qeCatalogueAsTable(QE_CATALOGUES.find((c) => c.code === 'QE_B1')!);
    expect(t.rows[0].row_key).toBe('n1');
    const ctx: RegisterRowsCtx = {
      table: (code, keys) => (code === 'QE_B1' ? (t.rows.find((r) => r.row_key === String(keys[0]))?.values as never) : undefined),
      tableRows: (code) => (code === 'QE_B1' ? t.rows : undefined),
    };
    expect(registerRowWarnings('qe62_items', { rows: [{ id: 'a', nr: 'n1', rating: 'y' }] }, { columns: qeColumns('QE_B1') }, ctx)).toBeNull();
    const w = registerRowWarnings('qe62_items', { rows: [{ id: 'a', nr: 'n1', rating: 'y' }, { id: 'b', nr: 1, rating: 'y' }] }, { columns: qeColumns('QE_B1') }, ctx);
    expect(w).toBe('Register qe62_items: nr = 1 ist kein Schlüssel der Tabelle QE_B1 (Zeile 2) [EN] nr = 1 is not a key of table QE_B1 (row 2)');
  });
});
