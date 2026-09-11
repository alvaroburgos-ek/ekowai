import { describe, it, expect } from 'vitest';
import { tab9AsTable, tab5AsTable, tab6AsTable, tab13AsTable, a138SeedTables } from '../regulation-tables-seed-a138';
import { getTab9Entries } from '../tab9';
import { FLAECHENGRUPPE_CODES, flaechengruppeToTier, tab6Limit } from '../tab6-loading';
import { computeSoilEstimate } from '../asm-source';

/** Same full-precision de-DE formatter as the implementation (0.9 → "0,9", 0.25 → "0,25") — used
 *  to assert quote CONTENT, not just non-empty length. */
const de = (n: number): string => String(n).replace('.', ',');

describe('A138 seed tables ≡ TS constants (pins)', () => {
  it('TAB9: 30 rows, each (cm, cs, kind, group) equals tab9.ts', () => {
    const t = tab9AsTable();
    expect(t.rows).toHaveLength(30);
    for (const e of getTab9Entries()) {
      const r = t.rows.find((r) => r.row_key === e.value)!;
      expect(r.values).toMatchObject({ cm: e.cm, cs: e.cs, kind: e.kind, group: e.group });
      expect(r.label_de).toBe(e.label);
      expect(r.verbatim_quote.length).toBeGreaterThan(0);
      expect(r.verbatim_quote).toContain(de(e.cm));
      expect(r.verbatim_quote).toContain(de(e.cs));
    }
    expect(t.override_policy).toBe('anhaltswert');
  });
  it('TAB9: verbundstein_sickerfuge quote states the full-precision cm 0,25 (not rounded to 0,3)', () => {
    const t = tab9AsTable();
    const r = t.rows.find((r) => r.row_key === 'verbundstein_sickerfuge')!;
    expect(r.values.cm).toBe(0.25);
    expect(r.verbatim_quote).toContain('0,25');
  });
  it('TAB5: 19 Flächengruppe codes → tier equals flaechengruppeToTier', () => {
    const t = tab5AsTable();
    expect(t.rows.map((r) => r.row_key)).toEqual([...FLAECHENGRUPPE_CODES]);
    for (const c of FLAECHENGRUPPE_CODES) expect(t.rows.find((r) => r.row_key === c)!.values.tier).toBe(flaechengruppeToTier(c));
    for (const r of t.rows) expect(r.verbatim_quote.length).toBeGreaterThan(0);
  });
  it('TAB6: tier2/tier3 × thin/thick equals tab6Limit', () => {
    const t = tab6AsTable();
    for (const tier of ['tier2', 'tier3'] as const) for (const [band, th] of [['thin', 0.2], ['thick', 0.3]] as const) {
      const lim = tab6Limit(tier, th);
      expect(lim.kind).toBe('limit');
      expect(t.rows.find((r) => r.row_key === `${tier}|${band}`)!.values.max).toBe((lim as { max: number }).max);
    }
    expect(t.rows).toHaveLength(4);
    for (const r of t.rows) expect(r.verbatim_quote.length).toBeGreaterThan(0);
  });
  it('TAB13: mittel_feinsand 0.10, schluffig 0.20 equals computeSoilEstimate', () => {
    const t = tab13AsTable();
    expect(t.rows.find((r) => r.row_key === 'mittel_feinsand')!.values.factor).toBe(computeSoilEstimate(1, 'mittel_feinsand'));
    expect(t.rows.find((r) => r.row_key === 'schluffig')!.values.factor).toBe(computeSoilEstimate(1, 'schluffig'));
    for (const r of t.rows) expect(r.verbatim_quote.length).toBeGreaterThan(0);
  });
  it('a138SeedTables(): returns TAB9, TAB5, TAB6, TAB13 in that order', () => {
    expect(a138SeedTables().map((t) => t.table_code)).toEqual(['TAB9', 'TAB5', 'TAB6', 'TAB13']);
  });
});
