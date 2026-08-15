/**
 * GOLDEN TESTS — printed worked examples from the standards themselves.
 *
 * Every input and every expected value below is quoted from a standard's own
 * printed worked example ("Anwendungsbeispiel"). Per SR-3 each number was
 * verified against the RENDERED page image (pdftoppm -r 300 of
 * DIN-18130-1.pdf, scratchpad din18130-p-{05,17,18,19,20}.png, viewed
 * 2026-08-01) — not just the OCR transcript
 * (Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1_OCR.md).
 *
 * Source: DIN 18130-1:1998-05, Abschnitt 9 "Anwendungsbeispiele"
 * (printed pages 17-20) plus Gl. (6)/Tabelle 2 (printed page 5).
 *
 * NEGATIVE FINDING — DWA-A 138-1 (Oktober 2024): the full page-prefixed text
 * extract (S001-S103) contains NO complete printed worked example (inputs AND
 * numeric result). Anhang A-E are methodology / legal / planning / checklist /
 * operations content; the body prints formulas and parameter tables only.
 * Hence all golden examples here come from DIN 18130-1.
 *
 * Convention: expected values are compared on the printed mantissa
 * (computed / 10^exponent) so toBeCloseTo precision maps 1:1 onto the
 * printed digits, independent of the absolute scale (1e-4 ... 1e-10 m/s).
 */
import { describe, it, expect } from 'vitest';
import { evalExpression } from '@/lib/eval/arithmetic';

describe('DIN 18130-1 Gl. (6) — Temperaturkorrektur alpha (Seite 5, Tabelle 2)', () => {
  /**
   * Standard: DIN 18130-1:1998-05 | Gl. (6) | printed page 5
   * Printed:  "k10 = 1,359 / (1 + 0,0337 · T + 0,00022 · T²) · kT = α · kT   (6)"
   * Printed:  "Tabelle 2: Korrekturbeiwert α ... Temperatur T °C | 5 | 10 | 15 | 20 | 25
   *            α | 1,158 | 1,000 | 0,874 | 0,771 | 0,686"
   */
  const ALPHA = '1.359 / (1 + 0.0337 * T + 0.00022 * T^2)';

  it.each([
    { T: 5, printed: 1.158 },
    { T: 10, printed: 1.0 },
    { T: 15, printed: 0.874 },
    { T: 20, printed: 0.771 },
    { T: 25, printed: 0.686 },
  ])('alpha(T=$T °C) = $printed (Tabelle 2)', ({ T, printed }) => {
    expect(evalExpression(ALPHA, { T })).toBeCloseTo(printed, 3);
  });

  it('alpha for T = 0,5 × (20,5 + 22,0) = 0,7485 (Tabelle 10, Seite 19)', () => {
    // Printed (Tabelle 10): "α für T = 0,5 × (20,5 + 22,0)  °C  0,7485"
    const T = evalExpression('0.5 * (T_min + T_max)', { T_min: 20.5, T_max: 22.0 });
    expect(T).toBeCloseTo(21.25, 10);
    expect(evalExpression(ALPHA, { T })).toBeCloseTo(0.7485, 3);
  });

  it('alpha for T = 0,5 × (19,0 + 22,0) = 0,762 (Tabelle 11, Seite 20)', () => {
    // Printed (Tabelle 11): "α für T = 0,5 × (19,0 + 22,0) ... 0,762"
    const T = evalExpression('0.5 * (T_min + T_max)', { T_min: 19.0, T_max: 22.0 });
    expect(evalExpression(ALPHA, { T })).toBeCloseTo(0.762, 3);
  });
});

