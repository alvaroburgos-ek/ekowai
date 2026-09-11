/**
 * DWA-M 820-1 · Anhang A "Risikoanalyse" · Methodik S. 43 + Tab. A.1 (S. 44) /
 * Tab. A.2 (S. 46)
 * ───────────────────────────────────────────────────────────────────────────
 * The guideline prescribes a STRUCTURED, MULTI-PARTY project risk analysis:
 * risks are identified, described and rated "gemeinsam mit den wesentlichen
 * Projektbeteiligten (u. a. Bauherr, Planer, Betrieb) nach einheitlichen
 * Grundsätzen" (S. 43). This module encodes exactly what the printed pages
 * carry and nothing more:
 *
 *   - the risk GROUPS ("häufig auftretende Risikogruppen") and their printed
 *     example risks — a SEEDED, EXTENSIBLE picklist. The guideline itself says
 *     the list "muss in der Praxis … um projektspezifische Risiken ergänzt
 *     werden" (S. 44), so free entry is allowed alongside the seeds.
 *   - THREE assessors per risk — Bauherr, Planer, Betrieb (Tab. A.1) — each
 *     giving an Eintretenswahrscheinlichkeit (0–10) and a Schaden (0–10).
 *   - derived per dimension: M-Wert (arithmetic mean) and S-Abweichung —
 *     the SAMPLE standard deviation (n−1). Verified against the printed row
 *     "Einsprachen/Auflagen": prob {8,8,9} → M 8,3 / S 0,6; Schaden {2,2,2} →
 *     M 2,0 / S 0,0; Risiko {16,16,18} → M 16,7 / S 1,2. The population stdev
 *     would print 0,5 / 0,9 and is therefore ruled out by the table itself.
 *   - Risiko per assessor = Pᵢ × Iᵢ; Risiko M-Wert/S-Abw are the stats of the
 *     three PRODUCTS (Tab. A.1 structure), not the product of the means.
 *   - Maßnahmenplan per risk incl. Konsequenzen and Kompetenzregelung
 *     ("inklusive der Konsequenzen und der erforderlichen Kompetenzregelungen
 *     im Fall des Eintretens", S. 43; Tab. A.2).
 *
 * NOT encoded because the guideline does not print it (never invent — SR-2):
 *   - any "high priority" score band / threshold. Tab. A.1 prints only three
 *     EXAMPLE score values (0/25/100), not band boundaries.
 *   - any numeric cutoff for "stark unterschiedliche Risikoeinschätzungen"
 *     (S. 43). `hasDivergence` is a FACTUAL non-unanimity indicator
 *     (S-Abweichung > 0) used as a display aid only — it flags that the
 *     assessors did not agree, it does NOT classify the disagreement as
 *     large; the S-Abw value itself is surfaced for the engineer to judge.
 */

/* ── Assessors (Tab. A.1 / S. 43) ─────────────────────────────────────────── */

export const ASSESSORS = ['bauherr', 'planer', 'betrieb'] as const;
export type AssessorKey = (typeof ASSESSORS)[number];

export const ASSESSOR_LABELS: Record<AssessorKey, string> = {
  bauherr: 'Bauherr',
  planer: 'Planer',
  betrieb: 'Betrieb',
};

/** One assessor's rating of one risk: Eintretenswahrscheinlichkeit + Schaden. */
export type AssessorRating = {
  /** Eintretenswahrscheinlichkeit — integer 0–10 (anchors 0/5/10). null = unset. */
  probability: number | null;
  /** Schaden (Auswirkung) — integer 0–10 (anchors 0/5/10). null = unset. */
  impact: number | null;
};

