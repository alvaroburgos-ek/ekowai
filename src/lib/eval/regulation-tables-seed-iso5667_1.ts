/**
 * ISO-5667-1 regulation-table seed builders (Plan 3 Task 28, 2026-09-24).
 *
 * SR-1 / SR-3: every seeded value and every `verbatim_quote` was read in this session from an
 * IN-SESSION `pdftotext -layout` extraction of the standard's own PDF
 * `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-1\ISO-5667-1.pdf`
 * (NTC-ISO 5667-1:1995 — the Colombian/ICONTEC adoption of ISO 5667/1:1980, Spanish). That is the
 * doctrine's VA path: a PDF-derived quote WITH a PDF page number. The spans live in
 * `regulation-tables-quotes-iso5667_1.ts` (generated mechanically by line range, never retyped); each
 * span's doc comment names the PDF page (form-feed mapping) and the page the document itself prints.
 * The extraction is NOT committed — the command, its byte/page counts and the page-mapping method are
 * in `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-iso5667_1.md`.
 *
 * Edition (iso5667_1-J-1): the cover page prints "NTC-ISO 5667-1 / 1995-05-10" (L1–L5) and the
 * DOCUMENTO DE REFERENCIA prints "Geneva, 1980, 16 pp. (ISO 5667/1, 1980)" (L1099–L1100). Prod
 * `standards.version` is "1980 (ISO 5667/1:1980; adopted as NTC-ISO 5667-1:1995)" (read-only
 * 2026-09-24) → token `'1980'`. EVERY quote in this module is from the 1980 edition; a clause number
 * of the CURRENT ISO 5667-1 may differ (the sign-off block carries the caveat).
 *
 * verification_status (iso5667_1-J-2): the corpus vocabulary is `md_verified` (every row lifted from a
 * markdown transcript) / `imported_unverified`. There is NO markdown transcript for this standard, so
 * `md_verified` would be factually wrong, and a third token `pdf_verified` is NOT introduced
 * unilaterally — every table here therefore ships the fail-safe `imported_unverified`, and the
 * sign-off proposes `pdf_verified` with the exact UPDATE SQL.
 *
 * Four tables, all printed:
 *   - S16_4_K   — §16.4 K per confidence level (the ONE printed numeric table of the standard).
 *   - S21       — §21 flow-measurement method catalogue, keyed (aspect, method).
 *   - S8_6      — §8.6 minimum nominal bore for heterogeneous liquids (sentence rule).
 *   - S12_1_2   — §12.1.2 minimum sludge sampling-pipe diameter (sentence rule).
 *
 * Unreadable / ambiguous cells (recorded, nothing corrected):
 *   - iso5667_1-U-1: the radical and the summation of the printed §16.4 s-formula and of the §16.5
 *     L-formula are LOST by pdftotext (L813–L822 renders the fraction bar as "S =" over "n −1";
 *     L871–L881 renders "L = 2 Kσ / n" without the √). No seeded CELL depends on either: the s / L
 *     math stays in prod's own verified equations 1 / 2. The divisor `n − 1` IS printed and readable
 *     (L822) — that is the only thing the seed relies on (it settles `stdev_rows`' sample form).
 *   - iso5667_1-U-2: the superscript of "(2Kσ/L)2" (L855–L856) renders inline, i.e. the exponent is
 *     not typographically marked. No seeded cell depends on it either (prod equation 3 already stores
 *     `(2 * K * sigma / L)^2`, and the printed worked example L886–L906 reproduces 61 from 7,84²).
 */
import type { RegulationTable, RegulationRow } from './regulation-tables';
import { Q } from './regulation-tables-quotes-iso5667_1';

const STD = 'ISO-5667-1';
export const ISO5667_1_EDITION = '1980';
const ED = ISO5667_1_EDITION;
/** iso5667_1-J-2: PDF-derived (VA) but the corpus has no token for it — the fail-safe lower token ships. */
const STATUS = 'imported_unverified' as const;

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Build-time SR-1 guard: every seeded cell text must be printed inside the named span (whitespace-collapsed). */
function inSpan(quote: string, cell: string | null, where: string): void {
  if (cell !== null && !collapse(quote).includes(collapse(cell))) throw new Error(`${where}: cell "${cell}" is not inside its verbatim span`);
}

