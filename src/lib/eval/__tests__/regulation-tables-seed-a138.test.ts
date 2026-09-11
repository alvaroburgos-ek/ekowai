import { describe, it, expect } from 'vitest';
import { tab9AsTable, tab5AsTable, tab6AsTable, tab13AsTable } from '../regulation-tables-seed-a138';
import { getTab9Entries } from '../tab9';
import { FLAECHENGRUPPE_CODES, flaechengruppeToTier, tab6Limit } from '../tab6-loading';
import { computeSoilEstimate } from '../asm-source';

describe('A138 seed tables ≡ TS constants (pins)', () => {
  it('TAB9: 30 rows, each (cm, cs, kind, group) equals tab9.ts', () => {
    const t = tab9AsTable();
    expect(t.rows).toHaveLength(30);
    for (const e of getTab9Entries()) {
      const r = t.rows.find((r) => r.row_key === e.value)!;
      expect(r.values).toMatchObject({ cm: e.cm, cs: e.cs, kind: e.kind, group: e.group });
      expect(r.label_de).toBe(e.label);
      expect(r.verbatim_quote.length).toBeGreaterThan(0);
    }
    expect(t.override_policy).toBe('anhaltswert');
  });
  it('TAB5: 19 Flächengruppe codes → tier equals flaechengruppeToTier', () => {
    const t = tab5AsTable();
    expect(t.rows.map((r) => r.row_key)).toEqual([...FLAECHENGRUPPE_CODES]);
    for (const c of FLAECHENGRUPPE_CODES) expect(t.rows.find((r) => r.row_key === c)!.values.tier).toBe(flaechengruppeToTier(c));
  });
  it('TAB6: tier2/tier3 × thin/thick equals tab6Limit', () => {
    const t = tab6AsTable();
    for (const tier of ['tier2', 'tier3'] as const) for (const [band, th] of [['thin', 0.2], ['thick', 0.3]] as const) {
      const lim = tab6Limit(tier, th);
      expect(lim.kind).toBe('limit');
      expect(t.rows.find((r) => r.row_key === `${tier}|${band}`)!.values.max).toBe((lim as { max: number }).max);
    }
    expect(t.rows).toHaveLength(4);
  });
  it('TAB13: mittel_feinsand 0.10, schluffig 0.20 equals computeSoilEstimate', () => {
    const t = tab13AsTable();
    expect(t.rows.find((r) => r.row_key === 'mittel_feinsand')!.values.factor).toBe(computeSoilEstimate(1, 'mittel_feinsand'));
    expect(t.rows.find((r) => r.row_key === 'schluffig')!.values.factor).toBe(computeSoilEstimate(1, 'schluffig'));
  });
});
