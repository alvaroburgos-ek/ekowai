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
  'A138-10:2',
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
]);
