import { getTab9Entries } from './tab9';
import { FLAECHENGRUPPE_CODES, flaechengruppeToTier, tab6Limit } from './tab6-loading';
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DWA-A-138-1'; const ED = '2024-10';
const GROUP_LABEL: Record<1 | 2 | 3, string> = { 1: 'Wasserundurchlässige Flächen', 2: 'Teildurchlässige / schwach ableitende Flächen', 3: 'Durchlässige Flächen' };

export function tab9AsTable(): RegulationTable {
  const rows: RegulationRow[] = getTab9Entries().map((e, i) => ({
    row_key: e.value, keys: { surface_type: e.value }, group_label: GROUP_LABEL[e.group], label_de: e.label, order_index: i,
    values: { cm: e.cm, cs: e.cs, kind: e.kind, group: e.group },
    verbatim_quote: `Tab. 9: ${e.label} — C_m ${e.cm.toFixed(1).replace('.', ',')} / C_s ${e.cs.toFixed(1).replace('.', ',')}`,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB9', title_de: 'Abflussbeiwerte je Oberflächentyp', clause_reference: '§5.3.3.5, Tab. 9', page_ref: null,
    key_columns: ['surface_type'], value_columns: [{ name: 'cm', type: 'number' }, { name: 'cs', type: 'number' }, { name: 'kind', type: 'enum', values: ['paved', 'unpaved'] }, { name: 'group', type: 'number' }],
    override_policy: 'anhaltswert', override_quote: 'C_i – Abflussbeiwert der Teilfläche, zum Beispiel gemäß Tabelle 9 (Gl. 2 Legende); §5.3.3.5 Anpassung für durchlässige Flächen',
    verification_status: 'engineer_verified', rows };
}
export function tab5AsTable(): RegulationTable {
  const rows: RegulationRow[] = FLAECHENGRUPPE_CODES.map((c, i) => ({ row_key: c, keys: { flaechengruppe: c }, group_label: null, label_de: c, order_index: i, values: { tier: flaechengruppeToTier(c) }, verbatim_quote: `Tab. 5 Kurzzeichen ${c}` }));
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Flächengruppen (Kurzzeichen) → Behandlungsanforderung', clause_reference: '§5.2.3, Tab. 5/6', page_ref: null,
    key_columns: ['flaechengruppe'], value_columns: [{ name: 'tier', type: 'enum', values: ['tier1_none', 'tier2', 'tier3', 'authority'] }], override_policy: 'locked', override_quote: null, verification_status: 'imported_unverified', rows };
}
export function tab6AsTable(): RegulationTable {
  const rows: RegulationRow[] = [];
  let i = 0;
  for (const tier of ['tier2', 'tier3'] as const) for (const [band, th] of [['thin', 0.2], ['thick', 0.3]] as const) {
    const lim = tab6Limit(tier, th);
    if (lim.kind !== 'limit') throw new Error('tab6Limit must be numeric for tier2/tier3');
    rows.push({ row_key: `${tier}|${band}`, keys: { tier, bbz_band: band }, group_label: null, label_de: `${tier === 'tier2' ? 'BK II' : 'BK III'}, ${band === 'thin' ? '< 0,30 m' : '≥ 0,30 m'}`, order_index: i++, values: { max: lim.max }, verbatim_quote: `Tab. 6: A_C/A_S,m ≤ ${lim.max} (${band === 'thin' ? 'BBZ < 0,30 m' : 'BBZ ≥ 0,30 m'})` });
  }
  return { standard_code: STD, edition: ED, table_code: 'TAB6', title_de: 'Max. A_C/A_S,m nach Behandlungsanforderung und BBZ-Mächtigkeit', clause_reference: '§5.2.3.2, Tab. 6', page_ref: null,
    key_columns: ['tier', 'bbz_band'], value_columns: [{ name: 'max', type: 'number' }], override_policy: 'locked', override_quote: null, verification_status: 'imported_unverified', rows };
}
export function tab13AsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'mittel_feinsand', keys: { bodenart: 'mittel_feinsand' }, group_label: null, label_de: 'Mittel-/Feinsand', order_index: 0, values: { factor: 0.10 }, verbatim_quote: 'Tab. 13: A_S,m = 0,10 · A_C (Mittel-/Feinsand)' },
    { row_key: 'schluffig', keys: { bodenart: 'schluffig' }, group_label: null, label_de: 'schluffig', order_index: 1, values: { factor: 0.20 }, verbatim_quote: 'Tab. 13: A_S,m = 0,20 · A_C (schluffig)' },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TAB13', title_de: 'Überschlägige Bemessung A_S,m nach Bodenart', clause_reference: 'Anhang A, Tab. 13', page_ref: null,
    key_columns: ['bodenart'], value_columns: [{ name: 'factor', type: 'number' }], override_policy: 'locked', override_quote: null, verification_status: 'imported_unverified', rows };
}
export function a138SeedTables(): RegulationTable[] { return [tab9AsTable(), tab5AsTable(), tab6AsTable(), tab13AsTable()]; }
