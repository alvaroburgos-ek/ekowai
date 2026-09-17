/**
 * DWA-A-138-1 regulation-table seed builders.
 *
 * Two generations live here on purpose (Plan 3 Task 1, 2026-09-17):
 *
 *   - `a138Plan1SeedTables()` — the FROZEN Plan-1 set (TAB9/5/6/13 with quotes
 *     synthesised from the TS constants). It reproduces the Plan-1 migration
 *     `20260911110000_regulation_tables_seed_a138.sql` byte-for-byte (pinned by
 *     scripts/__tests__/generated-sql-freshness.test.ts) and is what the Plan-3
 *     rollback re-emits. Never edit its output.
 *   - `a138SeedTables()` — the LIVE Plan-3 set (nine tables): the four Plan-1
 *     tables upgraded with `verbatim_quote` lifted line-by-line from the
 *     transcript `Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md`
 *     (line numbers in the comments; verified by
 *     scripts/regulation-tables/verify-regulation-tables.ts a138_p3), plus
 *     TAB7, TAB8, TAB11, TAB14 and S6_4_2_QVS. Emitted as
 *     `20260917100100_regulation_tables_seed_a138_p3.sql` (supersedes the Plan-1
 *     file via ON CONFLICT DO UPDATE); registered as SEED_BUILDERS.a138_p3 with
 *     `supersedes: 'a138'` so the deploy-before-seed fallback serves this set.
 *
 * SR-1: every seeded value is read from the quoted transcript line in the same
 * session that wrote it. Value-parity pins (TAB9 ≡ tab9.ts, TAB5 tier ≡
 * flaechengruppeToTier, TAB6 max ≡ tab6Limit, TAB13 ≡ computeSoilEstimate) live
 * in src/lib/eval/__tests__/regulation-tables-seed-a138.test.ts.
 */
import { getTab9Entries } from './tab9';
import { FLAECHENGRUPPE_CODES, flaechengruppeToTier, tab6Limit, type FlaechengruppeCode } from './tab6-loading';
import type { RegulationTable, RegulationRow } from './regulation-tables';

const STD = 'DWA-A-138-1'; const ED = '2024-10';
const GROUP_LABEL: Record<1 | 2 | 3, string> = { 1: 'Wasserundurchlässige Flächen', 2: 'Teildurchlässige / schwach ableitende Flächen', 3: 'Durchlässige Flächen' };
/** Full-precision de-DE formatter (comma decimal separator, no rounding) — e.g. 0.9 → "0,9", 1 → "1", 0.25 → "0,25".
 *  toFixed(1) would round 0.25 to "0,3" and misstate the printed value (SR-1 violation); this preserves the exact figure. */
const de = (n: number): string => String(n).replace('.', ',');

// ---------------------------------------------------------------------------
// Plan-1 builders — FROZEN (reproduce 20260911110000_regulation_tables_seed_a138.sql; re-emitted by the Plan-3 rollback)
// ---------------------------------------------------------------------------

export function tab9AsTablePlan1(): RegulationTable {
  const rows: RegulationRow[] = getTab9Entries().map((e, i) => ({
    row_key: e.value, keys: { surface_type: e.value }, group_label: GROUP_LABEL[e.group], label_de: e.label, order_index: i,
    values: { cm: e.cm, cs: e.cs, kind: e.kind, group: e.group },
    verbatim_quote: `Tab. 9: ${e.label} — C_m ${de(e.cm)} / C_s ${de(e.cs)}`,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB9', title_de: 'Abflussbeiwerte je Oberflächentyp', clause_reference: '§5.3.3.5, Tab. 9', page_ref: null,
    key_columns: ['surface_type'], value_columns: [{ name: 'cm', type: 'number' }, { name: 'cs', type: 'number' }, { name: 'kind', type: 'enum', values: ['paved', 'unpaved'] }, { name: 'group', type: 'number' }],
    override_policy: 'anhaltswert', override_quote: 'C_i – Abflussbeiwert der Teilfläche, zum Beispiel gemäß Tabelle 9 (Gl. 2 Legende); §5.3.3.5 Anpassung für durchlässige Flächen',
    verification_status: 'imported_unverified', rows };
}
export function tab5AsTablePlan1(): RegulationTable {
  const rows: RegulationRow[] = FLAECHENGRUPPE_CODES.map((c, i) => ({ row_key: c, keys: { flaechengruppe: c }, group_label: null, label_de: c, order_index: i, values: { tier: flaechengruppeToTier(c) }, verbatim_quote: `Tab. 5 Kurzzeichen ${c}` }));
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Flächengruppen (Kurzzeichen) → Behandlungsanforderung', clause_reference: '§5.2.3, Tab. 5/6', page_ref: null,
    key_columns: ['flaechengruppe'], value_columns: [{ name: 'tier', type: 'enum', values: ['tier1_none', 'tier2', 'tier3', 'authority'] }], override_policy: 'locked', override_quote: null, verification_status: 'imported_unverified', rows };
}
export function tab6AsTablePlan1(): RegulationTable {
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
export function tab13AsTablePlan1(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'mittel_feinsand', keys: { bodenart: 'mittel_feinsand' }, group_label: null, label_de: 'Mittel-/Feinsand', order_index: 0, values: { factor: 0.10 }, verbatim_quote: 'Tab. 13: A_S,m = 0,10 · A_C (Mittel-/Feinsand)' },
    { row_key: 'schluffig', keys: { bodenart: 'schluffig' }, group_label: null, label_de: 'schluffig', order_index: 1, values: { factor: 0.20 }, verbatim_quote: 'Tab. 13: A_S,m = 0,20 · A_C (schluffig)' },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TAB13', title_de: 'Überschlägige Bemessung A_S,m nach Bodenart', clause_reference: 'Anhang A, Tab. 13', page_ref: null,
    key_columns: ['bodenart'], value_columns: [{ name: 'factor', type: 'number' }], override_policy: 'locked', override_quote: null, verification_status: 'imported_unverified', rows };
}
/** The Plan-1 set, frozen: TAB9, TAB5, TAB6, TAB13 with synthesised quotes. */
export function a138Plan1SeedTables(): RegulationTable[] { return [tab9AsTablePlan1(), tab5AsTablePlan1(), tab6AsTablePlan1(), tab13AsTablePlan1()]; }

// ---------------------------------------------------------------------------
// Plan-3 builders — the LIVE set. Quotes lifted verbatim (whitespace-normalised
// single-line) from the transcript; the transcript line is in the comment.
// ---------------------------------------------------------------------------