/** One row of the project risk register (one identified risk). */
export type RiskEntry = {
  id: string;
  /** Risikogruppe — one of RISK_GROUPS[].group, or a project-specific label. */
  group: string;
  /** Short name of the risk. Seeded from the group's printed examples; free
   * text allowed per "um projektspezifische Risiken ergänzt" (S. 44). */
  risk: string;
  /** Project-specific DESCRIPTION of the risk (distinct from the short name). */
  description: string;
  /** Per-assessor ratings (Tab. A.1: Bauherr / Planer / Betrieb). */
  ratings: Record<AssessorKey, AssessorRating>;
  /** true when this row was migrated from the legacy single-value shape: the
   * old single probability/impact was replicated to ALL THREE assessors, so
   * M-Wert is preserved but S-Abw = 0 does NOT represent a real consensus.
   * The editor clears the flag on the first rating edit. */
  migratedFromSingle: boolean;
};

export type RiskRegisterCarrier = {
  rows: RiskEntry[];
};

/* ── Scales (Tab. A.1, verbatim anchors) ──────────────────────────────────── */

export const PROBABILITY_MIN = 0;
export const PROBABILITY_MAX = 10;
export const PROBABILITY_ANCHORS: Record<number, string> = {
  0: 'Risikofall tritt nicht ein (kein Eintritt)',
  5: 'Risiko kann eintreten',
  10: 'Hohe Wahrscheinlichkeit (tritt ein)',
};

export const IMPACT_MIN = 0;
export const IMPACT_MAX = 10;
export const IMPACT_ANCHORS: Record<number, string> = {
  0: 'Keine Auswirkungen',
  5: 'Mittlere Auswirkungen, Betriebsstörung',
  10: 'Große Auswirkungen, Katastrophe',
};

/** Risiko score labels — three printed EXAMPLE points (Tab. A.1), NOT band
 * boundaries. Used for an informative label at exact matches only. */
export const SCORE_EXAMPLE_LABELS: Record<number, string> = {
  0: 'Kein Risiko',
  25: 'Mittleres Risiko',
  100: 'Sehr großes Risiko',
};

/* ── Risk groups (Tab. A.1, verbatim; seed list, extensible) ──────────────── */

