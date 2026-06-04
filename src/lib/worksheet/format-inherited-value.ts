/**
 * Format a store FieldValue for read-only display in the "Vorgelagerte Werte"
 * (inherited values) panel.
 *
 * Every field type must render its value — the prior inline implementation in
 * the panel handled only `number` and `json` and fell through to "—" for
 * text/enum/date/boolean, which hid present-but-text inherited values
 * (e.g. kostra_grid_cell, site_address). "—" is reserved for genuinely empty
 * values.
 */
export type DisplayFieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown }
  | undefined;

export function formatInheritedValue(value: DisplayFieldValue, unit: string | null): string {
  if (!value) return '—';
  switch (value.type) {
    case 'number':
      if (value.value == null || !Number.isFinite(value.value)) return '—';
      return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(value.value)}${unit ? ` ${unit}` : ''}`;
    case 'text':
    case 'enum':
    case 'date':
      return value.value != null && value.value !== '' ? String(value.value) : '—';
    case 'boolean':
      return value.value == null ? '—' : value.value ? 'Ja' : 'Nein';
    case 'json':
      return value.value && typeof value.value === 'object' ? '(Tabelle)' : '—';
  }
}
