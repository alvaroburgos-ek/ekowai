/**
 * DWA-A 138-1 — materialize the single-sourced mean infiltration area A_S,m.
 *
 * Pure / DB-free. Given the active determination method + its inputs, returns
 * the flat A_S_m value to persist on A138-12 and a discriminated AsmState. The
 * server (worksheet.ts) supplies inputs and persists the outputs; consumers read
 * A_S_m by reference and never see the method.
 */
import {
  type AsmMethod, type FacilityType, type Tab13Bodenart, type AsmState,
  resolveAsmProducer, computeDirect, computeSoilEstimate,
} from './asm-source';
import type { FacilityType as SummaryFacilityType } from './phase4-summary';
import { iterateGoverningDuration } from './governing-duration';

/**
 * A-2: Mulde Gl.16 is iterative over Dauerstufen. Evaluate
 *   A_S,m(D,r_D) = (A_C·1e-7·r_D) / (h_M/(D·60·f_Z) + k_i)
 * at each tabulated (D, r_D(n)) and take the GOVERNING = maximum required area.
 * Reuses Piece-A's iterateGoverningDuration engine.
 */
export function computeMuldeGeometrySweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; h_M: number; f_Z: number; k_i: number },
): { A_S_m: number | null; governingD: number | null; boundaryLimited: boolean } {
  const gov = iterateGoverningDuration(rows, (D, r_D) =>
    (scalars.A_C * 1e-7 * r_D) / (scalars.h_M / (D * 60 * scalars.f_Z) + scalars.k_i),
  );
  return { A_S_m: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

/**
 * §6.4.2 Gl.21 (exact) / Gl.22 (thin-wall) — SERVER compute of the Rigole storage
 * coefficient s_R. Pure.
 *
 *   Gl.21:  s_R = (s_F/(b_R·h_R)) · [ b_R·h_R + az·(π/4)·( (1/s_F)·d_i² − d_a² ) ]
 *   Gl.22:  s_R = (s_F/(b_R·h_R)) · [ b_R·h_R + az·(π·d²/4)·( (1/s_F) − 1 ) ]   (d ≈ d_i ≈ d_a)
 *
 * When az (embedded-pipe count) is 0/absent the pipe term vanishes → s_R = s_F.
 * Gl.21 is the default (exact); Gl.22 is used only when the engineer flags
 * thin-wall pipes. Returns null when a required input is missing/non-finite.
 */
export function computeRigoleStorageCoefficient(inputs: {
  s_F: number | null;
  b_R: number | null;
  h_R: number | null;
  az: number | null;
  d_i: number | null;
  d_a: number | null;
  /** true → Gl.22 thin-wall (d ≈ d_i); default false → Gl.21 exact. */
  thinWall?: boolean;
}): number | null {
  const { s_F, b_R, h_R } = inputs;
  if (s_F == null || b_R == null || h_R == null) return null;
  if (![s_F, b_R, h_R].every(Number.isFinite)) return null;
  if (b_R === 0 || h_R === 0 || s_F === 0) return null;
  const az = inputs.az != null && Number.isFinite(inputs.az) ? inputs.az : 0;
  const bhr = b_R * h_R;
  if (az === 0) {
    // No embedded pipes → the bracket collapses to b_R·h_R → s_R = s_F.
    return s_F;
  }
  if (inputs.thinWall) {
    const d = inputs.d_i;
    if (d == null || !Number.isFinite(d)) return null;
    // Gl.22: pipe term az·(π·d²/4)·(1/s_F − 1).
    const pipeTerm = az * ((Math.PI * d * d) / 4) * (1 / s_F - 1);
    return (s_F / bhr) * (bhr + pipeTerm);
  }
  const d_i = inputs.d_i;
  const d_a = inputs.d_a;
  if (d_i == null || d_a == null || !Number.isFinite(d_i) || !Number.isFinite(d_a)) return null;
  // Gl.21: pipe term az·(π/4)·((1/s_F)·d_i² − d_a²).
  const pipeTerm = az * (Math.PI / 4) * ((1 / s_F) * d_i * d_i - d_a * d_a);
  return (s_F / bhr) * (bhr + pipeTerm);
}

/**
 * §6.7.2 Gl.37 — SERVER sweep of the governing shaft design head h_S.
 *
 *   h_S(D,r_D) = ( A_C·1e-7·r_D − (π·d_a²/4)·k_i )
 *              / ( π·d_i²/(4·D·60·f_Z) + d_a·π·k_i/2 )
 *
 * Iterate over the tabulated (D, r_D) rows and take the GOVERNING = maximum required
 * head (mirrors the Mulde sweep). Returns { h_S, governingD }. Gl.36 then gives the
 * geometric volume V_S = π·d_i²/4·h_S at that governing head.
 */
export function computeSchachtHeadSweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; d_a: number; d_i: number; k_i: number; f_Z: number },
): { h_S: number | null; governingD: number | null; boundaryLimited: boolean } {
  const { A_C, d_a, d_i, k_i, f_Z } = scalars;
  const gov = iterateGoverningDuration(rows, (D, r_D) => {
    const numerator = A_C * 1e-7 * r_D - (Math.PI * d_a * d_a) / 4 * k_i;
    const denominator = (Math.PI * d_i * d_i) / (4 * D * 60 * f_Z) + (d_a * Math.PI * k_i) / 2;
    if (denominator === 0) return null;
    return numerator / denominator;
  });
  return { h_S: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

/**
 * Finding F — the facility GOVERNING STORAGE VOLUME rule (pure).
 *
 * The geometry sweep (server-side) yields the footprint A_S_m / a governing head;
 * the governing storage volume is derived and MUST be persisted onto the facility
 * worksheet's volume field so the A138-23 summary can read it (engine-output-
 * materialization gap fix).
 *
 * Source-verified per facility (DWA-A 138-1):
 *   mulde   → V_M  = A_S,m · h_M                         (§6.3.2 Gl.15)
 *   rigole  → V_R  = b_R · h_R · L_R · s_R               (§6.4.2 Gl.20; s_R via Gl.21/22)
 *   mre     → V_MR = V_M + V_R                           (§6.5.2 Gl.26)  [cross-ws sum]
 *   schacht → V_S  = π · d_i²/4 · h_S                    (§6.7.2 Gl.36; h_S swept via Gl.37)
 *   becken  → V_B  = Gl.41 governing sweep               (§6.8.2 Gl.41)  [server-provided]
 *   flaeche → none (area device, §6.2.2 Gl.12 A_S is an area)
 *   mrs     → V_MR = V_M + V_R                           (§6.6.2: "analog zur Bemessung von
 *             Mulden-Rigolen-Elementen (siehe 6.5.2)" → Gl.26; V_MÜ (Gl.30) is the swale
 *             OVERFLOW volume that sizes the overflow outlet Q_MÜ (Gl.31), never the storage)
 *
 * @returns the governing volume, or null when an input is missing / non-finite / the
 *   facility's rule is excluded.
 */
export type FacilityGoverningVolumeInputs = {
  /** Governing footprint from the sweep (A_S,m). */
  A_S_m: number | null;
  /** Mulde depth h_M. */
  h_M: number | null;
  // ── Rigole (Gl.20) ──
  b_R?: number | null;
  h_R?: number | null;
  L_R?: number | null;
  s_R?: number | null;
  // ── MRE (Gl.26) — persisted component volumes ──
  V_M?: number | null;
  V_R?: number | null;
  // ── Schacht (Gl.36) — inner diameter + swept governing head ──
  d_i?: number | null;
  h_S?: number | null;
  // ── Becken (Gl.41) — server-provided governing volume (from the Gl.41 sweep) ──
  V_B_governing?: number | null;
};

export function facilityGoverningVolume(
  facilityType: SummaryFacilityType,
  inputs: FacilityGoverningVolumeInputs,
): number | null {
  const finite = (x: number | null | undefined): x is number =>
    x != null && Number.isFinite(x);
  switch (facilityType) {
    case 'mulde': {
      const { A_S_m, h_M } = inputs;
      if (!finite(A_S_m) || !finite(h_M)) return null;
      // Gl.15: V_M = A_S,m · h_M.
      return A_S_m * h_M;
    }
    case 'rigole': {
      const { b_R, h_R, L_R, s_R } = inputs;
      if (!finite(b_R) || !finite(h_R) || !finite(L_R) || !finite(s_R)) return null;
      // Gl.20: V_R = b_R · h_R · L_R · s_R.
      return b_R * h_R * L_R * s_R;
    }
    case 'mre':
    case 'mrs': {
      const { V_M, V_R } = inputs;
      if (!finite(V_M) || !finite(V_R)) return null;
      // Gl.26: V_MR = V_M + V_R (scoped cross-ws sum of persisted component volumes).
      // MRS (§6.6.2 L2023): designed "analog zur Bemessung von Mulden-Rigolen-Elementen
      // (siehe 6.5.2)" — same storage identity; only Gl.29 → Gl.32 adds the throttle Q_Dr.
      return V_M + V_R;
    }
    case 'schacht': {
      const { d_i, h_S } = inputs;
      if (!finite(d_i) || !finite(h_S)) return null;
      // Gl.36: V_S = π · d_i²/4 · h_S (at the governing swept head).
      return (Math.PI * d_i * d_i) / 4 * h_S;
    }
    case 'becken': {
      const { V_B_governing } = inputs;
      if (!finite(V_B_governing)) return null;
      // Gl.41 governing sweep is computed server-side (GOVERNING_PROFILES 'A138-22');
      // the result flows in as V_B_governing.
      return V_B_governing;
    }
    // area device — no dedicated storage volume.
    case 'flaeche':
      return null;
  }
}

/**
 * Governing storage-volume symbol per facility (the facility worksheet's V field).
 * Source-verified + auto-persisted for mulde/rigole/mre/mrs/schacht/becken. flaeche has
 * no storage volume → null so nothing persists.
 */
export const FACILITY_GOVERNING_VOLUME_SYMBOL: Record<SummaryFacilityType, string | null> = {
  flaeche: null,     // area device — no dedicated storage volume
  mulde:   'V_M',    // §6.3.2 Gl.15
  rigole:  'V_R',    // §6.4.2 Gl.20
  mre:     'V_MR',   // §6.5.2 Gl.26
  mrs:     'V_MR',   // §6.6.2 L2023 "analog … 6.5.2" → Gl.26 (A138-20 field, staged block 2026-10-01)
  schacht: 'V_S',    // §6.7.2 Gl.36
  becken:  'V_B',    // §6.8.2 Gl.41 (active field is V_B, not V_VA)
};

/** Descriptor of the governing-volume row to persist onto the facility worksheet. */
export type FacilityVolumeWrite = { volumeSymbol: string; value: number };

/**
 * Finding F write-set assembly (pure): given the facility type and the sweep inputs,
 * produce the governing-volume row to persist (symbol + value), or null when there is
 * nothing to persist (no volume rule / inputs missing).
 *
 * The worksheet.ts asm producer branch calls this after computing the sweep footprint
 * to persist V_M in the SAME transaction; the branch and the unit tests exercise the
 * SAME rule (no mirror).
 */
export function facilityVolumeMaterialize(
  facilityType: SummaryFacilityType,
  inputs: FacilityGoverningVolumeInputs,
): FacilityVolumeWrite | null {
  const volumeSymbol = FACILITY_GOVERNING_VOLUME_SYMBOL[facilityType];
  if (volumeSymbol == null) return null;
  const value = facilityGoverningVolume(facilityType, inputs);
  if (value == null || !Number.isFinite(value)) return null;
  return { volumeSymbol, value };
}

export type AsmMaterializeInput = {
  method: AsmMethod;
  A_S_min: number | null;
  A_S_max: number | null;
  A_C: number | null;
  bodenart: Tab13Bodenart | null;
  /** Resolved facility geometry value: Rigole one-shot Gl.17, or the Mulde sweep's A_S_m. */
  geometryValue: number | null;
  manualValue: number | null;
  manualProvenance: string | null;
  facilityType: FacilityType | null;
  sourceWorksheet: string | null;
};

export function materializeAsm(input: AsmMaterializeInput): { A_S_m: number | null; state: AsmState } {
  const producer = resolveAsmProducer(input.method, input.facilityType);

  if (producer.kind === 'unresolved') {
    return { A_S_m: null, state: { status: 'indeterminate', reason: producer.reason } };
  }

  if (producer.kind === 'manual') {
    if (input.manualValue == null || !Number.isFinite(input.manualValue)) {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Manueller A_S,m-Wert fehlt.' } };
    }
    if (!input.manualProvenance || input.manualProvenance.trim() === '') {
      return { A_S_m: null, state: { status: 'indeterminate', reason: 'Herkunftsangabe (Datenblatt/Quelle) für manuellen A_S,m erforderlich.' } };
    }
    return { A_S_m: input.manualValue, state: { status: 'manual', value: input.manualValue, provenance: input.manualProvenance.trim() } };
  }

  let value: number | null;
  if (producer.kind === 'direct') {
    value = computeDirect(input.A_S_min, input.A_S_max);
  } else if (producer.kind === 'soil_estimate') {
    value = computeSoilEstimate(input.A_C, input.bodenart);
  } else { // geometry — geometryValue already resolved (Mulde sweep / Rigole one-shot)
    value = input.geometryValue != null && Number.isFinite(input.geometryValue) ? input.geometryValue : null;
  }

  if (value == null) {
    return { A_S_m: null, state: { status: 'indeterminate', reason: `A_S,m per ${input.method} nicht bestimmbar — Eingaben fehlen.` } };
  }

  // Derive sourceWorksheet from the resolved producer for geometry; otherwise use caller's value
  const sourceWorksheet = producer.kind === 'geometry' ? producer.worksheetCode : (input.sourceWorksheet ?? 'A138-12');

  return {
    A_S_m: value,
    state: { status: 'determined', value, method: input.method, sourceWorksheet },
  };
}

// ===========================================================================
// Mulde / Mulden-Rigolen pure sizing rules (readiness follow-up 2026-10-01)
// ===========================================================================

/**
 * §5.3.3.6 (L1395) — the design infiltration rate of the VEGETATED SOIL ZONE k_i,BBZ.
 *
 *   "Erfüllt der Boden der bewachsenen Bodenzone die Anforderungen nach 5.2.3.2 und liegt die
 *    Korngrößenverteilung in dem maßgeblichen Bereich nach Bild 1, kann der k_f-Wert für die
 *    bewachsene Bodenzone mit 1·10⁻⁵ bis 5·10⁻⁵ m/s angesetzt werden; der Korrekturfaktor für
 *    die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall
 *    zu vernachlässigen."
 *
 * So with the printed range (quelle = 'bild1_bereich') Gl.5/6 collapse to k_i = k_f·f_Ort
 * (f_Methode neglected); with a MEASURED k_f,BBZ the full f_K = f_Ort·f_Methode applies.
 * The engineer selects the value inside the range (SR-2) — never auto-picked here.
 */
export function computeKiBBZ(inputs: {
  k_f_BBZ: number | null;
  quelle: string | null;
  f_ort: number | null;
  f_K: number | null;
}): number | null {
  const { k_f_BBZ, quelle, f_ort, f_K } = inputs;
  if (k_f_BBZ == null || !Number.isFinite(k_f_BBZ)) return null;
  const factor = quelle === 'bild1_bereich' ? f_ort : f_K;
  if (factor == null || !Number.isFinite(factor)) return null;
  return k_f_BBZ * factor;
}

/**
 * §6.5.2 (L1909, L1925) — which k_i the SWALE of a facility uses:
 *   "Bei der Muldenbemessung ist die Infiltrationsrate der bewachsenen Bodenzone und bei der
 *    Bemessung der Rigole die Infiltrationsrate des anstehenden Bodens bemessungsrelevant."
 *   "Die maßgebliche Bodenschicht der Mulde für die Bestimmung der bemessungsrelevanten
 *    Infiltrationsrate k_i ist die bewachsene Bodenzone."
 * For a composite (mre / mrs) the swale takes k_i,BBZ when it is known; a plain swale keeps
 * the project k_i of the governing layer (§6.3.2 L1698: the vegetated zone is one of the
 * layers considered on A138-05/-11).
 */
export function swaleDesignInfiltrationRate(
  facilityType: SummaryFacilityType | null,
  k_i: number | null,
  k_i_BBZ: number | null,
): number | null {
  const composite = facilityType === 'mre' || facilityType === 'mrs';
  if (composite && k_i_BBZ != null && Number.isFinite(k_i_BBZ)) return k_i_BBZ;
  return k_i != null && Number.isFinite(k_i) ? k_i : null;
}

/**
 * §6.3.2 Gl.14 (L1681) — REQUIRED swale storage volume, governing over the Dauerstufen:
 *   V_M(D) = [(A_C + A_VA)·10⁻⁷·r_D(n) − A_S,m·k_i]·D·60·f_Z ;  V_M,erf = max_D V_M(D).
 * The persisted V_M on A138-17 is the AVAILABLE volume Gl.15 = A_S,m·h_M (chosen head); the
 * check "available ≥ required" is the sizing itself (gate A138-REQ-34, staged 2026-10-01).
 */
export function computeMuldeRequiredVolumeSweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; A_VA: number; A_S_m: number; k_i: number; f_Z: number },
): { V_M_erf: number | null; governingD: number | null; boundaryLimited: boolean } {
  const { A_C, A_VA, A_S_m, k_i, f_Z } = scalars;
  const gov = iterateGoverningDuration(rows, (D, r_D) =>
    ((A_C + A_VA) * 1e-7 * r_D - A_S_m * k_i) * D * 60 * f_Z,
  );
  return { V_M_erf: gov.governingValue, governingD: gov.governingD, boundaryLimited: gov.boundaryLimited };
}

