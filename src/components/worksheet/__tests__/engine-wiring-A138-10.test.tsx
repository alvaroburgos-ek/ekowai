/**
 * Integration test for the A138-10 Gl. 2 engine wiring.
 *
 * Exercises the production code path end-to-end without mocking the engine
 * or the store:
 *
 *   real store (zustand)
 *     -> SubAreasEditor (user types here)
 *     -> useEquationEngine hook (the SAME hook worksheet-form.tsx uses)
 *     -> EquationEngineCard (renders the engine state)
 *     -> store field-write (the hook writes A_C back into the store)
 *
 * Assertions are on what the DOM actually renders — not on the evaluator's
 * return value. That's the wiring layer the unit tests deliberately skip.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubAreasEditor } from '../sub-areas-editor';
import { EquationEngineCard } from '../equation-engine-card';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// ---- A138-10 fixture: real field ids/symbols from the DB --------------------
const A138_10_GL2_EQ_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const SUB_AREAS_FIELD_ID = 'fixture-sub-areas-id';
const A_C_FIELD_ID = 'fixture-A_C-id';

const FIELDS = [
  { id: A_C_FIELD_ID, symbol: 'A_C', unit: 'm²' },
  { id: SUB_AREAS_FIELD_ID, symbol: 'sub_areas_A138_10', unit: null },
];

const EQUATIONS = [
  {
    id: A138_10_GL2_EQ_ID,
    equationNumber: '2',
    formula: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
    inputSymbols: ['A_E_b_a_i', 'A_E_nb_a_i', 'C_i'],
    outputSymbol: 'A_C',
  },
];

// ---- Harness: same wiring that worksheet-form.tsx uses ---------------------
function Harness() {
  const { engineStates } = useEquationEngine({
    worksheetCode: 'A138-10',
    fields: FIELDS,
    equations: EQUATIONS,
    engineWhitelist: new Set<string>(['A138-10:2']),
  });
  const state = engineStates[A138_10_GL2_EQ_ID];
  return (
    <>
      <SubAreasEditor fieldId={SUB_AREAS_FIELD_ID} />
      {state && (
        <EquationEngineCard
          equationNumber="2"
          sourceFormula="A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)"
          state={state}
          outputSymbol="A_C"
          outputUnit="m²"
        />
      )}
    </>
  );
}

// ---- Helpers ---------------------------------------------------------------

function initStore() {
  // Reset the real store to a clean state pointing at a fixture instance.
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', {}, {}, {});
  });
}

/** Read the latest A_C value the engine wrote back into the store. */
function getStoredAC(): number | null {
  const v = useWorksheetStore.getState().values[A_C_FIELD_ID];
  if (v?.type !== 'number') return null;
  return v.value;
}

/** Add N empty rows by clicking the add-row button N times. */
async function addRows(user: ReturnType<typeof userEvent.setup>, count: number) {
  const btn = screen.getByRole('button', { name: /Zeile hinzufügen/i });
  for (let i = 0; i < count; i++) await user.click(btn);
}

/** Fill row `idx` (0-based) by querying inputs *inside that row's <tr>*. */
async function fillRow(
  user: ReturnType<typeof userEvent.setup>,
  idx: number,
  data: {
    label: string;
    kind: 'paved' | 'unpaved';
    area: number;
    c: number | '';
  },
) {
  const rows = screen.getAllByRole('row');
  // rows[0] is the <thead> row, so data rows start at index 1
  const row = rows[idx + 1];
  const scope = within(row);
  const inputs = scope.getAllByRole('textbox'); // label
  await user.type(inputs[0], data.label);
  const selects = scope.getAllByRole('combobox');
  await user.selectOptions(selects[0], data.kind);
  const numberInputs = scope.getAllByRole('spinbutton');
  await user.clear(numberInputs[0]);
  await user.type(numberInputs[0], String(data.area));
  await user.clear(numberInputs[1]);
  if (data.c !== '') await user.type(numberInputs[1], String(data.c));
}

/** Clear the coefficient of row `idx`. */
async function clearCoefficient(user: ReturnType<typeof userEvent.setup>, idx: number) {
  const rows = screen.getAllByRole('row');
  const row = rows[idx + 1];
  const numberInputs = within(row).getAllByRole('spinbutton');
  await user.clear(numberInputs[1]);
}