// ---------------------------------------------------------------------------
// S16_4_K — §16.4 (PDF p.12, printed p.11). The ONE printed numeric table:
//
//     Nivel de confianza   99     98     95     90     80     68     50
//              K          2,58   2,33   1,96   1,64   1,28   1,00   0,67
//
// The printed table is COLUMN-oriented (a header line of confidence levels over a line of K values),
// so a seeded ROW corresponds to a printed COLUMN and there is no per-row line to quote: every row's
// `verbatim_quote` is the WHOLE printed table span (L844–L846), and `inSpan` asserts at build time
// that the row's level token AND its K value both occur inside it. Key tokens are the prod
// `confidence_level` enum `value` strings, byte-identical (D-1 / G-A3): 99 / 98 / 95 / 90 / 80 / 68 / 50.
//
// Policy `locked`: L839–L840 prints "el intervalo de confianza de X , calculado a partir de algún
// número de resultados n, es X ± K/n, donde K tiene el valor dado en la siguiente tabla, dependiendo
// del nivel de confianza adoptado" — "tiene el valor dado" ⇒ no override. SR-2 is respected because
// the ENGINEER still selects `confidence_level`; the table only supplies the K that follows from it.
// ---------------------------------------------------------------------------
export const S16_4_K_ROWS = [
  { confidence_level: '99', k: 2.58, printed: '2,58' },
  { confidence_level: '98', k: 2.33, printed: '2,33' },
  { confidence_level: '95', k: 1.96, printed: '1,96' },
  { confidence_level: '90', k: 1.64, printed: '1,64' },
  { confidence_level: '80', k: 1.28, printed: '1,28' },
  { confidence_level: '68', k: 1.0, printed: '1,00' },
  { confidence_level: '50', k: 0.67, printed: '0,67' },
] as const;
export function s164KAsTable(): RegulationTable {
  inSpan(Q.L844_846, 'Nivel de confianza', 'S16_4_K header');
  const rows: RegulationRow[] = S16_4_K_ROWS.map((r, i) => {
    inSpan(Q.L844_846, r.confidence_level, `S16_4_K ${r.confidence_level} level`);
    inSpan(Q.L844_846, r.printed, `S16_4_K ${r.confidence_level} value`);
    return {
      row_key: r.confidence_level,
      keys: { confidence_level: r.confidence_level },
      group_label: null,
      label_de: `Vertrauensniveau ${r.confidence_level} % → K = ${r.printed}`,
      order_index: i,
      values: { k: r.k, k_printed: r.printed },
      verbatim_quote: Q.L844_846,
    };
  });
  return {
    standard_code: STD, edition: ED, table_code: 'S16_4_K',
    title_de: 'Faktor K je Vertrauensniveau (§16.4: 99 / 98 / 95 / 90 / 80 / 68 / 50 → 2,58 / 2,33 / 1,96 / 1,64 / 1,28 / 1,00 / 0,67)',
    clause_reference: '§16.4', page_ref: 'PDF p.12 (gedruckte S. 11)',
    key_columns: ['confidence_level'],
    value_columns: [{ name: 'k', type: 'number' }, { name: 'k_printed', type: 'string' }],
    override_policy: 'locked',
    override_quote: Q.L837_840,
    verification_status: STATUS, rows,
  };
}

