import type { FormTemplateSpec } from '../types';

/**
 * ATV-A 704E — IGC-Card 8 "Sampling Log", Annex A (printed pp. 51–53).
 * Detection: FORM_TEMPLATE; alignment REMAP_NEEDED + MISSING_FIELDS.
 * Source spec: _site_audit/ATV-A-704E/_form_layout_spec.md (image-only scan, OCR-verified).
 * Only `sampling_method`, `sample_type`, `sample_pretreatment`, `precipitation_influence`
 * exist in WS-06 (flattened); every other form field is a GAP (encodedSymbol: null) — NOT fabricated.
 */
export const atvA704eIqcCard8: FormTemplateSpec = {
  standardCode: 'ATV-A-704E',
  title: 'IGC-Card 8 — Sampling Log',
  sourceLocation: 'IGC-Card 8, Annex A (printed pp. 51–53)',
  note: 'Footnote: observe DIN 38402 Part 11 ff and DIN EN ISO 5667-13. "Cross out where inapplicable."',
  sections: [
    {
      title: 'Information on the sampling',
      fields: [
        { label: 'Company/plant/discharger', kind: 'text', encodedSymbol: null },
        { label: 'Reason for sampling', kind: 'text', encodedSymbol: null },
        { label: 'Extent of the analysis (parameter)', kind: 'text', encodedSymbol: null },
      ],
    },
    {
      title: 'Method of sampling',
      fields: [
        { label: 'Method of sampling', kind: 'checkbox-group', options: ['manual sampling', 'automatic sampling'], encodedSymbol: 'sampling_method', remapNote: 'manual/automatic + proportional sub-options flattened into one enum (nesting lost)' },
        { label: 'Automatic — proportional', kind: 'checkbox-group', options: ['time proportional', 'volume proportional', 'flow proportional'], encodedSymbol: 'sampling_method', remapNote: 'same enum as above' },
      ],
    },
    {
      title: 'Sample count & handling',
      fields: [
        { label: 'Number of samples taken', kind: 'number', encodedSymbol: null },
        { label: 'Pre-treatment', kind: 'checkbox-group', options: ['none', 'cooled', 'added: ___'], encodedSymbol: 'sample_pretreatment', remapNote: 'encoded enum has no values; "added" free-text not captured' },
        { label: 'Influence of precipitation', kind: 'checkbox-group', options: ['yes', 'no'], encodedSymbol: 'precipitation_influence', remapNote: 'source is binary yes/no; encoding uses none/partial/full (richer than source)' },
      ],
    },
    {
      title: 'On-site assessment / measurements',
      grid: {
        title: 'On-site assessment / measurements',
        orientation: 'rows-x-columns',
        note: 'Matrix: parameter rows × N sample columns. Fields marked * are not captured in the encoding.',
        members: [
          { label: 'Sample designation', kind: 'text', encodedSymbol: null },
          { label: 'Sampling point', kind: 'text', encodedSymbol: null },
          { label: 'Date', kind: 'date', encodedSymbol: null },
          { label: 'Time', kind: 'time', encodedSymbol: null },
          { label: 'Sample type (single / random / qualified random [interval/count] / mixed from–to)', kind: 'text', encodedSymbol: 'sample_type', remapNote: 'four grid rows collapsed into one enum' },
          { label: 'Settleable substances after __ h', kind: 'number', encodedSymbol: null },
          { label: 'pH value', kind: 'number', encodedSymbol: null },
          { label: 'Conductivity at 20.0 °C', kind: 'number', unit: 'µS/cm', encodedSymbol: null },
          { label: 'Supply temperature', kind: 'number', unit: '°C', encodedSymbol: null },
          { label: 'Smell', kind: 'text', encodedSymbol: null },
          { label: 'Colour', kind: 'text', encodedSymbol: null },
          { label: 'Oxygen', kind: 'number', encodedSymbol: null },
          { label: 'Turbidity', kind: 'text', encodedSymbol: null },
          { label: 'Flow, measured', kind: 'number', unit: 'l/min', encodedSymbol: null },
          { label: 'Flow, estimated (reduced / normal / increased)', kind: 'checkbox-group', options: ['reduced', 'normal', 'increased'], encodedSymbol: null },
        ],
      },
    },
  ],
  signoff: [
    { label: 'Notes / Remarks', kind: 'textarea', encodedSymbol: null },
    { label: 'Sampling carried out by', kind: 'signature' },
  ],
};
