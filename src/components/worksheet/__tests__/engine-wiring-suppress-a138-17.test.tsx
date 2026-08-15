/**
 * Defect #22 — wiring-level reproduction test (binding rider).
 *
 * WHAT THIS TESTS:
 *   worksheet-form.tsx line 309 wires engine suppression via
 *   `composeEngineSuppressedSymbols(asmMethod, worksheet.template.code,
 *   inheritedFromBySymbol)`. Reverting that line back to the old call
 *   `asmEngineSuppressedSymbols(asmMethod)` (dropping the home-boundary
 *   term) silently re-introduces defect #22 in production with NO existing
 *   test failing. This test closes that gap.
 *
 * APPROACH — render WorksheetForm with mocked sub-components + spied engine:
 *   We mock all server actions and sub-components that have server-only /
 *   DB dependencies, then mount the REAL WorksheetForm with a minimal
 *   A138-17-shaped props fixture. useEquationEngine is replaced with a spy
 *   that records the `suppressWriteBackSymbols` argument it receives.
 *
 *   Reverting worksheet-form line 309 from:
 *     composeEngineSuppressedSymbols(asmMethod, worksheet.template.code, inheritedFromBySymbol)
 *   to:
 *     asmEngineSuppressedSymbols(asmMethod)
 *   causes asmMethod=null → empty set → `capturedSuppressSet` no longer
 *   contains 'A_S_m' → the primary assertion FAILS. Defect caught.
 *
 * REPRODUCTION PROPERTY (verified in "RED/GREEN proof" section below):
 *   - GREEN (fixed): capturedSuppressSet.has('A_S_m') === true.
 *   - RED  (reverted to old call): has('A_S_m') === false → assertion fails.
 *     Documented via it.fails which passes the suite only when the inner
 *     assertion throws.
 */

// ── Mocks — must be declared BEFORE any imports the mocked modules touch ──────

// Server actions (all use DB; must be stubs):
vi.mock('@/lib/actions/worksheet', () => ({
  saveWorksheet: vi.fn(async () => ({ ok: true, warnings: [] })),
}));
vi.mock('@/lib/actions/worksheet-transition', () => ({
  transitionWorksheet: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/overrides', () => ({
  recordManualOverride: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/citations', () => ({
  addCitation: vi.fn(async () => ({ ok: true })),
  removeCitation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/documents', () => ({
  uploadDocument: vi.fn(async () => ({ ok: true, id: 'stub-doc' })),
}));
vi.mock('@/lib/actions/verification', () => ({
  verifyField:   vi.fn(async () => ({ ok: true })),
  unverifyField: vi.fn(async () => ({ ok: true })),
  verifyEquation:   vi.fn(async () => ({ ok: true })),
  unverifyEquation: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/actions/project-standards', () => ({
  addStandardByCodeToProject: vi.fn(async () => ({ ok: true })),
}));

// Next.js and i18n stubs:
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={String(href)}>{children}</a>,
}));

// Sub-components that render deeply or import server-only things:
vi.mock('../section-group', () => ({ SectionGroup: () => null }));
vi.mock('../equations-block', () => ({ EquationsBlock: () => null }));
vi.mock('../compliance-block', () => ({ ComplianceBlock: () => null }));
vi.mock('../approval-bar', () => ({ ApprovalBar: () => null }));
vi.mock('../equation-engine-card', () => ({ EquationEngineCard: () => null }));
vi.mock('../manual-override-pill', () => ({
  ManualOverridePill: () => null,
  useManualOverride: () => ({ isOverrideActive: false, onOverride: vi.fn() }),
}));
vi.mock('../rainfall-tables-editor', () => ({ RainfallTablesEditor: () => null }));
vi.mock('../rainfall-table-selector', () => ({ RainfallTableSelector: () => null }));
vi.mock('../surface-inventory-editor', () => ({ SurfaceInventoryEditor: () => null }));
vi.mock('../surface-source-banner', () => ({ SurfaceSourceBanner: () => null }));
vi.mock('@/components/form-templates/SourceFormReferencePanel', () => ({
  SourceFormReferencePanel: () => null,
}));

// DynamicField renders deeply (CitationPicker, VerifyButton, ClauseChip…);
// stub it so WorksheetForm renders without error:
vi.mock('../dynamic-field', () => ({
  DynamicField: () => null,
}));

// ── The engine hook spy — captures `suppressWriteBackSymbols` ─────────────────
let capturedSuppressSet: ReadonlySet<string> | undefined;

vi.mock('@/lib/eval/use-equation-engine', () => ({
  useEquationEngine: vi.fn((args: { suppressWriteBackSymbols?: ReadonlySet<string> }) => {
    capturedSuppressSet = args.suppressWriteBackSymbols;
    return { engineEquationIds: new Set<string>(), engineStates: {} };
  }),
}));

// ── Remaining imports (AFTER mock declarations) ───────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, act } from '@testing-library/react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { WorksheetForm } from '../worksheet-form';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';

// ── A138-17 props fixture ─────────────────────────────────────────────────────
//
// Minimal required props for WorksheetForm. We provide:
//   - worksheet.template.code = 'A138-17'
//   - inheritedFromBySymbol  = { A_S_m: 'A138-12', … }  (the critical entry)
//   - asmMethod resolves to null: no `a_s_m_determination_method` field exists
//     on A138-17 (it lives on A138-12 only), so asmMethodFieldHoisted is
//     undefined → asmMethod = null.
//
// With these inputs, worksheet-form line 309 (FIXED):
//   composeEngineSuppressedSymbols(null, 'A138-17', { A_S_m: 'A138-12', … })
//   → home-boundary term: A_S_m home=A138-12 ≠ A138-17 → added to set.
//   → capturedSuppressSet.has('A_S_m') = true.
//
// If line 309 is REVERTED to `asmEngineSuppressedSymbols(null)`:
//   → null → 'direct' default → empty set.
//   → capturedSuppressSet.has('A_S_m') = false → assertion FAILS.

