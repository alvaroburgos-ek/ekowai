/** Number display for cases, chart and step-through: no grouping, 6 significant digits, |x| < 10⁻³ as m·10ⁿ. */
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

export function fmtNum(x: number, locale: 'de' | 'en'): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const tag = locale === 'en' ? 'en-GB' : 'de-DE';
  if (Math.abs(x) < 1e-3) {
    const [m, e] = x.toExponential(3).split('e');
    const mant = new Intl.NumberFormat(tag, { maximumFractionDigits: 3, useGrouping: false }).format(Number(m));
    const exp = String(Number(e)).split('').map((c) => SUP[c] ?? c).join('');
    return `${mant}·10${exp}`;
  }
  return new Intl.NumberFormat(tag, { maximumSignificantDigits: 6, useGrouping: false }).format(x);
}