// ---------------------------------------------------------------------------
// S21 — §21 "MÉTODOS DISPONIBLES PARA LA MEDICIÓN DEL FLUJO" (PDF pp.15–16, printed pp.14–15),
// keyed (aspect, method). `aspect` tokens are the prod `flow_aspect` enum values
// (direction / velocity / discharge — §19.1 L941–L947 prints exactly three aspects); `method` tokens
// are the prod `flow_measurement_method` enum values (15), byte-identical (D-1 / G-A3). Value column
// `valid` = 1: the combination IS printed under that aspect. A combination the standard does NOT print
// has NO row — `lookup()` then returns null and the register's `method_ok` cell stays BLANK rather than
// reading 0 (probed in this session; iso5667_1-F-1 carries the raw output and the engine proposal).
//
// §21.2 (L1041) reads "La dirección y la velocidad se pueden medir utilizando:" — its five items are
// printed for BOTH `direction` and `velocity`. §21.3 (L1053) "La velocidad también se puede medir
// utilizando:" adds four for `velocity`. §21.4 (L1064) "La descarga se puede determinar utilizando:"
// gives the `discharge` set; its item a) (L1066–L1067) is a cross-reference to §21.3 inside the SAME
// document, and the two §21.3 methods not repeated under d) (current_meter, pneumatic) are seeded
// through it — flagged `via_cross_reference` in the row values and carried as iso5667_1-J-4 so the
// owner can drop those two rows with one DELETE if the cross-reference reading is rejected.
//
// Policy `kann`: L1041 / L1053 / L1064 print "se pueden medir" / "se puede determinar" — a list of
// printed alternatives. No `override` sidecar is wired on the register: the `method` column IS the
// choice among the printed alternatives (a `kann` table read by a derived column, gap G-1).
// ---------------------------------------------------------------------------
type S21Row = { aspect: 'direction' | 'velocity' | 'discharge'; method: string; label: string; quote: string; cell: string; cross?: true };
export const S21_ROWS: readonly S21Row[] = [
  // §21.2 a) – e): direction AND velocity
  { aspect: 'direction', method: 'drogue', label: 'Richtung · Dragas (Schleppkörper)', quote: Q.L1043, cell: 'Dragas.' },
  { aspect: 'direction', method: 'float_trawl', label: 'Richtung · Flotadores y barcos con redes rastreras', quote: Q.L1044, cell: 'Flotadores y barcos con redes rastreras.' },
  { aspect: 'direction', method: 'chemical_tracer', label: 'Richtung · Trazas químicas (incluyendo tinturas)', quote: Q.L1046, cell: 'Trazas químicas (incluyendo tinturas).' },
  { aspect: 'direction', method: 'microbiological_tracer', label: 'Richtung · Trazadores microbiológicos', quote: Q.L1048, cell: 'Trazadores microbiológicos.' },
  { aspect: 'direction', method: 'radioactive_tracer', label: 'Richtung · Trazadores radiactivos', quote: Q.L1050, cell: 'Trazadores radiactivos.' },
  { aspect: 'velocity', method: 'drogue', label: 'Geschwindigkeit · Dragas (Schleppkörper)', quote: Q.L1043, cell: 'Dragas.' },
  { aspect: 'velocity', method: 'float_trawl', label: 'Geschwindigkeit · Flotadores y barcos con redes rastreras', quote: Q.L1044, cell: 'Flotadores y barcos con redes rastreras.' },
  { aspect: 'velocity', method: 'chemical_tracer', label: 'Geschwindigkeit · Trazas químicas (incluyendo tinturas)', quote: Q.L1046, cell: 'Trazas químicas (incluyendo tinturas).' },
  { aspect: 'velocity', method: 'microbiological_tracer', label: 'Geschwindigkeit · Trazadores microbiológicos', quote: Q.L1048, cell: 'Trazadores microbiológicos.' },
  { aspect: 'velocity', method: 'radioactive_tracer', label: 'Geschwindigkeit · Trazadores radiactivos', quote: Q.L1050, cell: 'Trazadores radiactivos.' },
  // §21.3 a) – d): velocity only
  { aspect: 'velocity', method: 'current_meter', label: 'Geschwindigkeit · Medidores de la corriente (Messflügel)', quote: Q.L1056, cell: 'Medidores de la corriente, tipos de lectura directa y registro.' },
  { aspect: 'velocity', method: 'ultrasonic', label: 'Geschwindigkeit · Técnicas ultrasónicas', quote: Q.L1058, cell: 'Técnicas ultrasónicas.' },
  { aspect: 'velocity', method: 'electromagnetic', label: 'Geschwindigkeit · Técnicas electromagnéticas', quote: Q.L1060, cell: 'Técnicas electromagnéticas.' },
  { aspect: 'velocity', method: 'pneumatic', label: 'Geschwindigkeit · Técnicas neumáticas', quote: Q.L1062, cell: 'Técnicas neumáticas.' },
  // §21.4 a) – e): discharge
  { aspect: 'discharge', method: 'current_meter', label: 'Abfluss · Geschwindigkeitsmessung nach §21.3 im Querschnitt bekannter Fläche', quote: Q.L1066_1067, cell: 'Mediciones de la velocidad, tales como las mencionadas en el numeral 21.3 efectuadas en un canal cuya área de sección transversal sea conocida.', cross: true },
  { aspect: 'discharge', method: 'pneumatic', label: 'Abfluss · Geschwindigkeitsmessung nach §21.3 im Querschnitt bekannter Fläche', quote: Q.L1066_1067, cell: 'Mediciones de la velocidad, tales como las mencionadas en el numeral 21.3 efectuadas en un canal cuya área de sección transversal sea conocida.', cross: true },
  { aspect: 'discharge', method: 'mechanical', label: 'Abfluss · Medios mecánicos directos (balde basculador, medidor estándar de agua)', quote: Q.L1074, cell: 'Medios mecánicos directos, tales como un balde basculador o un medidor estándar de agua.' },
  { aspect: 'discharge', method: 'weir_level', label: 'Abfluss · Wasserstand über einer Einengung (Wehr)', quote: Q.L1076_1077, cell: 'Medición del nivel de agua por encima de una restricción en el flujo, tal como una presa para canal de agua.' },
  { aspect: 'discharge', method: 'venturi', label: 'Abfluss · Druckdifferenz über einer Venturi-Düse (geschlossene Leitung)', quote: Q.L1086, cell: 'Diferencias de presión a través de una tobera de venturi.' },
  { aspect: 'discharge', method: 'orifice_plate', label: 'Abfluss · Druckdifferenz über einer Blende (geschlossene Leitung)', quote: Q.L1088, cell: 'Diferencias de presión a través de una placa de orificio.' },
  { aspect: 'discharge', method: 'pumping_rate', label: 'Abfluss · Pumpenförderstrom × Pumpdauer (geschlossene Leitung)', quote: Q.L1090, cell: 'Tasa de bombeo, multiplicada por la duración del bombeo.' },
  { aspect: 'discharge', method: 'electromagnetic', label: 'Abfluss · Elektromagnetische Technik (geschlossene Leitung)', quote: Q.L1092, cell: 'Técnicas electromagnéticas, ultrasónicas y de otra índole.' },
  { aspect: 'discharge', method: 'ultrasonic', label: 'Abfluss · Ultraschalltechnik (geschlossene Leitung)', quote: Q.L1092, cell: 'Técnicas electromagnéticas, ultrasónicas y de otra índole.' },
  { aspect: 'discharge', method: 'dilution_gauging', label: 'Abfluss · Calibrador de dilución (Verdünnungsmessung)', quote: Q.L1095, cell: 'Calibrador de dilución, para medir en un sitio las descargas en los cursos de agua naturales.' },
] as const;
export function s21AsTable(): RegulationTable {
  const seen = new Set<string>();
  const rows: RegulationRow[] = S21_ROWS.map((r, i) => {
    inSpan(r.quote, r.cell, `S21 ${r.aspect}/${r.method}`);
    const row_key = `${r.aspect}|${r.method}`;
    if (seen.has(row_key)) throw new Error(`S21: duplicate row_key ${row_key}`);
    seen.add(row_key);
    return {
      row_key,
      keys: { aspect: r.aspect, method: r.method },
      group_label: r.aspect,
      label_de: r.label,
      order_index: i,
      values: { valid: 1, printed_item: collapse(r.cell), via_cross_reference: r.cross === true },
      verbatim_quote: r.quote,
    };
  });
  return {
    standard_code: STD, edition: ED, table_code: 'S21',
    title_de: 'Verfügbare Durchflussmessverfahren je Strömungsaspekt (§21.2 Richtung/Geschwindigkeit, §21.3 Geschwindigkeit, §21.4 Abfluss)',
    clause_reference: '§21.2, §21.3, §21.4', page_ref: 'PDF pp.15–16 (gedruckte S. 14–15)',
    key_columns: ['aspect', 'method'],
    value_columns: [{ name: 'valid', type: 'number' }, { name: 'printed_item', type: 'string' }, { name: 'via_cross_reference', type: 'boolean' }],
    override_policy: 'kann',
    override_quote: `${Q.L1041} — ${Q.L1053} — ${Q.L1064}`,
    verification_status: STATUS, rows,
  };
}