const INHERITED_FROM: Record<string, string> = {
  A_S_m: 'A138-12',
  A_C:   'A138-07',
  A_VA:  'A138-07',
  r_D_n: 'A138-10',
};

const WORKSHEET_FORM_PROPS = {
  locale:     'de' as const,
  projectId:  'proj-fixture',
  worksheet: {
    template: {
      code:    'A138-17',
      titleDe: 'Mulde',
      titleEn: 'Retention Basin',
    },
  },
  instance: {
    id:     'inst-fixture-a138-17',
    status: 'draft' as const,
  },
  sections:                 [],
  fields:                   [],
  equations:                [],
  complianceRequirements:   [],
  complianceSuggestions:    [],
  initialValues:            {},
  initialSources:           {},
  initialCitations:         {},
  sameSymbolValuesBySymbol: {},
  inheritedFromBySymbol:    INHERITED_FROM,
  standardCode:             'DWA-A-138-1',
  docs:                     [],
} satisfies Parameters<typeof WorksheetForm>[0];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('defect #22 — wiring-level (WorksheetForm → useEquationEngine suppressWriteBackSymbols)', () => {
  beforeEach(() => {
    capturedSuppressSet = undefined;
    (useEquationEngine as Mock).mockClear();

    act(() => {
      useWorksheetStore
        .getState()
        .init('inst-fixture-a138-17', {}, {}, {});
    });
  });

  // ── GREEN: the primary assertion ─────────────────────────────────────────

  it('FIXED — WorksheetForm A138-17: engine receives A_S_m in suppressWriteBackSymbols', () => {
    render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);

    // useEquationEngine must have been called — confirms the seam executed.
    expect(useEquationEngine).toHaveBeenCalled();

    // The suppression set passed by WorksheetForm line 309 must contain A_S_m.
    // REVERTING line 309 to `asmEngineSuppressedSymbols(asmMethod)` (asmMethod=null
    // → empty set) makes this assertion FAIL → test RED → defect caught.
    expect(capturedSuppressSet).toBeDefined();
    expect(capturedSuppressSet!.has('A_S_m')).toBe(true);
  });

  it('FIXED — all inherited symbols (A_C, A_VA, r_D_n) are also in the suppression set', () => {
    render(<WorksheetForm {...WORKSHEET_FORM_PROPS} />);

    expect(capturedSuppressSet!.has('A_C')).toBe(true);
    expect(capturedSuppressSet!.has('A_VA')).toBe(true);
    expect(capturedSuppressSet!.has('r_D_n')).toBe(true);
  });

  it('baseline — empty inheritedFromBySymbol: suppression set is empty (no false positives)', () => {
    render(
      <WorksheetForm
        {...WORKSHEET_FORM_PROPS}
        inheritedFromBySymbol={{}}
      />,
    );

    expect(useEquationEngine).toHaveBeenCalled();
    // No inherited symbols → nothing to suppress (asmMethod=null → method term empty).
    expect(capturedSuppressSet).toBeDefined();
    expect(capturedSuppressSet!.size).toBe(0);
  });

  // ── RED proof — documented failure of the reverted path ──────────────────
  //
  // `it.fails` passes the suite only when the inner assertion THROWS.
  // This case demonstrates — live, via execution — that reverting
  // worksheet-form line 309 to `asmEngineSuppressedSymbols(asmMethod)` breaks
  // the suppression of A_S_m.
  //
  // HOW TO READ THE RED OUTPUT (captured during verification):
  //   AssertionError: expected false to be true
  //   at: capturedSuppressSet!.has('A_S_m')).toBe(true)
  //
  // The `it.fails` label ensures this documents the defect without breaking CI.
  //
  // NOTE: we cannot render WorksheetForm itself with the REVERTED code path
  // inside a single test file — that would require editing the source. Instead,
  // we document the equivalent via a standalone BugSeamHarness (below) that
  // replicates the reverted expression verbatim.

  // Thin harness that replicates EXACTLY the reverted expression:
  // `const engineSuppressedSymbols = useMemo(() => asmEngineSuppressedSymbols(asmMethod), [asmMethod]);`
  // asmMethod=null → empty set → A_S_m not suppressed → defect returns.

  it.fails(
    'RED (reverted path): asmEngineSuppressedSymbols(null) → A_S_m absent from set → assertion fails',
    () => {
      // This component replicates what worksheet-form would do if line 309 were
      // reverted to `asmEngineSuppressedSymbols(asmMethod)`.
      function BugSeamHarness() {
        const { asmEngineSuppressedSymbols } = require('@/lib/eval/asm-source') as typeof import('@/lib/eval/asm-source');
        const suppressed = React.useMemo(() => asmEngineSuppressedSymbols(null), []);
        useEquationEngine({
          worksheetCode: 'A138-17',
          fields: [],
          equations: [],
          suppressWriteBackSymbols: suppressed,
        });
        return null;
      }

      render(<BugSeamHarness />);

      expect(useEquationEngine).toHaveBeenCalled();
      // asmEngineSuppressedSymbols(null) = stable empty set
      // → has('A_S_m') = false → this assertion THROWS → it.fails passes.
      expect(capturedSuppressSet!.has('A_S_m')).toBe(true); // ← FAILS (expected)
    },
  );
});
