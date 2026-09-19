/**
 * Design window ("Bemessungsfenster") — for one facility type, the range of
 * the engineer's design variable inside which every limit of the guideline
 * holds, plus the derived values at each step so the decision is made with
 * the numbers in view.
 *
 * Pure: takes the resolved KOSTRA rows of the design return period, the
 * fixed scalars the engine already has, and the current value of the design
 * variable. Nothing here is a new source: every sizing function mirrors the
 * facility's printed equation and every limit cites the clause / Tab. 14
 * cell it comes from (DWA-A 138-1:2024, transcript lines in comments).
 *
 * Limits carry a severity (independent review 2026-09-19, findings F-1/F-2):
 *   - hard: a printed requirement (§5.3.3.2 q_S,AC ≥ 2; the sizing itself
 *     L_R ≥ L_R,erf / A_S ≥ A_S,erf) — gates the window;
 *   - rule: a printed "in der Regel" value (Tab. 14 Einstauhöhe) — gates the
 *     window, deviation possible with justification;
 *   - info: shown for orientation only, never gates (Entleerungszeit: Tab. 14
 *     L2260 is for n = 1/a and §6.3.2 L1740 says no proof is required in the
 *     Einfaches Verfahren; the equation t_E = h / k_i is an assumption, not
 *     printed).
 * "near" marks a value within `nearFraction` of its bound (amber band).
 *
 * Facilities covered now: flaeche (§6.2), mulde (§6.3), rigole (§6.4),
 * MRE (§6.5, with V_M as fixed input), becken (§6.8). MRS (§6.6, needs the
 * throttle Q_Dr and the overflow route) and schacht (§6.7, Gl. 34–38 with the
 * shaft geometry) follow the same shape and are not defined yet.
 */
import { iterateGoverningDuration, fixedDurationIntensity } from './governing-duration';

export type FacilityKey = 'flaeche' | 'mulde' | 'rigole' | 'MRE' | 'MRS' | 'schacht' | 'becken';

export type RainRow = { D_min: number | null; r_D_n: number | null };

export type LimitDef = {
  key: string;
  labelDe: string;
  clause: string;
  /** The guideline's own sentence / table cell, verbatim (transcript line in clause). */
  quoteDe?: string;
  /** What the engineer can do when the limit is violated (from the guideline's logic, not advice beyond it). */
  leverDe?: string;
  /** derived key the limit reads */
  on: string;
  kind: 'max' | 'min';
  bound: number;
  unit: string;
  severity: 'hard' | 'rule' | 'info';
  /** strict inequality (Gl. 13 prints k_i > …) */
  strict?: boolean;
};

export type DerivedValues = Record<string, number | null>;

export type WindowDef = {
  facility: FacilityKey;
  titleDe: string;
  variable: { symbol: string; labelDe: string; unit: string; min: number };
  /** Scalar symbols that must be present (finite) before the window can be evaluated. */
  requires: string[];
  /** Derived keys in display order with label + unit. */
  derived: Array<{ key: string; labelDe: string; unit: string; digits: number }>;
  evaluate: (rows: RainRow[], s: Record<string, number>, x: number) => DerivedValues;
  limits: LimitDef[];
  notesDe: string[];
};

export type CheckResult = { key: string; ok: boolean; near: boolean; value: number | null; bound: number; kind: 'max' | 'min'; unit: string; labelDe: string; clause: string; severity: 'hard' | 'rule' | 'info' };
export type WindowRow = { x: number; isCurrent: boolean; derived: DerivedValues; checks: CheckResult[]; ok: boolean };
export type WindowResult = {
  def: WindowDef;
  current: WindowRow | null;
  steps: WindowRow[];
  /** Smallest / largest scanned x where every limit holds (null = none found). */
  window: { min: number | null; max: number | null };
  /** For the chart: per-duration sizing at the CURRENT x (null when not iterated). */
  curve: Array<{ D: number; r_D: number; value: number }> | null;
  governingD: number | null;
};

const NEAR_FRACTION = 0.15;

function qSac(k_i: number, A_S_m: number, A_C: number, Q_Dr = 0): number {
  // Gl. 9 (L1592): q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / A_C · 10⁴  [l/(s·ha)]
  return ((k_i * A_S_m * 1000 + Q_Dr) / A_C) * 1e4;
}

