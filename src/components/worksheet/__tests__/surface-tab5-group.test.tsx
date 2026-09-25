/**
 * Per-row Tab. 5 group on the surface inventory and the strictest-group rule
 * (§5.2.3.2, L944: several groups on one facility ⇒ the strictest requirement
 * governs, "V1, V2 und V3 an eine Mulde: Es gelten die Anforderungen für V3").
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
import { render, screen, fireEvent } from '@testing-library/react';
import { SurfaceInventoryEditor } from '../surface-inventory-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { governingTab5Group, normalizeSurfaceCarrier, TAB5_GROUPS_BY_STRICTNESS } from '@/lib/eval/surface-inventory';

const FIELD = 'fld-surf';
const row = (id: string, label: string, tab9: string, area: number, ci: number, cs: number, group?: string) =>
  ({ id, label, tab9_value: tab9, area_m2: area, c_i: ci, c_s: cs, tab5_group: group ?? null, coeff_override: false });

function init(rows: unknown[]) {
  useWorksheetStore.getState().init('inst-1', { [FIELD]: { type: 'json', value: { rows } } } as never, {}, {});
}
const stored = () => (useWorksheetStore.getState().values[FIELD] as { value: { rows: Array<{ tab5_group?: string | null }> } }).value.rows;

describe('governingTab5Group', () => {
  it('returns the strictest of the connected groups (the guideline example V1/V2/V3 → V3)', () => {
    const c = normalizeSurfaceCarrier({ rows: [row('1', 'a', 'beton', 10, 0.9, 1, 'V1'), row('2', 'b', 'beton', 10, 0.9, 1, 'V2'), row('3', 'c', 'beton', 10, 0.9, 1, 'V3')] });
    expect(governingTab5Group(c)).toEqual({ groups: ['V1', 'V2', 'V3'], governing: 'V3' });
  });

  it('one group, no group and unknown tokens behave sanely', () => {
    expect(governingTab5Group(normalizeSurfaceCarrier({ rows: [row('1', 'a', 'beton', 10, 0.9, 1, 'D')] }))).toEqual({ groups: ['D'], governing: 'D' });
    expect(governingTab5Group(normalizeSurfaceCarrier({ rows: [row('1', 'a', 'beton', 10, 0.9, 1)] }))).toEqual({ groups: [], governing: null });
    expect(governingTab5Group(normalizeSurfaceCarrier({ rows: [row('1', 'a', 'beton', 10, 0.9, 1, 'XX')] })).governing).toBeNull();
  });

  it('the strictness order puts the (*) and BK III groups last and the unrestricted BK I groups first', () => {
    expect(TAB5_GROUPS_BY_STRICTNESS[0]).toBe('VW1');
    expect(TAB5_GROUPS_BY_STRICTNESS.indexOf('V3')).toBeGreaterThan(TAB5_GROUPS_BY_STRICTNESS.indexOf('V2'));
    expect(TAB5_GROUPS_BY_STRICTNESS.at(-1)).toBe('SA');
  });
});

describe('SurfaceInventoryEditor — per-row group', () => {
  beforeEach(() => init([row('1', 'Dach', 'dach_flach_metall', 104.6, 0.9, 1, 'D')]));

  it('renders a Tab. 5 select per row with the category hint and stores the choice', () => {
    render(<SurfaceInventoryEditor fieldId={FIELD} />);
    const sel = screen.getAllByLabelText('Flächengruppe (Tab. 5)')[0] as HTMLSelectElement;
    expect(sel.value).toBe('D');
    expect(screen.getByText('BK I')).toBeInTheDocument();
    fireEvent.change(sel, { target: { value: 'V2' } });
    expect(stored()[0].tab5_group).toBe('V2');
  });

  it('shows the single-group note, and for several groups names the governing one with the clause', () => {
    render(<SurfaceInventoryEditor fieldId={FIELD} />);
    expect(screen.getByTestId('tab5-governing').textContent).toMatch(/Flächengruppe der Zeilen: D \(BK I\)\. Diese Gruppe ist auf A138-06 zu wählen\./);
    init([row('1', 'Dach', 'dach_flach_metall', 104.6, 0.9, 1, 'D'), row('2', 'Hof', 'beton', 50, 0.9, 1, 'V2')]);
    render(<SurfaceInventoryEditor fieldId={FIELD} />);
    const note = screen.getAllByTestId('tab5-governing').at(-1)!.textContent!;
    expect(note).toMatch(/Mehrere Flächengruppen angeschlossen: D, V2/);
    expect(note).toMatch(/Maßgebend ist die strengste Behandlungsanforderung — V2/);
    expect(note).toMatch(/Es gelten die Anforderungen für V3/);
  });

  it('rows without a group show no note and never break the sums', () => {
    init([row('1', 'Dach', 'dach_flach_metall', 100, 0.9, 1)]);
    render(<SurfaceInventoryEditor fieldId={FIELD} />);
    expect(screen.queryByTestId('tab5-governing')).toBeNull();
  });
});
