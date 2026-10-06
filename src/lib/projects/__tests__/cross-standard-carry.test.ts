/**
 * M820 flow block 3 item 2 (X10, owner ruling 2026-10-06) — the explicit cross-standard carry-over allow-list.
 * DWA-M 820-2 § 4.8.2 points to the DWA-M 820-1 Annex A risk analysis ("Fundierte Risikoanalysen (Hinweise gibt Merkblatt
 * DWA-M 820-1:2020 in Anhang A) … werden durchgeführt", PDF p. 37). The 820-1 Tab. A.1 register (M820-06) and Tab. A.2 measure plan
 * (M820-07) are json, so the own-value rule (A4: only text / date of another standard count) asked for them twice. The allow-list
 * lets exactly these two symbols, in exactly this direction, count — for the required-field check (A4) and the page prefill.
 */
import { describe, it, expect } from 'vitest';
import {
  CROSS_STANDARD_CARRY,
  crossStandardCarryNote,
  isCrossStandardCarry,
  selectPrefillUpstreams,
} from '../cross-standard-carry';

describe('CROSS_STANDARD_CARRY — the allow-list', () => {
  it('holds exactly the two 820-1 → 820-2 risk carriers (X11 / X12 not listed: their shapes differ)', () => {
    expect(CROSS_STANDARD_CARRY.map((c) => `${c.symbol} ${c.from}→${c.to} ${c.fromSheets.join('/')}`)).toEqual([
      'risk_register DWA-M-820-1→DWA-M-820-2 M820-06',
      'risk_mitigation_plan DWA-M-820-1→DWA-M-820-2 M820-07',
    ]);
  });
  it('is directional and symbol-exact', () => {
    expect(isCrossStandardCarry('risk_register', 'DWA-M-820-1', 'DWA-M-820-2')).toBe(true);
    expect(isCrossStandardCarry('risk_mitigation_plan', 'DWA-M-820-1', 'DWA-M-820-2')).toBe(true);
    expect(isCrossStandardCarry('risk_register', 'DWA-M-820-2', 'DWA-M-820-1')).toBe(false);
    expect(isCrossStandardCarry('risk_register', 'DWA-M-820-3', 'DWA-M-820-2')).toBe(false);
    expect(isCrossStandardCarry('stakeholder_list', 'DWA-M-820-1', 'DWA-M-820-2')).toBe(false);
    expect(isCrossStandardCarry('abweichungen', 'DIN-276', 'ATV-A-704E')).toBe(false);
    expect(isCrossStandardCarry('risk_register', null, 'DWA-M-820-2')).toBe(false);
  });
  it('the editor note names the source part and sheets and says it can be overwritten', () => {
    const note = crossStandardCarryNote('risk_register', 'DWA-M-820-1', 'DWA-M-820-2');
    expect(note).toContain('DWA-M 820-1 (M820-06 / M820-07)');
    expect(note).toMatch(/taken from DWA-M 820-1 \(M820-06 \/ M820-07\)/);
    expect(note).toMatch(/überschreib/);
    expect(crossStandardCarryNote('risk_register', 'DWA-M-820-2', 'DWA-M-820-1')).toBeNull();
  });
});

describe('selectPrefillUpstreams — the page prefill', () => {
  type U = { worksheetCode: string; value: unknown; sourceStandardCode?: string | null; isFromCurrentStandard: boolean };
  const u = (worksheetCode: string, std: string, value: unknown, own = false): U => ({ worksheetCode, value, sourceStandardCode: std, isFromCurrentStandard: own });
  it('RED before: for an allow-listed symbol, a same-named value of an unrelated standard neither replaces nor blocks (ambiguity) the 820-1 source', () => {
    const ups = [u('M820-06', 'DWA-M-820-1', { rows: [1] }), u('Z-01', 'OTHER-STD', { rows: [2] })];
    expect(selectPrefillUpstreams('risk_register', 'DWA-M-820-2', ups).map((x) => x.worksheetCode)).toEqual(['M820-06']);
  });
  it('own-standard occurrences are kept (they sort first)', () => {
    const ups = [u('820-2-03', 'DWA-M-820-2', { rows: [3] }, true), u('M820-06', 'DWA-M-820-1', { rows: [1] })];
    expect(selectPrefillUpstreams('risk_register', 'DWA-M-820-2', ups).map((x) => x.worksheetCode)).toEqual(['820-2-03', 'M820-06']);
  });
  it('a symbol not on the list (or another target standard) is passed through unchanged — the existing prefill', () => {
    const ups = [u('A-01', 'X', 'a'), u('B-01', 'Y', 'b')];
    expect(selectPrefillUpstreams('project_name', 'DWA-M-820-2', ups)).toEqual(ups);
    expect(selectPrefillUpstreams('risk_register', 'DWA-M-820-1', ups)).toEqual(ups);
  });
});