// Tab. 9 (L1248–L1315), one printed row per tab9.ts entry (30 printed value rows: L1253–1258, L1269–1272,
// L1274–1279, L1281–1289, L1300–1302, L1304–1306). Keyed by the tab9.ts `value`.
const TAB9_QUOTES: Readonly<Record<string, string>> = {
  dach_schraeg_metall: String.raw`\hline & - Metall, Glas, Schiefer, Faserzement & 0,9 & 1,0 \\`, // L1253
  dach_schraeg_ziegel: String.raw`\hline & - Ziegel, Abdichtungsbahnen (z. B. Dachpappe) & 0,9 & 1,0 \\`, // L1254
  dach_flach_metall: String.raw`\hline & - Metall, Glas, Faserzement & 0,9 & 1,0 \\`, // L1256
  dach_flach_abdichtung: String.raw`\hline & - Abdichtungsbahnen (z. B. Dachpappe) & 0,9 & 1,0 \\`, // L1257
  dach_flach_kies: String.raw`\hline & - Kiesschüttung & 0,8 & 0,8 \\`, // L1258
  gruendach_extensiv_steil: String.raw`\hline & - Extensivbegrünung & $>5^{\mathrm{o}^{(\mathrm{b})}}$ & 0,4 & 0,7 \\`, // L1269
  gruendach_intensiv: String.raw`\hline & - Intensivbegrünung, $\geqslant 30 \mathrm{~cm}$ Aufbaudicke & $\leqslant 5^{o^{(b)}}$ & 0,1 & 0,2 \\`, // L1270
  gruendach_extensiv_10: String.raw`\hline & - Extensivbegrünung $\geqslant 10 \mathrm{~cm}$ Aufbaudicke & \multirow{2}{*}{$\leqslant 5^{o^{(b)}}$} & 0,2 & 0,4 \\`, // L1271
  gruendach_extensiv_unter10: String.raw`\hline & - Extensivbegrünung $<10 \mathrm{~cm}$ Aufbaudicke & & 0,3 & 0,5 \\`, // L1272
  beton: String.raw`\hline & \multicolumn{2}{|l|}{Betonflächen} & 0,9 & 1,0 \\`, // L1274
  schwarzdecke_asphalt: String.raw`\hline & \multicolumn{2}{|l|}{Schwarzdecken (Asphalt)} & 0,9 & 1,0 \\`, // L1275
  pflaster_fugenverguss: String.raw`\hline & \multicolumn{2}{|c|}{Befestigte Flächen mit Fugendichtung, z. B. Pflaster mit Fugenverguss} & 0,8 & 1,0 \\`, // L1276
  gleis_feste_fahrbahn: String.raw`\hline & \multicolumn{2}{|l|}{Oberirdische Gleisanlage, feste Fahrbahn} & 0,9 & 1,0 \\`, // L1277
  rampe_zum_gebaeude: String.raw`\hline & \multicolumn{2}{|c|}{Rampen mit Neigung zum Gebäude, unabhängig von der Neigung und Befestigungsart} & 1,0 & 1,0 \\`, // L1278
  kunststoff_sportplatz: String.raw`\hline & \multicolumn{2}{|l|}{Kunststoffflächen von Sportplätzen} & 0,5 & 1,0 \\`, // L1279
  betonsteinpflaster_sand: String.raw`\hline & \multicolumn{2}{|l|}{Betonsteinpflaster, in Sand oder Schlacke verlegt, Flächen mit Platten} & 0,7 & 0,9 \\`, // L1281
  pflaster_fuge_15: String.raw`\hline & \multicolumn{2}{|l|}{Pflasterflächen, mit Fugenanteil > $15 \%$, z. B. $10 \mathrm{~cm} \times 10 \mathrm{~cm}$ und kleiner oder fester Kiesbelag} & 0,6 & 0,7 \\`, // L1282
  wassergebunden: String.raw`\hline & \multicolumn{2}{|l|}{Wassergebundene Flächen} & 0,7 & 0,9 \\`, // L1283
  kiesbelag_locker: String.raw`\hline & \multicolumn{2}{|l|}{Lockerer Kiesbelag, Schotterrasen (z. B. Kinderspielplätze)} & 0,2 & 0,3 \\`, // L1284
  verbundstein_sickerfuge: String.raw`\hline & \multicolumn{2}{|l|}{Verbundsteine mit Sickerfugen, Sicker-/Dränsteine} & 0,25 & 0,4 \\`, // L1285
  rasengitter_verkehr: String.raw`\hline & \multicolumn{2}{|c|}{Rasengittersteine mit häufigen Verkehrsbelastungen (z. B. Parkplatz)} & 0,2 & 0,4 \\`, // L1286
  rasengitter_ohne_verkehr: String.raw`\hline & \multicolumn{2}{|c|}{Rasengittersteine ohne häufige Verkehrsbelastungen (z. B. Feuerwehrzufahrt)} & 0,1 & 0,2 \\`, // L1287
  gleis_schotter_durchlaessig: String.raw`\hline & \multicolumn{2}{|c|}{Gleisanlage, Schotterbau mit durchlässigem Unterbau} & 0,1 & 0,2 \\`, // L1288
  gleis_schotter_schwach: String.raw`\hline & \multicolumn{2}{|c|}{Gleisanlage, Schotterbau mit schwach durchlässigem Unterbau} & 0,4 & 0,6 \\`, // L1289
  sport_draen_kunststoff: String.raw`\hline & Kunststoff-Flächen, Kunststoffrasen & 0,1 & 0,1 \\`, // L1300
  sport_draen_tenne: String.raw`\hline & Tennenflächen (Hart-, Asche(n)-, Schlackeplatz) & 0,3 & 0,3 \\`, // L1301
  sport_draen_rasen: String.raw`\hline & Rasenflächen & 0,1 & 0,1 \\`, // L1302
  park_flach: String.raw`\hline & flaches Gelände & 0,1 & 0,2 \\`, // L1304
  park_steil: String.raw`\hline & steiles Gelände & 0,2 & 0,3 \\`, // L1305
  wasserflaeche_eingestaut: String.raw`\hline & dauerhaft eingestaute Wasserflächen & 1,0 & 1,0 \\`, // L1306
};