// ---------------------------------------------------------------- definitions

const MULDE: WindowDef = {
  facility: 'mulde',
  titleDe: 'Bemessungsfenster Versickerungsmulde (§6.3)',
  variable: { symbol: 'A_S_m', labelDe: 'Mittlere Versickerungsfläche A_S,m', unit: 'm²', min: 5 },
  requires: ['A_C', 'k_i', 'f_Z'],
  // optional: A_VA (überregnete Fläche); when absent the §6.3.2 approximation A_VA = A_S,m (L1705) is used and said so
  derived: [
    { key: 'V_M', labelDe: 'Speichervolumen V_M (Gl. 14, max über D)', unit: 'm³', digits: 1 },
    { key: 'D', labelDe: 'maßgebende Dauerstufe', unit: 'min', digits: 0 },
    { key: 'h', labelDe: 'Einstauhöhe h = V_M / A_S,m', unit: 'cm', digits: 1 },
    { key: 't_E', labelDe: 'Entleerungszeit t_E = h / k_i', unit: 'h', digits: 1 },
    { key: 'q_S_AC', labelDe: 'q_S,AC (Gl. 9)', unit: 'l/(s·ha)', digits: 1 },
  ],
  evaluate: (rows, s, x) => {
    // Gl. 14 (L1681): V_M = [(A_C + A_VA)·10⁻⁷·r_D(n) − A_S,m·k_i]·D·60·f_Z  (no Q_Dr term printed in Gl. 14)
    // A_VA: engineer value if given, else the printed approximation "A_VA = A_S,m" (L1705)
    const A_VA = typeof s.A_VA === 'number' && Number.isFinite(s.A_VA) ? s.A_VA : x;
    const g = iterateGoverningDuration(rows, (D, r) => ((s.A_C + A_VA) * 1e-7 * r - x * s.k_i) * D * 60 * s.f_Z);
    const V = g.governingValue;
    const h = V != null ? (V / x) * 100 : null; // Gl. 15 (L1720) rearranged: h_M = V_M / A_S,m
    return {
      V_M: V, D: g.governingD, h,
      t_E: h != null ? (h / 100) / s.k_i / 3600 : null, // ASSUMPTION: t_E = h / k_i (no printed equation)
      q_S_AC: qSac(s.k_i, x, s.A_C, 0), // Gl. 9 (L1451)
    };
  },
  limits: [
    { key: 'h_max', labelDe: 'Einstauhöhe Mulde i. d. R. ≤ 30 cm', clause: 'Tab. 14 (L2257), §6.3.1 (L1659)', on: 'h', kind: 'max', bound: 30, unit: 'cm', severity: 'rule',
      quoteDe: 'Tab. 14, Einstauhöhe [cm]: „für Mulden i. d. R. ≤ 30“; §6.3.1: „Der maximale Bemessungseinstau der Mulde h_max ist in der Regel auf 30 cm zu begrenzen.“',
      leverDe: 'Sohlenfläche vergrößern (h = V_M / A_S,m) oder die Mulde flacher und breiter anlegen.' },
    { key: 't_E_max', labelDe: 'Entleerungszeit ≤ 84 h (Information, n = 1/a)', clause: 'Tab. 14 (L2260), §6.3.2 (L1740)', on: 't_E', kind: 'max', bound: 84, unit: 'h', severity: 'info',
      quoteDe: '§6.3.2: „Aus vegetationstechnischer Sicht ist bei oberirdischen Versickerungsanlagen eine Entleerungszeit von ≤ 84 Stunden für n = 1/a bei geeigneter Bepflanzung in der Regel unkritisch. […] Beim Einfachen Verfahren ist ein bemessungstechnischer Nachweis der Entleerungszeit nicht erforderlich, da die Anwendungsgrenze des Verfahrens q_S,AC ≥ 2 l/(s·ha) greift.“',
      leverDe: 'Sohlenfläche vergrößern (t_E = h / k_i sinkt mit h) oder eine höhere Durchlässigkeit durch Feldversuch belegen (Tab. 11).' },
    { key: 'q_min', labelDe: 'Einfaches Verfahren: q_S,AC ≥ 2 l/(s·ha)', clause: '§5.3.3.2 (L1092), Gl. 9 (L1451)', on: 'q_S_AC', kind: 'min', bound: 2, unit: 'l/(s·ha)', severity: 'hard',
      quoteDe: '§5.3.3.2: „Die spezifische Versickerungs-/Abflussleistung bezogen auf den Bemessungswert der Zuflüsse AC ist q_s ≥ 2 l/(s·ha).“',
      leverDe: 'Sohlenfläche vergrößern (q_S,AC wächst linear mit A_S,m) — sonst Nachweisverfahren (Langzeitsimulation, §5.3.3.3).' },
  ],
  notesDe: [
    'Überregnete Fläche A_VA: eigener Wert, sonst die Näherung des Regelwerks „A_VA = A_S,m“ (§6.3.2, L1705) — eine der zwei genannten Optionen; A_VA ist nach §5.3.3.5 (L1240) die maximale Versickerungsfläche, die Näherung kann den Zufluss geringfügig unterschätzen.',
    'Einstauhöhe h = V_M / A_S,m nach Gl. 15 (L1720, „näherungsweise“).',
    'Entleerungszeit: Tab. 14 nennt ≤ 84 h für n = 1/a; im Einfachen Verfahren ist kein Nachweis erforderlich (§6.3.2, L1740). Der Wert t_E = h / k_i ist eine Annahme (keine Gleichung im Regelwerk) und wird nur zur Information angezeigt — er begrenzt das Fenster nicht.',
  ],
};