export const RISK_GROUPS: ReadonlyArray<{ group: string; examples: readonly string[] }> = [
  {
    group: 'Rahmenbedingungen des Projekts',
    examples: [
      'Neue Anforderungen / Bestimmungen',
      'Finanzierung nicht gesichert (z. B. Budgetrestriktion)',
      'Jahreskosten zu hoch (Vorgaben überschritten)',
    ],
  },
  {
    group: 'Projektumfeld',
    examples: [
      'Einsprachen / Auflagen (Vergaben, Baubewilligung etc.)',
      'Betroffenheit Anwohner (z. B. Lärm/Geruch, Akzeptanz, Verkehr)',
      'Konflikte mit anderen internen oder externen Projekten (Kapazitäten Bauherr / Betrieb)',
      'Erschließung nicht oder ungenügend vorhanden (Strom, Zufahrt etc.)',
    ],
  },
  {
    group: 'Umwelt, Ökologie',
    examples: [
      'Altlasten / Schadstoffe / Kampfmittel',
      'Pflanzen und Tiere (Amphibien, Vögel, Bäume etc.)',
      'Projekt hat Auswirkungen auf Umwelt (z. B. Emissionen, Schutzzonen, Verkehr)',
      'Bestehende Bausubstanz schwierig oder ungenügend bekannt',
      'Baugrund / Grundwasserverhältnisse / Hochwasserrisiko unsicher',
    ],
  },
  {
    group: 'Rechtliche Aspekte',
    examples: [
      'Verträge, Vertragsmängel, Grundlasten, Werkverträge',
      'Gesetze und Vorschriften nicht bekannt oder unvollständig berücksichtigt (Sicherheit)',
      'Bewilligungsverfahren / Zonenvorschriften nicht korrekt angewendet',
      'Behörden nicht vororientiert rsp. orientiert',
      'Schriftliche Nachweise fehlen',
    ],
  },
  {
    group: 'Projektvorgaben',
    examples: [
      'Kostenverfolgung (Teuerungen, Budget, Investitionskosten)',
      'Einhalten von Auflagen, Normen, Bewilligungen, Materialvorschriften',
      'Projektziele und Anforderungen nicht eindeutig festgelegt',
      'Qualitätsanforderungen ungenügend definiert',
      'Kosten-/Leistungsvorgaben unklar (z. B. Sanierungen, Redundanzen)',
    ],
  },
  {
    group: 'Beteiligte und Betroffene',
    examples: [
      'Widerstand von Nachbarn',
      'Betreiber nur ungenügend einbezogen',
      'Schlüsselpositionen schwach besetzt, mangelnde Erfahrung oder Kapazitäten fehlen (beim Auftragnehmer und/oder Auftraggeber)',
      'Personalwechsel in den Schlüsselpositionen, Abhängigkeit von Einzelpersonen oder Ausfall von Schlüsselpersonen',
      'Ungenügendes oder fehlendes Qualitätsmanagement von Beteiligten',
    ],
  },
  {
    group: 'Betrieb',
    examples: [
      'Betriebsstörungen während Betrieb, Provisorien (Umweltschäden)',
      'Betriebsdokumentation unvollständig',
      'Beeinträchtigung durch Erschütterung, Lärm, Staub usw.',
      'Betrieb lässt nur eingeschränkte Arbeitsfenster zu, Verzögerung',
    ],
  },
  {
    group: 'Projektorganisation',
    examples: [
      'Projektkomplexität, Koordination, Organisation, Zuständigkeiten unklar (Abhängigkeit)',
      'Ungenügende Kommunikation (zeitlich, Stufe)',
      'Viele Beteiligte, viele Nahtstellen = Entscheidungswege lang (Missverständnisse etc.)',
      'Informationsfluss nicht geregelt',
    ],
  },
  {
    group: 'Projektablauf',
    examples: [
      'Termine können nicht eingehalten werden, Bauverzögerungen, Lieferfristen nicht genügend berücksichtigt',
      'Insolvenz (Lieferanten, Planer, Unternehmer etc.)',
    ],
  },
  {
    group: 'Technik',
    examples: [
      'Nutzwert falsch geschätzt',
      'Technologien neuartig oder komplex',
      'Besondere Beanspruchungen nicht richtig eingeschätzt oder Materialien falsch gewählt',
      'Schulungs- und Einführungsaufwand ungenügend (Zeitpunkt, Schulungstiefe, Schulungsinhalte)',
    ],
  },
  {
    group: 'Sicherheit',
    examples: [
      'Schäden extern (Infrastrukturen, Ver- und Entsorgungsleitungen, Nachbargebäude etc.)',
      'Sicherheit (CE-Konformität, Mitarbeitende, Anwohner/Besucher, Umwelt, Arbeitssicherheit)',
      'Bauzustände, Baumethoden risikoreich',
      'Sensible Anlagen und Bauten im Nachbarbereich',
      'Wassergefährdende Flüssigkeiten im Nahbereich',
    ],
  },
];

/** All group labels, in printed order. */
export const RISK_GROUP_LABELS: readonly string[] = RISK_GROUPS.map((g) => g.group);

/* ── Row construction / parsing ───────────────────────────────────────────── */

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyRatings(): Record<AssessorKey, AssessorRating> {
  return {
    bauherr: { probability: null, impact: null },
    planer: { probability: null, impact: null },
    betrieb: { probability: null, impact: null },
  };
}

export function newRiskEntry(): RiskEntry {
  return {
    id: newId(),
    group: '',
    risk: '',
    description: '',
    ratings: emptyRatings(),
    migratedFromSingle: false,
  };
}

function clampScale(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const r = Math.round(v);
  if (r < min || r > max) return null;
  return r;
}

function parseRating(raw: unknown): AssessorRating {
  if (!raw || typeof raw !== 'object') return { probability: null, impact: null };
  const r = raw as Partial<AssessorRating>;
  return {
    probability: clampScale(r.probability, PROBABILITY_MIN, PROBABILITY_MAX),
    impact: clampScale(r.impact, IMPACT_MIN, IMPACT_MAX),
  };
}