/**
 * §6.5.2 Gl.30/31 (L1960–L1996) — swale OVERFLOW of a Mulden-Rigolen-Element/-System.
 *
 *   Gl.30: V_MÜ(D) = [(A_C + A_VA)·r_D(n_R)·10⁻⁷ − A_S,m·k_i]·D·60·f_Z − V_M
 *   "Ergibt sich für eine Dauerstufe D ein Wert größer als Null, liegt ein Überlauf vor. Die
 *    Regenspende r_D(n_R) mit der kleinsten Dauerstufe, für die ein Überlauf vorliegt, ist die
 *    maßgebliche Regenspende r_MÜ."
 *   Gl.31: Q_MÜ = A_C·10⁻⁴·r_MÜ − A_VA·k_i·1000   [l/s]
 *
 * rows = the column of the TRENCH design frequency n_R; k_i = the SWALE's rate (BBZ, see
 * swaleDesignInfiltrationRate); V_M = the swale volume designed for n_M (§6.3.2).
 * No overflow at any D → overflow:false, r_MÜ/Q_MÜ = 0 and V_MÜ = the largest (negative)
 * value, so the sheet shows the margin honestly instead of a blank.
 */
export function computeMuldenUeberlauf(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; A_VA: number; A_S_m: number; k_i: number; f_Z: number; V_M: number },
): { overflow: boolean; D: number | null; r_MUE: number; V_MUE: number | null; Q_MUE: number } {
  const { A_C, A_VA, A_S_m, k_i, f_Z, V_M } = scalars;
  const complete = rows
    .filter((r): r is { D_min: number; r_D_n: number } =>
      typeof r.D_min === 'number' && Number.isFinite(r.D_min) && r.D_min > 0 &&
      typeof r.r_D_n === 'number' && Number.isFinite(r.r_D_n))
    .sort((a, b) => a.D_min - b.D_min);
  let maxV: number | null = null;
  for (const row of complete) {
    const V = ((A_C + A_VA) * row.r_D_n * 1e-7 - A_S_m * k_i) * row.D_min * 60 * f_Z - V_M;
    if (V > 0) {
      const Q = A_C * 1e-4 * row.r_D_n - A_VA * k_i * 1000;
      return { overflow: true, D: row.D_min, r_MUE: row.r_D_n, V_MUE: V, Q_MUE: Q };
    }
    if (maxV == null || V > maxV) maxV = V;
  }
  return { overflow: false, D: null, r_MUE: 0, V_MUE: maxV, Q_MUE: 0 };
}

