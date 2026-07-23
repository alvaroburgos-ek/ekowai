/**
 * Finding G1 (summary fix wave) — DB-free DISPATCH-LEVEL logic RED.
 *
 * Two coupled defects, both proven here at the logic layer (no DB):
 *
 * (a) CHAIN-FIRE: when the asm/facility materialize writes A_S_m (+ Finding-F's V_M)
 *     SERVER-side in a save's tx, the phase4_summary summary must ALSO recompute in
 *     the SAME tx — mirroring the existing chained Tab.6 re-fire. On current code the
 *     summary only producer-fires when a PHASE4_SUMMARY_INPUT_SYMBOL is in the user's
 *     save BATCH; an A138-17 h_M save changes h_M (∉ summary inputs) → asm fires,
 *     summary does NOT → the summary freezes at its Step-1 snapshot. RED here: after
 *     asm fires, phase4_summary is NOT in the fired set.
 *
 * (b) TX-OPEN: a deliberate no-dirty A138-23 re-save must open the transaction so the
 *     aggregator re-runs. worksheet.ts:558 excludes isPhase4SummarySave → savedCount=0
 *     + no producer fire → tx never opens → the re-save is a silent no-op. RED here:
 *     the tx-open predicate returns false for an isPhase4SummarySave no-dirty save.
 *
 * These model the SAME dispatch that saveWorksheet runs (the pattern used by
 * dispatch-routing-matrix.test.ts / materialize-registry.test.ts). GREEN after G1.
 */
import { describe, it, expect } from 'vitest';
import {
  MATERIALIZE_REGISTRY,
  producerFiredEntries,
  phase4SummaryChainFires,
  shouldOpenTransaction,
} from '../materialize-registry';
import { ASM_GL16_EQUATION_ID } from '@/lib/eval/asm-source';

const ownerFiredIds = (eqs: ReadonlyArray<{ id: string }>) =>
  new Set(MATERIALIZE_REGISTRY.filter((entry) => entry.ownerTrigger(eqs)).map((e) => e.id));

describe('G1(a) — chain-fire the summary after the asm/facility materialize', () => {
  it('an A138-17 h_M save fires asm but NOT phase4_summary via the batch (the freeze)', () => {
    // h_M ∈ ASM_INPUT_SYMBOLS but ∉ PHASE4_SUMMARY_INPUT_SYMBOLS.
    const eqs = [{ id: ASM_GL16_EQUATION_ID }];
    const fired = producerFiredEntries(new Set(['h_M']), ownerFiredIds(eqs));
    expect(fired.some((e) => e.id === 'asm')).toBe(true);
    expect(fired.some((e) => e.id === 'phase4_summary')).toBe(false); // the stale-summary bug
  });

  it('phase4SummaryChainFires: when asm fired (A_S_m/V_M materialized), the summary chain-fires', () => {
    // RED before G1: phase4SummaryChainFires does not exist / returns false.
    expect(phase4SummaryChainFires(new Set(['asm']))).toBe(true);
  });

  it('phase4SummaryChainFires: does NOT chain if the summary already fired (no double-fire)', () => {
    expect(phase4SummaryChainFires(new Set(['asm', 'phase4_summary']))).toBe(false);
  });

  it('phase4SummaryChainFires: no chain when only unrelated materializes fired', () => {
    expect(phase4SummaryChainFires(new Set(['loading']))).toBe(false);
    expect(phase4SummaryChainFires(new Set())).toBe(false);
  });
});

describe('G1(b) — tx-open predicate includes isPhase4SummarySave', () => {
  it('a no-dirty A138-23 re-save opens the transaction (RED: :558 excludes it)', () => {
    const open = shouldOpenTransaction({
      savedCount: 0,
      isBasinSave: false,
      isLoadingSave: false,
      isAsmSave: false,
      isPhase4SummarySave: true,
      producerEntriesLength: 0,
    });
    expect(open).toBe(true);
  });

  it('an unrelated no-dirty save still does NOT open the transaction', () => {
    const open = shouldOpenTransaction({
      savedCount: 0,
      isBasinSave: false,
      isLoadingSave: false,
      isAsmSave: false,
      isPhase4SummarySave: false,
      producerEntriesLength: 0,
    });
    expect(open).toBe(false);
  });

  it('the existing open conditions are preserved', () => {
    for (const k of ['isBasinSave', 'isLoadingSave', 'isAsmSave'] as const) {
      const base = {
        savedCount: 0, isBasinSave: false, isLoadingSave: false, isAsmSave: false,
        isPhase4SummarySave: false, producerEntriesLength: 0,
      };
      expect(shouldOpenTransaction({ ...base, [k]: true })).toBe(true);
    }
    expect(shouldOpenTransaction({
      savedCount: 3, isBasinSave: false, isLoadingSave: false, isAsmSave: false,
      isPhase4SummarySave: false, producerEntriesLength: 0,
    })).toBe(true);
    expect(shouldOpenTransaction({
      savedCount: 0, isBasinSave: false, isLoadingSave: false, isAsmSave: false,
      isPhase4SummarySave: false, producerEntriesLength: 1,
    })).toBe(true);
  });
});