/**
 * Parse any stored value into a well-formed carrier. Defensive against legacy
 * free-text blobs, partial rows, and the PREVIOUS single-value row shape
 * ({probability, impact} at top level, no `ratings`).
 *
 * Legacy migration policy (deliberate, disclosed): the old single value is
 * replicated to ALL THREE assessors and the row is flagged
 * `migratedFromSingle`. This preserves the M-Wert exactly and loses no data,
 * but its S-Abweichung of 0 is an artifact of the migration, not a real
 * consensus — which is exactly what the flag tells the UI to say. Mapping the
 * value to a single named assessor instead would fabricate an attribution
 * nobody made. Unknown shapes → empty register.
 */
export function normalizeRiskCarrier(value: unknown): RiskRegisterCarrier {
  if (!value || typeof value !== 'object') return { rows: [] };
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return { rows: [] };
  const rows: RiskEntry[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;

    let ratings: Record<AssessorKey, AssessorRating>;
    let migratedFromSingle = false;

    if (r.ratings && typeof r.ratings === 'object') {
      const rr = r.ratings as Record<string, unknown>;
      ratings = {
        bauherr: parseRating(rr.bauherr),
        planer: parseRating(rr.planer),
        betrieb: parseRating(rr.betrieb),
      };
      migratedFromSingle = r.migratedFromSingle === true;
    } else {
      // Legacy single-value row shape.
      const p = clampScale(r.probability, PROBABILITY_MIN, PROBABILITY_MAX);
      const i = clampScale(r.impact, IMPACT_MIN, IMPACT_MAX);
      ratings = {
        bauherr: { probability: p, impact: i },
        planer: { probability: p, impact: i },
        betrieb: { probability: p, impact: i },
      };
      migratedFromSingle = p != null || i != null;
    }

    rows.push({
      id: typeof r.id === 'string' && r.id.length > 0 ? r.id : newId(),
      group: typeof r.group === 'string' ? r.group : '',
      risk: typeof r.risk === 'string' ? r.risk : '',
      description: typeof r.description === 'string' ? r.description : '',
      ratings,
      migratedFromSingle,
    });
  }
  return { rows };
}

/* ── Derivations (Tab. A.1: M-Wert + S-Abweichung) ────────────────────────── */

export type SampleStats = {
  /** Arithmetic mean ("M-Wert"), or null when no values are present. */
  mean: number | null;
  /** SAMPLE standard deviation, divisor n−1 ("S-Abweichung"); null when n<2.
   * Verified against Tab. A.1: {8,8,9}→0,6 · {2,2,2}→0,0 · {16,16,18}→1,2. */
  sdev: number | null;
  /** Number of values that entered the statistics. */
  n: number;
};

export function sampleStats(values: readonly number[]): SampleStats {
  const n = values.length;
  if (n === 0) return { mean: null, sdev: null, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sdev: null, n };
  const ss = values.reduce((a, x) => a + (x - mean) * (x - mean), 0);
  return { mean, sdev: Math.sqrt(ss / (n - 1)), n };
}