/**
 * §6.6.2 Gl.32 (L2031) — required trench length of a Mulden-Rigolen-SYSTEM (with throttle):
 *   L_R(D) = [(A_C + A_VA)·10⁻⁷·r_D(n) − b_R·h_R·k_i − V_M/(D·60·f_Z) − Q_Dr·10⁻³]
 *          / [b_R·h_R·s_R/(D·60·f_Z) + (b_R + h_R)·k_i]
 * governing = max over the Dauerstufen ("iterative Anwendung … für unterschiedliche
 * Dauerstufen D", L2055). Q_Dr = the mean throttle outflow of Gl.33 in l/s; k_i = the
 * SUBSOIL rate (trench side). Q_Dr = 0 reproduces Gl.29 (MRE).
 */
export function computeMrsTrenchLengthSweep(
  rows: ReadonlyArray<{ D_min: number | null; r_D_n: number | null }>,
  scalars: { A_C: number; A_VA: number; V_M: number; k_i: number; f_Z: number; b_R: number; h_R: number; s_R: number; Q_Dr: number },
): { L_R: number | null; governingD: number | null; r_D_at_governing: number | null } {
  const { A_C, A_VA, V_M, k_i, f_Z, b_R, h_R, s_R, Q_Dr } = scalars;
  const gov = iterateGoverningDuration(rows, (D, r_D) => {
    const t = D * 60 * f_Z;
    const num = (A_C + A_VA) * 1e-7 * r_D - b_R * h_R * k_i - V_M / t - Q_Dr * 1e-3;
    const den = (b_R * h_R * s_R) / t + (b_R + h_R) * k_i;
    return den === 0 ? null : num / den;
  });
  return { L_R: gov.governingValue, governingD: gov.governingD, r_D_at_governing: gov.r_D_at_governing };
}