const FLAECHE: WindowDef = {
  facility: 'flaeche',
  titleDe: 'Bemessungsfenster Flächenversickerung (§6.2)',
  variable: { symbol: 'A_S', labelDe: 'Versickerungsfläche A_S', unit: 'm²', min: 5 },
  requires: ['A_C', 'k_i'],
  // optional: D_flaeche (10 = Regelfall; 15 bei großen, flach geneigten Anschlussflächen — Ingenieurwahl, §6.2.2 L1650)
  derived: [
    { key: 'D', labelDe: 'Dauerstufe D (Regelfall 10 min)', unit: 'min', digits: 0 },
    { key: 'r_D', labelDe: 'Regenspende r_D(n) bei D', unit: 'l/(s·ha)', digits: 1 },
    { key: 'k_i_req', labelDe: 'erforderlich k_i > r_D·10⁻⁷ (Gl. 13)', unit: 'm/s', digits: 8 },
    { key: 'A_S_req', labelDe: 'erforderliche Fläche A_S = A_C / (k_i·10⁷/r_D − 1) (Gl. 12)', unit: 'm²', digits: 1 },
    { key: 'A_S_ratio', labelDe: 'A_S / A_S,erf', unit: '–', digits: 2 },
  ],
  evaluate: (rows, s, x) => {
    // §6.2.2 (L1650): "sollte die Dauer des Bemessungsregens in der Regel zu D = 10 min gewählt werden. Bei großen und
    // flach geneigten Anschlussflächen kann die maßgebende Dauerstufe auf D = 15 min vergrößert werden." Gl. 12 (L1627), Gl. 13 (L1643)
    const Dsel = s.D_flaeche === 15 ? 15 : 10;
    const fx = fixedDurationIntensity(rows, Dsel);
    if (!fx) return { D: Dsel, r_D: null, k_i_req: null, A_S_req: null, A_S_ratio: null };
    const denom = (s.k_i * 1e7) / fx.r_D - 1;
    const A_S_req = denom > 0 ? s.A_C / denom : null; // Gl. 13 violated ⇒ no finite area
    return { D: Dsel, r_D: fx.r_D, k_i_req: fx.r_D * 1e-7, A_S_req, A_S_ratio: A_S_req != null ? x / A_S_req : null };
  },
  limits: [
    { key: 'gl13', labelDe: 'k_i > r_D(n)·10⁻⁷ (Gültigkeitsbedingung)', clause: '§6.2.2 Gl. 13 (L1643)', on: 'k_i_margin', kind: 'min', bound: 1, unit: '–', severity: 'hard', strict: true,
      quoteDe: 'Gl. 13: „k_i > r_D(n)·10⁻⁷“.', leverDe: 'Nur eine höhere Durchlässigkeit (Feldversuch, Tab. 11) oder ein anderer Anlagentyp mit Speicherwirkung (Bild 7).' },
    { key: 'area', labelDe: 'A_S ≥ A_S,erf', clause: '§6.2.2 Gl. 12 (L1627)', on: 'A_S_ratio', kind: 'min', bound: 1, unit: '–', severity: 'hard',
      quoteDe: 'Gl. 12: „A_S = A_C / (k_i·10⁷ / r_D(n) − 1)“.', leverDe: 'Versickerungsfläche vergrößern.' },
  ],
  notesDe: [
    'Ohne Speicherwirkung: der Zufluss muss im Regenmoment versickern; bei schluffigem Sand meist nicht erfüllbar (Gl. 13).',
    'Dauerstufe: Regelfall D = 10 min; D = 15 min ist bei großen, flach geneigten Anschlussflächen eine Ingenieurwahl (§6.2.2, L1650) — über D_flaeche wählbar.',
  ],
};

