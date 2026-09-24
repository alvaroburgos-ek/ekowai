/**
 * Plan 3 final wave B (defect 2) — a checklist rendered enum VALUES, not labels.
 *
 * Found by DWA-M-820-2 (`m820_2-E-1`); ISO-5667-10 names it too. `fromDbField` mapped a
 * prod `select_many` field's `enum_values` to `options: ev.map((e) => e.value)` and threw
 * `label_de` away, so every option of every migrated checklist rendered as its token
 * (`qs_rohrleitung`) instead of the printed German label ("Rohrleitungsbau").
 *
 * The fix carries the labels through the config (`optionLabels`) and the editor renders
 * `optionLabels[value] ?? value` — the same `option_labels ?? value` rule the register
 * editor's enum column already follows.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChecklistEditor } from '../checklist-editor';
import { fromDbField } from '@/lib/eval/selection-fields';
import type { ChecklistConfig } from '@/lib/eval/selection-fields';

afterEach(cleanup);

const DB_ROW = {
  symbol: 'qs_bereiche',
  dataType: 'enum',
  widget: 'select_many',
  lookup: null,
  visibleWhen: null,
  uiConfig: { title: 'QS-Bereiche', subtitle: 'DWA-M 820-2', groups: [{ label: 'Bau', options: ['qs_rohrleitung'] }] },
  enumValues: [
    { value: 'qs_rohrleitung', label_de: 'Rohrleitungsbau', order_index: 0 },
    { value: 'qs_kanalsanierung', label_de: 'Kanalsanierung', order_index: 1 },
    // a prod row whose label_de IS the value (no separate label printed)
    { value: 'sonstiges', label_de: 'sonstiges', order_index: 2 },
  ],
};

describe('checklist labels (wave B defect 2)', () => {
  it('fromDbField keeps label_de beside the value', () => {
    const cfg = fromDbField(DB_ROW) as ChecklistConfig;
    expect(cfg.kind).toBe('checklist');
    expect(cfg.options).toEqual(['qs_rohrleitung', 'qs_kanalsanierung', 'sonstiges']);
    expect(cfg.optionLabels).toEqual({
      qs_rohrleitung: 'Rohrleitungsbau',
      qs_kanalsanierung: 'Kanalsanierung',
      sonstiges: 'sonstiges',
    });
  });

  it('the editor renders the LABEL, not the value — flat option list', () => {
    const cfg = { ...(fromDbField(DB_ROW) as ChecklistConfig), groups: undefined };
    render(<ChecklistEditor fieldId="f1" config={cfg} />);
    expect(screen.getByText('Rohrleitungsbau')).toBeTruthy();
    expect(screen.getByText('Kanalsanierung')).toBeTruthy();
    expect(screen.queryByText('qs_rohrleitung')).toBeNull();
    // the checkbox stays addressable by its label
    expect(screen.getByLabelText('Rohrleitungsbau')).toBeTruthy();
  });

  it('the editor renders the LABEL inside a grouped option list too', () => {
    const cfg = fromDbField(DB_ROW) as ChecklistConfig;
    render(<ChecklistEditor fieldId="f2" config={cfg} />);
    expect(screen.getByText('Rohrleitungsbau')).toBeTruthy();
    expect(screen.queryByText('qs_rohrleitung')).toBeNull();
  });

  it('falls back to the value when prod supplies no label', () => {
    const cfg: ChecklistConfig = { kind: 'checklist', title: 'T', subtitle: '', options: ['nur_wert'] };
    render(<ChecklistEditor fieldId="f3" config={cfg} />);
    expect(screen.getByText('nur_wert')).toBeTruthy();
  });
});

/**
 * Wave B fix round 1, item 4 — `??` does not catch the EMPTY STRING, so a prod
 * `enum_values[i].label_de = ''` would render a blank checkbox label with no way to tell
 * the options apart. Prod has 0 empty labels today; this is prophylactic and pinned.
 */
describe('checklist labels — an empty label_de falls back to the value (fix round 1, item 4)', () => {
  const ROW_WITH_EMPTY = {
    ...DB_ROW,
    uiConfig: { title: 'QS-Bereiche', subtitle: 'DWA-M 820-2' },
    enumValues: [
      { value: 'qs_rohrleitung', label_de: 'Rohrleitungsbau', order_index: 0 },
      { value: 'qs_leer', label_de: '', order_index: 1 },
      { value: 'qs_blank', label_de: '   ', order_index: 2 },
    ],
  };
  it('fromDbField maps an empty / whitespace label to the value', () => {
    const cfg = fromDbField(ROW_WITH_EMPTY) as ChecklistConfig;
    expect(cfg.optionLabels).toEqual({
      qs_rohrleitung: 'Rohrleitungsbau',
      qs_leer: 'qs_leer',
      qs_blank: 'qs_blank',
    });
  });
  it('the editor never renders a blank label, even if one reached optionLabels', () => {
    const cfg: ChecklistConfig = {
      kind: 'checklist', title: 'T', subtitle: '', options: ['qs_leer'],
      optionLabels: { qs_leer: '' },
    };
    render(<ChecklistEditor fieldId="f4" config={cfg} />);
    expect(screen.getByLabelText('qs_leer')).toBeTruthy();
  });
});
