/**
 * Engineer-facing number formatting (German locale) for values that come out of the engine or the
 * database as raw doubles. Readiness run 2026-09-30 (A138 BESS case): copy hints printed
 * "162.20000000000002" and "0.0000006599999999999999", the upstream panel printed k_i = 6,6·10⁻⁷ as "0".
 *
 * Rules: null/undefined/NaN → "—"; |v| ≥ 1e-3 (or 0) → de-DE with at most 4 fraction digits, but never
 * fewer significant digits than 4 for values below 1 (0,0016 stays 0,0016); |v| < 1e-3 → mantissa with
 * up to 3 significant digits and a superscript power of ten (6,6·10⁻⁷), which is how the guideline prints
 * permeabilities. Strings pass through unchanged.
 */
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('');

const fmt4 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });
const fmtSig = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 4 });
const fmtMant = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 3 });

export function formatNumberDe(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein';
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a < 1e-3) {
    const exp = Math.floor(Math.log10(a));
    const mant = v / 10 ** exp;
    return `${fmtMant.format(mant)}·10${sup(exp)}`;
  }
  if (a < 1) return fmtSig.format(v);
  return fmt4.format(v);
}