/** Tab. 9 — quotes lifted; values stay the tab9.ts constants (parity pin). Status stays `imported_unverified` until the owner rules I-2 (sign-off a138-O-1). */
export function tab9AsTable(): RegulationTable {
  const rows: RegulationRow[] = getTab9Entries().map((e, i) => {
    const quote = TAB9_QUOTES[e.value];
    if (!quote) throw new Error(`TAB9: no lifted quote for tab9.ts entry ${e.value}`);
    return {
      row_key: e.value, keys: { surface_type: e.value }, group_label: GROUP_LABEL[e.group], label_de: e.label, order_index: i,
      values: { cm: e.cm, cs: e.cs, kind: e.kind, group: e.group },
      verbatim_quote: quote,
    };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB9', title_de: 'Empfohlene Abflussbeiwerte für das Einfache Verfahren', clause_reference: '§5.3.3.5, Tab. 9', page_ref: null,
    key_columns: ['surface_type'], value_columns: [{ name: 'cm', type: 'number' }, { name: 'cs', type: 'number' }, { name: 'kind', type: 'enum', values: ['paved', 'unpaved'] }, { name: 'group', type: 'number' }],
    override_policy: 'anhaltswert',
    // Gl. 2 legend L1218 + L1222 (durchlässige Flächen abweichend von Tabelle 9).
    override_quote: String.raw`$C_{\mathrm{i}}$ & - & Abflussbeiwert der Teilfläche, zum Beispiel gemäß Tabelle 9 — Der Abflussbeiwert für durchlässige Flächen kann in Abhängigkeit der Durchlässigkeit des anstehenden Bodens und der Gefälleverhältnisse abweichend von Tabelle 9 gewählt werden.`,
    // I-2 ruling pending (a138-O-1): the printed row now backs every quote, but whether the (label, C_m, C_s) triple counts as
    // "the printed row" for verification is the owner's call — status stays imported_unverified until then.
    verification_status: 'imported_unverified', rows };
}

/** Prod enum tokens of `belastungskategorie` (captured a138.prior.json: BK_I / BK_II / BK_III) — the TAB5 `bk` cell must equal one of them (I-1). */
export const TAB5_BK_TOKENS = ['BK_I', 'BK_II', 'BK_III'] as const;
type BkToken = (typeof TAB5_BK_TOKENS)[number];

/**
 * Tab. 5 rows (L800–L866): Kurzzeichen → (tier from Plan 1, bk = printed Belastungskategorie).
 * The BK column is printed as multirow cells: "।" (L803, spanning D…V1 — the OCR glyph for "I"; L789 names exactly the
 * three categories I/II/III) and "1" (L833, BG1) are read as BK I — sign-off a138-U-5 records the two OCR cells; the
 * table therefore stays `imported_unverified` although every row quote is lifted.
 */
const TAB5_ROWS: ReadonlyArray<{ code: FlaechengruppeCode; bk: BkToken; quote: string }> = [
  { code: 'D', bk: 'BK_I', quote: String.raw`\hline Dächer (D) & Alle Dachflächen $\leqslant 50 \mathrm{~m}^{2}$ und Dachflächen $>50 \mathrm{~m}^{2}$ mit Ausnahme der unter Flächengruppe SD1 oder SD2 fallenden & D & \multirow{7}{*}{।} \\` }, // L803
  { code: 'VW1', bk: 'BK_I', quote: String.raw`\hline & - Fuß-, Rad- und Wohnwege & & \\ \hline & - Hof- und Wegeflächen ohne Kfz-Verkehr in Sport- und Freizeitanlagen & & \\ \hline & - Hofflächen ohne Kfz-Verkehr in Wohngebieten, wenn Fahrzeugwaschen dort unzulässig, & VW1 & \\ \hline & - Garagenzufahrten bei Einzelhausbebauung & & \\ \hline & - Fußgängerzonen ohne Marktstände und seltenen Freiluftveranstaltungen & & \\` }, // L804–808
  { code: 'V1', bk: 'BK_I', quote: String.raw`- Hof- und Verkehrsflächen in Wohngebieten mit geringem Kfz -Verkehr (DTV $\leqslant 300 \mathrm{Kfz} / \mathrm{d}$ oder $\leqslant 50$ Wohneinheiten), z. B. Wohnstraßen mit Park- und Stellplätzen, Zufahrten zu Sammelgaragen \\ - Park- und Stellplätze mit geringer Frequentierung (z. B. private Stellplätze) \end{tabular} & V1 & \\` }, // L810–812
  { code: 'VW2', bk: 'BK_II', quote: String.raw`\hline & - Marktplätze & & \multirow{4}{*}{II} \\ \hline & - Flächen, auf denen häufig Freiluftveranstaltungen stattfinden & VW2 & \\ \hline & - Einkaufsstraßen in Wohngebieten & & \\` }, // L813–815
  { code: 'V2', bk: 'BK_II', quote: String.raw`\hline & - Hof- und Verkehrsflächen außerhalb von Misch-, Gewerbeund Industriegebieten mit mäßigem Kfz-Verkehr (DTV 300 $\mathrm{Kfz} / \mathrm{d}$ bis $15.000 \mathrm{Kfz} / \mathrm{d}$ ), z. B. Wohn- und Erschließungsstraßen mit Park- und Stellplätzen, zwischengemeindliche Straßen- und Wegeverbindungen, Zufahrten zu Sammelgaragen & V2 & \\` }, // L816
  { code: 'V3', bk: 'BK_III', quote: String.raw`\hline Hof- und Wegeflächen (VW), Verkehrsflächen (V) & & V3 & III \\ \hline & \begin{tabular}{l} - Verkehrsflächen außerhalb von Misch- und Gewerbe- und Industriegebieten mit hohem Kfz-Verkehr (DTV > $15.000 \mathrm{Kfz} / \mathrm{d}$ ) \\ - Park- und Stellplätze mit hoher Frequentierung (z. B. bei Einkaufsmärkten) \\ - Hof- und Verkehrsflächen in Misch-, Gewerbe- und Industriegebieten mit mittlerem oder hohem Kfz-Verkehr (DTV > 2.000 Kfz/d), mit Ausnahme der unter SV und SVW fallenden \end{tabular} & & \\` }, // L818–823
  { code: 'BG1', bk: 'BK_I', quote: String.raw`\hline \multirow{10}{*}{Betriebsflächen (B) und sonstige Flächen mit besonderer Belastung (S)} & Gleisanlagen (G) mit Schotteroberbau auf freier Strecke sowie im Bahnhofsbereich bis $100.000 \mathrm{Lt} / \mathrm{d}$ (Leistungstonnen pro Tag) pro Gleis mit Ausnahme der unter SG fallenden & BG1 & 1 \\` }, // L833
  { code: 'BF', bk: 'BK_II', quote: String.raw`\hline & Start- und Landebahnen und weitere Betriebsflächen von Flughäfen (F) mit Ausnahme der unter SF fallenden & BF & \multirow{4}{*}{II} \\` }, // L834
  { code: 'BL', bk: 'BK_II', quote: String.raw`\hline & Landwirtschaftliche Hofflächen (L) mit Ausnahme der unter SL fallenden & BL & \\` }, // L835
  { code: 'BG2', bk: 'BK_II', quote: String.raw`\hline & \begin{tabular}{l} - Gleisanlagen (G) mit Schotteroberbau im Bahnhofsbereich > $100.000 \mathrm{Lt} / \mathrm{d}$ pro Gleis sowie \\ - Gleisanlagen (G) mit fester Fahrbahn bis $100.000 \mathrm{Lt} / \mathrm{d}$ pro-Gleis mit Ausnahme der unter SG fallenden \end{tabular} & BG2 & \\` }, // L836–839
  { code: 'BG3', bk: 'BK_III', quote: String.raw`\hline & Gleisanlagen (G) mit fester Fahrbahn > 100.000 Lt/d pro•Gleis mit Ausnahme der unter SG fallenden & BG3 & \\` }, // L848
  { code: 'SD1', bk: 'BK_II', quote: String.raw`\hline & Dachflächen (D) mit hohen Anteilen (20\% bis $70 \%$ der Gesamtdachfläche) an Materialien, die im Niederschlagswasser zu signifikanten Belastungen mit gewässerschädlichen Substanzen führen & SD1 & \\` }, // L840
  { code: 'SD2', bk: 'BK_III', quote: String.raw`\hline & Dachflächen (D) mit sehr hohen Anteilen (> 70 \% der Gesamtdachfläche) an Materialien, die im Niederschlagswasser zu signifikanten Belastungen mit gewässerschädlichen Substanzen führen & SD2 & \multirow{5}{*}{III} \\` }, // L841
  // Tab. 5 prints "SV bzw. SVW" as ONE row (L842); both prod codes carry that printed row.
  { code: 'SV', bk: 'BK_III', quote: String.raw`\hline & Hof- und Verkehrsflächen sowie Park- und Stellplätze (V) innerhalb von Misch-, Gewerbe- und Industriegebieten, auf denen sonstige besondere Beeinträchtigungen der Niederschlagswasserqualität zu erwarten sind, z. B. Lagerflächen, Zufahrten Steinbruch & SV bzw. SVW & \\` }, // L842
  { code: 'SVW', bk: 'BK_III', quote: String.raw`\hline & Hof- und Verkehrsflächen sowie Park- und Stellplätze (V) innerhalb von Misch-, Gewerbe- und Industriegebieten, auf denen sonstige besondere Beeinträchtigungen der Niederschlagswasserqualität zu erwarten sind, z. B. Lagerflächen, Zufahrten Steinbruch & SV bzw. SVW & \\` }, // L842
  { code: 'SF', bk: 'BK_III', quote: String.raw`\hline & \begin{tabular}{l} - Flächen von Flughäfen, auf denen eine Wäsche von Flugzeugen erfolgt \\ - Flächen im unmittelbaren Umfeld von Flächen mit Betankung oder Enteisung von Flugzeugen \end{tabular} & SF & \\` }, // L843–846
  { code: 'SL', bk: 'BK_III', quote: String.raw`\hline & Landwirtschaftliche Hofflächen und sonstige Flächen (L) mit großen Tieransammlungen, z. B. Viehhaltungsbetriebe, Reiterhöfe oder landwirtschaftliche Hofflächen (L) mit sonstigen starken Beeinträchtigungen der Niederschlagswasserqualität, z. B. Flächen zur Fahrzeugreinigung & SL & \\` }, // L847
  { code: 'SG', bk: 'BK_III', quote: String.raw`\hline \multirow{2}{*}{Betriebsflächen (B) und sonstige Flächen mit besonderer Belastung (S)} & \begin{tabular}{l} Gleisanlagen mit betriebsbedingt stark erhöhter Beeinträchtigung der Niederschlagswasserqualität, z. B. \\ - durch starken Rangierbetrieb oder stark frequentierte Bremsstrecken, \\ - bei Vegetationskontrolle durch Herbizideinsatz \end{tabular} & SG & \multirow{2}{*}{III} \\` }, // L858–862
  { code: 'SA', bk: 'BK_III', quote: String.raw`\hline & Hof- und Verkehrsflächen auf Abwasser- und Abfallanlagen (A) mit stark erhöhter Beeinträchtigung der Niederschlagswasserqualität, z. B. Flächen im unmittelbaren Umfeld von Flächen, auf denen Abfälle abgefüllt, verladen oder gelagert werden & SA & \\` }, // L863
];

/** Tab. 5 — Flächengruppe (Kurzzeichen) → tier (Plan 1, unchanged) + `bk` (printed Belastungskategorie, prod enum tokens). */
export function tab5AsTable(): RegulationTable {
  const byCode = new Map(TAB5_ROWS.map((r) => [r.code, r]));
  const rows: RegulationRow[] = FLAECHENGRUPPE_CODES.map((c, i) => {
    const r = byCode.get(c);
    if (!r) throw new Error(`TAB5: no lifted row for Kurzzeichen ${c}`);
    return { row_key: c, keys: { flaechengruppe: c }, group_label: null, label_de: c, order_index: i, values: { tier: flaechengruppeToTier(c), bk: r.bk }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB5', title_de: 'Kategorisierung von Niederschlagswasser bebauter oder befestigter Flächen', clause_reference: '§5.2.2, Tab. 5', page_ref: null,
    key_columns: ['flaechengruppe'],
    value_columns: [{ name: 'tier', type: 'enum', values: ['tier1_none', 'tier2', 'tier3', 'authority'] }, { name: 'bk', type: 'enum', values: [...TAB5_BK_TOKENS] }],
    // Kept `locked` (spec: tier mappings); L791 prints a deviation sentence — sign-off a138-P-1 asks whether that makes the table `anhaltswert`.
    override_policy: 'locked', override_quote: 'Von der Kategorisierung nach Tabelle 5 kann in begründeten Fällen abgewichen werden.', // L791
    verification_status: 'imported_unverified', rows };
}

// Tab. 6 (L912–L940). Printed thickness heads L915: "≥ 20 cm" (thin) | "≥ 30 cm" (thick). Only the two numeric
// tiers are seeded: D / VW1 / V1 / SD1…SA print "(*)" or an empty cell (L916–918, L927–933) and BG1 prints an n_M-only
// cell (L919) that the tier key cannot carry — sign-off a138-U-3.
const TAB6_QUOTES: Readonly<Record<'tier2' | 'tier3', string>> = {
  tier2: String.raw`\hline VW2 & \multirow{5}{*}{II} & \multirow{4}{*}{$A C / A_{\mathrm{s}, \mathrm{m}} \leqslant 30$ bei Mulden-Rigolen: Überlauf in Rigole mit $n_{\mathrm{M}}$ max. 1/a} & \multirow{4}{*}{$A C / A_{\mathrm{S}, \mathrm{m}} \leqslant 50$ bei Mulden-Rigolen: Überlauf in Rigole mit $n_{\mathrm{M}}$ max. 1/a} \\`, // L920
  tier3: String.raw`\hline BL & & \multirow{3}{*}{$A C / A_{\mathrm{S}, \mathrm{m}} \leqslant 15$ bei Mulden-Rigolen: Überlauf in Rigole mit $n_{\mathrm{M}}$ max. 1/a} & \multirow{3}{*}{$A C / A_{\mathrm{s}, \mathrm{m}} \leqslant 30$ bei Mulden-Rigole: Überlauf in Rigole mit $n_{\mathrm{M}}$ max. 1/a} \\`, // L924
};
/** Printed Tab. 6 limits per (tier, band): A_C/A_S,m max (parity-pinned against tab6Limit) and n_M max [1/a]. */
const TAB6_VALUES: Readonly<Record<'tier2' | 'tier3', Readonly<Record<'thin' | 'thick', { max: number; n_m_max: number }>>>> = {
  tier2: { thin: { max: 30, n_m_max: 1 }, thick: { max: 50, n_m_max: 1 } }, // L920
  tier3: { thin: { max: 15, n_m_max: 1 }, thick: { max: 30, n_m_max: 1 } }, // L924
};
/** Tab. 6 — (tier, bbz_band) → max A_C/A_S,m + n_m_max; quotes lifted L920/L924; every seeded row lifted ⇒ md_verified. */
export function tab6AsTable(): RegulationTable {
  const rows: RegulationRow[] = [];
  let i = 0;
  for (const tier of ['tier2', 'tier3'] as const) for (const [band, th] of [['thin', 0.2], ['thick', 0.3]] as const) {
    const lim = tab6Limit(tier, th);
    if (lim.kind !== 'limit') throw new Error('tab6Limit must be numeric for tier2/tier3');
    const v = TAB6_VALUES[tier][band];
    if (v.max !== lim.max) throw new Error(`TAB6 ${tier}|${band}: printed max ${v.max} != tab6Limit ${lim.max} (value-parity pin)`);
    rows.push({ row_key: `${tier}|${band}`, keys: { tier, bbz_band: band }, group_label: null, label_de: `${tier === 'tier2' ? 'BK II' : 'BK III'}, ${band === 'thin' ? '≥ 20 cm' : '≥ 30 cm'}`, order_index: i++, values: { max: v.max, n_m_max: v.n_m_max }, verbatim_quote: TAB6_QUOTES[tier] });
  }
  return { standard_code: STD, edition: ED, table_code: 'TAB6', title_de: 'Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone', clause_reference: '§5.2.3.2, Tab. 6', page_ref: null,
    key_columns: ['tier', 'bbz_band'], value_columns: [{ name: 'max', type: 'number' }, { name: 'n_m_max', type: 'number', unit: '1/a' }],
    override_policy: 'locked',
    override_quote: '(*) Verwendungshinweis: Die Behandlungsanforderungen für die Kategorien D, SD1, SD2, SV, SVW, SF, SL, SG und SA richten sich nach den rechtlichen Anforderungen und sind ggf. mit der zuständigen Behörde abzustimmen.', // L936
    verification_status: 'md_verified', rows };
}

/** Tab. 7 (L980–L1023) — required efficiencies per tier; D and SD1…SA print "(*)" (L984, L1009–1015) and are not seeded (a138-U-4). */
export function tab7AsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'tier1_none', keys: { tier: 'tier1_none' }, group_label: null, label_de: 'VW1, V1, BG1 (BK I)', order_index: 0, values: { eta_afs63_min: 40, eta_geloest_min: 50 },
      verbatim_quote: String.raw`\hline VW1 & & \multirow{3}{*}{40 \%} & \multirow{3}{*}{50 \% (**)} & \multirow{3}{*}{Bei Versickerung über Versickerungsschacht Typ B mit ausreichender Filtersandschicht und vorgeschaltetem Absetzschacht (Oberflächenbeschickung $10 \mathrm{~m} / \mathrm{h}$, Horizontalgeschwindigkeit $0,05 \mathrm{~m} / \mathrm{s}$ ) gilt die Reinigungsleistung als nachgewiesen} \\` }, // L985
    { row_key: 'tier2', keys: { tier: 'tier2' }, group_label: null, label_de: 'VW2, V2, BF, BG2 (BK II)', order_index: 1, values: { eta_afs63_min: 70, eta_geloest_min: 65 },
      verbatim_quote: String.raw`\hline VW2 & \multirow{5}{*}{II} & \multirow{4}{*}{70 \%} & \multirow{4}{*}{65 \% (**)} & \multirow{7}{*}{z. B. dezentrale Behandlungsanlage mit allgemeiner bauaufsichtlicher Zulassung DIBt} & \multirow{7}{*}{Mögliche zusätzliche Sicherheitsaspekte (Tauchwand, Absperrschieber, Beprobung auf Schadstoffakkumulation etc.) im Einzelfall mit der zuständigen Behörde abstimmen} \\` }, // L1002
    { row_key: 'tier3', keys: { tier: 'tier3' }, group_label: null, label_de: 'BL, V3, BG3 (BK III)', order_index: 2, values: { eta_afs63_min: 80, eta_geloest_min: 75 },
      verbatim_quote: String.raw`\hline BL & & \multirow{3}{*}{80 \%} & \multirow{3}{*}{75 \% (**)} & & \\` }, // L1006
  ];
  return { standard_code: STD, edition: ED, table_code: 'TAB7', title_de: 'Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen', clause_reference: '§5.2.3.3, Tab. 7', page_ref: null,
    key_columns: ['tier'], value_columns: [{ name: 'eta_afs63_min', type: 'number', unit: '%' }, { name: 'eta_geloest_min', type: 'number', unit: '%' }],
    override_policy: 'locked',
    override_quote: String.raw`(**) Der Wirkungsgrad $\eta_{\text {gelöste Stoffe }}$ bezieht sich ausschließlich auf die Referenzparameter Kupfer und Zink.`, // L1019
    verification_status: 'md_verified', rows };
}

