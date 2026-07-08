/**
 * (worksheetCode, equationNumber) pairs the in-tree formula engine is wired
 * for. Everything else falls through to the legacy sum-evaluator on the
 * client form, and is skipped entirely by the server-side snapshot capture.
 *
 * Lifted out of worksheet-form.tsx so the same set drives both the client
 * engine hook and the server-side snapshot evaluator — there can be only one
 * source of truth for "is this equation safe to evaluate automatically".
 *
 * Adding to this list still requires:
 *   - hand-calc reference + unit test
 *   - rewrites/profile entries if the formula needs them
 * (these constraints live in the equation-profiles + rewrites modules, not
 * here — this file only holds the gate).
 */
export const FORMULA_ENGINE_WHITELIST: ReadonlySet<string> = new Set<string>([
  'A138-07:2',   // A_C = Σ(A_E·C_i) from surface_inventory (producer)
  'A138-07:2c',  // C_m
  'A138-07:2d',  // A_E_ba (Σ befestigt area)
  'A138-07:2e',  // A_E_nba (Σ unbefestigt area)
  'A138-07:2f',  // A_C_sealed (reduced area, befestigt)
  'A138-07:2g',  // A_C_unsealed (reduced area, unbefestigt)
  'A138-13:8',
  'A138-18:21',
  // §6.x.y batch
  'A138-12:4',
  'A138-12:7',
  'A138-16:11',
  'A138-16:12',
  'A138-17:16',
  'A138-18:17',
  // 'A138-18:18' — DELIBERATELY NOT WIRED. The DB formula omits the ×10³
  // factor that Gl. (4) has for the same physical quantity Q_S (l/s with
  // m, m², m/s inputs), so the literal evaluation returns m³/s — a 1000×
  // magnitude trap. The profile + notes + _eval-reference-Gl18.md remain
  // in place documenting the open question; the engine renders no result
  // on the form (manual_required) rather than a wrong-magnitude number.

  // Batch-2: Mulde + Rigole Speichervolumen
  'A138-17:14', // V_M required (primary write)
  'A138-17:15', // V_M geometric (displayOnly)
  'A138-18:19', // V_R required (primary write)
  'A138-18:20', // V_R geometric (displayOnly)
  'A138-18:22', // s_R thin-wall alternative (displayOnly; Gl. 21 owns the field)
  'A138-18:23', // L_R required (displayOnly; engineer enters L_R as iteration var)

  // A138-10 — Einleitung in Gewässer
  'A138-10:3',  // Q_zu = r_D(n)·(A_C+A_VA)·10⁻⁴  (Gl. 3, governing inflow)

  // A138-11 — Drosselabfluss / Reduktionsbeiwerte
  'A138-11:5',  // k_i = k_f · f_K  (Gl. 5, site-specific permeability)
  'A138-11:6',  // f_K = min(f_ort·f_methode, 1)  (Gl. 6, correction factor cap)

  // A138-13 — Einleitungsmengen (Speichervolumen)
  'A138-13:9',  // q_S_AC = (k_i·A_S_m·1000 + Q_Dr)/A_C · 10^4  (Gl. 9, specific storage discharge)
]);
