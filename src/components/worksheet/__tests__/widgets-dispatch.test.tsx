/**
 * Plan 2b Task 3 — the WIDGETS registry's pure dispatch helpers:
 * effectiveWidget (NULL widget ⇒ inferWidget), widgetPlacement (register
 * placement via registerPlacement(), bespoke ⇒ bottom with today's h2 titles,
 * legacy TS checklists ⇒ bottom), resolveBespokeEditor (symbol-keyed while
 * widget IS NULL; ui_config.editor when set; a DB register config wins).
 */
import { describe, it, expect } from 'vitest';
import { effectiveWidget, widgetPlacement, resolveBespokeEditor, BESPOKE_TITLES, BESPOKE_BY_SYMBOL } from '../widgets';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';
import { registerPlacement } from '../register-editor';

const base = {
  id: 'f', labelDe: 'x', labelEn: null, unit: null, isRequired: false, enumValues: null, validationRules: null,
  clauseReference: null, verificationStatus: 'x', description: null, sectionId: 's1', orderIndex: 0, active: true,
  widget: null, uiConfig: null, lookup: null, visibleWhen: null,
} as const;

describe('effectiveWidget / placement / bespoke', () => {
  it('NULL widget infers from data_type exactly like inferWidget', () => {
    expect(effectiveWidget({ ...base, symbol: 'n', dataType: 'number' })).toBe('scalar');
    expect(effectiveWidget({ ...base, symbol: 'e', dataType: 'enum', enumValues: [{ value: 'a', label_de: 'a', label_en: null }] })).toBe('select_one');
    expect(effectiveWidget({ ...base, symbol: 'b', dataType: 'boolean' })).toBe('attestation');
    expect(effectiveWidget({ ...base, symbol: 'j', dataType: 'json' })).toBe('register');
    expect(effectiveWidget({ ...base, symbol: 'j', dataType: 'json', enumValues: [{ value: 'a', label_de: 'a', label_en: null }] })).toBe('select_many');
    expect(effectiveWidget({ ...base, symbol: 'n', dataType: 'number', widget: 'lookup_fill' })).toBe('lookup_fill');
  });

  it('surface_inventory (widget NULL) is a register placed at the bottom (fallback pins placement bottom)', () => {
    const f = { ...base, symbol: 'surface_inventory', dataType: 'json' as const };
    expect(widgetPlacement(f)).toEqual({ placement: 'bottom', title: 'Flächenverzeichnis' });
  });

  it('a DB register config without placement defaults to bottom via registerPlacement(); placement: section is honoured', () => {
    const cfg = { title: 'Reg', columns: [{ key: 'a', type: 'text', label: 'A' }] };
    const noPlacement = { ...base, symbol: 'x', dataType: 'json' as const, widget: 'register', uiConfig: cfg };
    expect(widgetPlacement(noPlacement)).toEqual({ placement: registerPlacement(cfg), title: 'Reg' });
    expect(widgetPlacement(noPlacement).placement).toBe('bottom');
    const inSection = { ...noPlacement, uiConfig: { ...cfg, placement: 'section' } };
    expect(widgetPlacement(inSection)).toEqual({ placement: 'section', title: 'Reg' });
  });

  it('the bespoke editors resolve by symbol while widget IS NULL and by ui_config.editor when set', () => {
    expect(resolveBespokeEditor({ ...base, symbol: 'r_D_n_table', dataType: 'json' }, null)).toBe('rainfall_tables');
    expect(resolveBespokeEditor({ ...base, symbol: 'risk_register', dataType: 'json' }, null)).toBe('risk_register');
    expect(resolveBespokeEditor({ ...base, symbol: 'risk_mitigation_plan', dataType: 'json' }, null)).toBe('risk_mitigation_plan');
    expect(resolveBespokeEditor({ ...base, symbol: 'anything', dataType: 'json', widget: 'register' }, { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }], editor: 'risk_mitigation_plan' })).toBe('risk_mitigation_plan');
    // DB register config wins ⇒ generic editor (Task 9 path)
    expect(resolveBespokeEditor({ ...base, symbol: 'risk_register', dataType: 'json', widget: 'register' }, { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }] })).toBeNull();
    // An unknown ui_config.editor never dispatches.
    expect(resolveBespokeEditor({ ...base, symbol: 'x', dataType: 'json', widget: 'register' }, { title: 't', columns: [{ key: 'a', type: 'text', label: 'A' }], editor: 'nope' })).toBeNull();
    // surface_inventory has NO bespoke editor any more — it is the generic RegisterEditor.
    expect(resolveBespokeEditor({ ...base, symbol: 'surface_inventory', dataType: 'json' }, resolveRegisterConfig({ symbol: 'surface_inventory', dataType: 'json', widget: null }))).toBeNull();
    expect(BESPOKE_TITLES.rainfall_tables).toBe('Regenspendentabellen (für V_VA nach Gl. 8)');
    expect(BESPOKE_TITLES.risk_register).toBe('Risikoanalyse (Anhang A — Tab. A.1)');
    expect(BESPOKE_TITLES.risk_mitigation_plan).toBe('Risiko-Maßnahmenplan (Anhang A — Tab. A.2)');
    expect((BESPOKE_BY_SYMBOL as Record<string, string>).surface_inventory).toBeUndefined();
  });

  it("the bespoke carriers keep their bottom placement + today's h2 titles while widget IS NULL", () => {
    expect(widgetPlacement({ ...base, symbol: 'r_D_n_table', dataType: 'json' })).toEqual({ placement: 'bottom', title: BESPOKE_TITLES.rainfall_tables });
    expect(widgetPlacement({ ...base, symbol: 'risk_register', dataType: 'json' })).toEqual({ placement: 'bottom', title: BESPOKE_TITLES.risk_register });
    // Plan 2b Task 4: pollutant_register is no longer bespoke — it places as a generic register (bottom, config title).
    expect(widgetPlacement({ ...base, symbol: 'pollutant_register', dataType: 'json' })).toEqual({ placement: 'bottom', title: 'Schadstoffregister (E-PRTR)' });
    expect((BESPOKE_BY_SYMBOL as Record<string, string>).pollutant_register).toBeUndefined();
    // Task 6 hand-off: rainfall_table_ref stays on its bespoke editor until then.
    expect(widgetPlacement({ ...base, symbol: 'rainfall_table_ref', dataType: 'text' })).toEqual({ placement: 'bottom', title: BESPOKE_TITLES.rainfall_table_ref });
    // A DB widget on the same symbol is NOT bespoke (widget non-null ⇒ no symbol keying).
    expect(widgetPlacement({ ...base, symbol: 'rainfall_table_ref', dataType: 'text', widget: 'scalar' })).toEqual({ placement: 'section', title: null });
  });

  it('a legacy TS selection register resolves to a bottom-placed register config', () => {
    const f = { ...base, symbol: 'bewertungskommission_members', dataType: 'json' as const };
    expect(resolveRegisterConfig(f)?.placement).toBe('bottom');
    expect(widgetPlacement(f)).toEqual({ placement: 'bottom', title: 'Bewertungskommission' });
  });

  it('legacy TS checklist ⇒ bottom (today); a DB select_many ⇒ its section; json without any config ⇒ section (placeholder)', () => {
    expect(widgetPlacement({ ...base, symbol: 'applicable_legal_bases', dataType: 'json' }).placement).toBe('bottom');
    expect(widgetPlacement({ ...base, symbol: 'db_many', dataType: 'json', widget: 'select_many', uiConfig: { title: 'DB' }, enumValues: [{ value: 'a', label_de: 'a', label_en: null }] })).toEqual({ placement: 'section', title: 'DB' });
    expect(widgetPlacement({ ...base, symbol: 'unknown_json', dataType: 'json' })).toEqual({ placement: 'section', title: null });
    expect(widgetPlacement({ ...base, symbol: 'n', dataType: 'number' })).toEqual({ placement: 'section', title: null });
  });
});