// Tab. 8 (L1132–L1196). Columns L1142–L1150: Bemessungshäufigkeit for A_C ≤ 800 m² | A_C > 800 m² und öffentliche
// Entwässerung | Überflutungshäufigkeit öffentliche Entwässerung. Rows (3) and (4) print ONE cell across both A_C
// columns (\multicolumn{2}).
const TAB8_QUOTES = {
  gering: String.raw`\hline (1) gering & \begin{tabular}{l} Bereiche, in denen das Wasser überwiegend schadlos und ohne Nutzungseinschränkungen auf der Oberfläche abfließen oder verbleiben kann; z. B.: \\ - offene Flächen abseits von Gebäuden (große Grundstücke in ländlichen Gebieten, Streusiedlungen, Grün- und Freiflächen, Parks etc.) \\ - Straßen ohne Randbebauung \end{tabular} & ( $\leqslant 0,33 / a)$ & ( $\leqslant 0,5 / \mathrm{a}$ ) & (0,1/a) \\`, // L1152–1156
  maessig: String.raw`\hline (2) mäßig & \begin{tabular}{l} Bereiche, in denen Überflutungen geringe bis mittlere Schäden oder Nutzungseinschränkungen verursachen können und die Sicherheit und Gesundheit nicht gefährden; \\ z. B.: \\ - Wohn- und Mischgebiete mit Gebäuden ohne zu Wohn- oder Gewerbezwecken genutzte Untergeschosse \\ - Parkplätze \end{tabular} & ( $\leqslant 0,2 / \mathrm{a}$ ) & ( $\leqslant 0,33 / \mathrm{a}$ ) & (0,05/a) \\`, // L1157–1162
  stark: String.raw`\hline (3) stark & \begin{tabular}{l} Bereiche, in denen Überflutungen lokal zu größeren Schäden oder Nutzungseinschränkungen führen oder die Sicherheit und Gesundheit potenziell gefährden können; z. B.: \\ - Stadtzentren \\ - Wohn- und Mischgebiete mit Gebäuden mit zu Wohn- oder Gewerbezwecken genutzten Untergeschossen \\ - Gewerbe-/Industriegebiete \\ - private Tiefgaragen \\ - Verkehrswege und Flächen von besonderer Bedeutung \\ - untergeordnete Straßenunterführungen \\ - Bereiche mit starkem Geländegefälle \end{tabular} & \multicolumn{2}{|c|}{\begin{tabular}{l} $\geqslant 5 \mathrm{a}$ \\ $(\leqslant 0,2 / \mathrm{a})$ \end{tabular}} & \begin{tabular}{l} 30 a \\ (0,033/a) \end{tabular} \\`, // L1163–1178
  sehr_stark: String.raw`\hline (4) sehr stark & \begin{tabular}{l} Bereiche, in denen Überflutungen zu weitreichenden größeren Schäden oder Nutzungseinschränkungen führen oder die Sicherheit und Gesundheit akut gefährden können; z. B.: \\ - Bereiche mit kritischer Infrastruktur \\ - Bereiche mit U-Bahn-/Tiefbahnhofzugängen \\ - übergeordnete Unterführungen \\ - öffentliche Tiefgaragen \end{tabular} & \multicolumn{2}{|c|}{$\geqslant 10 \mathrm{a}$ $$ (\leqslant 0,1 / a) $$} & (0,02/a) \\`, // L1179–1188
} as const;
export const TAB8_SCHUTZKATEGORIE = [
  { value: 'gering', label_de: '(1) gering' },          // L1152
  { value: 'maessig', label_de: '(2) mäßig' },          // L1157
  { value: 'stark', label_de: '(3) stark' },            // L1163
  { value: 'sehr_stark', label_de: '(4) sehr stark' },  // L1179
] as const;
/** Tab. 8 — (schutzkategorie, ac_band) → n_max [1/a], t_n_min [a] (nullable; printed only for (3)/(4)), ueberflutung_n [1/a]. */
export function tab8AsTable(): RegulationTable {
  const spec: ReadonlyArray<{ k: keyof typeof TAB8_QUOTES; le800: [number, number | null]; gt800: [number, number | null]; ue: number }> = [
    { k: 'gering', le800: [0.33, null], gt800: [0.5, null], ue: 0.1 },          // L1156: (≤ 0,33/a) | (≤ 0,5/a) | (0,1/a)
    { k: 'maessig', le800: [0.2, null], gt800: [0.33, null], ue: 0.05 },        // L1162: (≤ 0,2/a) | (≤ 0,33/a) | (0,05/a)
    { k: 'stark', le800: [0.2, 5], gt800: [0.2, 5], ue: 0.033 },                // L1173–1177: ≥ 5 a (≤ 0,2/a) both columns | 30 a (0,033/a)
    { k: 'sehr_stark', le800: [0.1, 10], gt800: [0.1, 10], ue: 0.02 },          // L1185–1188: ≥ 10 a (≤ 0,1/a) both columns | (0,02/a)
  ];
  const rows: RegulationRow[] = [];
  let i = 0;
  for (const s of spec) {
    const label = TAB8_SCHUTZKATEGORIE.find((c) => c.value === s.k)!.label_de;
    for (const band of ['le800', 'gt800'] as const) {
      const [n_max, t_n_min] = s[band];
      rows.push({ row_key: `${s.k}|${band}`, keys: { schutzkategorie: s.k, ac_band: band }, group_label: null,
        label_de: `${label}, ${band === 'le800' ? 'A_C ≤ 800 m²' : 'A_C > 800 m² und öffentliche Entwässerung'}`, order_index: i++,
        values: { n_max, t_n_min, ueberflutung_n: s.ue }, verbatim_quote: TAB8_QUOTES[s.k] });
    }
  }
  return { standard_code: STD, edition: ED, table_code: 'TAB8', title_de: 'Hinweise zur Festlegung von Bemessungs- und Überflutungshäufigkeiten für Versickerungsanlagen', clause_reference: '§5.3.3.4, Tab. 8', page_ref: null,
    key_columns: ['schutzkategorie', 'ac_band'],
    value_columns: [{ name: 'n_max', type: 'number', unit: '1/a' }, { name: 't_n_min', type: 'number', unit: 'a' }, { name: 'ueberflutung_n', type: 'number', unit: '1/a' }],
    // Bounds "(≤ …)" ⇒ locked; the caption "Hinweise zur Festlegung" (L1132) goes to sign-off a138-P-2; footnote (a) L1191 to a138-J-1.
    override_policy: 'locked',
    override_quote: String.raw`(a) Nach DIN 1986-100 ist kein rechnerischer Überflutungsnachweis erforderlich. Bei Durchführung eines Überflutungsnachweises kann bei $A C \leqslant 800 \mathrm{~m}^{2}$ die Bemessungshäufigkeit für $A C>800 \mathrm{~m}^{2}$ angesetzt werden.`, // L1191
    verification_status: 'md_verified', rows };
}