// ---------------------------------------------------------------------------
// S8_6 — §8.6 "MUESTREO EN TUBOS" (PDF p.5, printed p.4), the printed 25 mm minimum nominal bore.
// One row keyed by the printed case. Policy `anhaltswert`: the figure stands inside a parenthetical
// "(por ejemplo, al muestrear líquidos heterogéneos, de conducto nominal mínimo de 25 mm)" — a printed
// EXAMPLE, not a "debe". Prod CR-012 nevertheless enforces `pipe_nominal_bore >= 25` at severity
// `block`; that severity rests on reading a "por ejemplo" as normative and is a sign-off item
// (iso5667_1-J-3), never changed here.
// ---------------------------------------------------------------------------
export function s86AsTable(): RegulationTable {
  inSpan(Q.L320_324, 'de conducto nominal mínimo de 25 mm', 'S8_6 bore');
  return {
    standard_code: STD, edition: ED, table_code: 'S8_6',
    title_de: 'Mindest-Nennweite des Probenahmerohrs bei heterogenen Flüssigkeiten (§8.6: 25 mm)',
    clause_reference: '§8.6', page_ref: 'PDF p.5 (gedruckte S. 4)',
    key_columns: ['case'],
    value_columns: [{ name: 'min_nominal_bore_mm', type: 'number', unit: 'mm' }],
    override_policy: 'anhaltswert',
    override_quote: Q.L320_324,
    verification_status: STATUS,
    rows: [{
      row_key: 'heterogeneous', keys: { case: 'heterogeneous' }, group_label: null,
      label_de: 'Heterogene Flüssigkeiten — Nennweite mindestens 25 mm', order_index: 0,
      values: { min_nominal_bore_mm: 25 }, verbatim_quote: Q.L320_324,
    }],
  };
}