const RIGOLE: WindowDef = {
  facility: 'rigole',
  titleDe: 'Bemessungsfenster Rigole (§6.4)',
  variable: { symbol: 'L_R', labelDe: 'Rigolenlänge L_R', unit: 'm', min: 1 },
  requires: ['A_C', 'k_i', 'f_Z', 'b_R', 'h_R', 's_R'],
  derived: [
    { key: 'L_req', labelDe: 'erforderliche Länge L_R,erf (Gl. 23, max über D)', unit: 'm', digits: 1 },
    { key: 'D', labelDe: 'maßgebende Dauerstufe', unit: 'min', digits: 0 },
    { key: 'V_R', labelDe: 'Speichervolumen V_R = b·h·L·s_R (Gl. 20)', unit: 'm³', digits: 1 },
    { key: 'L_ratio', labelDe: 'L_R / L_R,erf', unit: '–', digits: 2 },
    { key: 'q_S_AC', labelDe: 'q_S,AC mit A_S,m nach Gl. 17', unit: 'l/(s·ha)', digits: 1 },
  ],
  evaluate: (rows, s, x) => {
    // Gl. 23 (L1846): L_R = (A_C·10⁻⁷·r − b·h·k_i − Q_Dr·10⁻³) / (b·h·s_R/(D·60·f_Z) + (b+h)·k_i)
    const Q_Dr = s.Q_Dr ?? 0;
    const g = iterateGoverningDuration(rows, (D, r) => {
      const num = s.A_C * 1e-7 * r - s.b_R * s.h_R * s.k_i - Q_Dr * 1e-3;
      const den = (s.b_R * s.h_R * s.s_R) / (D * 60 * s.f_Z) + (s.b_R + s.h_R) * s.k_i;
      return num / den;
    });
    const A_S_m = (s.b_R + s.h_R) * x + s.b_R * s.h_R; // Gl. 17 (L1766)
    return {
      L_req: g.governingValue, D: g.governingD,
      V_R: s.b_R * s.h_R * x * s.s_R,
      L_ratio: g.governingValue != null && g.governingValue > 0 ? x / g.governingValue : null,
      q_S_AC: qSac(s.k_i, A_S_m, s.A_C, Q_Dr),
    };
  },
  limits: [
    { key: 'length', labelDe: 'L_R ≥ L_R,erf', clause: '§6.4.2 Gl. 23 (L1846)', on: 'L_ratio', kind: 'min', bound: 1, unit: '–', severity: 'hard',
      quoteDe: '§6.4.2: „Die erforderliche Länge L_R erhält man durch die iterative Anwendung der Gl. (23) für unterschiedliche Dauerstufen D“ (L1849).', leverDe: 'Länge erhöhen oder Querschnitt b_R × h_R vergrößern.' },
    { key: 'q_min', labelDe: 'Einfaches Verfahren: q_S,AC ≥ 2 l/(s·ha)', clause: '§5.3.3.2 (L1092), Gl. 9 (L1451)', on: 'q_S_AC', kind: 'min', bound: 2, unit: 'l/(s·ha)', severity: 'hard',
      quoteDe: '§5.3.3.2: „… q_s ≥ 2 l/(s·ha).“', leverDe: 'Länge oder Querschnitt vergrößern (A_S,m nach Gl. 17 wächst).' },
  ],
  notesDe: [
    'Unterirdische Anlage: in Wasserschutzzonen und für Flächengruppe D nur nach Tab. 7 / behördlicher Abstimmung (§5.2.3.3).',
    's_R: ohne Sickerrohr gilt s_R = s_F (Gl. 21 mit az = 0, L1820); mit Rohr s_R nach Gl. 21/22 eingeben.',
  ],
};

