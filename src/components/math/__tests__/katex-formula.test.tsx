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
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KatexFormula } from '../katex-formula';
import { EquationsBlock } from '@/components/worksheet/equations-block';

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
