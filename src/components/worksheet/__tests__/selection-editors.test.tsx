import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { ChecklistEditor } from '../checklist-editor';
import { StructuredRegisterEditor } from '../structured-register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { SELECTION_CONFIGS, normalizeChecklist, normalizeRegister } from '@/lib/eval/selection-fields';

const FIELD_ID = 'fixture-selection';

function init(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
function stored() {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? v.value : undefined;
}
beforeEach(() => init());

const legal = SELECTION_CONFIGS.applicable_legal_bases;
const commission = SELECTION_CONFIGS.bewertungskommission_members;
const award = SELECTION_CONFIGS.award_criteria_list;

describe('ChecklistEditor (applicable_legal_bases)', () => {
  if (legal.kind !== 'checklist') throw new Error('config');
  it('SSR renders without throwing', () => {
    expect(() => renderToString(<ChecklistEditor fieldId={FIELD_ID} config={legal} />)).not.toThrow();
  });
  it('checking an option stores it; unchecking removes it', async () => {
    const user = userEvent.setup();
    render(<ChecklistEditor fieldId={FIELD_ID} config={legal} />);
    const gwbLabel = legal.options.find((o) => o.includes('GWB'))!;
    await user.click(screen.getByRole('checkbox', { name: gwbLabel }));
    expect(normalizeChecklist(stored()).selected).toContain(gwbLabel);
    await user.click(screen.getByRole('checkbox', { name: gwbLabel }));
    expect(normalizeChecklist(stored()).selected).not.toContain(gwbLabel);
  });
  it('adds a custom entry', async () => {
    const user = userEvent.setup();
    render(<ChecklistEditor fieldId={FIELD_ID} config={legal} />);
    await user.type(screen.getByRole('textbox', { name: 'Eigener Eintrag' }), 'LVergabeG NRW');
    await user.click(screen.getByRole('button', { name: '+ hinzufügen' }));
    expect(normalizeChecklist(stored()).selected).toContain('LVergabeG NRW');
  });
  it('readOnly disables checkboxes', () => {
    render(<ChecklistEditor fieldId={FIELD_ID} config={legal} readOnly />);
    for (const c of screen.getAllByRole('checkbox')) expect(c).toBeDisabled();
  });
});

describe('StructuredRegisterEditor (bewertungskommission_members)', () => {
  if (commission.kind !== 'register') throw new Error('config');
  it('SSR renders without throwing', () => {
    expect(() => renderToString(<StructuredRegisterEditor fieldId={FIELD_ID} config={commission} />)).not.toThrow();
  });
  it('adds a row and edits typed cells (text + boolean)', async () => {
    const user = userEvent.setup();
    render(<StructuredRegisterEditor fieldId={FIELD_ID} config={commission} />);
    await user.click(screen.getByRole('button', { name: commission.addLabel }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Meier');
    await user.click(screen.getByRole('checkbox', { name: 'Stimmberechtigt' }));
    const rows = normalizeRegister(stored(), commission.columns).rows;
    expect(rows[0]).toMatchObject({ name: 'Meier', stimmberechtigt: true });
  });
});

describe('StructuredRegisterEditor (change_orders — derived count + summed volume)', () => {
  const co = SELECTION_CONFIGS.change_orders;
  if (co.kind !== 'register') throw new Error('config');
  it('derives count and sums the volume column in the footer', () => {
    init({ rows: [
      { id: 'a', aenderung: 'Nachtrag 1', kosten_eur: 1000, status: 'genehmigt' },
      { id: 'b', aenderung: 'Nachtrag 2', kosten_eur: 500, status: 'offen' },
    ] });
    render(<StructuredRegisterEditor fieldId={FIELD_ID} config={co} />);
    const el = screen.getByTestId('structured-register-editor').textContent ?? '';
    expect(el).toMatch(/2\s*Einträge/);
    expect(el).toMatch(/Volumen/);
    expect(el).toMatch(/1\.500/); // 1000 + 500, de-DE formatting
  });
});

describe('StructuredRegisterEditor (award_criteria_list — enum + number cols)', () => {
  if (award.kind !== 'register') throw new Error('config');
  it('enum column offers the printed E.2 criteria; number column stores a weight', async () => {
    const user = userEvent.setup();
    init({ rows: [{ id: 'r', kriterium: '', gewichtung: null, anmerkung: '' }] });
    render(<StructuredRegisterEditor fieldId={FIELD_ID} config={award} />);
    expect(screen.getByRole('option', { name: 'Schlüsselpersonal' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kriterium' }), 'Preis');
    await user.type(screen.getByRole('spinbutton', { name: 'Gewichtung (%)' }), '30');
    const row = normalizeRegister(stored(), award.columns).rows[0];
    expect(row).toMatchObject({ kriterium: 'Preis', gewichtung: 30 });
  });
});