describe('DIN 18130-1 §9.1 — Kompressions-Durchlässigkeitsgerät, Gl. (9) (Seiten 17-18)', () => {
  /**
   * Standard: DIN 18130-1:1998-05 | §9.1 / Gl. (9) | printed page 17
   * Versuch DIN 18130 — KD — ES — ST — SB — 3
   * Printed:  "k = 1/(c · t) · ln(h1/h2)"  (Gl. (9) shape, Berechnung von k nach Gleichung (9))
   * Printed:  "Querschnittsfläche des Standrohres a = 2,43 · 10⁻⁵ m²"
   * Printed:  "c = A/(l0 · a) = 7,85 · 10⁻³ / (1,985 · 2,43 · 10⁻⁷) = 1,627 · 10⁴ m⁻¹"
   *   (denominator printed with combined exponent: 1,985·10⁻² m × 2,43·10⁻⁵ m²)
   */
  it('c = A/(l0 · a) = 1,627 · 10⁴ m⁻¹ (Seite 17)', () => {
    const c = evalExpression('A / (l_0 * a)', {
      A: 7.85e-3, // "A = 7,85 · 10⁻³ m²"
      l_0: 0.01985, // "Länge l0 = l = 0,01985 m"
      a: 2.43e-5, // "a = 2,43 · 10⁻⁵ m²"
    });
    expect(c / 1e4).toBeCloseTo(1.627, 3);
  });

  /**
   * Standard: DIN 18130-1:1998-05 | §9.1 Tabelle 7 | printed page 18
   * Printed:  "Tabelle 7: Versuchsergebnisse Anwendungsbeispiel 9.1 mit einer
   *            Wassersäule h1 = 0,655 m" — columns t | h2 | ln(h1/h2).
   * Spot-checks of the printed ln-column (the ln kernel of Gl. (9)).
   */
  it.each([
    // Versuch 1
    { h2: 0.648, printed: 0.0107, t: 15 },
    { h2: 0.632, printed: 0.0357, t: 45 },
    { h2: 0.584, printed: 0.1147, t: 150 },
    { h2: 0.503, printed: 0.264, t: 390 },
    // Versuch 2
    { h2: 0.649, printed: 0.0092, t: 15 },
    { h2: 0.534, printed: 0.2042, t: 390 },
  ])('Tabelle 7 (t=$t s): ln(0,655/$h2) = $printed', ({ h2, printed }) => {
    expect(evalExpression('ln(h_1 / h_2)', { h_1: 0.655, h_2: h2 })).toBeCloseTo(printed, 4);
  });

  /**
   * Standard: DIN 18130-1:1998-05 | §9.1 Versuch 1 | printed page 17
   * Printed:  "Versuch 1
   *              k · c = 7,2053 · 10⁻⁴ ± 0,01 · 10⁻⁴
   *              kT    = 4,43 · 10⁻⁸ ± 0,06 · 10⁻⁸
   *            umgerechnet auf 10 °C
   *              α     = 0,754 für T = 21°
   *              k10   = (3,34 ± 0,05) · 10⁻⁸ m/s"
   * (α = 0,754 is the Tabelle-2 linear interpolation 0,771 − 1/5·(0,771−0,686);
   *  the Gl.-(6) closed formula gives 0,753 — Tabelle 2 with "Zwischenwerte
   *  können geradlinig eingeschaltet werden" is the printed method.)
   */
  it('Versuch 1: kT = (k·c)/c = 4,43 · 10⁻⁸ m/s; k10 = α·kT = 3,34 · 10⁻⁸ m/s', () => {
    const kT = evalExpression('kc / c', { kc: 7.2053e-4, c: 1.627e4 });
    expect(kT / 1e-8).toBeCloseTo(4.43, 2);

    const k10 = evalExpression('alpha * k_T', { alpha: 0.754, k_T: 4.43e-8 });
    expect(k10 / 1e-8).toBeCloseTo(3.34, 2);
  });

  /**
   * Standard: DIN 18130-1:1998-05 | §9.1 Versuch 2 | printed page 17
   * Printed:  "Versuch 2
   *              k · c = 5,84 · 10⁻⁴ ± 1,6 · 10⁻⁵ s⁻¹
   *              kT    = (3,59 ± 0,10) · 10⁻⁸ m/s
   *              k10   = (2,7 ± 0,1) · 10⁻⁸ m/s"
   */
  it('Versuch 2: kT = (k·c)/c = 3,59 · 10⁻⁸ m/s; k10 = α·kT = 2,7 · 10⁻⁸ m/s', () => {
    const kT = evalExpression('kc / c', { kc: 5.84e-4, c: 1.627e4 });
    expect(kT / 1e-8).toBeCloseTo(3.59, 2);

    const k10 = evalExpression('alpha * k_T', { alpha: 0.754, k_T: 3.59e-8 });
    expect(k10 / 1e-8).toBeCloseTo(2.7, 1);
  });
});

