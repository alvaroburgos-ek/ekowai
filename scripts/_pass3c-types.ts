// Domain objects that mirror Pass3c xlsx sheet rows.
// One type per sheet. Field names match xlsx column headers.
// Conversion to DB-row shape happens in _pass3c-db.ts.

export type StandardRow = {
  standard_code: string;
  title_de: string;
  title_en: string | null;
  issuer: string | null;
  edition: string;
  domain: string | null;
  status: string | null;
  notes: string | null;
};

export type WorksheetRow = {
  worksheet_code: string;
  standard_code: string;
  title_de: string;
  title_en: string | null;
  phase: number | null;
  archetype: 'registration' | 'data_collection' | 'calculation' | 'summary' | 'verification' | null;
  section_refs: string | null;
  equation_refs: string | null;
  order_index: number;
  description: string | null;
  verification_status: string | null;
};

export type SectionRow = {
  worksheet_code: string;
  section_code: string;
  parent_section_code: string | null;
  title: string;
  order_index: number;
  purpose: string | null;
  verification_status: string | null;
};

export type FieldRow = {
  symbol: string;
  label_de: string;
  label_en: string | null;
  unit: string | null;
  data_type: 'number' | 'text' | 'enum' | 'date' | 'boolean' | 'json';
  kind: string | null;
  origin_worksheet: string;
  origin_section: string | null;
  consumer_worksheets: string | null;   // comma-separated, parsed to text[]
  equation_refs: string | null;
  required: string | null;              // "yes"/"no"/"true"/"false" — parsed to boolean
  validation_rules: string | null;      // free-form text, stored as JSONB { raw }
  regulation_reference: string | null;
  description: string | null;
  verification_status: string | null;
  notes: string | null;
  owner: string | null;
  xbrl_element_id: string | null;
};

export type EnumValueRow = {
  enum_name: string;
  value: string;
  label_de: string | null;
  label_en: string | null;
  order_index: number;
  regulation_reference: string | null;
  notes: string | null;
};

export type EquationRow = {
  equation_number: string;
  standard_code: string;
  description_de: string | null;
  description_en: string | null;
  formula: string;
  input_symbols: string | null;     // comma-separated → text[]
  output_symbol: string | null;
  regulation_reference: string | null;
  used_in_worksheet: string;
  verification_status: string | null;
  notes: string | null;
};

export type ComplianceRow = {
  requirement_code: string;
  standard_code: string;
  /** Optional explicit host worksheet. Absent → legacy phase fallback. */
  worksheet_code: string | null;
  title: string;
  description: string | null;
  evaluation_type: string | null;
  required_field_symbols: string | null;
  evaluation_expression: string | null;  // null for field_presence type (uses required_field_symbols)
  pass_condition: string | null;
  severity: string | null;  // 'warn' = advisory (non-blocking); anything else/absent → 'block'
  regulation_reference: string | null;
  phase: number | null;
  order_index: number | null;
  verification_status: string | null;
};

/** The whole parsed workbook before validation + DB write. */
export type ParsedWorkbook = {
  standard: StandardRow;
  worksheets: WorksheetRow[];
  sections: SectionRow[];
  fields: FieldRow[];
  enumValues: EnumValueRow[];
  equations: EquationRow[];
  complianceRequirements: ComplianceRow[];
};
