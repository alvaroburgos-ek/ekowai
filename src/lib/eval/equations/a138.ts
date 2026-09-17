/**
 * DWA-A-138-1 — Plan 3 Task 1 derived values as DATA for
 * `scripts/regulation-tables/emit-equations-sql.ts a138` (NEW equation rows
 * only; `ON CONFLICT DO NOTHING`). Every `verification_quote` is lifted from
 * the transcript `Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md` (line
 * in the comment). Text-only derivations (no printed formula) ship
 * `imported_unverified` and carry the printed sentence they encode.
 *
 * NOT emitted (STAGED in scripts/verification/a138-STAGED-plan3-rulings.sql):
 *   - A138-06-D1 `ac_as_ratio_limit` — bound by Plan 2b as a lookup_fill
 *     (controller amendment A; D-2b-3);
 *   - A138-06-D2 `n_M_overflow_limit` — lookup_fill shape, STAGED (a138-E-3);
 *   - A138-05-D2 `kf_test_sites_count = count_rows(kf_test_sites)` — the output
 *     is an EXISTING manual number consumed by A138-03/28; an equation would
 *     take ownership (engine read-only) and read 0 for an empty register →
 *     replacement of an input by a derived value, STAGED (a138-D-2);
 *   - `k_f = k_f_sites_min` (a138-R-2) and the Gl. 10 rewrite onto
 *     `A_C_s_flood` (a138-R-1) — replacements of prod equations/inputs.
 */
import type { EquationEntry, EquationModule } from '../field-configs/types';

const STD = 'DWA-A-138-1';