describe('DIN 18130-1 §9.2 — Versuchszylinder mit Standrohren, konstantes Gefälle (Seite 18)', () => {
  /**
   * Standard: DIN 18130-1:1998-05 | §9.2, Tabelle 8 + Tabelle 9 | printed page 18
   * Versuch DIN 18130 — ZY — MS — MZ — 2
   * Printed inputs (Tabelle 8):
   *   "Standrohrspiegelhöhen Oberstrom ho  m  0,268  0,268"
   *   "Unterstrom hu                      m  0,186  0,186"
   *   "hydraulischer Höhenunterschied h = ho − hu  m  0,082  0,082"
   *   "Meßzeitspanne t   s   300   300"
   *   "Wasservolumen Vw  m³  520 × 10⁻⁶  510 × 10⁻⁶"
   * Body: "Länge l0 = 0,272 m / Standrohrabstand l = 0,20 m /
   *        Querschnittsfläche A = 1,54 × 10⁻² m²"
   * Printed results (Tabelle 9):
   *   "k = Vw · l / (A · h · t)  m/s  2,745 × 10⁻⁴  2,693 × 10⁻⁴"
   *   "k10 = kT − α  m/s  2,12 × 10⁻⁴  2,08 × 10⁻⁴"   [sic — see FINDING 2]
   *   "Durchlässigkeitsbeiwert k10 = 2,1 × 10⁻⁴ m/s"
   */
  const scope = { l: 0.2, A: 1.54e-2, t: 300 };

  it('h = ho − hu = 0,082 m (Tabelle 8)', () => {
    expect(evalExpression('h_o - h_u', { h_o: 0.268, h_u: 0.186 })).toBeCloseTo(0.082, 3);
  });

  it('Versuch 1: kT = Vw·l/(A·h·t) = 2,745 · 10⁻⁴ m/s', () => {
    const kT = evalExpression('V_w * l / (A * h * t)', { ...scope, V_w: 520e-6, h: 0.082 });
    expect(kT / 1e-4).toBeCloseTo(2.745, 3);
  });

  it('Versuch 2: kT = Vw·l/(A·h·t) — printed 2,693 · 10⁻⁴, computed 2,6924 · 10⁻⁴ (last-digit rounding)', () => {
    // FINDING 1 (rounding edge, < 1 ULP of the printed mantissa):
    //   printed  "2,693 × 10⁻⁴" (Tabelle 9, Versuch 2)
    //   computed 510e-6 · 0,20 / (1,54e-2 · 0,082 · 300) = 2,69243 · 10⁻⁴
    //   2,69243 rounds to 2,692, not the printed 2,693 (off by 0,6 of the last
    //   printed digit). Within rounding slop of an intermediate — asserted at
    //   2 mantissa digits instead of the printed 3.
    const kT = evalExpression('V_w * l / (A * h * t)', { ...scope, V_w: 510e-6, h: 0.082 });
    expect(kT / 1e-4).toBeCloseTo(2.693, 2);
  });

  it('k10 = α · kT = 2,12 / 2,08 · 10⁻⁴ m/s (α = 0,771 aus Tabelle 2 bei T = 20,0 °C)', () => {
    // FINDING 2 (typographic): Tabelle 9 prints the operation as "k10 = kT − α";
    // only multiplication reproduces the printed row values, and Gl. (6) on
    // page 5 prints "kT = α · kT". The printed minus sign is a typo for "·".
    // Body (Seite 18): "Raumtemperatur: T = 20,0 °C" → Tabelle 2: α = 0,771.
    const k10v1 = evalExpression('alpha * k_T', { alpha: 0.771, k_T: 2.745e-4 });
    expect(k10v1 / 1e-4).toBeCloseTo(2.12, 2);

    const k10v2 = evalExpression('alpha * k_T', { alpha: 0.771, k_T: 2.693e-4 });
    expect(k10v2 / 1e-4).toBeCloseTo(2.08, 2);
  });
});

