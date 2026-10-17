/** The printed formula with the numbers of one duration substituted (spec §4.4). Pure, DE/EN. */
import { fmtNum } from './format';
import type { IterationSeries } from './types';

export function stepLines(series: IterationSeries, index: number, locale: 'de' | 'en'): string[] {
  const p = series.perDuration[index];
  if (!p) return [];
  const f = (x: number) => fmtNum(x, locale);
  const s = series.scalars;
  const n = series.perDuration.length;
  const T = series.returnPeriod != null ? `T = ${series.returnPeriod} a` : 'n';
  const head = locale === 'en'
    ? `Step ${index + 1} of ${n}: D = ${p.D} min, r_D(${T}) = ${f(p.r_D)} l/(s·ha)`
    : `Schritt ${index + 1} von ${n}: D = ${p.D} min, r_D(${T}) = ${f(p.r_D)} l/(s·ha)`;
  const lines = [head];
  if (series.kind === 'gl8') {
    lines.push('V_VA(D) = (r_D(n) · (A_C + A_VA) · 10⁻⁴ − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³  (Gl. 8)');
    lines.push(`= (${f(p.r_D)} · (${f(s.A_C)} + ${f(s.A_VA)}) · 10⁻⁴ − ${f(s.Q_S)} − ${f(s.Q_Dr)}) · ${p.D} · 60 · ${f(s.f_Z)} · ${f(s.f_A)} · 10⁻³ = ${f(p.value)} m³`);
  } else if (series.kind === 'gl10') {
    const q = (p.r_D * (s.AcS_paved + s.A_VA)) / 10000;
    lines.push(`Q_in = r_D(T) · (Σ A_E,b,a·C_S + A_VA) / 10 000 = ${f(p.r_D)} · (${f(s.AcS_paved)} + ${f(s.A_VA)}) / 10 000 = ${f(q)} l/s`);
    const neg = p.value < 0 ? (locale === 'en' ? '  → negative, V_Rück = 0' : '  → negativ, V_Rück = 0') : '';
    lines.push(`V_Rück = (Q_in − (Q_S + Q_Dr)) · D · 60 / 1000 − V_VA  (Gl. 10)`);
    lines.push(`= (${f(q)} − (${f(s.Q_S)} + ${f(s.Q_Dr)})) · ${p.D} · 60 / 1000 − ${f(s.V_VA)} = ${f(p.value)} m³${neg}`);
  } else {
    lines.push('A_S,m(D) = A_C · 10⁻⁷ · r_D(n) / (h_M / (D · 60 · f_Z) + k_i)  (Gl. 16)');
    lines.push(`= ${f(s.A_C)} · 10⁻⁷ · ${f(p.r_D)} / (${f(s.h_M)} / (${p.D} · 60 · ${f(s.f_Z)}) + ${f(s.k_i)}) = ${f(p.value)} m²`);
  }
  if (series.governingD != null && series.governingValue != null) {
    const g = series.floorAtZero ? Math.max(0, series.governingValue) : series.governingValue;
    const edge = series.boundaryLimited
      ? (locale === 'en' ? ' — no peak inside the table (last tabulated duration)' : ' — kein eindeutiges Maximum (letzte Tabellendauer)')
      : '';
    lines.push(locale === 'en'
      ? `Governing: D = ${series.governingD} min with ${f(g)} ${series.unit}${edge}`
      : `Maßgebend: D = ${series.governingD} min mit ${f(g)} ${series.unit}${edge}`);
  }
  return lines;
}
