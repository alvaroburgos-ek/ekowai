/**
 * Integration test for the KaTeX rendering pipeline.
 *
 * Exercises the production code path end-to-end (no mocking):
 *
 *   DB formula string
 *     -> formulaToLatex (ASCII → LaTeX)
 *     -> katex.renderToString
 *     -> dangerouslySetInnerHTML into a <span>
 *
 * The assertions look for the `katex` class that KaTeX always injects on
 * its outermost wrapper; that class is the canonical sign-off that math
 * was actually typeset and not just dropped as a text node.
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, act } from '@testing-library/react';
import katex from 'katex';
import { KatexFormula } from '../katex-formula';
import { EquationsBlock } from '@/components/worksheet/equations-block';

describe('KatexFormula — memoisation (FLL register stall, 2026-09-30)', () => {
  it('typesets ONCE across 25 parent re-renders and 5 unmount/remount cycles of the same formula', () => {
    const spy = vi.spyOn(katex, 'renderToString');
    const SOURCE = 'V_churn = SUM(A_i * C_i) + pi/4 * d^2';
    let bump!: () => void;
    let toggle!: () => void;
    function Parent() {
      const [n, setN] = useState(0);
      const [shown, setShown] = useState(true);
      bump = () => setN((v) => v + 1);
      toggle = () => setShown((v) => !v);
      return (
        <div data-n={n}>
          {shown && <KatexFormula source={SOURCE} displayMode />}
        </div>
      );
    }
    const { container } = render(<Parent />);
    expect(container.querySelector('.katex')).not.toBeNull();
    const afterMount = spy.mock.calls.length;
    expect(afterMount).toBe(1);

    // Parent re-renders with identical props: memo bails out, no typeset.
    for (let i = 0; i < 25; i++) act(() => bump());
    expect(spy.mock.calls.length).toBe(afterMount);

    // Unmount + remount: the module-level HTML cache answers, no typeset.
    for (let i = 0; i < 5; i++) {
      act(() => toggle());
      act(() => toggle());
    }
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(spy.mock.calls.length).toBe(afterMount);
    spy.mockRestore();
  });

  it('a changed formula string DOES typeset again (memo keys on the source)', () => {
    const spy = vi.spyOn(katex, 'renderToString');
    const { rerender } = render(<KatexFormula source="a_1 + b_1" />);
    const first = spy.mock.calls.length;
    expect(first).toBeGreaterThanOrEqual(0);
    rerender(<KatexFormula source="a_1 + b_1 + c_1" />);
    expect(spy.mock.calls.length).toBe(first + 1);
    spy.mockRestore();
  });
});

describe('KatexFormula', () => {
  it('renders a KaTeX-typeset formula for an A138-18 reference equation', () => {
    const { container } = render(
      <KatexFormula source="(b_R + h_R) * L_R + b_R * h_R" />,
    );
    // KaTeX wraps every render in <span class="katex">...</span>
    const katex = container.querySelector('.katex');
    expect(katex).not.toBeNull();
    // Subscript spans are present (the `_{R}` → KaTeX `.msupsub` infrastructure)
    expect(container.querySelector('.katex .msupsub')).not.toBeNull();
  });

  it('renders an empty string as nothing rather than crashing', () => {
    const { container } = render(<KatexFormula source="" />);
    expect(container.textContent).toBe('');
  });

  it('renders pi as a Greek glyph', () => {
    const { container } = render(<KatexFormula source="pi/4 * d^2" />);
    // KaTeX renders \pi using the unicode π glyph inside the .katex wrapper.
    const katex = container.querySelector('.katex');
    expect(katex).not.toBeNull();
    expect(katex?.textContent ?? '').toMatch(/π/);
  });
});

describe('EquationsBlock — integration', () => {
  it('renders each equation as a KaTeX <span class="katex"> in the document', () => {
    const equations = [
      {
        id: 'eq-1',
        equationNumber: '2',
        formula: 'A_C = SUM(A_E_b_a_i * C_i) + SUM(A_E_nb_a_i * C_i)',
        inputSymbols: ['A_E_b_a_i', 'A_E_nb_a_i', 'C_i'],
        outputSymbol: 'A_C',
        clauseReference: '§6.1',
        description: null,
        verificationStatus: 'engineer_verified',
      },
      {
        id: 'eq-2',
        equationNumber: '21',
        formula:
          's_R = (s_F / (b_R * h_R)) * (b_R * h_R + az * (pi/4) * ((d_i^2/s_F) - d_a^2))',
        inputSymbols: ['s_F', 'b_R', 'h_R', 'az', 'd_i', 'd_a'],
        outputSymbol: 's_R',
        clauseReference: '§7.4',
        description: null,
        verificationStatus: 'engineer_verified',
      },
    ];
    const { container } = render(<EquationsBlock equations={equations} />);
    const katexNodes = container.querySelectorAll('.katex');
    // One KaTeX render per equation row.
    expect(katexNodes.length).toBe(equations.length);
  });
});