export const EQUATIONS: EquationEntry[] = [
  {
    // Tab. 3 (L741–L752): column 2 = "Versickerung ist möglich" (all seven criteria), column 3 = "potenziell möglich"
    // (one or more), column 4 = "nicht möglich" (one suffices). Criteria as printed (L745–L751) mapped to the prod
    // enum tokens of the seven A138-01/02 fields (captured a138.prior.json):
    //   L745 MHGW ≥ 1 m                → gw_clearance >= 1                         (col 3: < 1 m; no col-4 cell)
    //   L746 Altlasten                  → contaminated_land_status none / nearby / present
    //   L747 Trinkwasserschutzgebiet    → water_protection_zone == 'none' (col 2); any zone ⇒ col 3 — the col-4 cell is a
    //                                    RISK judgment ("nicht vernachlässigbar"), never auto-derived (a138-D-1)
    //   L748 k_f ≥ 1·10⁻⁶ m/s           → kf_initial_estimate >= 0.000001 (col 3/4 split needs the Ableitung/Anschluss
    //                                    fact that no field carries ⇒ col 3 only, a138-D-1)
    //   L749 geotechnische Gefährdung   → geotech_hazards none / nearby / at_site
    //   L750 Mindestabstände            → building_clearance_status met / not_met_protection_possible / not_met_no_protection
    //   L751 Hang                       → slope_risk none / unlikely / probable
    standard: STD, worksheet: 'A138-02', equation_number: 'A138-02-D1',
    formula: "feasibility_code = if(gw_clearance >= 1 AND contaminated_land_status == 'none' AND water_protection_zone == 'none' AND kf_initial_estimate >= 0.000001 AND geotech_hazards == 'none' AND building_clearance_status == 'met' AND slope_risk == 'none', 1, if(contaminated_land_status == 'present' OR geotech_hazards == 'at_site' OR building_clearance_status == 'not_met_no_protection' OR slope_risk == 'probable', 3, 2))",
    input_symbols: ['gw_clearance', 'contaminated_land_status', 'water_protection_zone', 'kf_initial_estimate', 'geotech_hazards', 'building_clearance_status', 'slope_risk'],
    output_symbol: 'feasibility_code', output_unit: null,
    clause_reference: '§5.1.1, Tab. 3',
    description: 'Plan 3: Umsetzbarkeit nach Tab. 3 als Spaltencode (1 = alle Spalte-2-Kriterien erfüllt, 3 = ein Spalte-4-Kriterium trifft zu, sonst 2); feasibility_determination bleibt manuell (a138-D-1).',
    verification_quote: 'Eine Versickerung von Niederschlagswasser ist grundsätzlich möglich, wenn alle der oben genannten Kriterien zutreffen und durch Fachgutachten nachgewiesen sind. Ist ein Kriterium nicht erfüllt sind die entsprechenden Kriterien nach Spalte 3 zu prüfen. & Wenn eine oder mehrere Kriterien dieser Kategorie zutreffen, sind technische und planerische Maßnahmen durch die Fachplanenden aufzuzeigen und ggf. mit der zuständigen Genehmigungsbehörde abzustimmen & Wenn eines der oben aufgeführten Kriterien zutrifft, ist eine Versickerung von Niederschlagswasser in der Regel nicht zulässig', // L752
  },
  {
    standard: STD, worksheet: 'A138-05', equation_number: 'A138-05-D1',
    formula: 'k_f_sites_min = min_rows(kf_test_sites, k_f_measured)',
    input_symbols: ['kf_test_sites'], output_symbol: 'k_f_sites_min', output_unit: 'm/s',
    clause_reference: '§5.3.3.6',
    description: 'Plan 3: minimaler gemessener k_f über alle Versuchsstandorte (Register kf_test_sites); Übernahme in k_f STAGED (a138-R-2).',
    verification_quote: String.raw`Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als $k_{\mathrm{f}}$-Wert verwendet.`, // L1354
  },
  {
    standard: STD, worksheet: 'A138-05', equation_number: 'A138-05-D3',
    formula: 'k_f_layer_min = min_rows(soil_layers, k_f)',
    input_symbols: ['soil_layers'], output_symbol: 'k_f_layer_min', output_unit: 'm/s',
    clause_reference: '§5.3.1',
    description: 'Plan 3: geringste Durchlässigkeit der maßgeblichen Bodenschichten (Register soil_layers).',
    verification_quote: 'Bei geschichteten Bodenprofilen sind maßgebliche Bodenschichten zu wählen, um die bemessungsrelevante Infiltrationsrate festzulegen. Die maßgeblichen Bodenschichten sind bei zentralen Versickerungsanlagen in einem Bodengutachten auszuweisen, bei dezentralen Versickerungsanlagen wird dies empfohlen. Bei oberirdischen Anlagen muss bei der Festlegung der bemessungsrelevanten In- filtrationsrate für die Bemessung die vorhandene oder geplante bewachsene Bodenzone berücksichtigt werden; die jeweils geringere Durchlässigkeit ist maßgebend.', // L1039
  },
  {
    // A_C is produced on A138-07 and NOT yet consumed on A138-08 (captured consumer_worksheets) — the consumer edit is
    // STAGED (a138-C-4); until it is applied the engine reports the missing input, never a wrong limit.
    standard: STD, worksheet: 'A138-08', equation_number: 'A138-08-D1',
    formula: "n_limit = lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')",
    input_symbols: ['schutzkategorie', 'A_C'], output_symbol: 'n_limit', output_unit: '1/a',
    clause_reference: '§5.3.3.4, Tab. 8',
    description: 'Plan 3: obere Grenze der Bemessungshäufigkeit aus Tab. 8 (Schutzkategorie × A_C ≤ / > 800 m²); Prüfung n ≤ n_limit STAGED (a138-G-4).',
    verification_quote: String.raw`Grundstücksentwässerung mit $$ A C \leqslant 800 \mathrm{~m}^{2(a)} $$ & \begin{tabular}{l} Grundstücksentwässerung mit $$ A C>800 \mathrm{~m}^{2} $$ \\ und öffentliche Entwässerung \end{tabular}`, // L1142–1151 (column heads)
  },
  {
    standard: STD, worksheet: 'A138-26', equation_number: 'A138-26-D1',
    formula: "A_C_s_flood = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_s, 0))",
    input_symbols: ['surface_inventory'], output_symbol: 'A_C_s_flood', output_unit: 'm²',
    clause_reference: '§5.3.4.1, Gl. 10',
    description: 'Plan 3: Σ(A_E,b,a · C_S) über die befestigten Zeilen des Flächenverzeichnisses (Gl.-10-Term); Umstellung von Gl. 10 STAGED (a138-R-1).',
    verification_quote: String.raw`V_{\text {Rück }}=\left(\frac{r_{\mathrm{D}(30)} \cdot\left(\sum_{i=1}^{n}\left(A_{\mathrm{E}, \mathrm{~b}, \mathrm{a}} \cdot C_{\mathrm{S}}\right)+A_{\mathrm{VA}}\right)}{10.000}-\left(Q_{\mathrm{S}}+Q_{\mathrm{Dr}}\right)\right) \cdot \frac{D \cdot 60}{1000}-V_{\mathrm{VA}} \geqslant 0 \tag{10}`, // L1501
  },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: EquationModule = { EQUATIONS };
