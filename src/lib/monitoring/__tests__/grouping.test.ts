/**
 * Wartungsplan grouping pure-core tests — table-marker parsing, group labels,
 * due-state tallies, the ungrouped fallback, facility-type resolution from
 * project_parameters rows, and the value → E-table map.
 */
import { describe, it, expect } from 'vitest';
import {
  FACILITY_TYPE_SYMBOLS,
  facilityValueToGroup,
  groupMaintenanceTasks,
  resolveFacilityTypeValue,
} from '../grouping';
import type { GroupableTask } from '../grouping';
import type { DueState } from '../schedule';

function task(
  title: string,
  state: DueState = 'overdue',
  lastDone: string | null = null,
): GroupableTask {
  return { title, status: { state, lastDone } };
}

describe('groupMaintenanceTasks — table-marker parsing', () => {
  it('groups duties by their E.<n> title prefix', () => {
    const groups = groupMaintenanceTasks([
      task('E.1 Flächenbefestigungen – Oberfläche kontrollieren'),
      task('E.2 Versickerungsmulden – Zulauf kontrollieren'),
      task('E.2 Versickerungsmulden – Mähen'),
      task('E.6 Versickerungsbecken – Sedimenträumung'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['E.1', 'E.2', 'E.6']);
    expect(groups[1].tasks).toHaveLength(2);
  });

  it('parses multi-digit table numbers', () => {
    const groups = groupMaintenanceTasks([task('E.10 Sonstiges – prüfen')]);
    expect(groups[0].key).toBe('E.10');
  });

  it('requires the marker at the START of the title', () => {
    const groups = groupMaintenanceTasks([task('Anhang E.2 – prüfen')]);
    expect(groups[0].key).toBeNull();
  });

  it('requires whitespace after the marker (E.2x is not a table)', () => {
    const groups = groupMaintenanceTasks([task('E.2x Sonderfall')]);
    expect(groups[0].key).toBeNull();
  });

  it('preserves task order inside a group and first-seen group order', () => {
    const groups = groupMaintenanceTasks([
      task('E.3 Rigolen – a'),
      task('E.2 Versickerungsmulden – b'),
      task('E.3 Rigolen – c'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['E.3', 'E.2']);
    expect(groups[0].tasks.map((t) => t.title)).toEqual([
      'E.3 Rigolen – a',
      'E.3 Rigolen – c',
    ]);
  });

  it('never drops a task — group sizes sum to the input length', () => {
    const input = [
      task('E.1 Flächenbefestigungen – a'),
      task('§ 5.2 Sichtkontrolle'),
      task('E.5 Versickerungsschächte – b'),
      task('Betriebstagebuch führen'),
    ];
    const groups = groupMaintenanceTasks(input);
    expect(groups.reduce((n, g) => n + g.tasks.length, 0)).toBe(input.length);
  });
});

describe('groupMaintenanceTasks — labels', () => {
  it('label = shared title prefix up to the first " – "', () => {
    const groups = groupMaintenanceTasks([
      task('E.2 Versickerungsmulden – Zulauf kontrollieren'),
    ]);
    expect(groups[0].label).toBe('E.2 Versickerungsmulden');
  });

  it('falls back to the full title when no dash separator exists', () => {
    const groups = groupMaintenanceTasks([task('E.4 Mulden-Rigolen-Systeme')]);
    // NOT split at the unspaced hyphens inside the compound word.
    expect(groups[0].label).toBe('E.4 Mulden-Rigolen-Systeme');
  });

  it('non-E titles (e.g. M-1200-3 §-duties) form ONE null-labelled group', () => {
    const groups = groupMaintenanceTasks([
      task('§ 5.2 Sichtkontrolle Einlauf'),
      task('§ 6.1 Schlammspiegel messen'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBeNull();
    expect(groups[0].label).toBeNull();
    expect(groups[0].tasks).toHaveLength(2);
  });
});

describe('groupMaintenanceTasks — counts + journal match', () => {
  it('tallies due states per group', () => {
    const groups = groupMaintenanceTasks([
      task('E.2 Versickerungsmulden – a', 'overdue'),
      task('E.2 Versickerungsmulden – b', 'overdue'),
      task('E.2 Versickerungsmulden – c', 'due', '2026-07-01'),
      task('E.2 Versickerungsmulden – d', 'ok', '2026-07-20'),
      task('E.2 Versickerungsmulden – e', 'unscheduled'),
    ]);
    expect(groups[0].counts).toEqual({ overdue: 2, due: 1, ok: 1, unscheduled: 1 });
  });

  it('hasJournalMatch = true iff any duty has lastDone set', () => {
    const none = groupMaintenanceTasks([task('E.2 Mulden – a', 'overdue', null)]);
    expect(none[0].hasJournalMatch).toBe(false);
    const some = groupMaintenanceTasks([
      task('E.2 Mulden – a', 'overdue', null),
      task('E.2 Mulden – b', 'ok', '2026-07-20'),
    ]);
    expect(some[0].hasJournalMatch).toBe(true);
  });

  it('empty input → no groups', () => {
    expect(groupMaintenanceTasks([])).toEqual([]);
  });
});

describe('resolveFacilityTypeValue', () => {
  it('prefers facility_type_dimensioned over a138_anlagentyp_gewaehlt', () => {
    expect(FACILITY_TYPE_SYMBOLS[0]).toBe('facility_type_dimensioned');
    const v = resolveFacilityTypeValue([
      { symbol: 'a138_anlagentyp_gewaehlt', valueEnum: 'rigole', valueText: null },
      { symbol: 'facility_type_dimensioned', valueEnum: null, valueText: 'mulde' },
    ]);
    expect(v).toBe('mulde');
  });

  it('value_enum wins over value_text within a row', () => {
    const v = resolveFacilityTypeValue([
      { symbol: 'facility_type_dimensioned', valueEnum: 'rigole', valueText: 'mulde' },
    ]);
    expect(v).toBe('rigole');
  });

  it('newest row wins within one symbol', () => {
    const v = resolveFacilityTypeValue([
      {
        symbol: 'facility_type_dimensioned',
        valueEnum: 'mulde',
        valueText: null,
        enteredAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        symbol: 'facility_type_dimensioned',
        valueEnum: 'rigole',
        valueText: null,
        enteredAt: new Date('2026-06-01T00:00:00Z'),
      },
    ]);
    expect(v).toBe('rigole');
  });

  it('skips empty/whitespace values and falls through to the next symbol', () => {
    const v = resolveFacilityTypeValue([
      { symbol: 'facility_type_dimensioned', valueEnum: '  ', valueText: null },
      { symbol: 'a138_anlagentyp_gewaehlt', valueEnum: 'schacht', valueText: null },
    ]);
    expect(v).toBe('schacht');
  });

  it('returns null when nothing usable is stored', () => {
    expect(resolveFacilityTypeValue([])).toBeNull();
    expect(
      resolveFacilityTypeValue([
        { symbol: 'other_symbol', valueEnum: 'mulde', valueText: null },
      ]),
    ).toBeNull();
  });
});

describe('facilityValueToGroup — value → E-table map', () => {
  it.each([
    ['mulde', 'E.2'],
    ['versickerungsmulde', 'E.2'],
    ['rigole', 'E.3'],
    ['mulden_rigole', 'E.4'],
    ['mulden-rigolen', 'E.4'],
    ['Mulden-Rigolen-System', 'E.4'],
    ['schacht', 'E.5'],
    ['versickerungsschacht', 'E.5'],
    ['becken', 'E.6'],
    ['versickerungsbecken', 'E.6'],
    ['flaechenbefestigung', 'E.1'],
    ['durchlaessige Flaechenbefestigung', 'E.1'],
  ])('%s → %s', (value, group) => {
    expect(facilityValueToGroup(value)).toBe(group);
  });

  it('matches case-insensitively', () => {
    expect(facilityValueToGroup('MULDE')).toBe('E.2');
    expect(facilityValueToGroup('Versickerungsbecken')).toBe('E.6');
  });

  it('the combined system NEVER falls into the plain mulde/rigole groups', () => {
    expect(facilityValueToGroup('mulden_rigolen_element')).toBe('E.4');
    expect(facilityValueToGroup('mulden-rigole')).toBe('E.4');
  });

  it('unknown or unset values → null (nothing is highlighted)', () => {
    expect(facilityValueToGroup('teich')).toBeNull();
    expect(facilityValueToGroup('')).toBeNull();
    expect(facilityValueToGroup(null)).toBeNull();
    expect(facilityValueToGroup(undefined)).toBeNull();
  });
});
