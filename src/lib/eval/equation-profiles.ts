/**
 * Equation profiles — per-equation metadata the engine needs that the
 * `equations` DB row doesn't carry:
 *
 *   - expectedUnits: the unit each input MUST have in the formula's source
 *     context, independent of whatever `fields.unit` currently says. Lets
 *     the engine catch a units drift between a field and the equation's
 *     own dimensional expectations (e.g. d_i stored as 'mm' on a field
 *     when §6.4.2 specifies m).
 *
 *   - constants: numeric constants the formula references by name (e.g.
 *     `pi`). The arithmetic evaluator otherwise throws on unknown
 *     identifiers, which is the correct fail-loud default for symbols.
 *
 * Profiles are explicit, per equation_id — never derived. They are paired
 * with the `engineWhitelist` entry: if an equation is on the whitelist it
 * MUST have a profile, otherwise the engine can't check its units.
 */

export type EquationProfile = {
  /** Expected unit per input symbol. `null` means dimensionless. */
  expectedUnits: Record<string, string | null>;
  /** Numeric constants made available in the eval scope under their name. */
  constants?: Record<string, number>;
  /** Free-text engineer-facing note shown alongside any unit_conflict. */
  notes?: string;
};

export const equationProfiles: Record<string, EquationProfile> = {
  // DWA-A 138-1 · A138-18 · Gl. (21) · §6.4.2 (Rigole, lokaler Override über Tab. 2)
  '069c2b02-8883-48a4-82ce-b21c9ef1fff8': {
    expectedUnits: {
      s_F: null, // dimensionless
      b_R: 'm',
      h_R: 'm',
      az: null, // dimensionless count
      d_i: 'm', // §6.4.2 L1831 overrides Tab. 2 mm — engine flags if field carries anything else
      d_a: 'm', // §6.4.2 L1832 same override
    },
    constants: { pi: Math.PI },
    notes:
      '§6.4.2 (Rigole) definiert d_i und d_a lokal in m (L1831-1832), nicht in mm wie Tab. 2. Engineer-Review erforderlich, wenn ein Feld mm liefert.',
  },
};