/** Tab. 11 (L1381–L1393) — six printed method rows → f_Methode. Tokens are the proposed 6-value enum for `permeability_test_method` (sign-off a138-E-1). */
export const TAB11_METHODS = [
  { value: 'feldversuch_grossflaechig', label_de: 'Großflächige Feldversuche in Testgrube/Probeschurf (≥ 1 m²)', f: 1, quote: String.raw`\hline Großflächige Feldversuche in Testgrube/Probeschurf ( $\geqslant 1 \mathrm{~m}^{2}$ ) & 1 \\` }, // L1384
  { value: 'feldversuch_kleine_testgrube', label_de: 'Kleinflächige Feldversuche – kleine Testgrube/Probeschurf (< 1 m²)', f: 0.9, quote: String.raw`\hline Kleinflächige Feldversuche & \\ \hline - kleine Testgrube/ Probeschurf ( $<1 \mathrm{~m}^{2}$ ) & 0,9 \\` }, // L1385–1386
  { value: 'doppelzylinder_infiltrometer', label_de: 'Kleinflächige Feldversuche – Doppelzylinder-Infiltrometer', f: 0.9, quote: String.raw`\hline - Doppelzylinder-Infiltrometer & 0,9 \\` }, // L1387
  { value: 'open_end_test', label_de: 'Kleinflächige Feldversuche – Open-End-Test', f: 0.8, quote: String.raw`\hline - Open-End-Test & 0,8 \\` }, // L1388
  { value: 'labor_ungestoert', label_de: 'Laborverfahren mit ungestörten Proben (z. B. Permeameter)', f: 0.7, quote: String.raw`\hline Laborverfahren mit ungestörten Proben (z. B. Permeameter) & 0,7 \\` }, // L1389
  { value: 'labor_gestoert_sieblinie', label_de: 'Laborverfahren mit gestörten Proben/Sieblinienauswertung für Sandböden', f: 0.1, quote: String.raw`\hline Laborverfahren mit gestörten Proben/ Sieblinienauswertung für Sandböden & 0,1 \\` }, // L1390
] as const;
export function tab11AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB11_METHODS.map((m, i) => ({ row_key: m.value, keys: { method: m.value }, group_label: null, label_de: m.label_de, order_index: i, values: { f_methode: m.f }, verbatim_quote: m.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TAB11', title_de: 'Korrekturfaktoren Infiltrationsrate', clause_reference: '§5.3.3.6, Tab. 11', page_ref: null,
    key_columns: ['method'], value_columns: [{ name: 'f_methode', type: 'number' }],
    // No override wording printed; the factor enters Gl. 6 as a fixed product term.
    override_policy: 'locked', override_quote: String.raw`f_{\mathrm{K}}=f_{\text {Ort }} \cdot f_{\text {Methode }} \leqslant 1 \tag{6}`, // L1361
    verification_status: 'md_verified', rows };
}

/** Tab. 13 (L1706–L1713) — quotes lifted; factors parity-pinned against computeSoilEstimate. Row keys = `soil_bodenart_tab13` prod enum tokens. */
export function tab13AsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'mittel_feinsand', keys: { bodenart: 'mittel_feinsand' }, group_label: null, label_de: 'Mittel-/Feinsand', order_index: 0, values: { factor: 0.10 }, verbatim_quote: String.raw`\hline Mittel-/Feinsand & 0,10 • $A C$ \\` }, // L1709
    { row_key: 'schluffig', keys: { bodenart: 'schluffig' }, group_label: null, label_de: 'schluffiger Sand, sandiger Schluff, Schluff', order_index: 1, values: { factor: 0.20 }, verbatim_quote: String.raw`\hline schluffiger Sand, sandiger Schluff, Schluff & 0,20 ⋅ AC \\` }, // L1710
  ];
  return { standard_code: STD, edition: ED, table_code: 'TAB13', title_de: 'Größenordnungen A_S,m nach Bodenart', clause_reference: '§6.3.2, Tab. 13', page_ref: null,
    key_columns: ['bodenart'], value_columns: [{ name: 'factor', type: 'number' }], override_policy: 'locked',
    override_quote: 'In Tabelle 13 werden in Abhängigkeit der Bodenart Größenordnungen zur Abschätzung von $A_{\\mathrm{s}, \\mathrm{m}}$ unabhängig von der Geometrie der Anlage gegeben.', // L1702
    verification_status: 'md_verified', rows };
}

