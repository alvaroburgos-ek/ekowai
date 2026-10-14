/**
 * C-9 (2026-10-14, sign-off 64_ / ruling R-11): the conformity and progress documents list the phases not reached yet
 * and the duties (gates) that were therefore NOT checked — a declaration covers only the phases marked reached.
 *
 * Rule (generic, no per-standard list):
 *  - a PHASE DRIVER is a boolean field whose symbol matches `phase_<name>_erreicht` (the encoding convention introduced
 *    with DWA-M 820-2 block 20261008100000: `phase_ausfuehrung_erreicht`, `phase_inbetriebnahme_erreicht`,
 *    `phase_gewaehrleistung_erreicht`). A future encoding that wants this listing names its driver the same way.
 *  - a phase is NOT REACHED when its driver is answered `false` on a sheet where it is visible (hidden or unanswered
 *    drivers are not listed: nothing was declared).
 *  - a gate was NOT CHECKED BECAUSE OF the driver when its verdict is a guard-skipped pass and the definitely-false
 *    guard on its top guard chain reads the driver (`conditionSkippedBy`). A gate skipped by an outer guard (LPH 8
 *    „entfällt", no construction award) is not attributed to the phase.
 * Display only — no verdict, no gate, no count changes.
 *
 * DWA-M 820-3 has no such driver: its „Phase noch nicht erreicht" is a per-goal enum token (`noch_nicht_erreicht`)
 * that the gates accept and the REQ-xx-3 warnings already report, so nothing is listed for it here.
 */

const PHASE_DRIVER_RE = /^phase_[a-z0-9_]+_erreicht$/;

export function isPhaseDriver(f: { symbol: string; dataType: string }): boolean {
  return f.dataType === 'boolean' && PHASE_DRIVER_RE.test(f.symbol);
}

export type PhaseDriverInput = {
  worksheetCode: string;
  symbol: string;
  labelDe: string;
  labelEn?: string | null;
  dataType: string;
  value: unknown;
  /** Hidden by visible_when on its sheet (then it declares nothing). */
  hidden: boolean;
};

export type PhaseGateInput = {
  worksheetCode: string;
  code: string;
  titleDe: string;
  titleEn?: string | null;
  severity: string;
  /** Symbols of the guard that made the gate's pass vacuous ([] = really checked / not guard-skipped). */
  skippedBy: readonly string[];
};

export type PhaseDeferral = {
  worksheetCode: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  gates: Array<{ worksheetCode: string; code: string; titleDe: string; titleEn: string | null; severity: string }>;
};

/** Phases answered „not reached" (first sheet that shows the driver), each with the gates its guard skipped. */
export function collectPhaseDeferrals(drivers: readonly PhaseDriverInput[], gates: readonly PhaseGateInput[]): PhaseDeferral[] {
  const out: PhaseDeferral[] = [];
  const seen = new Set<string>();
  for (const d of drivers) {
    if (!isPhaseDriver(d) || d.hidden || d.value !== false || seen.has(d.symbol)) continue;
    seen.add(d.symbol);
    out.push({
      worksheetCode: d.worksheetCode,
      symbol: d.symbol,
      labelDe: d.labelDe,
      labelEn: d.labelEn ?? null,
      gates: gates
        .filter((g) => g.skippedBy.includes(d.symbol))
        .map((g) => ({ worksheetCode: g.worksheetCode, code: g.code, titleDe: g.titleDe, titleEn: g.titleEn ?? null, severity: g.severity })),
    });
  }
  return out;
}

export type PhaseDeferralText = {
  headingDe: string;
  headingEn: string;
  introDe: string;
  introEn: string;
  items: Array<{ de: string; en: string }>;
};

/** The DE / EN document text (shared by the conformity declaration, the checklist, the report and the Prüf-Memo). */
export function phaseDeferralLines(deferrals: readonly PhaseDeferral[]): PhaseDeferralText {
  return {
    headingDe: 'Noch nicht erreichte Phasen — nicht geprüft',
    headingEn: 'Phases not reached yet — not checked',
    introDe:
      'Die folgenden Phasen sind als „noch nicht erreicht“ beantwortet. Die daran gebundenen Pflichten wurden nicht geprüft; diese Unterlage deckt nur die als erreicht markierten Phasen ab. Sobald eine Phase erreicht ist, wird sie auf „Ja“ gesetzt und das Arbeitsblatt erneut eingereicht.',
    introEn:
      'The following phases are answered “not reached yet”. The duties tied to them were not checked; this document covers only the phases marked reached. Once a phase is reached, it is set to “Yes” and the worksheet is submitted again.',
    items: deferrals.map((d) => {
      const gatesDe = d.gates.map((g) => `${g.worksheetCode} ${g.code} (${g.severity}) ${g.titleDe}`).join('; ');
      const gatesEn = d.gates.map((g) => `${g.worksheetCode} ${g.code} (${g.severity}) ${g.titleEn ?? g.titleDe}`).join('; ');
      return {
        de: `${d.worksheetCode} · ${d.labelDe} = Nein — ${gatesDe ? `nicht geprüft: ${gatesDe}` : 'keine daran gebundene Prüfung'}`,
        en: `${d.worksheetCode} · ${d.labelEn ?? d.labelDe} = No — ${gatesEn ? `not checked: ${gatesEn}` : 'no check tied to it'}`,
      };
    }),
  };
}
