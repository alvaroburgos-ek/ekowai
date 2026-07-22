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
};