/**
 * Tab. 14 (L2250–L2269), transposed: the printed columns are facility types (L2252, left→right)
 *   Versickerungsfläche → `flaeche` · Versickerungsmulde → `mulde` · Mulden-Rigolen-Element → `MRE` ·
 *   Mulden-Rigolen-System → `MRS` · Rigole → `rigole` · Versickerungsschacht → `schacht` · Versickerungsbecken → `becken`
 * (tokens = prod `facility_type_selected` enum values, D-1). Each seeded row is one facility type read down the seven
 * printed value lines; every row carries the whole printed body (L2252–L2260) as its quote. "–" ⇒ null. The MRE cell of
 * "Freibord Überlauf" is printed EMPTY (L2258: `- & - & & $\geq 10$`) ⇒ null, sign-off a138-U-6; the table therefore
 * stays `imported_unverified`. "k_f-Wert bewachsene Bodenzone (langjähriger Betrieb) ca. 1·10⁻⁵" (L2256) is a "ca." figure
 * and is not seeded as a limit column.
 */
const TAB14_BODY = String.raw`\hline \multirow[t]{2}{*}{Planungsvorgabe oder Nachweisgröße} & \multirow[b]{2}{*}{Einheit} & Versickerungsfläche & Versickerungsmulde & Mulden-Rigolen-Element & Mulden-Rigolen-System & Rigole & Versickerungsschacht & Versickerungsbecken \\ \hline & & \multicolumn{6}{|c|}{Dezentral} & Zentral \\ \hline $k_{\mathrm{f}}$-Wert maßgebliche Bodenschicht & $\mathrm{m} / \mathrm{s}$ & \multicolumn{3}{|c|}{$\geqslant 1 \cdot 10^{-6}$} & - & \multicolumn{2}{|c|}{$\geqslant 1 \cdot 10^{-6}$} & $\geqslant 1 \cdot 10^{-5}$ \\ \hline Mächtigkeit bewachsene Bodenzone & cm & \multicolumn{4}{|c|}{$\geqslant 20$} & - & - & $\geq 20$ \\ \hline $k_{\mathrm{f}}$-Wert bewachsene Bodenzone (langjähriger Betrieb) ${'$'}{ }^{[1]}$ & $\mathrm{m} / \mathrm{s}$ & \multicolumn{4}{|c|}{ca. $1 \cdot 10^{-5}$} & - & - & ca. $1 \cdot 10^{-5}$ \\ \hline Einstauhöhe & cm & 0 & \multicolumn{3}{|r|}{für Mulden i. d. R. $\leqslant 30$} & \multicolumn{2}{|c|}{ggf. bautechnisch begrenzt} & i. d. R. $\geqslant 50$ \\ \hline Freibord Überlauf ${'$'}{ }^{(2)}$ & cm & - & - & & $\geq 10$ & - & - & $\geq 35$ \\ \hline Böschungsneigung & 1: m & - & \multicolumn{3}{|c|}{i. d. R. 1 : 1,5 oder flacher} & - & - & i. d.R. $\leqslant 1: 1,5$ \\ \hline Entleerungszeit ( $n=1 / a$ ) ${'$'}{ }^{\text {(3) }}$ & h & - & \multicolumn{3}{|c|}{$\leqslant 84$} & - & - & $\leqslant 84$ \\`; // L2252–2260
type Tab14Cells = { kf_min: number | null; bbz_min_cm: number | null; einstau_min_cm: number | null; einstau_max_cm: number | null; freibord_min_cm: number | null; boeschung_max: number | null; entleerung_max_h: number | null };
export const TAB14_ROWS: ReadonlyArray<{ facility_type: string; label_de: string } & Tab14Cells> = [
  //                                                                  L2254      L2255       L2257 (min/max)      L2258   L2259   L2260
  { facility_type: 'flaeche', label_de: 'Versickerungsfläche',        kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: 0,   einstau_max_cm: 0,   freibord_min_cm: null, boeschung_max: null, entleerung_max_h: null },
  { facility_type: 'mulde', label_de: 'Versickerungsmulde',           kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: null, boeschung_max: 1.5, entleerung_max_h: 84 },
  { facility_type: 'MRE', label_de: 'Mulden-Rigolen-Element',         kf_min: 1e-6, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: null, boeschung_max: 1.5, entleerung_max_h: 84 }, // Freibord cell printed empty (a138-U-6)
  { facility_type: 'MRS', label_de: 'Mulden-Rigolen-System',          kf_min: null, bbz_min_cm: 20, einstau_min_cm: null, einstau_max_cm: 30, freibord_min_cm: 10, boeschung_max: 1.5, entleerung_max_h: 84 },
  { facility_type: 'rigole', label_de: 'Rigole',                      kf_min: 1e-6, bbz_min_cm: null, einstau_min_cm: null, einstau_max_cm: null, freibord_min_cm: null, boeschung_max: null, entleerung_max_h: null },
  { facility_type: 'schacht', label_de: 'Versickerungsschacht',       kf_min: 1e-6, bbz_min_cm: null, einstau_min_cm: null, einstau_max_cm: null, freibord_min_cm: null, boeschung_max: null, entleerung_max_h: null },
  { facility_type: 'becken', label_de: 'Versickerungsbecken',         kf_min: 1e-5, bbz_min_cm: 20, einstau_min_cm: 50, einstau_max_cm: null, freibord_min_cm: 35, boeschung_max: 1.5, entleerung_max_h: 84 },
];
export function tab14AsTable(): RegulationTable {
  const rows: RegulationRow[] = TAB14_ROWS.map(({ facility_type, label_de, ...cells }, i) => ({
    row_key: facility_type, keys: { facility_type }, group_label: null, label_de, order_index: i, values: { ...cells }, verbatim_quote: TAB14_BODY,
  }));
  return { standard_code: STD, edition: ED, table_code: 'TAB14', title_de: 'Zusammenstellung der Planungs- und Bemessungsvorgaben von Versickerungsanlagen', clause_reference: '§6.9, Tab. 14', page_ref: null,
    key_columns: ['facility_type'],
    value_columns: [
      { name: 'kf_min', type: 'number', unit: 'm/s' }, { name: 'bbz_min_cm', type: 'number', unit: 'cm' },
      { name: 'einstau_min_cm', type: 'number', unit: 'cm' }, { name: 'einstau_max_cm', type: 'number', unit: 'cm' },
      { name: 'freibord_min_cm', type: 'number', unit: 'cm' }, { name: 'boeschung_max', type: 'number', unit: '1:m (m)' },
      { name: 'entleerung_max_h', type: 'number', unit: 'h' },
    ],
    override_policy: 'anhaltswert',
    override_quote: String.raw`Einstauhöhe & cm & 0 & \multicolumn{3}{|r|}{für Mulden i. d. R. $\leqslant 30$} — Böschungsneigung & 1: m & - & \multicolumn{3}{|c|}{i. d. R. 1 : 1,5 oder flacher}`, // L2257 / L2259 ("i. d. R." = Regelfall)
    verification_status: 'imported_unverified', rows };
}

