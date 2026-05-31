/**
 * Integration test: clicking a ClauseChip opens the NormTextPane with the
 * correct heading title for the requested clause reference.
 *
 * The server action `getNormSection` is mocked — the section-extractor logic
 * is unit-tested separately. This test focuses on the UI wiring:
 *   - clicking the chip calls the action with (standardCode, clauseReference)
 *   - the panel becomes visible and renders the returned title
 *   - pressing Escape closes the panel
 *   - found:false shows the source-faithful "not found" message
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the server action BEFORE the component imports it.
vi.mock('@/lib/actions/norm-text', () => ({
  getNormSection: vi.fn(),
}));

import { getNormSection } from '@/lib/actions/norm-text';
import { NormTextProvider } from '../norm-text-context';
import { ClauseChip } from '../clause-chip';

const mockGetNormSection = vi.mocked(getNormSection);

function Harness({ standardCode = 'DWA-A-138-1' }: { standardCode?: string }) {
  return (
    <NormTextProvider standardCode={standardCode}>
      <div>
        <ClauseChip clauseReference="§5.3.3.5" />
        <ClauseChip clauseReference="§99.99" />
      </div>
    </NormTextProvider>
  );
}

describe('NormTextPane integration', () => {
  beforeEach(() => {
    mockGetNormSection.mockReset();
  });

  afterEach(() => {
    // Clean up the body in case a pane leaked into the next test.
    document.body.innerHTML = '';
  });

  it('opens the pane with the resolved title when chip is clicked', async () => {
    mockGetNormSection.mockResolvedValue({
      found: true,
      title: '5.3.3.5 Berechnung Zuflüsse',
      markdown: 'Für die Berechnung der Zuflüsse … AC = sum(A_i * C_i)',
      sourceFile: 'DWA-A-138-1.md',
    });

    render(<Harness />);

    // Panel is not in the DOM before the click.
    expect(screen.queryByTestId('norm-text-pane')).toBeNull();

    const chip = screen.getByTestId('clause-chip-§5.3.3.5');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByTestId('norm-text-pane')).toBeInTheDocument();
    });

    // The action was called with the worksheet's standardCode and the clause.
    expect(mockGetNormSection).toHaveBeenCalledWith({
      standardCode: 'DWA-A-138-1',
      clauseReference: '§5.3.3.5',
    });

    // Once the resolved promise lands, the title shows up in the header.
    await waitFor(() => {
      expect(screen.getByTestId('norm-text-title')).toHaveTextContent(
        '5.3.3.5 Berechnung Zuflüsse',
      );
    });

    // Body markdown is rendered.
    expect(
      screen.getByText(/Für die Berechnung der Zuflüsse/),
    ).toBeInTheDocument();
  });

  it('closes the pane on Escape', async () => {
    mockGetNormSection.mockResolvedValue({
      found: true,
      title: '5.3.3.5 Berechnung Zuflüsse',
      markdown: 'body',
      sourceFile: 'DWA-A-138-1.md',
    });

    render(<Harness />);
    fireEvent.click(screen.getByTestId('clause-chip-§5.3.3.5'));
    await waitFor(() =>
      expect(screen.getByTestId('norm-text-pane')).toBeInTheDocument(),
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByTestId('norm-text-pane')).toBeNull(),
    );
  });

  it('renders a source-faithful "not found" message for unmatched clauses', async () => {
    mockGetNormSection.mockResolvedValue({
      found: false,
      reason: 'clause_not_found',
    });

    render(<Harness />);
    fireEvent.click(screen.getByTestId('clause-chip-§99.99'));

    await waitFor(() => {
      expect(screen.getByTestId('norm-text-pane')).toBeInTheDocument();
    });

    await waitFor(() => {
      // Must NOT show a markdown body — never fabricate.
      expect(screen.getByText(/nicht exakt/)).toBeInTheDocument();
    });
  });

  it('renders ClauseChip as plain text when no provider is mounted', () => {
    render(<ClauseChip clauseReference="§5.1.1" />);
    // No interactive button rendered — should be a plain <span>.
    expect(screen.queryByTestId('clause-chip-§5.1.1')).toBeNull();
    expect(screen.getByText('§5.1.1')).toBeInTheDocument();
  });

  it('renders nothing when clauseReference is null', () => {
    const { container } = render(
      <NormTextProvider standardCode="DWA-A-138-1">
        <ClauseChip clauseReference={null} />
      </NormTextProvider>,
    );
    // Provider still renders a comment + null pane, but the chip itself is null.
    expect(container.textContent ?? '').toBe('');
  });
});
