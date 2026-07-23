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
  /**
   * When true, the engine card renders the computed value for engineer
   * review but the hook does NOT write it back to the output field. Used
   * for "required" or alternative-form equations whose output_symbol
   * collides with another equation's primary write-back, or whose output
   * would overwrite an engineer-entered iteration variable (e.g. Gl. 23
   * L_R — the engineer types L_R; the equation displays the required L_R
   * as a sizing aid but does not clobber the input).
   */
  displayOnly?: boolean;
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
      '§6.4.2 Gl. (18): Q_S Rigole. Source L1778 verbatim "Q_S (in m³/s)" — die DB-Formel lässt den ×10³-Faktor (anders als Gl. (4)) weg, weil das Output dimensional m³/s ist. Pile-6 SQL fügt das Q_S-Feld auf A138-18 mit Einheit m³/s hinzu. Ambiguity-Guard fängt jede stille Vermischung mit dem l/s-Q_S aus Gl. (4) ab.',
  },

  // ====================================================================
  // Batch-3: §6.4.2 (Rigole rest) + §6.5.2 (MRE) + §6.6.2 (MRS) +
  //          §6.7.2 (Schacht) + §6.8.2 (Becken)
  // Gl. 10 (V_Rück, §5.3.4) parked — needs sub-area carrier with flood C_S.
  // ====================================================================

  // A138-18 · Gl. (24) · §6.4.2 — q_VS Versickerrohr Wasseraustritt
  'f17ba5d8-601e-4de1-8e59-d6b0a69e21a6': {
    expectedUnits: { az_SOE: '1/m', A_SOE: 'cm²' },
    notes: '§6.4.2 Gl. (24): spezifischer Wasseraustritt des Versickerrohrs. q_VS in l/(s·m) mit az_SOE in 1/m und A_SOE in cm².',
  },

  // A138-18 · Gl. (25) · §6.4.2 — condition L_VS · q_VS ≥ r_5(n) · A_C · 10⁻⁴
  '86cdef5c-4199-4de6-ad0d-e2248b0834c9': {
    expectedUnits: { L_VS: 'm', q_VS: 'l/(s·m)', r_5_n: 'l/(s·ha)', A_C: 'm²' },
    notes: '§6.4.2 Gl. (25): hydraulische Leistung Vollsickerrohr — Bedingung. Computed-Value = LHS − RHS (slack); positiv = Bedingung erfüllt.',
  },

  // A138-19 · Gl. (26) · §6.5.2 — V_MR = V_M + V_R
  '32b85bf3-7b59-4abe-ac98-62f4fb15007b': {
    expectedUnits: { V_M: 'm³', V_R: 'm³' },
    displayOnly: true,
    notes: '§6.5.2 Gl. (26): V_MR Identität. displayOnly — Gl. (28) ist die primäre Bemessungsgleichung.',
  },

  // A138-19 · Gl. (27) · §6.5.2 — V_R = V_MR − V_M
  '150baf9a-0e7c-4a6c-9ce1-890ca7f491df': {
    expectedUnits: { V_MR: 'm³', V_M: 'm³' },
    displayOnly: true,
    notes: '§6.5.2 Gl. (27): Umkehrung von Gl. (26). displayOnly — V_R wird primär durch Gl. (19) berechnet.',
  },

  // A138-19 · Gl. (28) · §6.5.2 — V_MR required (MRE Bemessung)
  '570a63ed-08c4-4324-9ee7-0408816bba3f': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n: 'l/(s·ha)', b_R: 'm', h_R: 'm', L_R: 'm',
      k_i: 'm/s', D: 'min', f_Z: null,
    },
    // Fan-out (MRE): the "required" V_MR eq needs the server-swept governing D; the
    // client cannot resolve D → its write-back enqueues V_MR=null, clobbering the
    // server materialize (V_MR = persisted V_M + persisted V_R, Gl.26). Mark
    // displayOnly so the client never enqueues V_MR — the SERVER cross-ws sum is
    // authoritative. Gl.28 still renders + evaluates in the equation card.
    displayOnly: true,
    notes: '§6.5.2 Gl. (28): erforderliches MRE-Volumen. displayOnly — V_MR wird server-materialisiert als V_M + V_R (Gl.26); der maßgebende D stammt aus dem serverseitigen Sweep, der Client-Write-back darf V_MR nicht null-clobbern.',
  },

  // A138-19 · Gl. (29) · §6.5.2 — L_R required (MRE)
  'bc11db1c-c935-40c7-87fb-6b35c6f1b1b0': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n: 'l/(s·ha)', b_R: 'm', h_R: 'm',
      k_i: 'm/s', V_M: 'm³', s_R: null, D: 'min', f_Z: null,
    },
    displayOnly: true,
    notes: '§6.5.2 Gl. (29): erforderliche L_R für MRE. displayOnly — L_R ist Engineer-Iterationsgröße.',
  },

  // A138-20 · Gl. (30) · §6.5.2/§6.6.2 — V_MUE Muldenüberlauf-Volumen
  '947db98f-6ad1-482c-ae15-e9d0963d1abe': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n_R: 'l/(s·ha)',
      A_S_m: 'm²', k_i: 'm/s', D: 'min', f_Z: null, V_M: 'm³',
    },
    symbolAliases: {
      // After normalize-formula, `r_D(n_R)` becomes `r_D_n_R`. Alias it
      // to the generic A138-10 `r_D_n` field via inheritance.
      r_D_n_R: 'r_D_n',
    },
    notes: '§6.5.2/§6.6.2 Gl. (30): Muldenüberlauf-Volumen. r_D(n_R) ist die Regenspende für die Rigolen-Bemessungshäufigkeit.',
  },

  // A138-20 · Gl. (31) · §6.5.2/§6.6.2 — Q_MUE Muldenüberlauf-Abfluss
  '71af6131-12d3-4294-b192-256878ce7ecf': {
    expectedUnits: { A_C: 'm²', r_MUE: 'l/(s·ha)', A_VA: 'm²', k_i: 'm/s' },
    notes: '§6.5.2/§6.6.2 Gl. (31): Muldenüberlauf-Abfluss in l/s. A_C·10⁻⁴ konvertiert m²→ha, ·1000 konvertiert m³/s→l/s im A_VA-Term.',
  },

  // A138-20 · Gl. (32) · §6.6.2 — L_R MRS
  '904f2f36-9b62-4960-ba21-d77e6e0d89a4': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n: 'l/(s·ha)', b_R: 'm', h_R: 'm',
      k_i: 'm/s', V_M: 'm³', Q_Dr: 'l/s', s_R: null, D: 'min', f_Z: null,
    },
    displayOnly: true,
    notes: '§6.6.2 Gl. (32): L_R für MRS (Mulde-Rigolen-System mit Drossel). displayOnly.',
  },

  // A138-20 · Gl. (33) · §6.6.2 — Q_Dr mean
  '9357f6ea-65c6-4cad-a90e-17ec33461246': {
    expectedUnits: { Q_Dr_min: 'l/s', Q_Dr_max: 'l/s' },
    notes: '§6.6.2 Gl. (33): mittlerer Drosselabfluss = (Q_Dr,min + Q_Dr,max)/2.',
  },

  // A138-21 · Gl. (34) · §6.7.2 — A_S Schacht (Mantel + Sohle)
  '059d3751-b942-41ec-bc7f-4f0343353eb6': {
    expectedUnits: { d_a: 'm', h_S: 'm' },
    constants: { pi: Math.PI },
    notes: '§6.7.2 Gl. (34): Versickerungsfläche Schacht = π·d_a²/4 + π·d_a·h_S/2 (Sohle + Mantel).',
  },

  // A138-21 · Gl. (35) · §6.7.2 — V_S required
  'bfaf30f2-26e6-4373-9642-23429805afa2': {
    expectedUnits: {
      A_C: 'm²', r_D_n: 'l/(s·ha)', A_S: 'm²', k_i: 'm/s', D: 'min', f_Z: null,
    },
    // Fan-out (Schacht): the "required" V_S eq needs the server-swept governing D →
    // the client write-back enqueues V_S=null, clobbering the server materialize
    // (V_S = π·d_i²/4·h_S, Gl.36, at the Gl.37-swept governing head). Mark displayOnly
    // so the client never enqueues V_S — the SERVER materialize is authoritative.
    displayOnly: true,
    notes: '§6.7.2 Gl. (35): erforderliches Schachtvolumen V_S. displayOnly — V_S wird server-materialisiert (Gl.36 am Gl.37-Sweep-Einstau); der Client-Write-back darf V_S nicht null-clobbern.',
  },

  // A138-21 · Gl. (36) · §6.7.2 — V_S geometric (π·d_i²/4·h_S)
  '36f70dae-ec78-4fc5-b5c9-83b138339ffa': {
    expectedUnits: { d_i: 'm', h_S: 'm' },
    constants: { pi: Math.PI },
    displayOnly: true,
    notes: '§6.7.2 Gl. (36): geometrisches Schachtvolumen. displayOnly — Gl. (35) primär.',
  },

  // A138-21 · Gl. (37) · §6.7.2 — h_S required
  'aba53568-97f3-4054-b613-1b1413cb36fd': {
    expectedUnits: {
      A_C: 'm²', r_D_n: 'l/(s·ha)', d_a: 'm', d_i: 'm', k_i: 'm/s',
      D: 'min', f_Z: null,
    },
    constants: { pi: Math.PI },
    notes: '§6.7.2 Gl. (37): erforderlicher Bemessungseinstau h_S. Schreibt h_S (primär).',
  },

  // A138-21 · Gl. (38) · §6.7.2 — condition A_S_FS · k_f_FS ≥ A_S_Schacht · k_i
  '19f36c1e-9b20-43cd-8b09-6040e81598c2': {
    expectedUnits: {
      A_S_FS: 'm²', k_f_FS: 'm/s', A_S_Schacht: 'm²', k_i: 'm/s',
    },
    notes: '§6.7.2 Gl. (38): Filterschicht ausreichend durchlässig. Computed = LHS − RHS (Filterleistung-Slack).',
  },

  // A138-21 · Gl. (39) · §6.7.2 — erf_k_f_FS minimum
  'a3d078ba-3386-4feb-a302-ab22dc2d1fc8': {
    expectedUnits: { d_a: 'm', h_S: 'm', d_i: 'm', k_i: 'm/s' },
    notes: '§6.7.2 Gl. (39): minimale erforderliche Filterdurchlässigkeit. Output erf_k_f_FS in m/s.',
  },

  // A138-21 · Gl. (40) · §6.7.2 — h_S filter form
  '2c491f26-2b35-4dc6-8af0-c185173af0c6': {
    expectedUnits: {
      A_C: 'm²', r_D_n: 'l/(s·ha)', d_i: 'm', k_f_FS: 'm/s',
      D: 'min', f_Z: null,
    },
    constants: { pi: Math.PI },
    displayOnly: true,
    notes: '§6.7.2 Gl. (40): alternative h_S-Berechnung (Filterschicht limitierend). displayOnly — Gl. (37) primär.',
  },

  // A138-22 · Gl. (41) · §6.8.2 — V_B Becken (field symbol is V_B, not V_VA)
  '433f7700-90cb-410d-8103-7b72f53db8fa': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n: 'l/(s·ha)', A_S_m: 'm²',
      k_i: 'm/s', Q_Dr: 'l/s', D: 'min', f_Z: null, f_A: null,
    },
    // Fan-out (Becken): Gl.41 is iterated over D (governing = max V) server-side
    // (GOVERNING_PROFILES 'A138-22'); the client cannot resolve the governing D →
    // its write-back enqueues V_B=null, clobbering the server materialize. Mark
    // displayOnly so the client never enqueues V_B — the SERVER Gl.41 sweep is
    // authoritative.
    displayOnly: true,
    notes: '§6.8.2 Gl. (41): Becken-Speichervolumen V_B. displayOnly — V_B wird server-materialisiert über den Gl.41-Dauerstufen-Sweep; der Client-Write-back darf V_B nicht null-clobbern.',
  },

  // A138-26 · Gl. (10) V_Rück flood-check · §5.3.4
  '8e3c7e22-e3c7-449a-b267-928332c89306': {
    expectedUnits: {
      // The aggregator handles its own per-row + per-scalar checks; this
      // profile carries documentation only. Output "(condition)" is not a
      // field, so no write-back fires.
    },
    notes: '§5.3.4 Gl. (10): Flood-check V_Rück. Aggregator-Pfad mit eigenem Carrier sub_areas_A138_26 + 6 Skalaren (A_VA, Q_S, Q_Dr, D, V_VA, r_D(T_n,Ü)). Positive V_Rück = zusätzliche Flutspeicherung erforderlich; ≤ 0 = Flutnachweis bestanden.',
  },

  // ====================================================================
  // Batch-2: Mulde + Rigole Speichervolumen — Gl. 14, 15, 19, 20, 22, 23
  // Sibling-unit check (against current main): V_M, V_R, s_R, L_R all
  // match their existing field units (m³, m³, –, m). Gl. 14/19 are the
  // SOURCE's design equations and own the field write-back. Gl. 15/20/22/23
  // are display-only (alternative form or sizing aid) to avoid clobber.
  // ====================================================================

  // A138-17 · Gl. (14) · §6.3.2 — V_M required
  'bfe6e59a-015f-4c95-b717-8599f80cb68a': {
    expectedUnits: {
      A_C: 'm²',
      A_VA: 'm²',
      r_D_n: 'l/(s·ha)',
      A_S_m: 'm²',
      k_i: 'm/s',
      D: 'min',
      f_Z: null,
    },
    // Finding H (§6.3.2): Gl.14 needs D — the GOVERNING Dauerstufe from the
    // server-only Mulde geometry sweep (worksheet.ts computeMuldeGeometrySweep).
    // The CLIENT engine cannot resolve D → client-side Gl.14 can't compute → its
    // write-back enqueues V_M=null, which the autosave then persists, CLOBBERING
    // the server-materialized governing volume (step-6b). Marking Gl.14
    // displayOnly stops the client write-back loop (use-equation-engine.ts:527
    // skips displayOnly equations) so the client never enqueues V_M — the SERVER
    // materialize (V_M = A_S,m · h_M, Gl.15, §6.3.2-verified Speichervolumen) is
    // authoritative. Gl.14 still renders in the equation card + evaluates purely.
    displayOnly: true,
    notes:
      '§6.3.2 Gl. (14): erforderliches Muldenspeichervolumen aus Zufluss-Versickerungs-Bilanz. displayOnly — der maßgebende D stammt aus dem serverseitigen Dauerstufen-Sweep; die Persistierung von V_M erfolgt server-materialisiert (= A_S,m·h_M, Gl.15), damit der Client-Write-back kein null clobbert (Finding H).',
  },

  // A138-17 · Gl. (15) · §6.3.2 — V_M geometric
  '44fd56a8-b473-441a-be21-297d9f501226': {
    expectedUnits: { A_S_m: 'm²', h_M: 'm' },
    displayOnly: true,
    notes:
      '§6.3.2 Gl. (15): geometrisches Muldenvolumen V_M = A_S,m · h_M. displayOnly — Gl. (14) ist primärer Schreiber.',
  },

  // A138-18 · Gl. (19) · §6.4.2 — V_R required
  '58c0c298-ca72-4bb6-ab05-0b298114523e': {
    expectedUnits: {
      A_C: 'm²',
      r_D_n: 'l/(s·ha)',
      b_R: 'm',
      h_R: 'm',
      L_R: 'm',
      k_i: 'm/s',
      Q_Dr: 'l/s',
      D: 'min',
      f_Z: null,
    },
    // Fan-out (Rigole): the "required" V_R eq needs the server-swept governing D →
    // the client write-back enqueues V_R=null, clobbering the server materialize
    // (V_R = b_R·h_R·L_R·s_R, Gl.20, with s_R computed server-side via Gl.21/22).
    // Mark displayOnly so the client never enqueues V_R — the SERVER geometric
    // materialize is authoritative.
    displayOnly: true,
    notes:
      '§6.4.2 Gl. (19): erforderliches Rigolenspeichervolumen. displayOnly — V_R wird server-materialisiert als b_R·h_R·L_R·s_R (Gl.20, s_R nach Gl.21/22); der Client-Write-back darf V_R nicht null-clobbern.',
  },

  // A138-18 · Gl. (20) · §6.4.2 — V_R geometric
  'b8e74a4b-64cc-4b81-b306-b2e01e759f5e': {
    expectedUnits: { b_R: 'm', h_R: 'm', L_R: 'm', s_R: null },
    displayOnly: true,
    notes:
      '§6.4.2 Gl. (20): geometrisches Rigolenvolumen V_R = b·h·L·s_R. displayOnly — Gl. (19) ist primär.',
  },

  // A138-18 · Gl. (22) · §6.4.2 — s_R thin-wall alternative
  '20c31318-7401-4f89-a27b-bc3cf8723548': {
    expectedUnits: { s_F: null, b_R: 'm', h_R: 'm', az: null, d: 'm' },
    constants: { pi: Math.PI },
    symbolAliases: {
      // No separate `d` field on A138-18; the thin-wall approximation reads
      // the inner diameter `d_i`. Engineer is responsible for using Gl. (22)
      // only when d_i ≈ d_a (thin plastic pipes).
      d: 'd_i',
    },
    displayOnly: true,
    notes:
      '§6.4.2 Gl. (22): s_R für dünnwandige Versickerrohre (d ≈ d_i ≈ d_a). Algebraisch identisch zu Gl. (21) wenn d_a = d_i. displayOnly — Gl. (21) ist primär.',
  },

  // A138-18 · Gl. (23) · §6.4.2 — L_R required
  '927aa5ab-3aa9-486e-a05d-f91847e8d31e': {
    expectedUnits: {
      A_C: 'm²',
      r_D_n: 'l/(s·ha)',
      b_R: 'm',
      h_R: 'm',
      k_i: 'm/s',
      Q_Dr: 'l/s',
      s_R: null,
      D: 'min',
      f_Z: null,
    },
    displayOnly: true,
    notes:
      '§6.4.2 Gl. (23): erforderliche Rigolen-Länge L_R. displayOnly — der Engineer trägt L_R als Iterationsgröße ein.',
  },

  // FLL-GAR-2023 · FLL-GAR-22 · Gl. (2b) — g_prime ≥ (Delta_u·gamma_A − (…))/cos(beta).
  // An INEQUALITY (Mindestauflast-Bedingung), NOT a producer of g_prime; Gl. (2a)
  // is the sole producer. displayOnly so the multi-producer collision guard leaves
  // Gl.2a's g_prime intact. Encoding-shape class: "inequality encoded as
  // equation-producer" (see defect register).
  'c7dc584b-0f65-476d-935a-d5306d885a65': {
    expectedUnits: {},
    displayOnly: true,
    notes:
      'FLL-GAR-22 Gl. (2b): Mindestauflast-Bedingung g_prime ≥ …; displayOnly — Gl. (2a) ist der Produzent von g_prime, Gl. (2b) ist die Prüfbedingung.',
  },

  // ====================================================================
  // DWA-M-205 · ES-1 (inequality-as-producer) neutralisation.
  //   These "equations" are threshold BANDS extracted from prose, but their
  //   output_symbol = the very entered input field being range-checked
  //   (e.g. uv_dosis "produced" by both Gl. EQ-01 and the band EQ-02 → the
  //   engine's multi-producer collision guard can BLANK the engineer's entry —
  //   the same FLL-GAR-22:2b g_prime bug). displayOnly stops the write-back so
  //   the band renders as a review aid without clobbering the input.
  //   Every band + modal verb RENDER-confirmed against DWA-M_205.pdf (2013).
  //   Each unique eq is encoded TWICE (S3 ×2, base M205-05/06/07/08 +
  //   duplicate M205-10/13/15/17/21) — BOTH copies get the profile, identically.
  //   Enforcement (where the source carries a modal) lives in the companion
  //   compliance_requirement, NOT here — see
  //   20260708260000_dwa_m_205_es1_disposition.sql.
  // ====================================================================

  // M205-05 · EQ-02 · §4.1.2.3 — uv_dosis 300–450 J/m² (Mindestbestrahlung)
  'ba51e8f2-4c20-4c01-8f4d-9effcc262b37': {
    expectedUnits: { uv_dosis: 'J/m²' },
    displayOnly: true,
    notes:
      '§4.1.2.3 (PDF S. 18, gerendert): "Danach beträgt die Mindestbestrahlung etwa 300 J/m² bis 450 J/m²…" — deskriptiver Richtwert (kein muss). ES-1: Band statt Produzent → displayOnly, kein Write-back auf das Eingabefeld uv_dosis.',
  },
  // M205-10 · EQ-02 (S3 ×2 Duplikat)
  '31918a55-696c-4044-a398-1f1c5e36d1e1': {
    expectedUnits: { uv_dosis: 'J/m²' },
    displayOnly: true,
    notes:
      '§4.1.2.3 (PDF S. 18): uv_dosis 300–450 J/m², "beträgt etwa" (Richtwert). ES-1 displayOnly. S3-Duplikat von M205-05 EQ-02.',
  },

  // M205-05 · EQ-12 · §4.1.2.3 — uv_dosis 400–700 J/m² (Schwankungsbreite)
  '1a5e5b28-d9c1-4a49-8c5e-9d596e000ff9': {
    expectedUnits: { uv_dosis: 'J/m²' },
    displayOnly: true,
    notes:
      '§4.1.2.3 (PDF S. 18): "…zeigt eine Schwankungsbreite … von 400 J/m² bis 600 J/m² und im Einzelfall bis zu 700 J/m²" — empirische Betriebsspanne (kein muss). ES-1 displayOnly. (Hinweis: DB-Band 400–700 verflacht die 400–600/Einzelfall-700-Qualifizierung — S9, separat.)',
  },
  // M205-10 · EQ-12 (S3 ×2 Duplikat)
  'd55d6598-b169-469f-8e17-f7a1c9583bf2': {
    expectedUnits: { uv_dosis: 'J/m²' },
    displayOnly: true,
    notes:
      '§4.1.2.3 (PDF S. 18): uv_dosis Schwankungsbreite 400–600, Einzelfall bis 700 J/m². ES-1 displayOnly. S3-Duplikat von M205-05 EQ-12.',
  },

  // M205-05 · EQ-06 · §4.1.5.2 — spez_strom_uv 30–60 Wh/m³
  '197122ba-f723-4b27-80c1-51a972ea8e12': {
    expectedUnits: { spez_strom_uv: 'Wh/m³' },
    displayOnly: true,
    notes:
      '§4.1.5.2 (PDF S. 24, gerendert): "…bewegt sich der spezifische Stromverbrauch im Bereich von 30 Wh bis 60 Wh pro Kubikmeter…" — deskriptiver Betriebswert (kein muss). ES-1 displayOnly.',
  },
  // M205-13 · EQ-06 (S3 ×2 Duplikat)
  '246ff465-b925-47a4-85eb-beb9932f9f65': {
    expectedUnits: { spez_strom_uv: 'Wh/m³' },
    displayOnly: true,
    notes:
      '§4.1.5.2 (PDF S. 24): spez_strom_uv 30–60 Wh/m³, "bewegt sich im Bereich" (deskriptiv). ES-1 displayOnly. S3-Duplikat von M205-05 EQ-06.',
  },

  // M205-06 · EQ-07 · §4.2.2 — spez_energie_membran 0.1–0.2 kWh/m³
  'b3126c0d-7940-413e-b3f0-b25b02ccbf38': {
    expectedUnits: { spez_energie_membran: 'kWh/m³' },
    displayOnly: true,
    notes:
      '§4.2.2 (PDF S. 25, gerendert): "Bei einem spezifischen Energiebedarf von ca. 0,1 kWh/m³ bis 0,2 kWh/m³ Filtrat…" — deskriptiver Wert ("von ca.", kein muss). ES-1 displayOnly.',
  },
  // M205-15 · EQ-07 (S3 ×2 Duplikat)
  'd399b7fd-e988-4499-a2a6-6af379ab0db5': {
    expectedUnits: { spez_energie_membran: 'kWh/m³' },
    displayOnly: true,
    notes:
      '§4.2.2 (PDF S. 25): spez_energie_membran 0,1–0,2 kWh/m³, "von ca." (deskriptiv). ES-1 displayOnly. S3-Duplikat von M205-06 EQ-07.',
  },

  // M205-07 · EQ-04 · §4.3.6 — ozon_pro_doc < 0.8 mg/mg
  '5bc795dd-75f7-433c-a359-b2c1e58d7488': {
    expectedUnits: { ozon_pro_doc: 'mg/mg' },
    displayOnly: true,
    notes:
      '§4.3.6 (PDF S. 31, gerendert): "Die Bromatbildung kann minimiert werden, wenn Ozon proportional zum DOC (< 0,8 mg/mg) dosiert wird." — Betriebsempfehlung mit Sicherheitsbezug (Bromat-Minimierung), kein muss → warn-Kandidat. ES-1 displayOnly; Enforcement (warn) in der Migration.',
  },
  // M205-17 · EQ-04 (S3 ×2 Duplikat)
  '30a51b8c-422f-411a-8c09-c728a393f433': {
    expectedUnits: { ozon_pro_doc: 'mg/mg' },
    displayOnly: true,
    notes:
      '§4.3.6 (PDF S. 31): ozon_pro_doc < 0,8 mg/mg, "kann minimiert werden, wenn … dosiert wird" (Empfehlung). ES-1 displayOnly. S3-Duplikat von M205-07 EQ-04.',
  },

  // M205-08 · EQ-09 · §4.4.2 — clo2_dosis 5–10 g/m³
  '0e05ac69-c6c4-460a-80b0-7664370b08ca': {
    expectedUnits: { clo2_dosis: 'g/m³' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 32, gerendert): "…sind etwa 5 g bis 10 g Chlordioxid pro Kubikmeter … notwendig, bei sandfiltriertem Abwasser … nur 1 g/m³ bis 5 g/m³." — deskriptive Dosierspanne (kein muss). ES-1 displayOnly. (DB-Band 5–10 lässt die sandfiltriert-Alternative 1–5 aus — S9, separat.)',
  },
  // M205-21 · EQ-09 (S3 ×2 Duplikat)
  '0c258d85-0a1e-4456-b0df-12f529d11d2c': {
    expectedUnits: { clo2_dosis: 'g/m³' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 32): clo2_dosis 5–10 g/m³ (sandfiltriert 1–5), "sind etwa … notwendig" (deskriptiv). ES-1 displayOnly. S3-Duplikat von M205-08 EQ-09.',
  },

  // M205-08 · EQ-10 · §4.4.2 — freies_chlor 1–20 mg/l
  '86f703b6-6348-4577-a624-029e1ce3c93b': {
    expectedUnits: { freies_chlor: 'mg/l' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 31, gerendert): "Je nach dem Gehalt an organischen Stoffen im Abwasser sind 1 mg bis 20 mg freies Chlor pro Liter … erforderlich." — kontextabhängige Betriebsspanne (kein muss auf feste Grenze). ES-1 displayOnly.',
  },
  // M205-21 · EQ-10 (S3 ×2 Duplikat)
  '3f3b7237-8837-45ff-86a5-1582f7156cbd': {
    expectedUnits: { freies_chlor: 'mg/l' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 31): freies_chlor 1–20 mg/l, "sind … erforderlich" (kontextabhängig). ES-1 displayOnly. S3-Duplikat von M205-08 EQ-10.',
  },

  // M205-08 · EQ-11 · §4.4.2 — restchlor_betrieb ≥ 0.2 mg/l (freies-Chlor-Überschuss)
  'cb540d04-9822-4941-a6e2-12a9be184c8e': {
    expectedUnits: { restchlor_betrieb: 'mg/l' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 30/32, gerendert): "In dem aus dem Behandlungsbecken abfließenden Abwasser muss noch ein Überschuss von freiem Chlor in der Größenordnung von 0,2 mg/l nachzuweisen sein, um die Desinfektionswirkung sicherzustellen." — einziges ES-1-Item mit MUSS-Verb → block-Kandidat. ES-1 displayOnly (stoppt Collision-Blank); Enforcement (block, FÜR ALVARO) in der Migration. Hinweis: "in der Größenordnung von" mildert die harte ≥-Grenze → block/warn ist eine Modal-Ratifizierung.',
  },
  // M205-21 · EQ-11 (S3 ×2 Duplikat)
  'b02ff29a-36a0-41b8-b466-0a3b701bd895': {
    expectedUnits: { restchlor_betrieb: 'mg/l' },
    displayOnly: true,
    notes:
      '§4.4.2 (PDF S. 30/32): restchlor_betrieb ≥ 0,2 mg/l, "muss … nachzuweisen sein" (block-Kandidat). ES-1 displayOnly. S3-Duplikat von M205-08 EQ-11.',
  },

  // ====================================================================
  // DWA-A-201 · ES-1 (inequality-as-producer) neutralisation.
  //   Wie bei M-205 sind diese 12 "Gleichungen" Bemessungs-Schwellenwerte
  //   aus Prosa (§5.1–5.5), deren output_symbol das GEPRÜFTE Eingabe-/
  //   Bemessungsfeld selbst ist (V_erf_grobstoff, V_EW_absetz, …,
  //   A_min_nachklaer). Damit ist jede Gleichung ein zweiter Produzent
  //   ihres eigenen Symbols → der Multi-Producer-Collision-Guard der Engine
  //   kann den vom Ingenieur eingegebenen Wert BLANKEN. displayOnly stoppt
  //   den Write-back, sodass das Band als Review-Hilfe rendert, ohne die
  //   Eingabe zu überschreiben.
  //   KEIN S3 ×2 in A-201 — jede Gleichung existiert genau EINMAL (DB-Scan
  //   F-01…F-21 bestätigt), daher genau ein Profil je ES-1-Gleichung.
  //   Jeder Schwellenwert + jedes Modalverb RENDER-bestätigt gegen
  //   "dwa_a_201 (1).pdf" (August 2005, korr. Dez. 2011), poppler pdftoppm
  //   150 dpi S. 10 (§5.1–5.3) + S. 11 (§5.4–5.5).
  //   Enforcement: die durchsetzbaren "muss"/"gilt"-Grenzwerte werden bereits
  //   von den vorhandenen Gates CR-004/005/007/008 abgedeckt — hier werden
  //   KEINE Gates dupliziert. Die Migration flaggt nur die pre-existing
  //   Gate-Defekte (CR-006 kaputte doppelte IF-THEN + Cross-Worksheet-
  //   Platzierung von CR-006/007) für Alvaro. Siehe
  //   20260708270000_dwa_a_201_es1_disposition.sql.
  // ====================================================================

  // A201-08 · F-01 · §5.1 — V_erf_grobstoff ≥ Q_M · t_R,M
  '48ef9e99-ffc6-4b51-a911-88fb8e40101d': {
    expectedUnits: { V_erf_grobstoff: 'm³', Q_M: 'm³/h', t_R_M: 'h' },
    displayOnly: true,
    notes:
      '§5.1 (PDF S. 10, gerendert): "Für die Bemessung der Grobstoffentnahme gilt: V_erf ≥ Q_M · t_R,M ; t_R,M = 0,5 h." — normative Bemessungsregel ("gilt"). ES-1: Ungleichung mit Feld-Symbolen auf der RHS → displayOnly (kein Write-back auf V_erf_grobstoff). Enforcement existiert bereits als CR-004 (`V_erf_grobstoff >= Q_M * t_R_M and t_R_M == 0.5`, arithmetischer RHS → acompare-Pfad, grammar-OK).',
  },

  // A201-09 · F-03 · §5.2 — V_EW_absetz ≥ 0,5 m³/E
  '792d1332-5ed4-4b16-a106-8132a1fa7bf7': {
    expectedUnits: { V_EW_absetz: 'm³/E' },
    displayOnly: true,
    notes:
      '§5.2 (PDF S. 10, gerendert): "Absetzteiche werden auf V_EW ≥ 0,5 m³/E bemessen." — normativer Bemessungswert ("werden … bemessen"). ES-1 displayOnly. Enforcement bereits in CR-005.',
  },

  // A201-09 · F-04 · §5.2 — V_schlammraum_absetz ≥ 0,15 m³/E
  'e3c30a7d-c11e-4076-8f09-a0d4a590946e': {
    expectedUnits: { V_schlammraum_absetz: 'm³/E' },
    displayOnly: true,
    notes:
      '§5.2 (PDF S. 10, gerendert): Schlammraum "≥ 0,15 m³/E … gewählt werden" (Bemessungswert). ES-1 displayOnly. Enforcement bereits in CR-005.',
  },

  // A201-09 · F-06 · §5.2 — t_R_absetz ≥ 1 d
  'ba340cbf-9420-410d-bfc9-d4380dde9a6e': {
    expectedUnits: { t_R_absetz: 'd' },
    displayOnly: true,
    notes:
      '§5.2 (PDF S. 10, gerendert): "Es muss eine Durchflusszeit von mindestens einem Tag bei Trockenwetter eingehalten werden." — muss ≥ 1 d. ES-1 displayOnly. Enforcement bereits in CR-005.',
  },

  // A201-10 · F-07 · §5.3 — A_EW_unbelueftet ≥ 10 m²/E (Regelwert)
  '2c9d5018-004f-4f67-b40b-dcc8898d3171': {
    expectedUnits: { A_EW_unbelueftet: 'm²/E' },
    displayOnly: true,
    notes:
      '§5.3 (PDF S. 10, gerendert): "Unbelüftete Abwasserteiche sind mit A_EW ≥ 10 m²/E zu bemessen." — normativer Regel-Bemessungswert ("sind … zu bemessen"). ES-1 displayOnly. Enforcement-Absicht in CR-006 vorhanden, aber CR-006 ist DEFEKT (doppeltes IF-THEN + auf falschem Worksheet A201-08) → in der Migration für Alvaro geflaggt, hier NICHT umgeschrieben (ES-1-Scope).',
  },

  // A201-10 · F-08 · §5.3 — A_EW_unbelueftet ≥ 8 m²/E (reduziert bei Vorschaltung Absetzteich)
  '3f986494-9fae-4171-b602-ab106a8cd659': {
    expectedUnits: { A_EW_unbelueftet: 'm²/E' },
    displayOnly: true,
    notes:
      '§5.3 (PDF S. 10, gerendert): "Dieser Wert kann auf 8 m²/E vermindert werden, wenn nach Abschnitt 5.2 bemessene Absetzteiche vorgeschaltet sind." — bedingte Alternative ("kann … vermindert werden, wenn"). C9-Selektor-Partner zu F-07 (gleiches Symbol A_EW_unbelueftet, alternativer Wert). ES-1 displayOnly. Enforcement-Absicht in CR-006 (defekt, geflaggt).',
  },

  // A201-10 · F-10 · §5.3 — A_EW_nitrifikation ≥ 15 m²/E (deskriptive Beobachtung)
  'a69cfcaf-18a2-482e-a359-63848ffa00b9': {
    expectedUnits: { A_EW_nitrifikation: 'm²/E' },
    displayOnly: true,
    notes:
      '§5.3 (PDF S. 10, gerendert): "Bei Bemessungswerten A_EW ≥ 15 m²/E ist im Sommer eine teilweise Nitrifikation festzustellen." — DESKRIPTIVE Beobachtung ("ist … festzustellen"), KEIN Bemessungs-Mindestwert. ES-1 displayOnly ONLY; ein Gate hier wäre eine erfundene Anforderung → unterlassen (never-invent).',
  },

  // A201-11 · F-11 · §5.4 — B_R_BSB ≤ 25 g/(m³·d) (Last-Grenzwert)
  '2aa30964-75b6-4990-995e-58d16598fc2c': {
    expectedUnits: { B_R_BSB: 'g/(m³·d)' },
    displayOnly: true,
    notes:
      '§5.4 (PDF S. 11, gerendert): "Für die Bemessung von belüfteten Abwasserteichen muss eine BSB5-Raumbelastung von B_R,BSB ≤ 25 g/(m³·d) angesetzt werden." — muss ≤ 25 (Last-Grenzwert, block). ES-1 displayOnly. Enforcement bereits in CR-007 (`B_R_BSB <= 25`), aber CR-007 liegt auf A201-08 statt A201-11 → Cross-Worksheet-Platzierung geflaggt.',
  },

  // A201-11 · F-12 · §5.4 — t_R_belueftet ≥ 5 d
  'c34e9132-0c2f-404a-bc06-c2673770c761': {
    expectedUnits: { t_R_belueftet: 'd' },
    displayOnly: true,
    notes:
      '§5.4 (PDF S. 11, gerendert): "Es muss eine Durchflusszeit von fünf Tagen bei Trockenwetter eingehalten werden." — muss ≥ 5 d (block). ES-1 displayOnly. Enforcement in CR-007 (Platzierung geflaggt).',
  },

  // A201-11 · F-13 · §5.4 — OV_C_BSB ≥ 1,5 kg/kg
  '74018e72-ea91-4a1e-bef9-2cb4f3782f8d': {
    expectedUnits: { OV_C_BSB: 'kg/kg' },
    displayOnly: true,
    notes:
      '§5.4 (PDF S. 11, gerendert): "Als Sauerstoffverbrauch muss OV_C,BSB ≥ 1,5 kg/kg … angesetzt werden." — muss ≥ 1,5 (block). ES-1 displayOnly. Enforcement in CR-007 (Platzierung geflaggt).',
  },

  // A201-12 · F-15 · §5.5 — t_R_nachklaer ≥ 1 d
  '05bc3636-53d6-4518-aa00-2f40fce08d5a': {
    expectedUnits: { t_R_nachklaer: 'd' },
    displayOnly: true,
    notes:
      '§5.5 (PDF S. 11, gerendert): "Das erforderliche gesamte Teichvolumen errechnet sich aus der erforderlichen Mindestdurchflusszeit t_R = 1 d …" — normative Mindest-Durchflusszeit (block). ES-1 displayOnly. Enforcement bereits in CR-008 (`t_R_nachklaer>=1`).',
  },

  // A201-12 · F-16 · §5.5 — A_min_nachklaer ≥ 20 m²
  '4219cb5e-8ced-41b0-8eef-783e0d3fcfc5': {
    expectedUnits: { A_min_nachklaer: 'm²' },
    displayOnly: true,
    notes:
      '§5.5 (PDF S. 11, gerendert): "Bewährt haben sich Teiche mit einer Mindesttiefe von 1,2 m und einer Mindestfläche von 20 m²." — "Mindestfläche" = normativer Mindestwert (block), Verb "Bewährt haben sich" ist weicher (Erfahrungswert) → für Alvaro. ES-1 displayOnly. Enforcement bereits in CR-008 (`A_min_nachklaer>=20`, + h_nachklaer>=1.2 deckt die Mindesttiefe 1,2 m).',
  },

  // ====================================================================
  // DWA-A-102-2 · ES-1 (inequality-as-producer) neutralisation.
  //   8 "Gleichungen" sind in Wirklichkeit Ungleichungen (`<=` / `>=`),
  //   deren output_symbol das GEPRÜFTE Symbol selbst ist → zweiter Produzent
  //   ihres eigenen Symbols → der Multi-Producer-Collision-Guard der Engine
  //   kann den echten Produzenten-Wert bzw. die Ingenieur-Eingabe BLANKEN.
  //   displayOnly stoppt den Write-back; die Ungleichung rendert als
  //   Review-/Bemessungshilfe.
  //   ES-1-Instanzen (register S1/S7), UUIDs gegen equations.id verifiziert:
  //     Q_M   B.5 (A1022-08)       · echter Produzent = B.4
  //     e_0   Gl.15/17/18 (A1022-28) · echter Produzent = Gl.13
  //     Q_Dr  Gl.26/28 (A1022-33)  · KEIN Produzent (beide sind `>=`-Minima)
  //     m     Gl.22/23 (A1022-36)  · echter Produzent (Mittel-m) = B.13/Gl.24
  //   KEINE neuen Gates: die vorhandene AFS63-Durchsetzung (REQ-22
  //   eta_ges>=eta_erf) trägt die Kernanforderung; keine Quell-Modalverb-
  //   Grenze verlangt hier ein zusätzliches, in evaluate.ts faithful
  //   ausdrückbares Gate (never-invent). Alle Formeln render-confirmed vs
  //   DWA-A_102-2 (3).pdf (Opus 4.8, poppler — DEEP-DWA-A-102-2.md).
  //   Enforcement-Dispositionen: siehe
  //   20260708280000_dwa_a_102_2_es1_invtag_disposition.sql.
  //   HINWEIS m (Gl.22/23): die WRITTEN-NOT-APPLIED Migration 2803d00
  //   (20260708240000) retaggt Gl.22/23 output_symbol m -> m_min_required und
  //   re-homed REQ-24. Hier NUR displayOnly (kein Re-Fix) — die Retag-/Gate-
  //   Arbeit bleibt in 2803d00. Sobald 2803d00 angewendet ist, produzieren
  //   Gl.22/23 m_min_required und REQ-24 (`m - m_min_required >= 0`) prüft es;
  //   displayOnly bleibt korrekt (Minimum ist Bemessungshilfe, kein Mittel-m).
  // ====================================================================

  // A1022-08 · B.5 · §B.3.2.3.3 — Q_M Plausibilitäts-/Massenbilanz-Check
  '44d37420-9559-4b89-a305-e87cf516e488': {
    expectedUnits: { Q_M: 'l/s' },
    displayOnly: true,
    notes:
      '§B.3.2.3.3 (Anh. B): `Σ Q_M,i ≤ Q_M` — Plausibilitäts-/Massenbilanz-Check der Teilgebiets-Mischwasserabflüsse gegen den Gesamt-Q_M. KEIN Produzent von Q_M (das ist B.4 `f_S_QM·Q_S_aM+Q_F`). ES-1 displayOnly (stoppt Collision-Blank am B.4-Wert). KEIN Gate: die Formel enthält `Sum(...)` — in evaluate.ts nicht faithful ausdrückbar (kein SUM-Support) → NR, nicht erfinden.',
  },

  // A1022-28 · Gl.15 · §7.3.2.2 — e_0 Obergrenze (B_R_e_zul-Umstellung)
  'a5bd51eb-1d34-4970-b633-68f8935a8ce9': {
    expectedUnits: { e_0: '%' },
    displayOnly: true,
    notes:
      '§7.3.2.2 Gl. (15): `e_0 ≤ (B_R_e_zul − V_R_aM·C_KA)/(V_R_aM·C_e − V_R_aM·C_KA)·100` — Obergrenze der zulässigen Entlastungsrate, algebraische Umstellung der Frachtbedingung Gl. (14) (`B_R_e ≤ B_R_e_zul`). KEIN Produzent von e_0 (das ist Gl.13 `V_e_MWUe/V_R_aM·100`). ES-1 displayOnly. KEIN neues Gate: die echte Frachtdurchsetzung ist Gl.14/REQ-22 (AFS63-Nachweis); ein e_0-Gate hier wäre Feld-gegen-Feld-Division (nicht faithful gegen numerischen RHS ausdrückbar) und würde die Nachweis-Logik duplizieren → never-invent.',
  },

  // A1022-28 · Gl.17 · §7.3.2.2 — e_0 Obergrenze (CSB-Konzentrationsform)
  '46fb523a-2e8f-4f8e-b61b-ff4888a76ea4': {
    expectedUnits: { e_0: '%' },
    displayOnly: true,
    notes:
      '§7.3.2.2 Gl. (17): `e_0 ≤ (C_R_CSB − C_KA_CSB)/(C_e_CSB − C_KA_CSB)·100` — CSB-Konzentrationsform der e_0-Obergrenze. KEIN Produzent von e_0 (Gl.13). ES-1 displayOnly. KEIN Gate (Feld-gegen-Feld, Nachweis-Duplikat).',
  },

  // A1022-28 · Gl.18 · §7.3.2.2 — e_0 Obergrenze (Referenzwerte 107/70/3700)
  '008a7bc7-43f2-4568-aa55-2f8431001c37': {
    expectedUnits: { e_0: '%' },
    displayOnly: true,
    notes:
      '§7.3.2.2 Gl. (18): `e_0 ≤ (107−70)/(C_e_CSB−70)·100 = 3.700/(C_e_CSB−70)` — Spezialform mit den Referenzwerten 107/70 (render-confirmed VA). KEIN Produzent von e_0 (Gl.13). ES-1 displayOnly. KEIN Gate: die DB-Formel enthält zusätzlich ein `= 3700/(…)` (Doppel-Gleichheit, kein evaluate.ts-Ausdruck) und wäre ohnehin Feld-gegen-Feld → never-invent.',
  },

  // A1022-33 · Gl.26 · §7.3.4.5 — Q_Dr Mindest-Drosselabfluss (Summenform)
  '29c268ef-33c1-4b28-8269-c06d8465729f': {
    expectedUnits: { Q_Dr: 'l/s' },
    displayOnly: true,
    notes:
      '§7.3.4.5 Gl. (26): `Q_Dr ≥ Q_T_aM + Q_R_krit + Σ Q_Dr,i` — Mindestanforderung an den Gesamt-Drosselabfluss. KEIN Produzent (Minimum-Ungleichung). ES-1 displayOnly. KEIN Gate: Formel enthält `Sum(...)` (kein SUM in evaluate.ts) und die Quelle druckt hier keine „muss"-Grenze als hartes Einzel-Gate → NR, never-invent.',
  },

  // A1022-33 · Gl.28 · §7.3.4.5 — Q_Dr Mindest-Drosselabfluss (m_Rue-Form)
  '0708808f-84f8-4b82-82f0-a8dda7977bee': {
    expectedUnits: { Q_Dr: 'l/s', m_Rue: null, Q_T_aM: 'l/s' },
    displayOnly: true,
    notes:
      '§7.3.4.5 Gl. (28): `Q_Dr ≥ (m_Rue + 1)·Q_T_aM` — bauwerksbezogene Mindestanforderung an den Drosselabfluss. KEIN Produzent (Minimum-Ungleichung, Partner von Gl.26). ES-1 displayOnly. KEIN Gate: die Quelle druckt kein eigenständiges „muss"-Q_Dr-Gate (Bemessungsminimum, A-102-2 mid-consolidation — konservativ) → never-invent, für Alvaro falls Durchsetzung gewünscht.',
  },

  // A1022-36 · Gl.22 · §7.3.4.2 — m_min_required = 7 (C_T,aM,CSB ≤ 600)
  //   [Retag/Gate liegt in 2803d00; hier NUR displayOnly, kein Re-Fix.]
  'd2d1bf8b-5e93-4ad8-963a-d297c89b2d14': {
    expectedUnits: { m: null, C_T_aM_CSB: 'mg/l' },
    displayOnly: true,
    notes:
      '§7.3.4.2 Gl. (22): `m ≥ 7 für C_T,aM,CSB ≤ 600 mg/l` — Mindestmischverhältnis (Bemessungshilfe), NICHT Produzent des mittleren m (das ist B.13/Gl.24). ES-1 displayOnly. HINWEIS: die WRITTEN-NOT-APPLIED Migration 2803d00 retaggt output_symbol m -> m_min_required und durchsetzt via REQ-24 (`m - m_min_required >= 0`, re-homed A1022-36). Hier KEIN Re-Fix — Enforcement bleibt in 2803d00; displayOnly bleibt auch nach Retag korrekt. Piecewise `if` → ENGINE-blocked (E1) für Auto-Compute.',
  },

  // A1022-36 · Gl.23 · §7.3.4.2 — m_min_required = (C_T,aM,CSB − 180)/60 (> 600)
  //   [Retag/Gate liegt in 2803d00; hier NUR displayOnly, kein Re-Fix.]
  '70ebb0c4-2db9-4405-85ef-da863172666c': {
    expectedUnits: { m: null, C_T_aM_CSB: 'mg/l' },
    displayOnly: true,
    notes:
      '§7.3.4.2 Gl. (23): `m ≥ (C_T,aM,CSB − 180)/60 für C_T,aM,CSB > 600 mg/l` — erhöhtes Mindestmischverhältnis (Bemessungshilfe), NICHT Produzent des mittleren m. ES-1 displayOnly. HINWEIS: Retag output_symbol m -> m_min_required + Durchsetzung via REQ-24 liegen in 2803d00 (WRITTEN-NOT-APPLIED) — hier kein Re-Fix. Piecewise `if` → ENGINE-blocked (E1).',
  },

  // ====================================================================
  // ES-1 TAIL — DWA-A-262E · DWA-A-222 · DWA-M-187 · DWA-M-760 · FLL-Naturteich
  //   The last five standards carrying ES-1 (inequality-as-producer) instances:
  //   the "equation's" output_symbol IS the very field being range-/minimum-
  //   checked, so the equation is a second producer of its own symbol → the
  //   engine's multi-producer collision-guard can BLANK the real producer's
  //   value or the engineer's entry. displayOnly stops the write-back; the
  //   inequality still renders as a review / sizing aid.
  //   ALL-DISPLAYONLY, NO NEW GATES on this tail — verified per instance:
  //     • A-262E: enforcement pre-exists (REQ-13 B_d_TKN<=B_A_TKN_zul, warn,
  //       tied to Gl.13/14; commit 39f2291 gate layer) — do-not-rewrite-
  //       enforcing. Q_M rows carry SUM(...) → not faithfully expressible in
  //       evaluate.ts (no SUM) → NR, never-invent.
  //     • A-222: A_NB_theo/A_NB are the REQUIRED-AREA minima themselves (the
  //       output IS the minimum); A222-14 has no separate "chosen area" field
  //       → a gate would compare a field to itself (circular). Modal is
  //       "maßgebend/ergibt sich zu" (Gl.22) / "können … Bemessungsvorgaben"
  //       (Gl.27, conditional basin type) — no hard muss on a fixed threshold.
  //       → displayOnly only; a downstream chosen-vs-required gate is FLAGGED
  //       for Alvaro, not invented.
  //     • M-187: ok_boolean is a BOOLEAN CHECK output (b_R_a/(A_F/A_b_a) ≤
  //       b_krit) → benign ES-1; displayOnly, NO gate (a gate = the invented
  //       G9 Nachweis; boolean-check outputs never get a gate). DRAFT (P3).
  //     • M-760: NS_eff (ns_fettabscheider ≥ NS) — the enforcing sizing gate
  //       REQ-M760-13 (`ns_fettabscheider - NS >= 0`, block, subtraction form)
  //       already exists (commit f9b93a4, WRITTEN-NOT-APPLIED) → displayOnly
  //       only, do-not-duplicate.
  //     • FLL-Naturteich (⚠ P5 VA-BLOCKED — markdown extraction only, NO PDF;
  //       provenance ceiling = DS, NEVER VA): filter_50x_rule_met is a boolean
  //       check → benign displayOnly; splash_water_tank_volume is a number →
  //       harmful displayOnly. Pre-existing enforcing gate REQ-33 already
  //       covers the 150 l/m² rule (block) → no new gate. F-area (wrong
  //       reference area: pool_underwater_surface vs source's inundated water
  //       surface) is a SEPARATE SEV-2/DS defect — NOT fixed here.
  //   Every threshold/modal render- or DS-confirmed against the standard's own
  //   source (A-262E/A-222/M-187/M-760 PDF+markdown; FLL markdown only).
  //   All-displayOnly ⇒ NO migration for this tail (nothing to enforce/insert).
  //   UUIDs verified against equations.id (prod read-only, 2026-07-18).
  // ====================================================================

  // --- DWA-A-262E (English, November 2017) --------------------------------

  // A262-06 · Gl. (6) · Q_M — NOT ES-1 (assignment `Q_M = f_S,QM·Q_S,d,aM + Q_F`
  // FUSED with a `≥ Σ Q_Dr,RUB` constraint tail). Left as the sole Q_M producer
  // (Gl. 8 below is displayOnly → no collision). FLAGGED for re-encoding: split
  // the assignment from the ≥-constraint (S7/malformed) — not masked with displayOnly.
  // A262-06 · Gl. (8) · Q_M reine verkettete Ungleichung (SUM)
  'c99aba1c-ea82-4294-b136-9f9ce2f1f033': {
    expectedUnits: { Q_M: 'l/s' },
    displayOnly: true,
    notes:
      '§ hydraulische Belastung (PDF/MD Z. 646): `Q_M ≥ Σ Q_Dr,RU ≥ Σ Q_krit (l/s)` — reine verkettete Ungleichung, produziert nichts (DEEP F-constraint-as-eq: Gl.8 pure chained inequality). C9-Mitproduzent von Q_M mit Gl. (6). ES-1 displayOnly. KEIN Gate: verkettetes `≥…≥` + SUM(...) → in evaluate.ts nicht ausdrückbar → NR, never-invent.',
  },

  // A262-25 · Gl. (13) · A_F_TKN_red piecewise (≥-Zweig)
  'cb011262-3770-41a8-bf27-293f19aafe90': {
    expectedUnits: { A_F_TKN_red: 'm²', B_d_TKN: 'g/(m²·d)', A_F_CSB_red: 'm²', B_A_TKN_zul: 'g/(m²·d)' },
    displayOnly: true,
    notes:
      '§4.5 (PDF/MD Z. 1098-1101): "the dimensioning requirements according to Section 4.5 apply: for B_d,TKN/A_F,CSB,red ≥ B_A,TKN,zul use: A_F,TKN,red = B_d,TKN/B_A,TKN,zul" — Produzent der reduzierten TKN-Filterfläche (kein Grenzwert). ES-1 displayOnly (C9-Mitproduzent mit Gl.14, identische RHS = Quell-Quirk, DEEP-bestätigt VA p35 450 dpi). KEIN neues Gate: die bindende Bedingung `B_d_TKN ≤ B_A_TKN_zul` ist bereits als REQ-13 (warn, A262-25) gegatet → do-not-rewrite-enforcing.',
  },
  // A262-25 · Gl. (14) · A_F_TKN_red piecewise (<-Zweig, identische RHS)
  '7e28ed89-6c72-4058-b450-fe8d14f6e1c2': {
    expectedUnits: { A_F_TKN_red: 'm²', B_d_TKN: 'g/(m²·d)', A_F_CSB_red: 'm²', B_A_TKN_zul: 'g/(m²·d)' },
    displayOnly: true,
    notes:
      '§4.5 (PDF/MD Z. 1102): "for B_d,TKN/A_F,CSB,red < B_A,TKN,zul use: A_F,TKN,red = B_d,TKN/B_A,TKN,zul" — <-Zweig des piecewise mit IDENTISCHER RHS wie Gl.13 (DEEP: Quell-Quirk, keine Encoder-Fehler, VA p35). Produzent von A_F_TKN_red, C9-Mitproduzent mit Gl.13. ES-1 displayOnly. KEIN Gate (Enforcement = REQ-13, pre-existing).',
  },

  // --- DWA-A-222 (Mai 2011, korr. Okt. 2018 · WD korr5) --------------------

  // A222-14 · Gl. (22) · A_NB_theo erforderliche NB-Fläche (Trichterbecken)
  'f5215c5e-172a-4151-8288-b4342bb9b4ca': {
    expectedUnits: { A_NB_theo: 'm²', Q_bem: 'm³/h', RV: null },
    displayOnly: true,
    notes:
      '§4.4.2 (MD Z. 818-821): "Für die Berechnung ist die theoretische Oberfläche maßgebend. Sie ergibt sich zu: A_NB,theo ≥ Q_bem·(1+RV)/2,2 (m²)" — die erforderliche Mindestfläche IST das Bemessungsergebnis (Constraint-as-Producer, DEEP C9). ES-1 displayOnly (stoppt Collision-Blank). KEIN Gate: A222-14 trägt kein separates "gewählte Fläche"-Feld (nur A_NB_theo + A_NB + nachklaerung_typ) → ein Gate vergliche das Feld mit sich selbst (zirkulär); Modal "maßgebend/ergibt sich zu" ist kein harter muss auf einen festen Schwellenwert. Ein downstream gewählt-vs-erforderlich-Gate ist FÜR ALVARO geflaggt, nicht erfunden.',
  },
  // A222-14 · Gl. (27) · A_NB erforderliche NB-Fläche (horizontal durchströmt)
  '285e3568-0773-4177-821c-9bf2ea769553': {
    expectedUnits: { A_NB: 'm²', Q_bem: 'm³/h', RV: null },
    displayOnly: true,
    notes:
      '§4.4.3 (MD Z. 863-866): "… können auch horizontal durchströmte Nachklärbecken mit den nachstehenden Bemessungsvorgaben eingesetzt werden: A_NB ≥ Q_bem·(1+RV)/2,8 (m²)" — bedingte (Beckentyp-abhängige) erforderliche Mindestfläche; die Fläche IST das Bemessungsergebnis. ES-1 displayOnly. KEIN Gate: zirkulär (kein separates Wahl-Feld) + Modal "können … Bemessungsvorgaben" ist konditional/optional, kein muss → never-invent. Geflaggt für Alvaro (wie Gl.22).',
  },

  // --- DWA-M-187 GD (Entwurf September 2025 · P3 draft) --------------------

  // M187-09 · Gl. (2) · ok_boolean AFS63-Flächenbelastungs-Nachweis
  '6b3dc34c-a3da-4cfd-9e3a-803109b1bd12': {
    expectedUnits: { b_R_a: 'kg/(m²·a)', A_F: 'm²', A_b_a: 'ha', b_krit: 'kg/(m²·a)' },
    displayOnly: true,
    notes:
      '§5.5.4 (PDF p37, render-VA): "Nachweis der zulässigen … maximal zulässigen AFS63-Filterflächenbelastung b_krit = 7 kg/(m²·a) gemäß … DWA-A 178:2019" — `b_R_a/(A_F/A_b_a) ≤ b_krit` → output_symbol = ok_boolean (BOOLEAN Prüf-Flag, kein Produzent, DEEP S7). Benigne ES-1: displayOnly, KEIN Gate (ein Gate wäre die erfundene G9-Nachweis-Anforderung; Boolean-Check-Outputs bekommen nie ein Gate). P4-adoptiert aus DWA-A 178:2019. P3-Entwurf — bei Weißdruck re-verifizieren.',
  },
  // M187-22 · Gl. (2) · ok_boolean (S3 ×2 Duplikat)
  '75d9844f-9f7f-45ba-a8fc-e2bf850be7a5': {
    expectedUnits: { b_R_a: 'kg/(m²·a)', A_F: 'm²', A_b_a: 'ha', b_krit: 'kg/(m²·a)' },
    displayOnly: true,
    notes:
      '§5.5.4 (PDF p37): `b_R_a/(A_F/A_b_a) ≤ b_krit` → ok_boolean (Boolean-Check). Benigne ES-1 displayOnly, KEIN Gate. S3-Duplikat von M187-09 Gl.2 (S3 ×2 dedup FÜR ALVARO geflaggt, nicht ausgeführt). P3-Entwurf.',
  },

  // --- DWA-M-760 WD (April 2025 · final) -----------------------------------

  // M760-09 · EQ-M760-02 · NS_eff Fettabscheider-Nenngröße ns ≥ NS
  '2ffe9ec8-e7d8-41bc-8546-6349881acb06': {
    expectedUnits: { ns_fettabscheider: null, NS: null },
    displayOnly: true,
    notes:
      '§7.2.6.3 + DIN EN 1825-2:2002 6.1 (VC, VA-blockiert): `ns_fettabscheider ≥ NS` → output NS_eff (Constraint-as-Producer, DEEP S7). ES-1 displayOnly (stoppt Collision-Blank). KEIN neues Gate: das durchsetzende Sizing-Gate REQ-M760-13 (`ns_fettabscheider - NS >= 0`, block, Subtraktionsform) existiert bereits (Commit f9b93a4, WRITTEN-NOT-APPLIED) → do-not-duplicate.',
  },
  // M760-15 · EQ-M760-02 · NS_eff (S3 ×2 Duplikat, Sizing-Worksheet)
  '12244089-c454-4436-a855-6fba6946ea86': {
    expectedUnits: { ns_fettabscheider: null, NS: null },
    displayOnly: true,
    notes:
      '§7.2.6.3 + DIN EN 1825-2:2002 6.1: `ns_fettabscheider ≥ NS` → NS_eff. ES-1 displayOnly. S3-Duplikat von M760-09 EQ-M760-02 (S3 ×2 dedup FÜR ALVARO geflaggt). Enforcement = REQ-M760-13 auf M760-15 (pre-existing, Commit f9b93a4) → KEIN neues Gate.',
  },

  // --- FLL-Naturteich (2017 2. Aufl. · ⚠ P5 VA-BLOCKED, DS-Decke, KEIN PDF) --

  // FLLNT-10 · EQ-01 · filter_50x_rule_met 50×-Regel (Boolean-Check)
  '0a875bd8-1e8f-47f2-9a38-62396ea73c70': {
    expectedUnits: { filter_colonized_surface_actual: 'm²', pool_underwater_surface: 'm²' },
    displayOnly: true,
    notes:
      '⚠ DS (kein PDF, Provenienz-Decke DS, NIE VA). §10.3.1 / App.5 (MD Z. 1569/2770/4068): "at least 50-times all visible [underwater] surfaces" → `filter_colonized_surface_actual ≥ 50·pool_underwater_surface` → output filter_50x_rule_met (BOOLEAN Prüf-Flag, DEEP S7). Benigne ES-1: displayOnly, KEIN Gate (Boolean-Check bekommt nie ein Gate; never-invent).',
  },
  // FLLNT-11 · EQ-05 · splash_water_tank_volume 150 l/m² (Zahl, harmful)
  '27f94c84-87bd-411e-a9e5-c7546c59f713': {
    expectedUnits: { splash_water_tank_volume: 'l', pool_underwater_surface: 'm²' },
    displayOnly: true,
    notes:
      '⚠ DS (kein PDF, DS-Decke, NIE VA). §10.3.1 (MD Z. 2936-2937): "The usable volume of the splash water tank must be dimensioned so that at least 150 l per square metre can be provided to the inundated water surface." → `splash_water_tank_volume ≥ 150·pool_underwater_surface` → produziert eine Zahl (harmful ES-1). displayOnly (stoppt Collision-Blank). KEIN neues Gate: das durchsetzende REQ-33 (`IF rigid_overflow_used THEN splash_water_tank_volume ≥ 150·pool_underwater_surface`, block, Guard-Grammatik evaluate.ts-unterstützt) existiert bereits → do-not-duplicate. HINWEIS F-area (SEV-2, DS): sowohl EQ-05 als auch REQ-33 nutzen pool_underwater_surface (Boden + Wandfläche) statt der Quell-Bezugsfläche inundated_water_surface (horizontale Wasserfläche) → überdimensioniert. NICHT hier gefixt (ES-1-Scope + DS-Decke + never-invent) → FÜR ALVARO geflaggt.',
  },
};
