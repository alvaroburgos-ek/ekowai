import { describe, it, expect } from 'vitest';
import { MATERIALIZE_REGISTRY, producerFiredEntries } from '../materialize-registry';
import { ASM_GL7_EQUATION_ID, ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID } from '@/lib/eval/asm-source';
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';
import { A138_12_ASM_EQUATION_ID } from '@/lib/eval/tab6-loading';

/**
 * E1-B — dispatch-level routing matrix + the #21 structural invariant, as CI.
 *
 * These model the SAME two-stage dispatch that saveWorksheet runs:
 *   owner-dispatch gates (worksheet.ts:137-144): isBasinSave / isLoadingSave /
 *     isAsmSave (equation-topology on the SAVED worksheet), surface = in-batch.
 *   ownerFiredIds     (worksheet.ts:499-503): registry entries whose ownerTrigger fires.
 *   producerFiredEntries(changedSymbols, ownerFiredIds) (worksheet.ts:509).
 *   A materialize M runs iff owner-dispatch(M) OR M ∈ producerFiredEntries.
 *
 * INVARIANT (#21): ownerTrigger ⊆ owner-dispatch. If an entry's ownerTrigger
 * fires for a save that owner-dispatch does NOT handle, that save adds the entry
 * to ownerFiredIds (suppressing producer-fire) while no owner path runs it →
 * the materialize routes to NO path. That was the historical A138-17 geometry bug.
 */

// Mirror of the owner-dispatch gates in worksheet.ts (the equations each
// materialize's OWNER path actually fires on). Surface is handled by an in-batch
// presence check, not equation topology.
function ownerDispatchFires(entryId: string, eqs: ReadonlyArray<{ id: string }>, surfaceInBatch: boolean): boolean {
  switch (entryId) {
    case 'loading': return eqs.some((e) => e.id === A138_12_ASM_EQUATION_ID);
    case 'basin':   return eqs.some((e) => e.id === BASIN_GL8_EQUATION_ID);
    case 'asm':     return eqs.some((e) => e.id === ASM_GL7_EQUATION_ID);
    case 'surface': return surfaceInBatch;
    default:        return false;
  }
}
const ownerFiredIds = (eqs: ReadonlyArray<{ id: string }>) =>
  new Set(MATERIALIZE_REGISTRY.filter((entry) => entry.ownerTrigger(eqs)).map((e) => e.id));

function runsMaterialize(
  entryId: string,
  eqs: ReadonlyArray<{ id: string }>,
  changedSymbols: Set<string>,
  surfaceInBatch = false,
) {
  const owner = ownerDispatchFires(entryId, eqs, surfaceInBatch);
  const producer = producerFiredEntries(changedSymbols, ownerFiredIds(eqs)).some((e) => e.id === entryId);
  return { owner, producer, runs: owner || producer };
}

// Candidate owner-equation ids the ownerTrigger predicates key on.
const OWNER_EQUATION_IDS = [
  ASM_GL7_EQUATION_ID, BASIN_GL8_EQUATION_ID, A138_12_ASM_EQUATION_ID,
  ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID,
];

describe('#21 structural invariant — ownerTrigger ⊆ owner-dispatch', () => {
  it('every registry entry: any equation that fires ownerTrigger is also handled by owner-dispatch', () => {
    for (const entry of MATERIALIZE_REGISTRY) {
      for (const eqId of OWNER_EQUATION_IDS) {
        const eqs = [{ id: eqId }];
        if (entry.ownerTrigger(eqs)) {
          // If ownerTrigger claims this save, owner-dispatch MUST run the block —
          // otherwise producer-fire is suppressed and the materialize routes nowhere.
          expect(ownerDispatchFires(entry.id, eqs, false)).toBe(true);
        }
      }
    }
  });
});

describe('E1-B dispatch routing matrix — each materialize runs on exactly one path', () => {
  const cases: Array<{ name: string; entry: string; eqs: string[]; changed: string[]; surface?: boolean; via: 'owner' | 'producer' }> = [
    { name: 'A138-12 save (Gl.7) → asm via owner', entry: 'asm', eqs: [ASM_GL7_EQUATION_ID], changed: ['a_s_m_determination_method'], via: 'owner' },
    { name: 'A138-12 save (Gl.7) → loading via owner', entry: 'loading', eqs: [A138_12_ASM_EQUATION_ID], changed: ['A_S_m'], via: 'owner' },
    { name: 'A138-13 save (Gl.8) → basin via owner', entry: 'basin', eqs: [BASIN_GL8_EQUATION_ID], changed: ['A_C'], via: 'owner' },
    { name: 'A138-17 geometry save (Gl.16, h_M) → asm via PRODUCER (the #21 case)', entry: 'asm', eqs: [ASM_GL16_EQUATION_ID], changed: ['h_M'], via: 'producer' },
    { name: 'A138-18 geometry save (Gl.17, b_R) → asm via PRODUCER (Rigole)', entry: 'asm', eqs: [ASM_GL17_EQUATION_ID], changed: ['b_R'], via: 'producer' },
    { name: 'A138-15 facility save → asm via PRODUCER', entry: 'asm', eqs: [], changed: ['facility_type_selected'], via: 'producer' },
    { name: 'A138-06 save (flaechengruppe) → loading via PRODUCER', entry: 'loading', eqs: [], changed: ['flaechengruppe'], via: 'producer' },
  ];

  it.each(cases)('$name', ({ entry, eqs, changed, surface, via }) => {
    const r = runsMaterialize(entry, eqs.map((id) => ({ id })), new Set(changed), surface ?? false);
    expect(r.runs).toBe(true);                    // it must run on SOME path (the #21 bug: neither)
    expect(r.owner && r.producer).toBe(false);    // never both (no double-fire)
    expect(via === 'owner' ? r.owner : r.producer).toBe(true);
  });

  it('unrelated save (no owner eq, no input symbol) fires nothing', () => {
    const r = runsMaterialize('asm', [], new Set(['some_unrelated_symbol']));
    expect(r.runs).toBe(false);
  });
});