/** §6.4.2 (L1866–L1871) — approximate q_VS per Schüttmaterial when no manufacturer data exists. Row keys = the proposed `schuettmaterial` enum. */
export const S6_4_2_SCHUETTMATERIAL = [
  { value: 'kiessand', label_de: 'Kiessand', q_vs: 0.2, quote: String.raw`I bei Kiessand als Schüttmaterial: & & $q_{\mathrm{vs}}=0,2 \mathrm{l} /(\mathrm{s} \cdot \mathrm{m})$; \\` }, // L1869
  { value: 'kies', label_de: 'Kies (z. B. 16/32)', q_vs: 5, quote: String.raw`I bei Kies (z. B. 16/32) als Schüttmaterial: & & $q_{\mathrm{vs}}=5 \mathrm{l} /(\mathrm{s} \cdot \mathrm{m})$.` }, // L1870
] as const;
export function s642QvsAsTable(): RegulationTable {
  const rows: RegulationRow[] = S6_4_2_SCHUETTMATERIAL.map((m, i) => ({ row_key: m.value, keys: { schuettmaterial: m.value }, group_label: null, label_de: m.label_de, order_index: i, values: { q_vs: m.q_vs }, verbatim_quote: m.quote }));
  return { standard_code: STD, edition: ED, table_code: 'S6_4_2_QVS', title_de: 'Näherungswerte spezifischer Wasseraustritt q_VS aus dem Versickerrohr nach Schüttmaterial', clause_reference: '§6.4.2', page_ref: null,
    key_columns: ['schuettmaterial'], value_columns: [{ name: 'q_vs', type: 'number', unit: 'l/(s·m)' }],
    override_policy: 'messwert',
    override_quote: String.raw`Liegen keine Herstellerangaben zu den Sickeröffnungen vor, können folgende Werte näherungsweise für den spezifischen Wasseraustritt $q_{\mathrm{D}}$ aus dem Versickerrohr verwendet werden:`, // L1866
    verification_status: 'md_verified', rows };
}

/** The live Plan-3 set (nine tables). Order: the four Plan-1 tables first (same order as Plan 1), then the new ones. */
export function a138SeedTables(): RegulationTable[] {
  return [tab9AsTable(), tab5AsTable(), tab6AsTable(), tab13AsTable(), tab7AsTable(), tab8AsTable(), tab11AsTable(), tab14AsTable(), s642QvsAsTable()];
}