function collectDimension(
  entry: Pick<RiskEntry, 'ratings'>,
  dim: keyof AssessorRating,
): number[] {
  const out: number[] = [];
  for (const a of ASSESSORS) {
    const v = entry.ratings[a][dim];
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

/** M-Wert + S-Abweichung of the Eintretenswahrscheinlichkeit over the assessors. */
export function probabilityStats(entry: Pick<RiskEntry, 'ratings'>): SampleStats {
  return sampleStats(collectDimension(entry, 'probability'));
}

/** M-Wert + S-Abweichung of the Schaden over the assessors. */
export function impactStats(entry: Pick<RiskEntry, 'ratings'>): SampleStats {
  return sampleStats(collectDimension(entry, 'impact'));
}

/** Risiko per assessor = Pᵢ × Iᵢ, or null when that assessor's pair is
 * incomplete (Tab. A.1: the Risiko column is per-assessor). */
export function riskProducts(
  entry: Pick<RiskEntry, 'ratings'>,
): Record<AssessorKey, number | null> {
  const out = {} as Record<AssessorKey, number | null>;
  for (const a of ASSESSORS) {
    const { probability, impact } = entry.ratings[a];
    out[a] = probability != null && impact != null ? probability * impact : null;
  }
  return out;
}

/** M-Wert + S-Abweichung of the per-assessor Risiko PRODUCTS (Tab. A.1
 * structure — mean of the products, never the product of the means). */
export function riskStats(entry: Pick<RiskEntry, 'ratings'>): SampleStats {
  const products = Object.values(riskProducts(entry)).filter(
    (v): v is number => v != null,
  );
  return sampleStats(products);
}

/**
 * Factual non-unanimity indicator: true iff any of the three S-Abweichungen
 * (probability / impact / Risiko) is > 0, i.e. the assessors did not give
 * identical values. DISPLAY AID ONLY — the guideline (S. 43) demands engaging
 * with "stark unterschiedlichen Risikoeinschätzungen" but prints NO numeric
 * cutoff for "stark"; this flag therefore never classifies magnitude, it only
 * reports disagreement-vs-unanimity. The S-Abw values themselves are shown.
 */
export function hasDivergence(entry: Pick<RiskEntry, 'ratings'>): boolean {
  return (
    (probabilityStats(entry).sdev ?? 0) > 0 ||
    (impactStats(entry).sdev ?? 0) > 0 ||
    (riskStats(entry).sdev ?? 0) > 0
  );
}

/** A row is complete when it names a risk and ALL THREE assessors have rated
 * both dimensions (the full Tab. A.1 row). Mitigation/Konsequenz/Kompetenz are
 * required in practice (S. 43, Tab. A.2) but tracked separately so an
 * in-progress row still counts as an identified risk. */
export function isRiskRowComplete(row: RiskEntry): boolean {
  return (
    row.risk.trim().length > 0 &&
    ASSESSORS.every(
      (a) => row.ratings[a].probability != null && row.ratings[a].impact != null,
    )
  );
}

/* ── Register aggregates (derived — never hand-entered) ───────────────────── */

export type RiskRegisterSummary = {
  /** Total identified risks (rows that name a risk). */
  count: number;
  /** Rows with a computable Risiko M-Wert (≥1 assessor rated both dimensions). */
  assessed: number;
  /** Rows rated by all three assessors in both dimensions. */
  fullyAssessed: number;
  /** Maximum Risiko M-Wert across assessed rows, or null. */
  maxScore: number | null;
  /** Mean of the Risiko M-Werte across assessed rows, or null. */
  meanScore: number | null;
  /** Largest Risiko S-Abweichung across rows (null when none computable).
   * Surfaced so divergence is visible; NOT compared to any threshold. */
  maxDivergence: number | null;
};

export function summarizeRiskRegister(carrier: RiskRegisterCarrier): RiskRegisterSummary {
  const named = carrier.rows.filter((r) => r.risk.trim().length > 0);
  const means: number[] = [];
  let fullyAssessed = 0;
  let maxDivergence: number | null = null;
  for (const r of named) {
    const rs = riskStats(r);
    if (rs.mean != null) means.push(rs.mean);
    if (rs.n === ASSESSORS.length) fullyAssessed++;
    if (rs.sdev != null) {
      maxDivergence = maxDivergence == null ? rs.sdev : Math.max(maxDivergence, rs.sdev);
    }
  }
  return {
    count: named.length,
    assessed: means.length,
    fullyAssessed,
    maxScore: means.length ? Math.max(...means) : null,
    meanScore: means.length ? means.reduce((a, b) => a + b, 0) / means.length : null,
    maxDivergence,
  };
}