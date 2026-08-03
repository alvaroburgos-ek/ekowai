/** @typedef {{located_clause?:string, clause_ref?:string, modal_verb?:string, threshold_in_source?:string,
 *  printed_value?:string|null, enum_domain_coverage?:string|null, field_type?:string,
 *  provenance_grade?:'VA'|'VC', edition?:string, source_quote?:string,
 *  source_enum_members?:string[]}} Evidence */
/** @typedef {{id:string, severity?:string, condition?:string, clause_reference?:string,
 *  formula?:string, output_symbol?:string}} Target */
/** @typedef {{column:string, before:any, after:any}} Change */
/** @typedef {{id:string, kind:'gate'|'equation', risk:'zero'|'low'|'med'|'high',
 *  detector:(ev:Evidence,t:Target)=>boolean, escalateIf?:(ev:Evidence,t:Target)=>boolean,
 *  resolve:(ev:Evidence,t:Target)=>Change}} Rule */

/** @type {Rule[]} */
export const RULES = [
  {
    id: 'R-CLAUSEREF', kind: 'gate', risk: 'zero',
    detector: (ev, t) => !!ev.located_clause && ev.located_clause !== ev.clause_ref,
    resolve: (ev, t) => ({ column: 'clause_reference', before: t.clause_reference, after: ev.located_clause }),
  },
];
