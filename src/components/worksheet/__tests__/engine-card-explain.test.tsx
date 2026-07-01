/**
 * Rendered integration test for the EquationEngineCard "explain" features:
 *
 *   - Feature 1: missing-input chips + unit-conflict chips render as
 *                clickable buttons in the manual_required banner. Clicking
 *                a chip scrolls to the field that carries `data-symbol`.
 *   - Feature 2: the "Rechnung anzeigen" drill-down stays collapsed by
 *                default. Expanding it surfaces the substituted formula
 *                and a per-input table with value, unit and (when the
 *                inheritance map is provided) origin worksheet.
 *
 * Drives the production component with hand-built EvalState values — the
 * point of this test is the rendered DOM contract, not the evaluator.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquationEngineCard } from '../equation-engine-card';
import type { EvalState } from '@/lib/eval/formula';

describe('EquationEngineCard — Feature 1 (manual_required chips)', () => {
  it('renders missing-input chips and unit-conflict chips as buttons', () => {
    const state: EvalState = {
      kind: 'manual_required',
      reason: 'Mehrere Probleme',
      missing: ['A_C', 'k_i'],
      unitConflicts: [{ symbol: 'd_i', expected: 'm', actual: 'mm' }],
    };
    render(
      <>
        {/* Hidden target fields the chips can scroll to. */}
        <div data-symbol="A_C" />
        <div data-symbol="k_i" />
        <div data-symbol="d_i" />
        <EquationEngineCard
          equationNumber="42"
          sourceFormula="A_C = …"
          state={state}
          outputSymbol="A_C"
          outputUnit="m²"
        />
      </>,
    );

    const card = screen.getByTestId('engine-card-gl-42');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');

    // The "Fehlt: …" chip row exists and contains both missing symbols
    const missingRow = within(card).getByTestId('engine-card-gl-42-missing');
    const missingChips = within(missingRow).getAllByRole('button');
    expect(missingChips.map((b) => b.textContent)).toEqual(['A_C', 'k_i']);

    // The "Einheit: …" chip row exists for the unit conflict. Label combines
    // actual + expected so the engineer can read the chip at a glance.
    const unitRow = within(card).getByTestId('engine-card-gl-42-unit-conflicts');
    const unitChips = within(unitRow).getAllByRole('button');
    expect(unitChips).toHaveLength(1);
    expect(unitChips[0].textContent).toBe('d_i in mm, erwartet m');

    // The legacy <li> "d_i: erwartet m, geliefert mm" line is still present
    // — older integration tests pin on it; we only added the chips below.
    expect(
      within(card)
        .getAllByRole('listitem')
        .some((li) => /^d_i:\s*erwartet/.test(li.textContent ?? '')),
    ).toBe(true);

    // No computed number is ever rendered in manual_required state
    expect(within(card).queryByText(/A_C\s*=\s*\d/)).not.toBeInTheDocument();
  });

  it('clicking a missing-input chip scrolls to the matching data-symbol element', async () => {
    const state: EvalState = {
      kind: 'manual_required',
      reason: 'Fehlt: A_C',
      missing: ['A_C'],
    };
    // Stub scrollIntoView — happy-dom defines no-op stubs that we can spy on.
    const targetEl = document.createElement('div');
    targetEl.setAttribute('data-symbol', 'A_C');
    const scrollSpy = vi.fn();
    targetEl.scrollIntoView = scrollSpy;
    document.body.appendChild(targetEl);

    try {
      const user = userEvent.setup();
      render(
        <EquationEngineCard
          equationNumber="42"
          sourceFormula="A_C = …"
          state={state}
          outputSymbol="A_C"
          outputUnit="m²"
        />,
      );
      const card = screen.getByTestId('engine-card-gl-42');
      const chip = within(card).getByRole('button', {
        name: /Zu Feld A_C springen/,
      });
      await user.click(chip);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      // The transient marker is set on the target so the engineer sees
      // a visual cue even if scroll is a no-op.
      expect(targetEl).toHaveAttribute('data-symbol-flash', '1');
    } finally {
      targetEl.remove();
    }
  });
});

