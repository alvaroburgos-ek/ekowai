import { describe, it, expect } from 'vitest';
import {
  normalizeMitigationCarrier,
  summarizeMitigationPlan,
  newPlan,
  newMeasure,
  MEASURE_TYPES,
  MEASURE_TYPE_LABELS,
  RISK_GROUP_LABELS,
} from '../mitigation-plan';

describe('mitigation-plan — Tab. A.2 data', () => {
  it('encodes the T/O/P measure types verbatim', () => {
    expect(MEASURE_TYPES).toEqual(['T', 'O', 'P']);
    expect(MEASURE_TYPE_LABELS.T).toBe('Technische Maßnahme');
    expect(MEASURE_TYPE_LABELS.O).toBe('Organisatorische Maßnahme');
    expect(MEASURE_TYPE_LABELS.P).toBe('Personelle Maßnahme');
  });
  it('shares the Tab. A.1 Risikogruppen for the category (one source)', () => {
    expect(RISK_GROUP_LABELS).toContain('Umwelt, Ökologie');
    expect(RISK_GROUP_LABELS.length).toBe(11);
  });
});

describe('normalizeMitigationCarrier — defensive parsing', () => {
  it('coerces unknown shapes to an empty plan', () => {
    expect(normalizeMitigationCarrier('legacy note')).toEqual({ plans: [] });
    expect(normalizeMitigationCarrier(null)).toEqual({ plans: [] });
  });
  it('drops an invalid measure type to null but keeps the row', () => {
    const c = normalizeMitigationCarrier({
      plans: [{ id: 'p', risiko: 'X', measures: [{ id: 'm', type: 'Z', text: 't' }] }],
    });
    expect(c.plans[0].measures[0].type).toBeNull();
    expect(c.plans[0].measures[0].text).toBe('t');
  });
  it('keeps a valid T/O/P type and a numeric Wert', () => {
    const c = normalizeMitigationCarrier({
      plans: [{ id: 'p', risiko: 'X', wert: 48, measures: [{ id: 'm', type: 'O', text: 't' }] }],
    });
    expect(c.plans[0].wert).toBe(48);
    expect(c.plans[0].measures[0].type).toBe('O');
  });
});

describe('summarizeMitigationPlan — derived counts (never hand-entered)', () => {
  it('counts plans, measures, by type, and gaps', () => {
    const carrier = normalizeMitigationCarrier({
      plans: [
        {
          id: '1', risiko: 'Altlasten', risikokategorie: 'Umwelt, Ökologie', wert: 48,
          measures: [
            { id: 'a', type: 'O', text: 'Altlastenkataster beiziehen', verantwortung: 'BL' },
            { id: 'b', type: 'T', text: 'Vorausbegehung, Probenahmen', verantwortung: '' },
          ],
        },
        { id: '2', risiko: 'Termine', measures: [] }, // named but no measure
        { id: '3', risiko: '', measures: [{ id: 'x', type: 'P', text: 'ignored (unnamed plan)' }] },
      ],
    });
    const s = summarizeMitigationPlan(carrier);
    expect(s.planCount).toBe(2); // two named plans (row 3 unnamed)
    expect(s.measureCount).toBe(2); // only from named plans with text
    expect(s.byType).toEqual({ T: 1, O: 1, P: 0 });
    expect(s.plansWithoutMeasure).toBe(1); // plan 2
    expect(s.measuresWithoutOwner).toBe(1); // measure b
  });
  it('empty carrier → zeros, not fake data', () => {
    const s = summarizeMitigationPlan({ plans: [] });
    expect(s).toMatchObject({ planCount: 0, measureCount: 0, byType: { T: 0, O: 0, P: 0 } });
  });
  it('newPlan/newMeasure build empty rows', () => {
    expect(newPlan().measures).toEqual([]);
    expect(newMeasure().type).toBeNull();
  });
});
