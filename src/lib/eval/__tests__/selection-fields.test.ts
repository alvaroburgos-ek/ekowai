import { describe, it, expect } from 'vitest';
import {
  SELECTION_CONFIGS,
  normalizeChecklist,
  normalizeRegister,
  newRegisterRow,
  registerRowFilled,
} from '../selection-fields';

describe('selection-fields — config registry (DWA-M 820-1)', () => {
  it('covers the 7 remaining M820-1 json fields', () => {
    for (const sym of [
      'applicable_legal_bases', 'exclusion_124_gwb_selected', 'award_criteria_list',
      'stakeholder_list', 'alternatives_considered', 'quality_targets_konzept',
      'quality_targets_projekt', 'bewertungskommission_members',
    ]) {
      expect(SELECTION_CONFIGS[sym]).toBeTruthy();
    }
  });
  it('legal bases is a grouped checklist grounded in Anh. B (Ober-/Unterschwellenbereich)', () => {
    const c = SELECTION_CONFIGS.applicable_legal_bases;
    expect(c.kind).toBe('checklist');
    if (c.kind === 'checklist') {
      expect(c.groups?.length).toBe(3);
      const flat = c.options.join(' | ');
      expect(flat).toMatch(/GWB/);
      expect(flat).toMatch(/VgV/);
      expect(flat).toMatch(/HOAI/);
      // grouped options must equal the flattened union
      expect(c.groups?.flatMap((g) => g.options)).toEqual([...c.options]);
    }
  });
  it('§124 GWB is a declared-grounds register, NOT a fabricated statutory checklist', () => {
    const c = SELECTION_CONFIGS.exclusion_124_gwb_selected;
    expect(c.kind).toBe('register'); // grounds are external law, not printed
    if (c.kind === 'register') expect(c.note).toMatch(/extern|nicht im Merkblatt/);
  });
  it('covers the DWA-M-820-2 json fields', () => {
    for (const sym of [
      'included_hoai_phases', 'lph_completed', 'projektsteuerung_scope', 'project_goals',
      'stakeholders_list', 'applicable_din_standards', 'applicable_dwa_standards',
      'client_guidelines', 'permit_inventory_complete', 'software_products_defined',
      'data_security_measures',
    ]) {
      expect(SELECTION_CONFIGS[sym]).toBeTruthy();
    }
  });
  it('covers DIN-276 + DWA-M-277E fields with grounded options', () => {
    for (const sym of ['applicable_cost_groups', 'planning_stage_active', 'special_cost_flags', 'input_documents_register', 'source_set']) {
      expect(SELECTION_CONFIGS[sym]).toBeTruthy();
    }
    const kg = SELECTION_CONFIGS.applicable_cost_groups;
    if (kg.kind === 'checklist') {
      expect(kg.options.length).toBe(8); // KG 100–800
      expect(kg.options[0]).toMatch(/KG 100/);
      expect(kg.options[7]).toMatch(/KG 800/);
    }
    const gw = SELECTION_CONFIGS.source_set;
    if (gw.kind === 'checklist') {
      expect(gw.options).toContain('Dusche');
      expect(gw.options).toContain('Küchenspüle');
    }
  });
  it('HOAI phases checklist spans LPH 0–9', () => {
    const c = SELECTION_CONFIGS.included_hoai_phases;
    if (c.kind === 'checklist') {
      expect(c.options.length).toBe(10);
      expect(c.options[0]).toMatch(/LPH 0/);
      expect(c.options[9]).toMatch(/LPH 9/);
    }
  });
  it('award criteria enum holds the 7 printed E.2 criteria', () => {
    const c = SELECTION_CONFIGS.award_criteria_list;
    if (c.kind === 'register') {
      const col = c.columns.find((x) => x.key === 'kriterium');
      expect(col?.options).toContain('Schlüsselpersonal');
      expect(col?.options).toContain('Preis');
      expect(col?.options?.length).toBe(7);
    }
  });
});

describe('normalizeChecklist', () => {
  it('coerces junk to empty + dedupes strings', () => {
    expect(normalizeChecklist(null)).toEqual({ selected: [] });
    expect(normalizeChecklist({ selected: ['GWB', 'GWB', 'VgV', 3] })).toEqual({ selected: ['GWB', 'VgV'] });
  });
});

describe('normalizeRegister', () => {
  const cols = SELECTION_CONFIGS.bewertungskommission_members.kind === 'register'
    ? SELECTION_CONFIGS.bewertungskommission_members.columns : [];
  it('coerces cells by column type', () => {
    const c = normalizeRegister({ rows: [{ id: 'a', name: 'Meier', funktion: 'Vorsitz', sachverstand: 'Bau', stimmberechtigt: true }] }, cols);
    expect(c.rows[0]).toMatchObject({ name: 'Meier', stimmberechtigt: true });
  });
  it('drops junk + defaults missing cells', () => {
    const c = normalizeRegister({ rows: [{ id: 'a' }] }, cols);
    expect(c.rows[0].name).toBe('');
    expect(c.rows[0].stimmberechtigt).toBe(false);
  });
  it('newRegisterRow seeds typed defaults; registerRowFilled uses the first text/enum col', () => {
    const row = newRegisterRow(cols);
    expect(registerRowFilled(row, cols)).toBe(false);
    row.name = 'Meier';
    expect(registerRowFilled(row, cols)).toBe(true);
  });
});
