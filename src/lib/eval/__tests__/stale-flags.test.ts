/**
 * U-1 (2026-10-08, ruling R-12) — the save path flags a value saved while its question is hidden
 * (`is_stale = true`) and clears the flag only when the field is saved while visible.
 * Case: DWA-M 820-2 820-2-22 `abnahme_per_bild4` („Nein" from the first fill) hidden by
 * `phase_inbetriebnahme_erreicht = false`.
 */
import { describe, it, expect } from 'vitest';
import { staleFlagSets, type StaleFlagField, type StaleFlagRow } from '../stale-flags';

const own: StaleFlagField[] = [
  { id: 'f-phase', symbol: 'phase_inbetriebnahme_erreicht', dataType: 'boolean' },
  { id: 'f-abn', symbol: 'abnahme_per_bild4', dataType: 'boolean' },
  { id: 'f-note', symbol: 'abnahme_note', dataType: 'text' },
  { id: 'f-out', symbol: 'derived_out', dataType: 'number' },
];
const row = (fieldId: string, o: Partial<StaleFlagRow> = {}): StaleFlagRow => ({
  fieldId, sourceType: 'entered', isStale: false,
  valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null,
  ...o,
});

describe('staleFlagSets', () => {
  it('phase = false: the hidden, answered question is flagged; the visible driver is not', () => {
    const r = staleFlagSets(
      own,
      new Set(['abnahme_per_bild4', 'abnahme_note']),
      new Set(['f-phase']),
      [row('f-phase', { valueBoolean: false }), row('f-abn', { valueBoolean: false }), row('f-note', { valueText: '' })],
    );
    // f-note is hidden but holds no value ('' is no text value) ⇒ not flagged
    expect(r).toEqual({ setStale: ['f-abn'], clearStale: [] });
  });

  it('phase switched to Ja (only the driver saved): the reappearing answer KEEPS its flag', () => {
    const r = staleFlagSets(
      own,
      new Set(),
      new Set(['f-phase']),
      [row('f-phase', { valueBoolean: true }), row('f-abn', { valueBoolean: false, isStale: true })],
    );
    expect(r).toEqual({ setStale: [], clearStale: [] });
  });

  it('the engineer re-saves the visible answer: the flag clears', () => {
    const r = staleFlagSets(
      own,
      new Set(),
      new Set(['f-abn']),
      [row('f-phase', { valueBoolean: true }), row('f-abn', { valueBoolean: false, isStale: true })],
    );
    expect(r).toEqual({ setStale: [], clearStale: ['f-abn'] });
  });

  it('a value written while hidden is flagged in the same save', () => {
    const r = staleFlagSets(own, new Set(['abnahme_per_bild4']), new Set(['f-abn']), [row('f-abn', { valueBoolean: true })]);
    expect(r.setStale).toEqual(['f-abn']);
  });

  it('already-flagged rows are not re-written; derived/computed rows and foreign fields are never flagged', () => {
    const r = staleFlagSets(
      own,
      new Set(['abnahme_per_bild4', 'derived_out']),
      new Set(),
      [
        row('f-abn', { valueBoolean: false, isStale: true }),
        row('f-out', { valueNumber: '3', sourceType: 'derived' }),
        row('f-foreign', { valueNumber: '1' }),
      ],
    );
    expect(r).toEqual({ setStale: [], clearStale: [] });
  });
});
