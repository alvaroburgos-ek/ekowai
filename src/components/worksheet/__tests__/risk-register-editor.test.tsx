import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RiskRegisterEditor } from '../risk-register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { normalizeRiskCarrier, type RiskRegisterCarrier } from '@/lib/eval/risk-register';

const FIELD_ID = 'fixture-risk-register';

function initStore(initial?: RiskRegisterCarrier) {
  act(() => {
    useWorksheetStore.getState().init(
      'fixture-instance',
      initial ? { [FIELD_ID]: { type: 'json', value: initial } } : {},
      {},
      {},
    );
  });
}

function storedCarrier(): RiskRegisterCarrier {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? normalizeRiskCarrier(v.value) : { rows: [] };
}

/** One catalog risk pre-selected, in the new multi-assessor shape. */
function withRisk(group = 'Projektumfeld', risk = 'Einsprachen / Auflagen (Vergaben, Baubewilligung etc.)') {
  return normalizeRiskCarrier({
    rows: [
      {
        id: 'r',
        group,
        risk,
        description: '',
        ratings: {
          bauherr: { probability: null, impact: null },
          planer: { probability: null, impact: null },
          betrieb: { probability: null, impact: null },
        },
        migratedFromSingle: false,
      },
    ],
  });
}

beforeEach(() => initStore());

describe('RiskRegisterEditor — catalogue + multi-assessor assessment', () => {
  it('checking a guideline catalogue risk adds a structured multi-assessor row', async () => {
    const user = userEvent.setup();
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    // groups collapsed by default → expand one
    await user.click(screen.getByRole('button', { name: /Projektumfeld/ }));
    await user.click(screen.getByRole('checkbox', { name: /Einsprachen \/ Auflagen/ }));
    const rows = storedCarrier().rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].group).toBe('Projektumfeld');
    expect(rows[0].risk).toMatch(/Einsprachen/);
    expect(rows[0].ratings.bauherr).toEqual({ probability: null, impact: null });
  });

  it('unchecking the catalogue risk removes it again', async () => {
    const user = userEvent.setup();
    initStore(withRisk());
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: /Projektumfeld/ }));
    await user.click(screen.getByRole('checkbox', { name: /Einsprachen \/ Auflagen/ }));
    expect(storedCarrier().rows).toHaveLength(0);
  });

  it('shows the guideline groups and their printed risks in the catalogue', async () => {
    const user = userEvent.setup();
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    // all 11 group headers present
    expect(screen.getByRole('button', { name: /Umwelt, Ökologie/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Umwelt, Ökologie/ }));
    expect(screen.getByRole('checkbox', { name: /Altlasten \/ Schadstoffe \/ Kampfmittel/ })).toBeTruthy();
  });

  it('reproduces the printed worked example: M-Wert und S-Abweichung je Dimension', async () => {
    const user = userEvent.setup();
    initStore(withRisk());
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    // Tab. A.1 "Einsprachen/Auflagen": prob {8,8,9}, Schaden {2,2,2}.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Eintretenswahrscheinlichkeit Bauherr' }), '8');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Eintretenswahrscheinlichkeit Planer' }), '8');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Eintretenswahrscheinlichkeit Betrieb' }), '9');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Schaden Bauherr' }), '2');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Schaden Planer' }), '2');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Schaden Betrieb' }), '2');

    expect(storedCarrier().rows[0].ratings.betrieb.probability).toBe(9);
    // Printed derived values: 8,3 / 0,6 · 2,0 / 0,0 · 16,7 / 1,2.
    expect(screen.getAllByText('8,3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0,6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('16,7').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,2').length).toBeGreaterThan(0);
    expect(screen.getByText(/weichen ab/)).toBeTruthy();
  });

  it('adds a project-specific (custom) risk with editable group + name', async () => {
    const user = userEvent.setup();
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    await user.click(screen.getByRole('button', { name: '+ Projektspezifisches Risiko' }));
    expect(storedCarrier().rows).toHaveLength(1);
    // custom row exposes an editable group select + name input
    expect(screen.getByRole('combobox', { name: 'Risikogruppe' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Risiko (Kurzname)' })).toBeTruthy();
  });

  it('migrates a legacy single-value row and discloses the migration', () => {
    initStore(
      normalizeRiskCarrier({
        rows: [{ id: '1', group: 'Betrieb', risk: 'Ausfall', probability: 6, impact: 3, mitigation: 'm' }],
      }),
    );
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    const row = storedCarrier().rows[0];
    expect(row.ratings.bauherr).toEqual({ probability: 6, impact: 3 });
    expect(row.ratings.betrieb).toEqual({ probability: 6, impact: 3 });
    expect(screen.getByText(/Einzelbewertung übernommen/)).toBeTruthy();
  });

  it('derives the register footer and points measures to worksheet 07 (no mitigation here)', () => {
    initStore(
      normalizeRiskCarrier({
        rows: [
          {
            id: '1',
            group: 'Betrieb',
            risk: 'A',
            ratings: {
              bauherr: { probability: 8, impact: 2 },
              planer: { probability: 8, impact: 2 },
              betrieb: { probability: 9, impact: 2 },
            },
          },
        ],
      }),
    );
    render(<RiskRegisterEditor fieldId={FIELD_ID} />);
    expect(screen.getByText(/max\. Risiko M-Wert/)).toBeTruthy();
    // M820-06 is the analysis only — mitigation lives in the Maßnahmenplan (07).
    expect(screen.getByText(/Maßnahmenplan/)).toBeTruthy();
    expect(screen.queryByLabelText('Präventions-/Korrekturmaßnahmen')).toBeNull();
  });

  it('readOnly disables catalogue + rating controls', () => {
    initStore(withRisk());
    render(<RiskRegisterEditor fieldId={FIELD_ID} readOnly />);
    expect(screen.getByRole('button', { name: '+ Projektspezifisches Risiko' })).toBeDisabled();
    for (const c of screen.getAllByRole('combobox')) expect(c).toBeDisabled();
  });
});
