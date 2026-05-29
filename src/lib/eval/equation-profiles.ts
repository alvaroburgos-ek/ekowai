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
  /**
   * Per-equation alias from a formula symbol to the actual field symbol the
   * hook should look up. Used when a worksheet's field is named differently
   * than the formula expects — e.g. on A138-16 the formula's `r_D_n` reads
   * the local `r_D_n_used` field. The displayed substituted-map key remains
   * the formula symbol, so the engineer sees what the formula says.
   */
  symbolAliases?: Record<string, string>;
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

  // ====================================================================
  // §5.3.3.6 + §6.x.y batch — Gl. 4, 7, 11, 12, 16, 17, 18
  // (Gl. 11 is wired as a balance aggregator; profile here carries only
  // the symbol alias so the aggregator's field lookups resolve correctly.)
  // ====================================================================

  // A138-16 · Gl. (11) Bilanz-Check · §6.2.2
  '3b3b2cf6-da4f-43b2-a302-b7c38768d3ff': {
    expectedUnits: {
      A_C: 'm²',
      A_S: 'm²',
      r_D_n: 'l/(s·ha)',
      k_i: 'm/s',
    },
    symbolAliases: {
      r_D_n: 'r_D_n_used',
    },
    notes:
      '§6.2.2 Gl. (11): Wasserbilanz der Flächenversickerung. Balance-Aggregator prüft LHS ≈ RHS innerhalb 1 % rel. Toleranz.',
  },

  // A138-12 · Gl. (4) · §5.3.3.6 — Versickerungsleistung Q_S = k_i · A_S · 10³
  'bd080331-d673-4a11-b12a-29e00bdbc939': {
    expectedUnits: {
      k_i: 'm/s',
      A_S: 'm²',
    },
    notes:
      '§5.3.3.6 Gl. (4): Q_S in l/s mit k_i in m/s und A_S in m² — der ×10³-Faktor konvertiert m³/s → l/s.',
  },

  // A138-12 · Gl. (7) · §5.3.3.6 — A_S,m = (A_S,min + A_S,max) / 2
  '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac': {
    expectedUnits: {
      A_S_min: 'm²',
      A_S_max: 'm²',
    },
    notes:
      '§5.3.3.6 Gl. (7): Mittelung der Versickerungsfläche zwischen Min- und Max-Einstau.',
  },

  // A138-16 · Gl. (12) · §6.2.2 — A_S = A_C / (k_i · 10⁷ / r_D(n) − 1)
  'a1cf1d5c-d001-45aa-ae9d-a7406d75d120': {
    expectedUnits: {
      A_C: 'm²',
      k_i: 'm/s',
      r_D_n: 'l/(s·ha)',
    },
    symbolAliases: {
      // The Flächenversickerung worksheet carries the engineer's chosen
      // design intensity under `r_D_n_used`, not the generic `r_D_n`.
      r_D_n: 'r_D_n_used',
    },
    notes:
      '§6.2.2 Gl. (12): A_S für Flächenversickerung. r_D(n) ist die maßgebende Regenspende der gewählten Bemessungshäufigkeit; das Wizard-Feld heißt r_D_n_used.',
  },

  // A138-17 · Gl. (16) · §6.3.2 — A_S,m Mulde (Approach B, h_M-form)
  '14999c2a-cdeb-42c1-98fd-fcdec65123da': {
    expectedUnits: {
      A_C: 'm²',
      r_D_n: 'l/(s·ha)',
      h_M: 'm',
      D: 'min',
      f_Z: null,
      k_i: 'm/s',
    },
    symbolAliases: {
      // The Mulde worksheet doesn't carry its own r_D field; the generic
      // A138-10 `r_D_n` flows in via cross-worksheet inheritance.
      r_D_n: 'r_D_n',
    },
    notes:
      '§6.3.2 Gl. (16): mittlere Versickerungsfläche der Mulde. D in min ist die gewählte Dauerstufe.',
  },

  // A138-18 · Gl. (17) · §6.4.2 — A_S,m Rigole (Geometrie)
  '8afdb49a-7bb1-4f07-a64e-43009b8b6be1': {
    expectedUnits: {
      b_R: 'm',
      h_R: 'm',
      L_R: 'm',
    },
    notes: '§6.4.2 Gl. (17): Mantel- + Sohlenfläche der Rigole.',
  },

  // A138-18 · Gl. (18) · §6.4.2 — Q_S Rigole
  'ef4242d4-d9a0-43db-b65b-685bf9c92c9c': {
    expectedUnits: {
      b_R: 'm',
      h_R: 'm',
      L_R: 'm',
      k_i: 'm/s',
    },
    notes:
      '§6.4.2 Gl. (18): Q_S Rigole. ACHTUNG: die DB-Formel hat KEINEN ×10³-Faktor, anders als Gl. (4). Bei Einheiten m, m, m, m/s liefert sie m³/s — die zugehörige Wizard-Einheit l/s ist dann numerisch falsch um Faktor 1000. Engineer-Audit bitte.',
  },
};
