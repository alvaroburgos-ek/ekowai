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
    notes: '§6.5.2 Gl. (28): erforderliches MRE-Volumen. Schreibt V_MR (primär).',
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
    notes: '§6.7.2 Gl. (35): erforderliches Schachtvolumen V_S.',
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

  // A138-22 · Gl. (41) · §6.8.2 — V_VA Becken
  '433f7700-90cb-410d-8103-7b72f53db8fa': {
    expectedUnits: {
      A_C: 'm²', A_VA: 'm²', r_D_n: 'l/(s·ha)', A_S_m: 'm²',
      k_i: 'm/s', Q_Dr: 'l/s', D: 'min', f_Z: null, f_A: null,
    },
    notes: '§6.8.2 Gl. (41): Becken-Speichervolumen. Schreibt V_VA auf A138-22 (separates Feld vs Gl. 8 V_VA auf A138-13).',
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
    notes:
      '§6.3.2 Gl. (14): erforderliches Muldenspeichervolumen aus Zufluss-Versickerungs-Bilanz. Schreibt V_M (primärer Design-Wert).',
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
    notes:
      '§6.4.2 Gl. (19): erforderliches Rigolenspeichervolumen. Schreibt V_R (primär). Das eingebettete ((b+h)·L+b·h)·k_i ist hier dimensional m³/s — intern konsistent (anders als die Gl. (18)-Standalone-Falle).',
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
};
