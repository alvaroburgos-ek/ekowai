/**
 * Findings A & B — assemblePhase4Summary write-set (A138-23 producer branch).
 *
 * Finding A: facility_type_dimensioned must carry the facility TYPE ('mulde'),
 *   NOT the mapped design-worksheet code ('A138-17').
 * Finding B: facility_meets_qsac and facility_specific_dimensioning_complete
 *   must persist their computed BOOLEAN values (false when incomplete/not-met),
 *   never null — the assembly always emits a boolean for both.
 */
import { describe, it, expect } from 'vitest';
import {
  assemblePhase4Summary,
  type Phase4SummaryGathered,
} from '../phase4-summary';

const NOW = '2026-07-18';

function findWrite(writes: ReturnType<typeof assemblePhase4Summary>['writes'], symbol: string) {
  return writes.find((w) => w.symbol === symbol);
}

describe('assemblePhase4Summary — Finding A: facility_type_dimensioned = TYPE not CODE', () => {
  it('mulde → "mulde" (not "A138-17")', () => {
    const gathered: Phase4SummaryGathered = {
      facilityType: 'mulde',
      facilityWorksheetCode: 'A138-17', // the mapped code — must NOT be written
      volumeSymbol: 'V_M',
      footprintSymbol: 'A_S_m',
      volumeValue: 30,
      footprintValue: 100,
      qSac: 3,
      meetsQsacFlag: null,
      tEHours: null,
    };
    const { writes } = assemblePhase4Summary(gathered, NOW);
    const w = findWrite(writes, 'facility_type_dimensioned');
    expect(w).toBeDefined();
    expect(w!.kind).toBe('enum');
    expect(w!.value).toBe('versickerungsmulde');
    expect(w!.value).not.toBe('A138-17');
  });

  it('rigole → "rigole"', () => {
    const gathered: Phase4SummaryGathered = {
      facilityType: 'rigole',
      facilityWorksheetCode: 'A138-18',
      volumeSymbol: 'V_R',
      footprintSymbol: 'A_S_m',
      volumeValue: 10,
      footprintValue: 50,
      qSac: 3,
      meetsQsacFlag: null,
      tEHours: null,
    };
    const { writes } = assemblePhase4Summary(gathered, NOW);
    expect(findWrite(writes, 'facility_type_dimensioned')!.value).toBe('rigole');
  });

  it('facilityType null → null (unchanged)', () => {
    const gathered: Phase4SummaryGathered = {
      facilityType: null,
      facilityWorksheetCode: null,
      volumeSymbol: null,
      footprintSymbol: null,
      volumeValue: null,
      footprintValue: null,
      qSac: null,
      meetsQsacFlag: null,
      tEHours: null,
    };
    const { writes } = assemblePhase4Summary(gathered, NOW);
    expect(findWrite(writes, 'facility_type_dimensioned')!.value).toBeNull();
  });
});

describe('assemblePhase4Summary — Finding B: booleans persist false, not null', () => {
  it('incomplete + not-met → facility_meets_qsac=false, facility_specific_dimensioning_complete=false', () => {
    const gathered: Phase4SummaryGathered = {
      facilityType: 'mulde',
      facilityWorksheetCode: 'A138-17',
      volumeSymbol: 'V_M',
      footprintSymbol: 'A_S_m',
      volumeValue: null, // volume missing → incomplete
      footprintValue: null, // footprint missing → incomplete
      qSac: 1, // < 2 → not met
      meetsQsacFlag: null,
      tEHours: null,
    };
    const { writes } = assemblePhase4Summary(gathered, NOW);

    const qsac = findWrite(writes, 'facility_meets_qsac');
    const complete = findWrite(writes, 'facility_specific_dimensioning_complete');

    expect(qsac).toBeDefined();
    expect(qsac!.kind).toBe('boolean');
    expect(qsac!.value).toBe(false); // NOT null

    expect(complete).toBeDefined();
    expect(complete!.kind).toBe('boolean');
    expect(complete!.value).toBe(false); // NOT null
  });

  it('complete + met → both true (sanity)', () => {
    const gathered: Phase4SummaryGathered = {
      facilityType: 'mulde',
      facilityWorksheetCode: 'A138-17',
      volumeSymbol: 'V_M',
      footprintSymbol: 'A_S_m',
      volumeValue: 30,
      footprintValue: 100,
      qSac: 5,
      meetsQsacFlag: null,
      tEHours: null,
    };
    const { writes } = assemblePhase4Summary(gathered, NOW);
    expect(findWrite(writes, 'facility_meets_qsac')!.value).toBe(true);
    expect(findWrite(writes, 'facility_specific_dimensioning_complete')!.value).toBe(true);
  });
});

describe('assemblePhase4Summary — F-A8: derived meetsQsac uses the tolerant q_S,AC ≥ 2 boundary', () => {
  const base = (qSac: number): Phase4SummaryGathered => ({
    facilityType: 'mulde',
    facilityWorksheetCode: 'A138-17',
    volumeSymbol: 'V_M',
    footprintSymbol: 'A_S_m',
    volumeValue: 30,
    footprintValue: 105.2421,
    qSac,
    meetsQsacFlag: null,
    tEHours: null,
  });
  it('Gl. 9 at the exact limit (1e-6·105.2421·1000 / 526.2105 · 1e4 = 1.9999999999999998) meets q_S,AC ≥ 2', () => {
    const q = (1e-6 * 105.2421 * 1000 + 0) / 526.2105 * 1e4;
    expect(q).toBe(1.9999999999999998);
    const { writes } = assemblePhase4Summary(base(q), NOW);
    expect(findWrite(writes, 'facility_meets_qsac')!.value).toBe(true);
  });
  it('1.999 still does not meet it', () => {
    const { writes } = assemblePhase4Summary(base(1.999), NOW);
    expect(findWrite(writes, 'facility_meets_qsac')!.value).toBe(false);
  });
});