const MRE: WindowDef = {
  facility: 'MRE',
  titleDe: 'Bemessungsfenster Mulden-Rigolen-Element (§6.5)',
  variable: { symbol: 'L_R', labelDe: 'Rigolenlänge L_R unter der Mulde', unit: 'm', min: 1 },
  requires: ['A_C', 'A_VA', 'V_M', 'k_i', 'f_Z', 'b_R', 'h_R', 's_R'],
  derived: [
    { key: 'L_req', labelDe: 'erforderliche Länge L_R,erf (Gl. 29, max über D)', unit: 'm', digits: 1 },
    { key: 'D', labelDe: 'maßgebende Dauerstufe', unit: 'min', digits: 0 },
    { key: 'V_R', labelDe: 'V_R = b·h·L·s_R', unit: 'm³', digits: 1 },
    { key: 'V_MR', labelDe: 'V_MR = V_M + V_R (Gl. 26)', unit: 'm³', digits: 1 },
    { key: 'L_ratio', labelDe: 'L_R / L_R,erf', unit: '–', digits: 2 },
  ],
  evaluate: (rows, s, x) => {
    // Gl. 29 (L1946): L_R = ((A_C+A_VA)·10⁻⁷·r − b·h·k_i − V_M/(D·60·f_Z)) / (b·h·s_R/(D·60·f_Z) + (b+h)·k_i)
    const g = iterateGoverningDuration(rows, (D, r) => {
      const t = D * 60 * s.f_Z;
      const num = (s.A_C + s.A_VA) * 1e-7 * r - s.b_R * s.h_R * s.k_i - s.V_M / t;
      const den = (s.b_R * s.h_R * s.s_R) / t + (s.b_R + s.h_R) * s.k_i;
      return num / den;
    });
    const V_R = s.b_R * s.h_R * x * s.s_R;
    return { L_req: g.governingValue, D: g.governingD, V_R, V_MR: s.V_M + V_R, L_ratio: g.governingValue != null && g.governingValue > 0 ? x / g.governingValue : null };
  },
  limits: [{ key: 'length', labelDe: 'L_R ≥ L_R,erf', clause: '§6.5.2 Gl. 29 (L1946)', on: 'L_ratio', kind: 'min', bound: 1, unit: '–', severity: 'hard',
    quoteDe: 'Gl. 29 (L1946); §6.5.2: „Im ersten Schritt wird das erforderliche Speichervolumen gemäß Gl. (15) bemessen.“ (L1922)', leverDe: 'Länge erhöhen, Querschnitt oder Muldenvolumen V_M vergrößern.' }],
  notesDe: ['V_M ist das Muldenvolumen über der Rigole (Gl. 15, L1720); Bemessungshäufigkeit der Mulde i. d. R. n = 1/a (§6.5.2, L1922); Überlauf in die Rigole n_M nach Tab. 6.'],
};