describe('EquationEngineCard — Feature 2 (Rechnung anzeigen drill-down)', () => {
  const computed: EvalState = {
    kind: 'computed',
    value: 690,
    substituted: { a: 300, b: 200, c: 190 },
    formulaEvaluated: 'a + b + c',
  };

  it('drill-down is collapsed by default — the inputs detail table is NOT in the DOM', () => {
    render(
      <EquationEngineCard
        equationNumber="7"
        sourceFormula="X = a + b + c"
        state={computed}
        outputSymbol="X"
        outputUnit="m²"
      />,
    );
    const card = screen.getByTestId('engine-card-gl-7');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText('Rechnung anzeigen')).toBeInTheDocument();
    // The detail table only appears once expanded
    expect(
      within(card).queryByText(/Eingaben im Detail/),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByTestId('engine-card-gl-7-substituted-formula'),
    ).not.toBeInTheDocument();
  });

  it('expanding surfaces the substituted formula and per-input table', async () => {
    const user = userEvent.setup();
    render(
      <EquationEngineCard
        equationNumber="7"
        sourceFormula="X = a + b + c"
        state={computed}
        outputSymbol="X"
        outputUnit="m²"
        unitBySymbol={{ a: 'm²', b: 'm²', c: null }}
      />,
    );
    const card = screen.getByTestId('engine-card-gl-7');
    await user.click(within(card).getByRole('button', { name: 'Rechnung anzeigen' }));

    // Substituted formula: numbers replace each symbol
    const subFormula = within(card).getByTestId(
      'engine-card-gl-7-substituted-formula',
    );
    expect(subFormula.textContent).toBe('300 + 200 + 190');

    // Per-input table: one row per symbol with value + unit columns
    const rowA = within(card).getByTestId('engine-card-gl-7-input-a');
    expect(within(rowA).getByText('a')).toBeInTheDocument();
    expect(rowA.textContent).toMatch(/300/);
    expect(rowA.textContent).toMatch(/m²/);

    const rowC = within(card).getByTestId('engine-card-gl-7-input-c');
    // No unit for c — shown as the em-dash placeholder
    expect(rowC.textContent).toMatch(/—/);

    // Toggle label flips
    expect(
      within(card).getByRole('button', { name: 'Rechnung verbergen' }),
    ).toBeInTheDocument();
  });

  it('shows a Herkunft column populated from inheritedFromBySymbol', async () => {
    const user = userEvent.setup();
    render(
      <EquationEngineCard
        equationNumber="7"
        sourceFormula="X = a + b + c"
        state={computed}
        outputSymbol="X"
        outputUnit="m²"
        unitBySymbol={{ a: 'm²', b: 'm²', c: null }}
        inheritedFromBySymbol={{ a: 'A138-10', b: 'A138-08' }}
      />,
    );
    const card = screen.getByTestId('engine-card-gl-7');
    await user.click(
      within(card).getByRole('button', { name: 'Rechnung anzeigen' }),
    );

    // Column header
    expect(within(card).getByText('Herkunft')).toBeInTheDocument();
    // Origin worksheet codes show in the right row
    const rowA = within(card).getByTestId('engine-card-gl-7-input-a');
    expect(rowA.textContent).toMatch(/A138-10/);
    const rowB = within(card).getByTestId('engine-card-gl-7-input-b');
    expect(rowB.textContent).toMatch(/A138-08/);
    // c has no inherited origin — em-dash placeholder
    const rowC = within(card).getByTestId('engine-card-gl-7-input-c');
    expect(rowC.textContent).toMatch(/—/);
  });

  it('clicking an input symbol button scrolls to the matching data-symbol element', async () => {
    const targetEl = document.createElement('input');
    targetEl.setAttribute('data-symbol', 'a');
    const scrollSpy = vi.fn();
    targetEl.scrollIntoView = scrollSpy;
    document.body.appendChild(targetEl);
    try {
      const user = userEvent.setup();
      render(
        <EquationEngineCard
          equationNumber="7"
          sourceFormula="X = a + b + c"
          state={computed}
          outputSymbol="X"
          outputUnit="m²"
        />,
      );
      const card = screen.getByTestId('engine-card-gl-7');
      await user.click(
        within(card).getByRole('button', { name: 'Rechnung anzeigen' }),
      );
      const rowA = within(card).getByTestId('engine-card-gl-7-input-a');
      await user.click(within(rowA).getByRole('button', { name: /Zu Feld a springen/ }));
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    } finally {
      targetEl.remove();
    }
  });

  it('substituteFormula handles overlapping symbol prefixes (A_C vs A_C_b)', async () => {
    const stateOverlap: EvalState = {
      kind: 'computed',
      value: 11,
      substituted: { A_C: 1, A_C_b: 10 },
      formulaEvaluated: 'A_C + A_C_b',
    };
    const user = userEvent.setup();
    render(
      <EquationEngineCard
        equationNumber="9"
        sourceFormula="X = A_C + A_C_b"
        state={stateOverlap}
        outputSymbol="X"
        outputUnit={null}
      />,
    );
    const card = screen.getByTestId('engine-card-gl-9');
    await user.click(within(card).getByRole('button', { name: 'Rechnung anzeigen' }));
    const sub = within(card).getByTestId('engine-card-gl-9-substituted-formula');
    // Both should be substituted with their own number — NOT a partial overlap
    // (would have produced "1 + 1_b" or similar with a naive replace).
    expect(sub.textContent).toBe('1 + 10');
  });
});

