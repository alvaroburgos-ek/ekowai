import type { FormTemplateSpec } from '../types';

/**
 * ISO 14019-1:2026 — Table G.1 "agreed-upon procedures (AUP) report content",
 * Annex G (informative), p. 44. G.1.5 prescribes these elements be included in each
 * AUP report. Detection: FORM_TEMPLATE; alignment MISSING_FIELDS (report-content
 * structure not encoded). `informative: true` → recommended; never gates compliance.
 * Source spec: _site_audit/ISO-14019-1/_form_layout_spec.md.
 */
export const iso14019Table_G1: FormTemplateSpec = {
  standardCode: 'ISO-14019-1',
  title: 'AUP Report Content (Table G.1)',
  sourceLocation: 'Table G.1, Annex G (informative), p. 44',
  informative: true,
  note: 'Annex G is informative; G.1.5: these elements should be included in each AUP report.',
  sections: [
    {
      title: 'Title',
      fields: [{ label: 'Title that includes the word "impartial"', kind: 'text', encodedSymbol: null }],
    },
    {
      title: 'Content and roles',
      fields: [
        { label: 'Addressee (intended user(s))', kind: 'text', encodedSymbol: null },
        { label: 'Identification of the responsible party', kind: 'text', encodedSymbol: null },
        { label: 'Identification of the subject', kind: 'text', encodedSymbol: null },
        { label: 'Statement that the subject is the responsibility of the responsible party', kind: 'text', encodedSymbol: null },
        { label: 'Statement that sufficiency of the procedures is solely the intended user(s)\' responsibility', kind: 'text', encodedSymbol: null },
        { label: 'Disclaimer of the body\'s responsibility for the sufficiency of those procedures', kind: 'text', encodedSymbol: null },
      ],
    },
    {
      title: 'Methodology',
      fields: [
        { label: 'Statement that procedures were those agreed between responsible party and V/V body', kind: 'text', encodedSymbol: null },
        { label: 'Statement that the AUP was performed in accordance with [standard/programme]', kind: 'text', encodedSymbol: null },
        { label: 'Statement that the report is to be used solely by the intended user(s)', kind: 'text', encodedSymbol: null },
      ],
    },
    {
      title: 'Procedures and results',
      fields: [
        { label: 'Purpose for which the AUP were performed', kind: 'text', encodedSymbol: null },
        { label: 'Listing of the specific procedures performed', kind: 'textarea', encodedSymbol: null },
        { label: 'Where applicable, agreed-upon materiality limits', kind: 'text', encodedSymbol: null },
        { label: 'Description of factual findings incl. sufficient detail of errors and exceptions', kind: 'textarea', encodedSymbol: null },
      ],
    },
    {
      title: 'Caveats to the methodology',
      fields: [
        { label: 'Where applicable, reservations or restrictions concerning procedures or findings', kind: 'text', encodedSymbol: null },
        { label: 'Where applicable, nature of the assistance provided by a specialist', kind: 'text', encodedSymbol: null },
      ],
    },
    {
      title: 'Caveats to the AUP report',
      fields: [
        { label: 'Statement that the activities are a verification activity that does not result in a statement and provides no assurance', kind: 'text', encodedSymbol: null },
        { label: 'Statement that additional activities might have surfaced other matters', kind: 'text', encodedSymbol: null },
        { label: 'Statement that the report is designed for the intended user and not necessarily suitable for other purposes', kind: 'text', encodedSymbol: null },
      ],
    },
  ],
  signoff: [
    { label: 'Date of the report', kind: 'date', encodedSymbol: null },
    { label: 'Body\'s address', kind: 'text', encodedSymbol: null },
    { label: 'Body\'s signature', kind: 'signature' },
  ],
};