// ---- Tests -----------------------------------------------------------------

describe('A138-10 Gl. 2 — wiring integration', () => {
  beforeEach(() => initStore());

  it('initial render with zero rows — engine card is manual_required, A_C cleared', () => {
    render(<Harness />);
    const card = screen.getByTestId('engine-card-gl-2');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    // The reason references the empty-state, not a number
    expect(within(card).getByText(/mindestens eine Zeile/i)).toBeInTheDocument();
    expect(within(card).queryByText(/A_C\s*=\s*\d/)).not.toBeInTheDocument();
    expect(getStoredAC()).toBeNull();
  });

  // Per-test timeout bumped because this test does 4 addRows + 4 fillRows
  // (each fillRow types into 4 inputs). The default 5000ms is enough in
  // isolation but flaky under parallel suite load. 15000ms gives consistent
  // headroom without masking real regressions.
  it('(a) Case B (mixed C, four rows) — displayed A_C = 690 m², green/computed state', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await addRows(user, 4);
    await fillRow(user, 0, { label: 'Steildach', kind: 'paved', area: 400, c: 0.9 });
    await fillRow(user, 1, { label: 'Pflaster', kind: 'paved', area: 300, c: 0.8 });
    await fillRow(user, 2, { label: 'Kies', kind: 'paved', area: 100, c: 0.5 });
    await fillRow(user, 3, { label: 'Rasen', kind: 'unpaved', area: 200, c: 0.2 });

    // Card shows the green/computed badge ...
    const card = screen.getByTestId('engine-card-gl-2');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/rechnerisch bestätigt/i)).toBeInTheDocument();
    expect(
      within(card).queryByText(/rechnerisch nicht bestätigt/i),
    ).not.toBeInTheDocument();

    // ... and the rendered A_C is 690,00 m² (de-DE formatted)
    expect(within(card).getByText(/A_C = 690 m²/)).toBeInTheDocument();
    expect(within(card).getByText(/Σ befestigt/)).toBeInTheDocument();

    // The store now carries A_C = 690 — wired write-back happened
    expect(getStoredAC()).toBe(690);
  }, 15000);

  it('(b) Clearing one row\'s coefficient → manual_required, no number, no stale 690', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Build the same four-row state first
    await addRows(user, 4);
    await fillRow(user, 0, { label: 'Steildach', kind: 'paved', area: 400, c: 0.9 });
    await fillRow(user, 1, { label: 'Pflaster', kind: 'paved', area: 300, c: 0.8 });
    await fillRow(user, 2, { label: 'Kies', kind: 'paved', area: 100, c: 0.5 });
    await fillRow(user, 3, { label: 'Rasen', kind: 'unpaved', area: 200, c: 0.2 });
    expect(getStoredAC()).toBe(690);

    // Clear row 2 (Pflaster) coefficient
    await clearCoefficient(user, 1);

    const card = screen.getByTestId('engine-card-gl-2');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(within(card).getByText(/rechnerisch nicht bestätigt — manuell prüfen/i)).toBeInTheDocument();
    // The reason names the row by its label
    expect(within(card).getByText(/Pflaster/)).toBeInTheDocument();
    // No A_C number anywhere in the card
    expect(within(card).queryByText(/A_C\s*=\s*\d/)).not.toBeInTheDocument();
    // And the store's A_C was cleared — no stale 690
    expect(getStoredAC()).toBeNull();
  });

  it('(c) Case A (uniform C = 0.85, three rows) — displayed A_C = 510 m²', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await addRows(user, 3);
    await fillRow(user, 0, { label: 'Carpark A', kind: 'paved', area: 300, c: 0.85 });
    await fillRow(user, 1, { label: 'Carpark B', kind: 'paved', area: 200, c: 0.85 });
    await fillRow(user, 2, { label: 'Verge', kind: 'unpaved', area: 100, c: 0.85 });

    const card = screen.getByTestId('engine-card-gl-2');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/A_C = 510 m²/)).toBeInTheDocument();
    expect(getStoredAC()).toBe(510);
  });
});