describe('EquationEngineCard — three-state contract (regression guard)', () => {
  it('error state shows the message and never a computed number', () => {
    render(
      <EquationEngineCard
        equationNumber="3"
        sourceFormula="X = a/b"
        state={{ kind: 'error', message: 'Division durch null' }}
        outputSymbol="X"
        outputUnit={null}
      />,
    );
    const card = screen.getByTestId('engine-card-gl-3');
    expect(card).toHaveAttribute('data-engine-state', 'error');
    expect(within(card).getByText(/Fehler: Division durch null/)).toBeInTheDocument();
    // No "X = <number>" anywhere
    expect(within(card).queryByText(/X\s*=\s*\d/)).not.toBeInTheDocument();
    // No drill-down either
    expect(within(card).queryByText('Rechnung anzeigen')).not.toBeInTheDocument();
  });

  it('manual_required without missing/conflicts still renders the reason banner', () => {
    render(
      <EquationEngineCard
        equationNumber="3"
        sourceFormula="X = a/b"
        state={{ kind: 'manual_required', reason: 'Eingaben unklar' }}
        outputSymbol="X"
        outputUnit={null}
      />,
    );
    const card = screen.getByTestId('engine-card-gl-3');
    expect(card).toHaveAttribute('data-engine-state', 'manual_required');
    expect(within(card).getByText('Eingaben unklar')).toBeInTheDocument();
    // No chip rows when no missing/conflicts arrays
    expect(within(card).queryByTestId('engine-card-gl-3-missing')).not.toBeInTheDocument();
    expect(
      within(card).queryByTestId('engine-card-gl-3-unit-conflicts'),
    ).not.toBeInTheDocument();
  });
});

describe('EquationEngineCard — Feature 3 (warnings caveat block)', () => {
  it('renders a boundary-limited caveat block on a computed result with warnings', () => {
    const state: EvalState = {
      kind: 'computed',
      value: 293.17,
      substituted: { 'Maßgebende Dauerstufe D (min)': 1440 },
      formulaEvaluated: 'V_VA = ...',
      warnings: ['Kein eindeutiges Maximum: die maßgebende Dauerstufe liegt am Tabellenrand (D = 1440 min). Bemessung ggf. außerhalb des Einfachen Verfahrens (q_S_AC < 2 prüfen) oder Dauerstufenbereich nach DWA-A 117 erweitern.'],
    };
    render(
      <EquationEngineCard
        equationNumber="8"
        sourceFormula="V_VA = ..."
        state={state}
        outputSymbol="V_VA"
        outputUnit="m³"
      />,
    );
    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).getByText(/Kein eindeutiges Maximum/i)).toBeInTheDocument();
  });

  it('renders no caveat block when warnings is absent on a computed state', () => {
    const state: EvalState = {
      kind: 'computed',
      value: 18.684,
      substituted: { 'Maßgebende Dauerstufe D (min)': 30 },
      formulaEvaluated: 'V_VA = ...',
    };
    render(
      <EquationEngineCard
        equationNumber="8"
        sourceFormula="V_VA = ..."
        state={state}
        outputSymbol="V_VA"
        outputUnit="m³"
      />,
    );
    const card = screen.getByTestId('engine-card-gl-8');
    expect(card).toHaveAttribute('data-engine-state', 'computed');
    expect(within(card).queryByText(/Kein eindeutiges Maximum/i)).not.toBeInTheDocument();
    // No warning caveat container in the DOM
    expect(within(card).queryByTestId('engine-card-gl-8-warnings')).not.toBeInTheDocument();
  });

  it('renders no caveat block when warnings is an empty array', () => {
    const state: EvalState = {
      kind: 'computed',
      value: 18.684,
      substituted: { 'Maßgebende Dauerstufe D (min)': 30 },
      formulaEvaluated: 'V_VA = ...',
      warnings: [],
    };
    render(
      <EquationEngineCard
        equationNumber="8"
        sourceFormula="V_VA = ..."
        state={state}
        outputSymbol="V_VA"
        outputUnit="m³"
      />,
    );
    const card = screen.getByTestId('engine-card-gl-8');
    expect(within(card).queryByTestId('engine-card-gl-8-warnings')).not.toBeInTheDocument();
  });
});

// Quiet the unused-import warning for fireEvent — we may want it in the future.
void fireEvent;
