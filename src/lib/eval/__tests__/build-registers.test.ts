// Plan 2a fix round 1: `buildRegisters` is the ONE register builder shared by the hook, the report
// evaluator, the snapshot builder and the PDF assembler.
import { describe, it, expect } from 'vitest';
import { buildRegisters } from '../register-rows';

const SURFACE_ROWS = {
  rows: [
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
};

const FIELDS = [
  { id: 'f-si', symbol: 'surface_inventory', dataType: 'json' },
  { id: 'f-ac', symbol: 'A_C', dataType: 'number' },
  { id: 'f-sel', symbol: 'options', dataType: 'json', widget: 'select_many', uiConfig: { options: ['a', 'b'] } },
  { id: 'f-pr', symbol: 'pollutant_register', dataType: 'json' },
];
const JSON_BY_FIELD: Record<string, unknown> = { 'f-si': SURFACE_ROWS, 'f-sel': ['a'] /* f-pr: no value */ };
const jsonOf = (fieldId: string) => JSON_BY_FIELD[fieldId];
const noSymbols = () => undefined;

describe('buildRegisters', () => {
  it('A138 fixture: exactly one register keyed surface_inventory with 2 complete rows; number field, select_many field and valueless json field are skipped', () => {
    const regs = buildRegisters(FIELDS, jsonOf, { standardCode: 'DWA-A-138-1', symbol: noSymbols });
    expect(Object.keys(regs)).toEqual(['surface_inventory']);
    const reg = regs.surface_inventory;
    expect(reg.rows).toHaveLength(2);
    expect(reg.rows.every((r) => r.complete)).toBe(true);
    expect(reg.rows[0].values).toMatchObject({ kind: 'paved', c_i: 0.9 });
    expect(reg.rows[0].values.a_c_i as number).toBeCloseTo(3408.12, 6);
  });
  it('a json field whose value is null is skipped like an absent one', () => {
    const regs = buildRegisters(FIELDS, (id) => (id === 'f-si' ? null : jsonOf(id)), { standardCode: 'DWA-A-138-1', symbol: noSymbols });
    expect(regs).toEqual({});
  });
  it('standardCode undefined passes through to the unique-code table resolution (kind still derives from TAB9)', () => {
    const regs = buildRegisters(FIELDS, jsonOf, { symbol: noSymbols });
    expect(regs.surface_inventory.rows[1].values.kind).toBe('paved');
  });
  it('flags come from the config (pollutant_register.not_applicable) and ctx.symbol backs derived columns (G-13)', () => {
    const fields = [
      { id: 'p', symbol: 'pollutant_register', dataType: 'json' },
      { id: 'r', symbol: 'flaechen', dataType: 'json', widget: 'register', uiConfig: { title: 'F', columns: [
        { key: 'a', type: 'number', label: 'A', required: true },
        { key: 'w', type: 'derived', label: 'W', expr: 'a * EZ' },
      ] } },
    ];
    const json: Record<string, unknown> = { p: { not_applicable: true, rows: [] }, r: { rows: [{ id: '1', a: 4 }] } };
    const regs = buildRegisters(fields, (id) => json[id], { standardCode: 'X', symbol: (s) => (s === 'EZ' ? 2.5 : undefined) });
    expect(regs.pollutant_register.flags).toEqual({ not_applicable: true });
    expect(regs.flaechen.rows[0].values.w).toBe(10);
  });
});
