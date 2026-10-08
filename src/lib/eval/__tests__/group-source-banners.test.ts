/** U-4 (UX pass 820, 2026-10-08): one upstream banner per source sheet; an optional empty register yields none. */
import { describe, it, expect } from 'vitest';
import { groupSourceBanners, suppressOptionalMissing, type CarrierSourceState } from '../carrier-source-state';

const incomplete = (owner: string, c: number, t: number): CarrierSourceState => ({
  state: 'incomplete', complete: c, total: t, message: `Quelle ${owner} noch nicht freigegeben (${c}/${t} Zeilen vollständig).`,
});
const missing = (owner: string): CarrierSourceState => ({ state: 'missing', complete: 0, total: 0, message: `Quelle ${owner} nicht erfasst.` });
const ok: CarrierSourceState = { state: 'ok', complete: 1, total: 1, message: null };

describe('groupSourceBanners', () => {
  it('(a) two incomplete registers + one optional-missing register on the same owner ⇒ ONE banner naming the two registers', () => {
    const out = groupSourceBanners([
      { ownerCode: '820-2-04', label: 'Geltende DIN-Normen', state: incomplete('820-2-04', 5, 5), isRequired: true },
      { ownerCode: '820-2-04', label: 'Geltende DWA-Regelwerke', state: incomplete('820-2-04', 5, 5), isRequired: true },
      { ownerCode: '820-2-04', label: 'Weitere Regelwerke', state: missing('820-2-04'), isRequired: false },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].message).toBe(
      'Quelle 820-2-04 noch nicht freigegeben — Geltende DIN-Normen (5/5 Zeilen vollständig), Geltende DWA-Regelwerke (5/5 Zeilen vollständig).',
    );
    expect(out[0].message).not.toContain('Weitere Regelwerke');
  });

  it('(b) a REQUIRED missing register still yields the „nicht erfasst" banner', () => {
    const out = groupSourceBanners([{ ownerCode: 'M820-01', label: 'Beteiligte', state: missing('M820-01'), isRequired: true }]);
    expect(out.map((b) => b.message)).toEqual(['Quelle M820-01 nicht erfasst.']);
  });

  it('(c) different owners ⇒ separate banners, in first-appearance order', () => {
    const out = groupSourceBanners([
      { ownerCode: 'B', label: 'R1', state: incomplete('B', 1, 2), isRequired: true },
      { ownerCode: 'A', label: 'R2', state: incomplete('A', 0, 1), isRequired: true },
    ]);
    expect(out.map((b) => b.ownerCode)).toEqual(['B', 'A']);
    expect(out.map((b) => b.message)).toEqual(['Quelle B noch nicht freigegeben (1/2 Zeilen vollständig).', 'Quelle A noch nicht freigegeben (0/1 Zeilen vollständig).']);
  });

  it('withholding suffix appears once; a required missing register in a mixed group is named „nicht erfasst"', () => {
    const out = groupSourceBanners([
      { ownerCode: 'X', label: 'R1', state: incomplete('X', 1, 2), isRequired: true, withholds: true },
      { ownerCode: 'X', label: 'R2', state: missing('X'), isRequired: true },
    ]);
    expect(out[0].message).toBe('Quelle X noch nicht freigegeben — R1 (1/2 Zeilen vollständig), R2 (nicht erfasst) — abgeleitete Werte ausgeblendet.');
  });

  it('all grouped registers missing ⇒ „nicht erfasst — A, B"; English wording under locale en', () => {
    const inputs = [
      { ownerCode: 'X', label: 'A', state: missing('X'), isRequired: true },
      { ownerCode: 'X', label: 'B', state: missing('X'), isRequired: true },
    ];
    expect(groupSourceBanners(inputs)[0].message).toBe('Quelle X nicht erfasst — A, B.');
    expect(groupSourceBanners(inputs, 'en')[0].message).toBe('Source X not recorded — A, B.');
  });

  it('ok and null states produce nothing', () => {
    expect(groupSourceBanners([{ ownerCode: 'X', label: 'A', state: ok }, { ownerCode: 'X', label: 'B', state: null }])).toEqual([]);
  });
});

describe('suppressOptionalMissing', () => {
  it('optional (false / null / undefined) + missing ⇒ null; required or withholding ⇒ kept; incomplete always kept', () => {
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: missing('X'), isRequired: false })).toBeNull();
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: missing('X'), isRequired: null })).toBeNull();
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: missing('X') })).toBeNull();
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: missing('X'), isRequired: true })?.state).toBe('missing');
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: missing('X'), withholds: true })?.state).toBe('missing');
    expect(suppressOptionalMissing({ ownerCode: 'X', label: 'A', state: incomplete('X', 0, 1), isRequired: false })?.state).toBe('incomplete');
  });

  it('single register under locale en ⇒ the English sentence (DE keeps carrierSourceState verbatim)', () => {
    expect(groupSourceBanners([{ ownerCode: 'B', label: 'R1', state: incomplete('B', 1, 2), isRequired: true }], 'en')[0].message).toBe(
      'Source B not yet approved (1/2 rows complete).',
    );
    expect(groupSourceBanners([{ ownerCode: 'M820-01', label: 'R', state: missing('M820-01'), isRequired: true, withholds: true }], 'en')[0].message).toBe(
      'Source M820-01 not recorded — derived values hidden.',
    );
    expect(groupSourceBanners([{ ownerCode: 'B', label: 'R1', state: incomplete('B', 1, 2), isRequired: true }], 'de')[0].message).toBe(
      'Quelle B noch nicht freigegeben (1/2 Zeilen vollständig).',
    );
  });
});
