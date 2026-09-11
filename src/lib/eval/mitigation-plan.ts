/**
 * DWA-M 820-1 · Anhang A · Tabelle A.2 "Beispiel für den Aufbau eines
 * Risiko-Maßnahmenplans" (S. 46) — the measure plan that Tab. A.1's risk
 * analysis feeds into (S. 44: "muss in der Praxis um eine Spalte
 * 'Präventions- und Korrekturmaßnahmen' ergänzt werden … siehe Tabelle A.2").
 * ───────────────────────────────────────────────────────────────────────────
 * Per risk, Tab. A.2 prints a plan card with:
 *   - Risiko (id + name) and its Wert (the Risiko score from the analysis),
 *   - Risikokategorie / -bereich (one of the Tab. A.1 groups),
 *   - Schäden, Gefährdungsbilder (+ a Bemerkung/status line),
 *   - a list of Maßnahmen, each classified by TYPE — verbatim legend:
 *       "Maßnahmen: (Technische = T / Organisatorische = O / Personelle = P)"
 *     and each carrying a Verantwortung / Durchführen / Überwachung assignment
 *     (the p. 43 Kompetenzregelung: who decides, who executes, who monitors).
 *
 * This module encodes exactly that structure. The Risikokategorie options are
 * the same printed Risikogruppen as the risk register (Tab. A.1) — imported from
 * risk-register.ts so the two worksheets share one guideline source, never a
 * re-typed copy. Never invent a measure type or category the guideline does not
 * print (SR-2).
 */
import { RISK_GROUP_LABELS } from './risk-register';

export { RISK_GROUP_LABELS };

/** Maßnahmen-Typ — verbatim Tab. A.2 legend (T / O / P). */
export const MEASURE_TYPES = ['T', 'O', 'P'] as const;
export type MeasureType = (typeof MEASURE_TYPES)[number];
export const MEASURE_TYPE_LABELS: Record<MeasureType, string> = {
  T: 'Technische Maßnahme',
  O: 'Organisatorische Maßnahme',
  P: 'Personelle Maßnahme',
};

/** One measure within a risk's plan. */
export type Measure = {
  id: string;
  /** T / O / P (Tab. A.2). null = unset. */
  type: MeasureType | null;
  /** The measure text (Präventions-/Korrekturmaßnahme). */
  text: string;
  /** Kompetenzregelung columns (Tab. A.2 / S. 43). */
  verantwortung: string;
  durchfuehren: string;
  ueberwachung: string;
};

/** One risk's measure plan (a Tab. A.2 card). */
export type RiskMeasurePlan = {
  id: string;
  /** Risk name/id (e.g. "Altlasten / Findlinge / Schadstoffe"). */
  risiko: string;
  /** Risikokategorie / -bereich — one of RISK_GROUP_LABELS, or project-specific. */
  risikokategorie: string;
  /** Wert: the Risiko score carried over from the analysis (Tab. A.1). */
  wert: number | null;
  /** Schäden (damages). */
  schaeden: string;
  /** Gefährdungsbilder (hazard scenarios / description). */
  gefaehrdungsbilder: string;
  /** Bemerkung / Bearbeitungsstand (e.g. "zu 50 % erledigt"). */
  bemerkung: string;
  measures: Measure[];
};

export type MitigationPlanCarrier = { plans: RiskMeasurePlan[] };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newMeasure(): Measure {
  return { id: newId(), type: null, text: '', verantwortung: '', durchfuehren: '', ueberwachung: '' };
}

export function newPlan(): RiskMeasurePlan {
  return {
    id: newId(),
    risiko: '',
    risikokategorie: '',
    wert: null,
    schaeden: '',
    gefaehrdungsbilder: '',
    bemerkung: '',
    measures: [],
  };
}

function parseMeasure(raw: unknown): Measure {
  if (!raw || typeof raw !== 'object') return newMeasure();
  const r = raw as Partial<Measure>;
  const type = r.type === 'T' || r.type === 'O' || r.type === 'P' ? r.type : null;
  return {
    id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId(),
    type,
    text: typeof r.text === 'string' ? r.text : '',
    verantwortung: typeof r.verantwortung === 'string' ? r.verantwortung : '',
    durchfuehren: typeof r.durchfuehren === 'string' ? r.durchfuehren : '',
    ueberwachung: typeof r.ueberwachung === 'string' ? r.ueberwachung : '',
  };
}

/** Parse any stored value into a well-formed carrier (defensive against legacy
 * free-text blobs or partial rows). Unknown shapes → empty plan. */
export function normalizeMitigationCarrier(value: unknown): MitigationPlanCarrier {
  if (!value || typeof value !== 'object') return { plans: [] };
  const v = value as { plans?: unknown };
  if (!Array.isArray(v.plans)) return { plans: [] };
  const plans: RiskMeasurePlan[] = [];
  for (const raw of v.plans) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<RiskMeasurePlan> & { measures?: unknown };
    const wert =
      typeof r.wert === 'number' && Number.isFinite(r.wert) ? r.wert : null;
    plans.push({
      id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId(),
      risiko: typeof r.risiko === 'string' ? r.risiko : '',
      risikokategorie: typeof r.risikokategorie === 'string' ? r.risikokategorie : '',
      wert,
      schaeden: typeof r.schaeden === 'string' ? r.schaeden : '',
      gefaehrdungsbilder: typeof r.gefaehrdungsbilder === 'string' ? r.gefaehrdungsbilder : '',
      bemerkung: typeof r.bemerkung === 'string' ? r.bemerkung : '',
      measures: Array.isArray(r.measures) ? r.measures.map(parseMeasure) : [],
    });
  }
  return { plans };
}

export type MitigationPlanSummary = {
  /** Number of risk plans (plans that name a risk). */
  planCount: number;
  /** Total measures across all plans (derived — never hand-entered). */
  measureCount: number;
  /** Measure count by type T / O / P. */
  byType: Record<MeasureType, number>;
  /** Plans that name a risk but carry no measure yet. */
  plansWithoutMeasure: number;
  /** Measures still missing a Verantwortung (Kompetenzregelung, S. 43). */
  measuresWithoutOwner: number;
};

export function summarizeMitigationPlan(carrier: MitigationPlanCarrier): MitigationPlanSummary {
  const named = carrier.plans.filter((p) => p.risiko.trim().length > 0);
  const byType: Record<MeasureType, number> = { T: 0, O: 0, P: 0 };
  let measureCount = 0;
  let plansWithoutMeasure = 0;
  let measuresWithoutOwner = 0;
  for (const p of named) {
    const realMeasures = p.measures.filter((m) => m.text.trim().length > 0);
    if (realMeasures.length === 0) plansWithoutMeasure++;
    for (const m of realMeasures) {
      measureCount++;
      if (m.type) byType[m.type]++;
      if (m.verantwortung.trim().length === 0) measuresWithoutOwner++;
    }
  }
  return { planCount: named.length, measureCount, byType, plansWithoutMeasure, measuresWithoutOwner };
}
