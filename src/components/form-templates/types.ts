/**
 * Source-form layout templates.
 *
 * These types describe a regulatory source document's *fillable form / log /
 * protocol / prescribed report layout* (a FORM_TEMPLATE per the detection pass)
 * so the front end can render it in the source's own field order, grouping, and
 * sign-off structure.
 *
 * Discipline: a spec mirrors ONLY what the source prints. A field that the source
 * form has but the DB encoding does NOT capture is marked `encodedSymbol: null`
 * (a GAP) — it is rendered as an explicit "not captured in encoding" placeholder,
 * never fabricated as a real bound field. `informative: true` marks a recommended
 * (e.g. informative-annex) layout that must NOT gate compliance.
 */

export type FieldKind =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'textarea'
  | 'checkbox'
  | 'checkbox-group'
  | 'signature';

export interface FormFieldSpec {
  /** Label exactly as the source prints it (source language). */
  label: string;
  kind: FieldKind;
  /** Unit as printed in the source, if any (e.g. "µS/cm", "l/min", "°C"). */
  unit?: string;
  /** For checkbox-group: the option labels in source order. */
  options?: string[];
  /**
   * The DB field symbol this maps to, or `null` when the source field is NOT
   * encoded anywhere (a GAP — must be surfaced, never fabricated). Omit for
   * structural elements (signature lines, static statements) that are not data.
   */
  encodedSymbol?: string | null;
  /** Why the mapping is imperfect, e.g. "flattened into a single enum". */
  remapNote?: string;
  /** Optional per-field source citation. */
  source?: string;
}

export interface RepeatingGridSpec {
  title: string;
  /**
   * 'rows-x-columns' = fixed parameter rows × N sample columns (ATV IGC-Card 8).
   * 'columns-x-rows' = fixed columns × N repeating rows (ISO 5667-6 Tabla B.2).
   */
  orientation: 'rows-x-columns' | 'columns-x-rows';
  /** Parameter rows (orientation rows-x-columns) or column headers (columns-x-rows). */
  members: FormFieldSpec[];
  note?: string;
}

export interface SectionSpec {
  title: string;
  /** Simple labelled fields, in source order. */
  fields?: FormFieldSpec[];
  /** A repeating grid (matrix / log table). */
  grid?: RepeatingGridSpec;
}

export interface FormTemplateSpec {
  standardCode: string;
  /** Form title as printed in the source. */
  title: string;
  /** Verbatim source location (annex / card / table no. + page). */
  sourceLocation: string;
  /**
   * true → the source layout is recommended/informative (e.g. an informative
   * annex). The renderer shows a non-gating banner; it must never block compliance.
   */
  informative?: boolean;
  /** Optional note shown under the title (e.g. licensing/copy permission). */
  note?: string;
  sections: SectionSpec[];
  /** Sign-off block (date / address / signature), in source order. */
  signoff?: FormFieldSpec[];
}
