export function fmtDe(v: unknown): string {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '—';
    if (Number.isInteger(v)) return v.toLocaleString('de-DE');
    return v.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (typeof v === 'boolean') return v ? 'ja' : 'nein';
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}