const BECKEN: WindowDef = {
  facility: 'becken',
  titleDe: 'Bemessungsfenster Versickerungsbecken (§6.8)',
  variable: { symbol: 'A_S_m', labelDe: 'Mittlere Versickerungsfläche A_S,m', unit: 'm²', min: 5 },
  requires: ['A_C', 'A_VA', 'k_i', 'f_Z', 'f_A'],
  derived: [
    { key: 'V_B', labelDe: 'Speichervolumen V_B (Gl. 41, max über D)', unit: 'm³', digits: 1 },
    { key: 'D', labelDe: 'maßgebende Dauerstufe', unit: 'min', digits: 0 },
    { key: 'h', labelDe: 'Einstauhöhe h = V_B / A_S,m', unit: 'cm', digits: 1 },
    { key: 't_E', labelDe: 'Entleerungszeit t_E = h / k_i', unit: 'h', digits: 1 },
    { key: 'q_S_AC', labelDe: 'q_S,AC (Gl. 9)', unit: 'l/(s·ha)', digits: 1 },
  ],
  evaluate: (rows, s, x) => {
    // Gl. 41 (L2215): V_VA = [(A_C+A_VA)·10⁻⁷·r_D(n) − A_S,m·k_i − Q_Dr·10⁻³]·D·60·f_Z·f_A ; h = V/A_S,m carried over from Gl. 15 by "analog" (L2212) — ASSUMPTION
    const Q_Dr = s.Q_Dr ?? 0;
    const g = iterateGoverningDuration(rows, (D, r) => ((s.A_C + s.A_VA) * 1e-7 * r - x * s.k_i - Q_Dr * 1e-3) * D * 60 * s.f_Z * s.f_A);
    const V = g.governingValue;
    const h = V != null ? (V / x) * 100 : null;
    return { V_B: V, D: g.governingD, h, t_E: h != null ? (h / 100) / s.k_i / 3600 : null, q_S_AC: qSac(s.k_i, x, s.A_C, Q_Dr) };
  },
  limits: [
    { key: 'h_min', labelDe: 'Einstauhöhe Becken i. d. R. ≥ 50 cm', clause: 'Tab. 14 (L2257), §6.8.1 (L2210)', on: 'h', kind: 'min', bound: 50, unit: 'cm', severity: 'rule',
      quoteDe: 'Tab. 14, Einstauhöhe [cm], Versickerungsbecken: „i. d. R. ≥ 50“; §6.8.1: „Versickerungsbecken haben in der Regel Einstauhöhen von h ≥ 0,5 m.“', leverDe: 'Kleinere Sohlenfläche (h steigt) — oder die Anlage ist als Mulde sinnvoller (Tab. 14: Mulde ≤ 30 cm).' },
    { key: 't_E_max', labelDe: 'Entleerungszeit ≤ 84 h (Information, n = 1/a)', clause: 'Tab. 14 (L2260), §6.8.2 (L2242)', on: 't_E', kind: 'max', bound: 84, unit: 'h', severity: 'info',
      quoteDe: 'Tab. 14, Entleerungszeit (n = 1/a) [h], Versickerungsbecken: „≤ 84“; §6.8.2: „Für die Entleerungszeit von Versickerungsbecken sind die Angaben in 6.3.2 sowie in Tabelle 14 maßgebend.“', leverDe: 'Sohlenfläche vergrößern oder höhere Durchlässigkeit belegen.' },
    { key: 'q_min', labelDe: 'q_S,AC ≥ 2 l/(s·ha)', clause: '§5.3.3.2 (L1092), Gl. 9 (L1451)', on: 'q_S_AC', kind: 'min', bound: 2, unit: 'l/(s·ha)', severity: 'hard',
      quoteDe: '§5.3.3.2: „Die spezifische Versickerungs-/Abflussleistung bezogen auf den Bemessungswert der Zuflüsse AC ist q_s ≥ 2 l/(s·ha).“', leverDe: 'Sohlenfläche vergrößern.' },
  ],
  notesDe: [
    'Zentrale Anlage: k_f der maßgeblichen Bodenschicht ≥ 1·10⁻⁵ m/s und Freibord ≥ 35 cm (Tab. 14) sind Vorbedingungen, nicht Teil des Fensters.',
    'h = V / A_S,m und t_E = h / k_i sind für das Becken Annahmen (Gl. 15 gilt in §6.3.2 für die Mulde; §6.8.2 verweist „analog“, L2212).',
  ],
};

/**
 * Deterministic reading of a window row in the guideline's terms: one sentence
 * per limit (value vs bound, margin, the clause and its sentence) and one
 * overall sentence. No generated prose — every number is from the row and
 * every quote is the guideline's.
 */