// ---------------------------------------------------------------------------
// S12_1_2 — §12.1.2 "Lodos de tratamiento de aguas residuales domiciliarias" (PDF p.10, printed p.9),
// the printed 50 mm minimum sampling-conduit diameter. Policy `locked`: "el conducto del muestreo
// DEBE tener al menos 50 mm de diámetro" (L688–L689) — a "debe", no override.
// ---------------------------------------------------------------------------
export function s1212AsTable(): RegulationTable {
  inSpan(Q.L686_689, 'debe tener al menos 50 mm de diámetro', 'S12_1_2 diameter');
  return {
    standard_code: STD, edition: ED, table_code: 'S12_1_2',
    title_de: 'Mindestdurchmesser der Schlamm-Probenahmeleitung (§12.1.2: 50 mm)',
    clause_reference: '§12.1.2', page_ref: 'PDF p.10 (gedruckte S. 9)',
    key_columns: ['case'],
    value_columns: [{ name: 'min_diameter_mm', type: 'number', unit: 'mm' }],
    override_policy: 'locked',
    override_quote: Q.L686_689,
    verification_status: STATUS,
    rows: [{
      row_key: 'sludge_pipe', keys: { case: 'sludge_pipe' }, group_label: null,
      label_de: 'Schlammprobenahme aus einer Rohrleitung — Durchmesser mindestens 50 mm', order_index: 0,
      values: { min_diameter_mm: 50 }, verbatim_quote: Q.L686_689,
    }],
  };
}

export function iso56671SeedTables(): RegulationTable[] {
  return [s164KAsTable(), s21AsTable(), s86AsTable(), s1212AsTable()];
}