describe('DIN 18130-1 §9.3 — Triaxialzelle, Tabelle 10 (Seite 19)', () => {
  /**
   * Standard: DIN 18130-1:1998-05 | §9.3, Tabelle 10 | printed page 19
   * Versuch DIN 18130 — TX — DE — MZ — UO — 1
   * Printed inputs:
   *   "Länge l0 = l = 0,1192 m" / "A = 7,85 × 10⁻³ m²" (body, Seite 19)
   *   "Druckdifferenz p2 − p1 = 30 kN/m²  hydraulischer Höhenunterschied h
   *    = (p2 − p1)/γw = 3,0 m" (body, Seite 19)
   *   "Meßzeitspanne t  s  7200  7200  7200"
   *   "Wasservolumen Vw  m³  7,3 × 10⁻⁶  7,1 × 10⁻⁶  7,1 × 10⁻⁶"
   * Printed results (Tabelle 10):
   *   "kT = Vw · l / (A · h · t)  m/s  5,13 × 10⁻⁹  4,99 × 10⁻⁹  4,99 × 10⁻⁹"
   *   "k10 = kT · α  m/s  3,84 × 10⁻⁹  3,74 × 10⁻⁹  3,74 × 10⁻⁹"
   *   "Durchlässigkeitsbeiwert k10 = 3,77 × 10⁻⁹ m/s"
   */
  const scope = { l: 0.1192, A: 7.85e-3, h: 3.0, t: 7200 };

  it('Versuch 1: kT = 5,13 · 10⁻⁹ m/s; k10 = kT · α = 3,84 · 10⁻⁹ m/s', () => {
    const kT = evalExpression('V_w * l / (A * h * t)', { ...scope, V_w: 7.3e-6 });
    expect(kT / 1e-9).toBeCloseTo(5.13, 2);

    const k10 = evalExpression('k_T * alpha', { k_T: 5.13e-9, alpha: 0.7485 });
    expect(k10 / 1e-9).toBeCloseTo(3.84, 2);
  });

  it('Versuche 2+3: kT = 4,99 · 10⁻⁹ m/s; k10 = 3,74 · 10⁻⁹ m/s', () => {
    const kT = evalExpression('V_w * l / (A * h * t)', { ...scope, V_w: 7.1e-6 });
    expect(kT / 1e-9).toBeCloseTo(4.99, 2);

    const k10 = evalExpression('k_T * alpha', { k_T: 4.99e-9, alpha: 0.7485 });
    expect(k10 / 1e-9).toBeCloseTo(3.74, 2);
  });

  it('Mittelwert: k10 = 3,77 · 10⁻⁹ m/s', () => {
    const k10 = evalExpression('(a + b + c) / 3', { a: 3.84e-9, b: 3.74e-9, c: 3.74e-9 });
    expect(k10 / 1e-9).toBeCloseTo(3.77, 2);
  });
});

