import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { MitigationPlanEditor } from '../mitigation-plan-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { normalizeMitigationCarrier, type MitigationPlanCarrier } from '@/lib/eval/mitigation-plan';

const FIELD_ID = 'fixture-mitigation-plan';

function initStore(initial?: MitigationPlanCarrier) {
  act(() => {
    useWorksheetStore.getState().init(
      'fixture-instance',
      initial ? { [FIELD_ID]: { type: 'json', value: initial } } : {},
      {},
      {},
    );
  });
}
function storedCarrier(): MitigationPlanCarrier {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? normalizeMitigationCarrier(v.value) : { plans: [] };
}

function withPlan() {
  return normalizeMitigationCarrier({
    plans: [{ id: 'p', risiko: 'Altlasten', risikokategorie: 'Umwelt, Ökologie', wert: 48, measures: [] }],
  });
}

beforeEach(() => initStore());

describe('MitigationPlanEditor — Tab. A.2 measure plan', () => {
  it('SSR: renders to string without throwing (empty + populated)', () => {
    expect(() => renderToString(<MitigationPlanEditor fieldId={FIELD_ID} />)).not.toThrow();
  });

  it('adds a plan card', async () => {
    const user = userEvent.setup();
    render(<MitigationPlanEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: '+ Risiko-Maßnahmenplan' }));
    expect(storedCarrier().plans).toHaveLength(1);
  });

  it('offers the guideline Risikogruppen as category options', async () => {
    const user = userEvent.setup();
    initStore(withPlan());
    render(<MitigationPlanEditor fieldId={FIELD_ID} />);
    expect(screen.getByRole('option', { name: 'Umwelt, Ökologie' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Risikokategorie / -bereich' }), 'Rechtliche Aspekte');
    expect(storedCarrier().plans[0].risikokategorie).toBe('Rechtliche Aspekte');
  });

  it('adds a measure with the T/O/P type (guideline enum) and stores it', async () => {
    const user = userEvent.setup();
    initStore(withPlan());
    render(<MitigationPlanEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: '+ Maßnahme' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Maßnahmen-Typ' }), 'O');
    await user.type(screen.getByRole('textbox', { name: 'Maßnahme' }), 'Altlastenkataster beiziehen');
    const m = storedCarrier().plans[0].measures[0];
    expect(m.type).toBe('O');
    expect(m.text).toBe('Altlastenkataster beiziehen');
  });

  it('derives measure counts by type in the footer', () => {
    initStore(
      normalizeMitigationCarrier({
        plans: [{
          id: '1', risiko: 'Altlasten', wert: 48, measures: [
            { id: 'a', type: 'O', text: 'A', verantwortung: 'BL' },
            { id: 'b', type: 'T', text: 'B', verantwortung: 'BL' },
          ],
        }],
      }),
    );
    render(<MitigationPlanEditor fieldId={FIELD_ID} />);
    const editor = screen.getByTestId('mitigation-plan-editor');
    const footer = editor.textContent ?? '';
    expect(footer).toMatch(/Maßnahmenpläne/);
    expect(footer).toMatch(/2\s*Maßnahmen/); // derived measure count
    expect(footer).toMatch(/T\s*1/);
    expect(footer).toMatch(/O\s*1/);
  });

  it('readOnly disables editing', () => {
    initStore(withPlan());
    render(<MitigationPlanEditor fieldId={FIELD_ID} readOnly />);
    expect(screen.getByRole('button', { name: '+ Risiko-Maßnahmenplan' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Risikokategorie / -bereich' })).toBeDisabled();
  });
});
