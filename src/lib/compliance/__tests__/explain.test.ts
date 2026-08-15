import { describe, it, expect } from 'vitest';
import { explainCondition } from '../explain';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('explainCondition — leaves carry actual · required · wouldPass', () => {
  it('failed var-vs-var relational leaf explains both sides and how to pass', () => {
    const r = explainCondition('V_s >= V_S_min', lookup({ V_s: 10, V_S_min: 15 }));
    expect(r.kind).toBe('explained');
    if (r.kind !== 'explained') return;
    expect(r.leaves).toHaveLength(1);
    const leaf = r.leaves[0];
    expect(leaf.satisfied).toBe(false);
    expect(leaf.actual).toContain('V_s = 10');
    expect(leaf.required).toContain('>= 15');
    expect(leaf.required).toContain('V_S_min');
    expect(leaf.wouldPass).toMatch(/mindestens 15/);
  });

  it('passing leaf is satisfied with no wouldPass', () => {
    const r = explainCondition('V_s >= 15', lookup({ V_s: 20 }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].satisfied).toBe(true);
    expect(r.leaves[0].wouldPass).toBeUndefined();
  });

  it('missing symbol → satisfied null and named as fehlend', () => {
    const r = explainCondition('V_s >= 15', lookup({}));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].satisfied).toBeNull();
    expect(r.leaves[0].actual).toMatch(/fehlt/);
  });

  it('AND reports both leaves', () => {
    const r = explainCondition('a >= 1 AND b <= 5', lookup({ a: 0, b: 3 }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves).toHaveLength(2);
    expect(r.leaves[0].satisfied).toBe(false);
    expect(r.leaves[1].satisfied).toBe(true);
  });

  it('IF guard false → single vacuous leaf, body not descended', () => {
    const r = explainCondition('IF active THEN total == 5', lookup({ active: false }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0].satisfied).toBe(true);
    expect(r.leaves[0].text).toMatch(/nicht anwendbar/i);
  });

  it('IF guard true → body leaves explained', () => {
    const r = explainCondition('IF active THEN total == 5', lookup({ active: true, total: 4 }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves).toHaveLength(1);
    expect(r.leaves[0].satisfied).toBe(false);
    expect(r.leaves[0].wouldPass).toMatch(/auf 5/);
  });

  it('<= direction says höchstens', () => {
    const r = explainCondition('e_0 <= e_max', lookup({ e_0: 4, e_max: 2 }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].wouldPass).toMatch(/höchstens 2/);
  });

  it('enum equality leaf renders the literal', () => {
    const r = explainCondition('speichertyp == geschlossen', lookup({ speichertyp: 'offen' }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].actual).toContain('offen');
    expect(r.leaves[0].required).toContain('geschlossen');
  });

  it('arithmetic RHS renders the expression and its value', () => {
    const r = explainCondition('V_Rueck >= Q * 25', lookup({ V_Rueck: 200, Q: 10 }));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].required).toContain('250');
    expect(r.leaves[0].required).toContain('Q * 25');
  });

  it('IS NOT NULL leaf', () => {
    const r = explainCondition('protokoll IS NOT NULL', lookup({}));
    if (r.kind !== 'explained') throw new Error('expected explained');
    expect(r.leaves[0].satisfied).toBe(false);
    expect(r.leaves[0].wouldPass).toMatch(/ausfüllen|erfassen/i);
  });

  it('unparseable prose → manual', () => {
    expect(explainCondition('Engineer attestation per §5', lookup({})).kind).toBe('manual');
  });
});
