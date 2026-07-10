import { describe, it, expect } from 'vitest';
import { MATERIALIZE_REGISTRY, producerFiredEntries } from '../materialize-registry';
import { ASM_GL7_EQUATION_ID, ASM_GL16_EQUATION_ID, ASM_GL17_EQUATION_ID } from '@/lib/eval/asm-source';

describe('asm registry entry', () => {
  const asm = MATERIALIZE_REGISTRY.find((e) => e.id === 'asm');
  it('exists and targets A138-12', () => {
    expect(asm).toBeTruthy();
    expect(asm!.consumerTemplateCode).toBe('A138-12');
  });
  it('fires on a geometry input or facility_type_selected change', () => {
    const fired = producerFiredEntries(new Set(['h_M']), new Set());
    expect(fired.some((e) => e.id === 'asm')).toBe(true);
    const fired2 = producerFiredEntries(new Set(['facility_type_selected']), new Set());
    expect(fired2.some((e) => e.id === 'asm')).toBe(true);
  });
  it('does not double-fire when already owner-fired', () => {
    const fired = producerFiredEntries(new Set(['A_S_min']), new Set(['asm']));
    expect(fired.some((e) => e.id === 'asm')).toBe(false);
  });
});

// ── Defect #21: geometry-facility save must route the asm materialize to a path ──
// Reproduces the double-fire-suppression mismatch. The asm ownerTrigger matched
// Gl.7|Gl.16|Gl.17; Gl.16 lives on A138-17 and Gl.17 on A138-18. So a geometry save
// set ownerFiredIds ⊇ {asm} (suppressing the producer-fire) while the owner-path
// dispatch (isAsmSave = has Gl.7) is false for those worksheets → asm ran on NO path.
describe('asm dispatch routing across worksheets (defect #21)', () => {
  // Faithful mirrors of the two production gates in worksheet.ts:
  //   owner path gate  — worksheet.ts:144  (isAsmSave = templateEquations has Gl.7)
  //   ownerFiredIds set — worksheet.ts:499-503 (registry entries whose ownerTrigger matches)
  const isAsmSave = (eqs: ReadonlyArray<{ id: string }>) =>
    eqs.some((e) => e.id === ASM_GL7_EQUATION_ID);
  const ownerFiredIds = (eqs: ReadonlyArray<{ id: string }>) =>
    new Set(MATERIALIZE_REGISTRY.filter((entry) => entry.ownerTrigger(eqs)).map((e) => e.id));
  // Does the asm materialize run for this save, and via which path?
  const asmPaths = (eqs: ReadonlyArray<{ id: string }>, changed: Set<string>) => {
    const owner = isAsmSave(eqs);
    const producer = producerFiredEntries(changed, ownerFiredIds(eqs)).some((e) => e.id === 'asm');
    return { owner, producer };
  };

  it.each([
    ['A138-17 Mulde (Gl.16)', ASM_GL16_EQUATION_ID, 'h_M'],
    ['A138-18 Rigole (Gl.17)', ASM_GL17_EQUATION_ID, 'b_R'],
  ])('geometry save on %s fires asm on exactly one path (via producer)', (_label, geomEqId, changedSym) => {
    const eqs = [{ id: geomEqId }];             // the saved facility worksheet owns its geometry eq
    const changed = new Set([changedSym]);      // a geometry input changed in this save
    const { owner, producer } = asmPaths(eqs, changed);
    // Must run on some path (the bug: neither) — and not both (no double-fire).
    expect(owner || producer).toBe(true);
    expect(owner && producer).toBe(false);
    // Specifically: geometry saves route through the producer path, never the owner path.
    expect(producer).toBe(true);
    expect(owner).toBe(false);
  });

  it('A138-12 geometry-mode owner save fires asm once (owner path), never double via producer', () => {
    // A138-12 owns Gl.7; a method/direct-input change is in ASM_INPUT_SYMBOLS.
    const eqs = [{ id: ASM_GL7_EQUATION_ID }];
    const changed = new Set(['a_s_m_determination_method']);
    const { owner, producer } = asmPaths(eqs, changed);
    expect(owner).toBe(true);       // owner path handles A138-12
    expect(producer).toBe(false);   // producer suppressed → no double-fire
  });
});