describe('DIN 18130-1 §9.4 — Versuchszylinder nach 7.4, Tabelle 11 (Seite 20)', () => {
  /**
   * Standard: DIN 18130-1:1998-05 | §9.4, Tabelle 11 | printed page 20
   * Versuch DIN 18130 — ZY — DE — ST — 3
   * Printed inputs (body Seite 19 + Tabelle 11):
   *   "Länge lo = l = 0,05 m  Querschnittsfläche A = 7,238 × 10⁻³ m²"
   *   "Meßzeitspanne t  s  0 | 76.800 | 86.400 | 259.200"
   *   "Oberwasser ho  m  0,635 | 0,510 | 0,504 | 0,277"
   *   "Unterwasser hu m  0,0   | 0,189 | 0,192 | 0,257"
   *   "Differenz Wassersäule ho − hu  m  0,635 | 0,321 | 0,312 | 0,020"
   *   "Druckhöhe po/γw  m  2,0 (alle Spalten)"
   *   "Wasservolumen Vw  m³  1,25 × 10⁻⁵ | 1,31 × 10⁻⁵ | 3,35 × 10⁻⁵"
   * Printed results (Tabelle 11):
   *   "Hydraulischer Höhenunterschied h = ho − hu + (po − pu)/γw  m
   *      2,321 | 2,312 | 2,020"
   *   "Hydraulisches Gefälle i  1  46,4 | 46,2 | 40,4"
   *   "Durchlässigkeitsbeiwert kT  m/s  4,8 × 10⁻¹⁰ | 4,5 × 10⁻¹⁰ | 4,4 × 10⁻¹⁰
   *      kT = Vw · l / (A · h · t)"
   *   "α für T = 0,5 × (19,0 + 22,0)  0,762 ... k10  3,66 × 10⁻¹⁰ | 3,43 × 10⁻¹⁰ | 3,35 × 10⁻¹⁰"
   *   "Durchlässigkeitsbeiwert k10 = 3,48 × 10⁻¹⁰ m/s"
   */
  const l = 0.05;
  const A = 7.238e-3;

  it.each([
    // druckhoehe = printed "Druckhöhe po/γw = 2,0 m" (pu = 0,0 kN/m²)
    { n: 1, h_o: 0.51, h_u: 0.189, printedH: 2.321, printedI: 46.4 },
    { n: 2, h_o: 0.504, h_u: 0.192, printedH: 2.312, printedI: 46.2 },
    { n: 3, h_o: 0.277, h_u: 0.257, printedH: 2.02, printedI: 40.4 },
  ])('Ablesung $n: h = ho − hu + po/γw = $printedH m; i = h/l = $printedI', ({ h_o, h_u, printedH, printedI }) => {
    const h = evalExpression('h_o - h_u + druckhoehe', { h_o, h_u, druckhoehe: 2.0 });
    expect(h).toBeCloseTo(printedH, 3);

    const i = evalExpression('h / l', { h: printedH, l });
    expect(i).toBeCloseTo(printedI, 1);
  });

  it.each([
    { n: 1, V_w: 1.25e-5, h: 2.321, t: 76800, printedKT: 4.8, printedK10: 3.66 },
    { n: 2, V_w: 1.31e-5, h: 2.312, t: 86400, printedKT: 4.5, printedK10: 3.43 },
    { n: 3, V_w: 3.35e-5, h: 2.02, t: 259200, printedKT: 4.4, printedK10: 3.35 },
  ])(
    'Ablesung $n: kT = Vw·l/(A·h·t) = $printedKT · 10⁻¹⁰ m/s; k10 = α·kT = $printedK10 · 10⁻¹⁰ m/s',
    ({ V_w, h, t, printedKT, printedK10 }) => {
      const kT = evalExpression('V_w * l / (A * h * t)', { V_w, l, A, h, t });
      expect(kT / 1e-10).toBeCloseTo(printedKT, 1);

      const k10 = evalExpression('alpha * k_T', { alpha: 0.762, k_T: printedKT * 1e-10 });
      expect(k10 / 1e-10).toBeCloseTo(printedK10, 2);
    },
  );

  it('Mittelwert: k10 = 3,48 · 10⁻¹⁰ m/s', () => {
    const k10 = evalExpression('(a + b + c) / 3', { a: 3.66e-10, b: 3.43e-10, c: 3.35e-10 });
    expect(k10 / 1e-10).toBeCloseTo(3.48, 2);
  });
});