export function interpretRowDe(def: WindowDef, row: WindowRow, window: { min: number | null; max: number | null }): string[] {
  const fmt = (v: number | null, digits = 1) => (v == null || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(v));
  const out: string[] = [];
  for (const c of row.checks) {
    const lim = def.limits.find((l) => l.key === c.key)!;
    const margin = c.value == null ? null : c.kind === 'max' ? c.bound - c.value : c.value - c.bound;
    const rel = c.value != null && c.bound !== 0 ? Math.abs(margin! / c.bound) * 100 : null;
    let head: string;
    const isInfo = c.severity === 'info';
    if (c.value == null) head = `${c.labelDe}: nicht prüfbar (Eingabe fehlt).`;
    else if (!c.ok && isInfo) head = `${c.labelDe} überschritten (nur Information, begrenzt das Fenster nicht): ${fmt(c.value)} ${c.unit} gegenüber ${c.bound} ${c.unit}.`;
    else if (!c.ok) head = `${c.labelDe} ist verletzt: ${fmt(c.value)} ${c.unit} gegenüber ${c.kind === 'max' ? 'höchstens' : 'mindestens'} ${c.bound} ${c.unit} (${fmt(Math.abs(margin!))} ${c.unit} ${c.kind === 'max' ? 'zu viel' : 'zu wenig'}).`;
    else if (c.near) head = `${c.labelDe} ist knapp erfüllt: ${fmt(c.value)} ${c.unit}, Reserve ${fmt(margin)} ${c.unit} (${fmt(rel, 0)} %).`;
    else head = `${c.labelDe} ist erfüllt: ${fmt(c.value)} ${c.unit}, Reserve ${fmt(margin)} ${c.unit} (${fmt(rel, 0)} %).`;
    const tail = [lim.quoteDe ? ` Regelwerk (${c.clause}): ${lim.quoteDe}` : ` (${c.clause})`, !c.ok && lim.leverDe ? ` Hebel: ${lim.leverDe}` : ''].join('');
    out.push(head + tail);
  }
  const v = def.variable;
  if (row.ok) {
    const ruleNear = row.checks.some((c) => c.severity === 'rule' && c.near);
    out.push(`Gesamt: ${v.symbol} = ${fmt(row.x)} ${v.unit} liegt im Bemessungsfenster${window.min != null ? ` (zulässig etwa ${fmt(window.min, 0)} bis ${fmt(window.max, 0)} ${v.unit} im Suchbereich)` : ''}; die Anwendungsgrenze des Einfachen Verfahrens und die Regelwerte der Tab. 14 sind eingehalten${ruleNear ? ' (ein Regelwert knapp)' : ''}.`);
  } else {
    const bad = row.checks.filter((c) => !c.ok && c.severity !== 'info').map((c) => c.key).join(', ');
    out.push(`Gesamt: ${v.symbol} = ${fmt(row.x)} ${v.unit} liegt außerhalb des Fensters (${bad})${window.min != null ? `; zulässig etwa ${fmt(window.min, 0)} bis ${fmt(window.max, 0)} ${v.unit}` : '; im Suchbereich erfüllt kein Wert alle Grenzen'}.`);
  }
  return out;
}

export const DESIGN_WINDOWS: Partial<Record<FacilityKey, WindowDef>> = {
  flaeche: FLAECHE, mulde: MULDE, rigole: RIGOLE, MRE, becken: BECKEN,
};

/** Worksheet code → facility key (DWA-A-138-1 chain). */
export const WINDOW_BY_WORKSHEET: Readonly<Record<string, FacilityKey>> = {
  'A138-16': 'flaeche', 'A138-17': 'mulde', 'A138-18': 'rigole', 'A138-19': 'MRE', 'A138-20': 'MRS', 'A138-21': 'schacht', 'A138-22': 'becken',
};

// ---------------------------------------------------------------- evaluation

function runChecks(def: WindowDef, d: DerivedValues): CheckResult[] {
  return def.limits.map((l) => {
    let v = d[l.on] ?? null;
    // Flächenversickerung: the Gl.-13 margin k_i / (r_D·10⁻⁷) is derived here from k_i_req.
    if (l.on === 'k_i_margin') v = d.k_i_req != null && d.k_i_req > 0 && typeof d.__k_i === 'number' ? d.__k_i / d.k_i_req : null;
    if (v == null || !Number.isFinite(v)) return { key: l.key, ok: false, near: false, value: null, bound: l.bound, kind: l.kind, unit: l.unit, labelDe: l.labelDe, clause: l.clause, severity: l.severity };
    const ok = l.kind === 'max' ? (l.strict ? v < l.bound : v <= l.bound) : (l.strict ? v > l.bound : v >= l.bound);
    const near = ok && Math.abs(v - l.bound) <= NEAR_FRACTION * l.bound;
    return { key: l.key, ok, near, value: v, bound: l.bound, kind: l.kind, unit: l.unit, labelDe: l.labelDe, clause: l.clause, severity: l.severity };
  });
}

