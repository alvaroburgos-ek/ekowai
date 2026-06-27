import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RainfallTableSelector } from '../rainfall-table-selector';
import type { RainfallTable } from '@/lib/eval/rainfall-tables';

const TABLES: RainfallTable[] = [
  { id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', rows: [] },
  { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', rows: [] },
];

describe('RainfallTableSelector', () => {
  it('lists one option per table and selecting one calls onSelect with its id', () => {
    const onSelect = vi.fn();
    render(<RainfallTableSelector tables={TABLES} value="k1" onSelect={onSelect} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(screen.getByRole('option', { name: /KOSTRA Krefeld/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Lokal 531/ })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'l1' } });
    expect(onSelect).toHaveBeenCalledWith('l1');
  });

  it('never renders an r_D(n) value input (table-selection only)', () => {
    render(<RainfallTableSelector tables={TABLES} value="k1" onSelect={vi.fn()} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('is disabled when readOnly', () => {
    render(<RainfallTableSelector tables={TABLES} value="k1" onSelect={vi.fn()} readOnly />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  });
});