function scanPoints(current: number, min: number): number[] {
  const base = Math.max(current, min);
  const pts = new Set<number>();
  for (const f of [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]) {
    const v = Math.round(base * f * 100) / 100;
    if (v >= min) pts.add(v);
  }
  return Array.from(pts).sort((a, b) => a - b);
}

export function evaluateDesignWindow(
  facility: FacilityKey,
  rows: RainRow[],
  scalars: Record<string, number | null | undefined>,
  current: number | null,
): WindowResult | { error: string } {
  const def = DESIGN_WINDOWS[facility];
  if (!def) return { error: `Kein Bemessungsfenster für ${facility} definiert (MRS: Drosselabfluss; Schacht: Gl. 34–38 folgen).` };
  const s: Record<string, number> = {};
  const missing: string[] = [];
  for (const k of def.requires) {
    const v = scalars[k];
    if (typeof v === 'number' && Number.isFinite(v)) s[k] = v; else missing.push(k);
  }
  if (missing.length) return { error: `Fehlende Eingaben: ${missing.join(', ')}` };
  for (const k of ['Q_Dr', 'f_A', 'A_VA', 'D_flaeche']) if (s[k] == null && typeof scalars[k] === 'number' && Number.isFinite(scalars[k] as number)) s[k] = scalars[k] as number;
  if (!rows.some((r) => r.D_min != null && r.D_min > 0 && r.r_D_n != null)) return { error: 'Keine Regenspenden für die Bemessungs-Wiederkehrzeit.' };

  const x0 = current != null && Number.isFinite(current) && current >= def.variable.min ? current : def.variable.min * 10;
  const evalAt = (x: number, isCurrent: boolean): WindowRow => {
    const d = def.evaluate(rows, s, x);
    if (facility === 'flaeche') d.__k_i = s.k_i;
    const checks = runChecks(def, d);
    delete d.__k_i;
    // info checks never gate the window (F-1)
    return { x, isCurrent, derived: d, checks, ok: checks.filter((c) => c.severity !== 'info').every((c) => c.ok) };
  };

  const steps = scanPoints(x0, def.variable.min).map((x) => evalAt(x, current != null && Math.abs(x - current) < 1e-9));
  const currentRow = current != null && Number.isFinite(current) && current >= def.variable.min ? evalAt(current, true) : null;
  const okXs = steps.filter((r) => r.ok).map((r) => r.x);

  // Chart: the per-duration curve at the current x, when the facility iterates.
  let curve: WindowResult['curve'] = null;
  let governingD: number | null = null;
  if (currentRow && facility !== 'flaeche') {
    const xs = currentRow.x;
    const Q_Dr = s.Q_Dr ?? 0;
    const sizing =
      facility === 'mulde' ? (D: number, r: number) => ((s.A_C + (typeof s.A_VA === 'number' ? s.A_VA : xs)) * 1e-7 * r - xs * s.k_i) * D * 60 * s.f_Z
      : facility === 'becken' ? (D: number, r: number) => ((s.A_C + s.A_VA) * 1e-7 * r - xs * s.k_i - Q_Dr * 1e-3) * D * 60 * s.f_Z * s.f_A
      : facility === 'rigole' ? (D: number, r: number) => (s.A_C * 1e-7 * r - s.b_R * s.h_R * s.k_i - Q_Dr * 1e-3) / ((s.b_R * s.h_R * s.s_R) / (D * 60 * s.f_Z) + (s.b_R + s.h_R) * s.k_i)
      : (D: number, r: number) => { const t = D * 60 * s.f_Z; return ((s.A_C + s.A_VA) * 1e-7 * r - s.b_R * s.h_R * s.k_i - s.V_M / t) / ((s.b_R * s.h_R * s.s_R) / t + (s.b_R + s.h_R) * s.k_i); };
    const g = iterateGoverningDuration(rows, sizing);
    curve = g.perDuration;
    governingD = g.governingD;
  }

  return {
    def, current: currentRow, steps,
    window: { min: okXs.length ? Math.min(...okXs) : null, max: okXs.length ? Math.max(...okXs) : null },
    curve, governingD,
  };
}
