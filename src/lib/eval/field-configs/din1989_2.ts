/**
 * DIN-1989-2 — Plan 3 Task 17 field configs (registers, selections, lookup_fill,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts din1989_2`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from the
 * transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.md`; the
 * line is in the constant's name. Prod facts come from the captured
 * `din1989_2.prior.json` (2026-09-18, read-only): section codes are single
 * letters per worksheet (-01: B Begriffe, Symbole & Produktdaten; -02: B Werkstoffe ·
 * C Filtertypen & Einstauvolumen · D Hydraulische Anforderungen · E Trennwirkung,
 * Dichtheit, Standsicherheit; -03: B Eingangsgrößen & Prüfaufbau · C Hydraulischer
 * Wirkungsgrad · D Filtertrennwirkung · E Ausgabe & Transfer; -04: A Zweck (Kennzeichnung)
 * · B Konformitätsbewertung · C Einbau, Betrieb und Wartung). Inherited drivers:
 * `filtertyp` and `DN` reach -02 and -03, `einbausystem` and `funktionsprinzip`
 * reach -02, `hersteller` reaches -04; `werkstoff_filterelement` (-02) reaches nothing.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/din1989_2-STAGED-plan3-rulings.sql):
 *   - hiding the Typ-A / Typ-B inputs V_Rueck_A / V_Rueck_B / behaeltnis_masse /
 *     tiefe_gok_griff — every one is read by an unguarded block gate (CR-03 … CR-06);
 *     the gate-aware guard refuses → din1989_2-G-1 / G-2 (IF-guarded gate rewrites);
 *   - hiding standsicherheit_eingehalten under Erdeinbau (CR-10) → din1989_2-G-7;
 *   - the DN ≤ 200 rule on filtertrennwirkung_nachgewiesen (CR-08) → din1989_2-G-4,
 *     and on the consumed -03 outputs eta_Rueck_AB / eta_C / eta_hyd_bel and the
 *     Gl.-7…9 inputs m_ges_festst / m_sp_verunr / m_verw (producer guard) → din1989_2-C-2;
 *   - re-binding the existing `filtertyp` (consumed, CR-01) as the Tab.-1 lookup_fill
 *     → twin `filtertyp_tab1` here, the re-bind STAGED (din1989_2-E-1, amendment J);
 *   - a DN `select_one` — the transcript prints only the threshold "DN 200", never the
 *     nominal sizes (EN 12056-3 Tab. C.1 is external) → din1989_2-J-1; the rules read
 *     the existing number `DN <= 200` directly;
 *   - the brief's `reference` widget for an EN 12056-3 Q value — the codebase `reference`
 *     is a carrier-row picker (needs carrier_symbol/rows_path); the number stays the
 *     existing input `Q` (din1989_2-X-1).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';

const STD = 'DIN-1989-2';

// ---- lifted cue sentences (transcript line in the name) ----
const L227 = String.raw`Filter mit Zulaufnennweiten $\leq$ DN 200 müssen allen Anforderungen dieser Norm entsprechen.`;
const L228 = 'Für Filter mit Zulaufnennweite > DN 200 gibt es für die Anforderung Filtertrennwirkung und hydraulischer Wirkungsgrad des dauerbelasteten Systems zur Zeit kein genormtes Prüfverfahren. Der Hersteller muss diese Werte angeben und nachvollziehbar dokumentieren, wie er diese Werte ermittelt hat. Dem Auftraggeber und den Prüfstellen ist das Verfahren zur Ermittlung der angegebenen Werte auf Verlangen vorzulegen. Alle anderen Anforderungen müssen DIN 1989-2 entsprechen.';
const L256 = String.raw`Für den Einbau in Fallrohre muss der Werkstoff zwischen $-20^{\circ} \mathrm{C}$ und $+80^{\circ} \mathrm{C}$ temperaturbeständig sein.`;
const L263 = 'Aufgrund der unterschiedlichen Funktionsprinzipien sind Filter den in Tabelle 1 aufgeführten Typen zuzuordnen.';
const L267 = 'Tabelle 1 - Filtertypen';
const L271_TAIL = 'Filter mit mechanischer Filtration ohne Sedimentationsvolumen';
const L272 = 'kleines Sedimentationsvolumen';
const L281 = String.raw`Bei Filtern des Typs A erfolgt eine mechanische Abtrennung der Fremdstoffe mit anschließender Sedimentation dieser Stoffe in einem ausreichend großen Volumen zur Aktivierung einer dauerhaft wirksamen Sedimentations- und/oder Rückhaltewirkung (siehe Bild 1). Die Filtereinheiten müssen vor den Trennflächen (bei senkrechter Anordnung) oder über den Trennflächen (bei waagrechter Anordnung) ein Einstauvolumen $V_{\text {Rück }}$ nach Gleichung 1 sicherstellen. Filter des Typs A dürfen sowohl innerhalb als auch außerhalb von Regenwasserspeichern angeordnet werden.`;
const L284 = String.raw`V_{\text {Rück }}=Q \times 25 \tag{1}`;
const L290 = String.raw`Q der Volumenstrom in der planmäßigen Zulaufleitung zum Filter bei einem Füllungsgrad von $70 \%$ und einem Gefälle von 1 \% nach DIN EN 12056-3:2001-01, Tabelle C.1, in Liter je Sekunde`;
const L292 = 'Das Einstauvolumen muss für Reinigungszwecke zugänglich sein.';
const L309 = 'Bei Filtern des Typs B erfolgt eine mechanische Abtrennung der Fremdstoffe mit anschließender Sedimentation dieser Stoffe durch eine zuverlässige und planmäßige Rückhaltewirkung, die durch die Anordnung von Behältnissen zur Sammlung der Fremdstoffe erzielt werden kann. Diese Behältnisse müssen ohne Verwendung von Werkzeugen leicht herausnehmbar und übersichtlich angeordnet sein. Die Fremdstoffe müssen vor dem Filterelement (zulaufseitig) gesammelt werden (siehe Bild 2).';
const L311 = 'Die Masse eines planmäßig herausnehmbaren Behältnisses darf im gefüllten Zustand 20 kg nicht überschreiten.';
const L313 = 'Bei Erdeinbau darf zwischen Geländeoberkante (Schachtabdeckung) und Entnahmeelement (z. B. Haltegriff) eine Tiefe von 60 cm nicht überschritten werden.';
const L317 = String.raw`Das Volumen der herausnehmbaren Behältnisse $V_{\text {Rück }}$ muss mindestens betragen:`;
const L320 = String.raw`V_{\text {Rück }}=Q \times 2 \tag{2}`;
const L329 = 'Das Einstauvolumen muss für Reinigungszwecke zugänglich sein.';
const L345 = 'Alle Filter mit Fremdstoffableitung ohne planmäßige Sedimentations- und Rückhaltewirkung (siehe Bild 3) sind in Typ C einzustufen. Filter des Typs C dürfen sowohl innerhalb als auch außerhalb von Regenwasserspeichern angeordnet werden.';
const L374 = String.raw`Bezugsgröße ist der maximal zufließende Volumenstrom $Q_{\text {max }}$, nach DIN EN 12056-3:2001-01, Tabelle C. 1 in Abhängigkeit von der Nennweite DN der Zulaufleitung bei $1 \%$ Gefälle (70 \% Füllungsgrad).`;
const L378 = String.raw`Um Rückschlüsse auf die Dauerhaftigkeit und die Betriebssicherheit des Filtersystems zu ermöglichen, ist für Filter mit Zulaufnennweiten $\leq$ DN 200 der hydraulische Wirkungsgrad des belasteten Filters nach 6.4.6 zu ermitteln und in der Produktdokumentation anzugeben.`;
const L382 = String.raw`Die Filtertrennwirkung ist für Filter mit Zulaufnennweiten $\leq$ DN 200 nachzuweisen. Bei der Prüfung nach 6.5 sind möglichst viele Fremdstoffe, die dem Filter zufließen, vor dem Zufluss in den Speicher zurückzuhalten oder abzuleiten.`;
const L384 = 'Die Filtertrennwirkung ist als Quotient aus zurückgehaltenen Prüfstoffen bzw. abgeleiteten Prüfstoffen zur Gesamtfeststoffmasse je nach Filtertyp zu ermitteln.';
const L386 = 'Hinsichtlich der Abtrennung von Fremdstoffen müssen diese Filter einen Wirkungsgrad von mindestens 0,7 erreichen (siehe 6.5.3).';
const L403 = 'Für Filter mit Zulaufnennweite > DN200 sind die Prüfung des hydraulischen Wirkungsgrads des dauerbelasteten Systems nach 6.4.6 und der Filtertrennwirkung nach 6.5 nicht geeignet. In diesen Fällen ist vom Hersteller nachvollziehbar zu dokumentieren, wie er die von ihm angegebenen Werte ermittelt hat (siehe 5.1).';
const L479 = String.raw`Als Prüfmedium ist Klarwasser zu verwenden. Das unbelastete Filtersystem wird über die vorgegebene Nennweite des Zulaufquerschnitts, Gefälle $l=1 / 100$ nach DIN EN 12056-3:2001-01, Tabelle C. 1 mit in Tabelle 2 angegebenen Volumenströmen über eine jeweils festgelegte Dauer angeströmt. Anströmungen des Filters mit geringeren Volumenströmen sind über längere Zeit ( 4 min bzw. 8 min ) aufrecht zu erhalten, um bei der Füllstandsmessung im Auffangbehälter eine höhere Genauigkeit zu erzielen.`;
const L483 = 'Tabelle 2 - Prüfzeiten für Volumenströme';
const L509 = String.raw`\eta_{\mathrm{hydr}}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{3}`;
const L519 = String.raw`Als Prüfmedium ist Klarwasser zu verwenden, dem sedimentierbare Stoffe, Schwebstoffe und Schwimmstoffe nach 6.5.1 und Tabelle 3 hinzugefügt sind. Der Vorlagebehälter muss mindestens einem Volumen $V_{\text {Prüf }}$ entsprechen, das dem maximalen Volumenstrom $Q_{\mathrm{Zu}, \max }$ der jeweils vorgegebenen Nennweite des Querschnittes der Zulaufleitung bei $1 \%$ Gefälle, multipliziert mit 90 s entspricht.`;
const L522 = String.raw`V_{\text {Prüf }} \geq Q_{\mathrm{Zu}, \max } \times 90 \tag{4}`;
const L530 = 'Die Menge, Masse und Konzentration des einzelnen Prüfstoffes je 1000 Liter Prüfmedium muss Tabelle 3 entsprechen.';
const L535 = 'Abschließend ist der hydraulische Wirkungsgrad des verschmutzten Systems mit Klarwasser unter Einhaltung der Volumenströme und der Dauer nach 6.4.5 zu ermitteln.';
const L540 = String.raw`\eta_{\text {hyd,bel }}=\frac{Q_{\mathrm{Zu}}-Q_{\mathrm{Ab}}}{Q_{\mathrm{Zu}}} \tag{5}`;
const L563 = 'Tabelle 3 - Prüfstoffe je 1000 Liter Prüfmedium';
const L588 = String.raw`\hline \multicolumn{4}{|l|}{${'$'}{ }^{\mathrm{a}}$ Die LDPE-Folie geht fiktiv mit $10 \mathrm{~g} /$ Stück in die Massenbilanz ein.} \\`;
const L612 = String.raw`Der Vorlagebehälter muss mindestens einem Volumen $V_{\text {Prüf }}$ entsprechen, das dem maximalen Volumenstrom $Q_{\text {Zu, max }}$ der jeweils vorgegebenen Nennweite des Querschnittes der Zulaufleitung bei $1 \%$ Gefälle, multipliziert mit 180 s entspricht (Gleichung (6)).`;
const L615 = String.raw`V_{\text {Prüf }} \geq Q_{\text {Zu,max }} \times 180 \tag{6}`;
const L631 = String.raw`Nicht abgetrennte Prüfstoffe sind am Filterablauf mit einem Drahtsieb mit einer Nennmaschenweite von $250 \mu \mathrm{~m}$ nach DIN ISO 3310-1, das zur Nasssiebung geeignet ist, aufzufangen, zu trocknen und zu wägen. Bei Filtern Typ C ist der Verwurf (siehe 3.17) in gleicher Weise zu ermitteln. Maßgebend sind jeweils die Mengen- bzw. Masseanteile der gefundenen Zusätze.`;
const L639 = String.raw`Für die Filter Typ A und Typ B ist die Filtertrennwirkung $\eta_{\text {Rück, } \mathrm{A}, \mathrm{B}}$ zu ermitteln aus:`;
const L642 = String.raw`\eta_{\text {Rück,A,B }}=\frac{\sum_{\text {ges.Festst }}-\sum_{\text {Sp.verunr }}}{\sum_{\text {ges.Festst }}} \tag{7}`;
const L657 = 'Filter vom Typ C verfügen über kein planmäßiges Rückhaltevolumen. Die Prüfung wird gegenüber Typ A und Typ B um die Wirksamkeit des Verwurfes von Fremdstoffen in die Abflussleitung (so genannte Schmutzfrachttrennung) ergänzt.';
const L662 = String.raw`\eta_{\text {Verw }}=\frac{\sum_{\text {Verw }}}{\sum_{\text {ges.Festst }}} \tag{8}`;
const L671 = String.raw`\eta_{\mathrm{C}}=0,5\left(\eta_{\text {Rück }}+\eta_{\text {Verw }}\right)=0,5 \frac{\Sigma_{\text {ges.Festst }}-\Sigma_{\text {Sp. veruur }}+\Sigma_{\text {Verw }}}{\Sigma_{\text {ges.Festst }}} \tag{9}`;
const L691 = 'Regenwasserfilter nach dieser Norm sind deutlich sichtbar und dauerhaft wie folgt zu kennzeichnen mit:';
const L698 = 'g) Werkstoffbezeichnung (nur bei Kunststoff nach DIN EN ISO 1043-1);';

/** §7 (L692–L700): the nine printed Kennzeichnung items a)–i), labels lifted verbatim. */
export const KENNZEICHNUNG_ITEMS = [
  { value: 'a_nummer_norm', label_de: 'a) Nummer dieser Norm;' },                                            // L692
  { value: 'b_hersteller', label_de: 'b) Name und/oder Zeichen des Herstellers;' },                          // L693
  { value: 'c_typ', label_de: 'c) Typ;' },                                                                   // L694
  { value: 'd_nenngroesse', label_de: 'd) Nenngröße des Zu- und Ablaufs;' },                                 // L695
  { value: 'e_fliessrichtung', label_de: 'e) Fließrichtung;' },                                              // L696
  { value: 'f_filtertrennwirkung', label_de: 'f) Filtertrennwirkung nach 6.5.3;' },                          // L697
  { value: 'g_werkstoffbezeichnung', label_de: 'g) Werkstoffbezeichnung (nur bei Kunststoff nach DIN EN ISO 1043-1);' }, // L698
  { value: 'h_herstelldatum', label_de: 'h) Herstelldatum;' },                                               // L699
  { value: 'i_ueberwachende_stelle', label_de: 'i) Zeichen der überwachenden Stelle.' },                     // L700
] as const;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('DIN-1989-2-01');
const WS02 = on('DIN-1989-2-02');
const WS03 = on('DIN-1989-2-03');
const WS04 = on('DIN-1989-2-04');

// Drivers (prod tokens from the capture): filtertyp typ_a | typ_b | typ_c (consumed by -02 / -03); einbausystem
// integriert | separat_erdeinbau | separat_oberirdisch (consumed by -02); DN number (consumed by -02 / -03).
const TYP_A = "filtertyp == 'typ_a'";
const TYP_B = "filtertyp == 'typ_b'";
const TYP_C = "filtertyp == 'typ_c'";
const TYP_AB = "filtertyp IN {'typ_a', 'typ_b'}";
const ERDEINBAU = "einbausystem == 'separat_erdeinbau'";
/** L227 / L228 / L403: the standardised tests 6.4.6 / 6.5 apply up to DN 200; above it the manufacturer documents the method. */
const DN_LE_200 = 'DN <= 200';
const DN_GT_200 = 'DN > 200';

/** Gl. 7 / 8 / 9 sums over the pruefstoffe register — repeated INLINE in every -03 output (never chained on another new output). */
export const SUM_SOLL = 'sum_rows(pruefstoffe, masse_soll)';
export const SUM_SPEICHER = 'sum_rows(pruefstoffe, masse_speicher_g)';
export const SUM_VERWURF = 'sum_rows(pruefstoffe, if(masse_verwurf_g IS NULL, 0, masse_verwurf_g))';

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- DIN-1989-2-01: Tab. 1 — Sedimentationsvolumen select, the Tab.-1 twin fill and the consistency badge ----
  WS01({
    symbol: 'sedimentationsvolumen', widget: 'select_one', ui_config: null,
    enum_values: [
      // L271: the head of this column is an image in the transcript; the title follows the sibling L272 and §5.3.2 L281 (U-1)
      { value: 'gross', label_de: 'großes Sedimentationsvolumen', order_index: 0 }, // NOT reconstructed: the printed head cell is an image — only "großen Volumen" (L281) backs the word (fix round 1)
      { value: 'klein', label_de: 'kleines Sedimentationsvolumen', order_index: 1 }, // L272
      { value: 'keines', label_de: 'Filter mit mechanischer Filtration ohne Sedimentationsvolumen', order_index: 2 }, // L271
    ],
    verification_quote: `${L263} — ${L267} — ${L272} — ${L271_TAIL}`,
    create: { section_code: 'B', label_de: 'Planmäßiges Sedimentationsvolumen (Tab. 1, Spaltenkopf)', data_type: 'enum', unit: null, clause_reference: '§5.3.1, Tab. 1',
      description: 'Plan 3: zweiter Schlüssel der Tab. 1 (großes / kleines / ohne Sedimentationsvolumen) neben dem Funktionsprinzip; bestimmt zusammen mit funktionsprinzip den Filtertyp (filtertyp_tab1). Der Spaltenkopf der ersten Spalte ist im Transkript ein Bild (din1989_2-U-1).' },
  }),
  WS01({
    symbol: 'filtertyp_tab1', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TAB1', role: 'value', keys: [{ column: 'filterart', from_symbol: 'funktionsprinzip' }, { column: 'sedimentationsvolumen', from_symbol: 'sedimentationsvolumen' }], value: 'typ' },
    enum_values: [
      { value: 'typ_a', label_de: 'TYP A', order_index: 0 }, // L273 / L274
      { value: 'typ_b', label_de: 'TYP B', order_index: 1 },
      { value: 'typ_c', label_de: 'TYP C', order_index: 2 }, // L274
    ],
    verification_quote: `${L263} — ${L345}`,
    create: { section_code: 'B', label_de: 'Filtertyp nach Tab. 1 (aus Funktionsprinzip × Sedimentationsvolumen)', data_type: 'enum', unit: null, clause_reference: '§5.3.1, Tab. 1',
      description: 'Plan 3: Tab.-1-Zuordnung als Zwilling neben dem manuell gewählten filtertyp (das bestehende Feld ist von -02/-03 konsumiert und von CR-01 gelesen — Umbindung STAGED din1989_2-E-1); die Kombination Fremdstoffrückhalt × ohne Sedimentationsvolumen druckt "-" und hat keine Zeile. Abgleich → filtertyp_konsistent_code (DIN-1989-2-01-D1).' },
  }),
  WS01({
    symbol: 'filtertyp_konsistent_code', widget: 'derived', ui_config: null, verification_quote: L263,
    create: { section_code: 'B', label_de: 'Gewählter Filtertyp = Tab.-1-Zuordnung (1 = ja, 0 = Abweichung)', data_type: 'number', unit: null, clause_reference: '§5.3.1, Tab. 1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-01-D1 (filtertyp == filtertyp_tab1); ein Gate auf diesen Wert ist STAGED (din1989_2-G-5, ersetzt CR-01 "filtertyp IS NOT NULL").' },
  }),

  // ---- DIN-1989-2-02: required minima (Gl. 1 / 2), Typ-B containers, Fallrohr, Zugänglichkeit ----
  WS02({
    symbol: 'v_rueck_a_min', widget: 'derived', ui_config: null, visible_when: TYP_A, verification_quote: `${L281} — ${L284} — ${L290}`,
    create: { section_code: 'C', label_de: 'Erforderliches Einstauvolumen Typ A: V_Rück = Q × 25 s (Gl. 1)', data_type: 'number', unit: 'l', clause_reference: '§5.3.2, Gl. 1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-02-D1 (Q × 25; Q = Volumenstrom der Zulaufleitung nach DIN EN 12056-3:2001-01 Tab. C.1 — externer Wert, bleibt Eingabe). Das vorhandene V_Rueck_A bleibt die eingetragene Ist-Größe; Ablösung der Gl. 1 (die heute in das Eingabefeld schreibt) STAGED (din1989_2-R-1).' },
  }),
  WS02({
    symbol: 'v_rueck_b_min', widget: 'derived', ui_config: null, visible_when: TYP_B, verification_quote: `${L317} — ${L320}`,
    create: { section_code: 'C', label_de: 'Erforderliches Volumen der herausnehmbaren Behältnisse Typ B: V_Rück = Q × 2 s (Gl. 2)', data_type: 'number', unit: 'l', clause_reference: '§5.3.3, Gl. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-02-D2 (Q × 2); das vorhandene V_Rueck_B bleibt die eingetragene Ist-Größe (Σ der Behältnisse → behaeltnis_volumen_sum); Ablösung der Gl. 2 STAGED (din1989_2-R-1).' },
  }),
  WS02({
    symbol: 'behaeltnisse', widget: 'register', visible_when: TYP_B,
    ui_config: {
      title: 'Herausnehmbare Behältnisse (Typ B)', subtitle: '§5.3.3 — je Behältnis Volumen, Masse gefüllt (≤ 20 kg) und bei Erdeinbau die Entnahmetiefe (≤ 60 cm)', add_label: '+ Behältnis', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'volumen_l', label: 'Volumen', type: 'number', unit: 'l', required: true, min: 0, aria_label: 'Volumen des Behältnisses' },
        { key: 'masse_gefuellt_kg', label: 'Masse gefüllt', type: 'number', unit: 'kg', required: true, min: 0, aria_label: 'Masse des gefüllten Behältnisses' },
        { key: 'masse_ok', label: '≤ 20 kg', type: 'derived', expr: 'if(masse_gefuellt_kg <= 20, 1, 0)', display: 'badge', value_labels: { '1': '≤ 20 kg', '0': '> 20 kg' } }, // L311
        // L313: only for Erdeinbau (einbausystem is inherited from -01 on -02; while unset the column stays visible and optional)
        { key: 'grifftiefe_cm', label: 'Tiefe GOK bis Entnahmeelement', type: 'number', unit: 'cm', min: 0, visible_when: ERDEINBAU, aria_label: 'Tiefe Geländeoberkante bis Entnahmeelement' },
        { key: 'grifftiefe_ok', label: '≤ 60 cm', type: 'derived', expr: 'if(grifftiefe_cm IS NULL, 1, if(grifftiefe_cm <= 60, 1, 0))', display: 'badge', value_labels: { '1': '≤ 60 cm', '0': '> 60 cm' } },
        { key: 'ohne_werkzeug', label: 'ohne Werkzeug herausnehmbar', type: 'boolean' }, // L309
      ],
      footer: ['behaeltnis_volumen_sum', 'behaeltnis_masse_max', 'behaeltnis_grifftiefe_max'],
      note: `${L309} ${L311} ${L313} Ohne eingetragene Entnahmetiefe zeigt die Zeile "≤ 60 cm" vorläufig (kein Wert = keine Überschreitung); die maßgebende Tiefe behaeltnis_grifftiefe_max bleibt dann offen.`,
    },
    verification_quote: `${L309} — ${L311} — ${L313} — ${L317}`, // four spans (L315 lies between L313 and L317)
    create: { section_code: 'C', label_de: 'Herausnehmbare Behältnisse (Typ B, §5.3.3)', data_type: 'json', unit: null, clause_reference: '§5.3.3',
      description: 'Plan 3: Zeilen je herausnehmbarem Behältnis (Volumen, Masse gefüllt, Entnahmetiefe bei Erdeinbau); Σ Volumen → behaeltnis_volumen_sum (DIN-1989-2-02-D3), max. Masse → behaeltnis_masse_max (-D4), max. Tiefe → behaeltnis_grifftiefe_max (-D5); Ablösung der Skalare V_Rueck_B / behaeltnis_masse / tiefe_gok_griff und Umstellung von CR-04/05/06 STAGED (din1989_2-D-3 … D-5, G-2).' },
  }),
  WS02({
    symbol: 'behaeltnis_volumen_sum', widget: 'derived', ui_config: null, visible_when: TYP_B, verification_quote: L317,
    create: { section_code: 'C', label_de: 'Σ Volumen der herausnehmbaren Behältnisse', data_type: 'number', unit: 'l', clause_reference: '§5.3.3, Gl. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-02-D3 (sum_rows über behaeltnisse); Vergleich mit v_rueck_b_min (Gl. 2) — Umstellung von CR-04 STAGED (din1989_2-G-2).' },
  }),
  WS02({
    symbol: 'behaeltnis_masse_max', widget: 'derived', ui_config: null, visible_when: TYP_B, verification_quote: L311,
    create: { section_code: 'C', label_de: 'Größte Masse eines gefüllten Behältnisses (Grenze 20 kg)', data_type: 'number', unit: 'kg', clause_reference: '§5.3.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-02-D4 (max_rows über behaeltnisse); Umstellung von CR-05 STAGED (din1989_2-G-2).' },
  }),
  WS02({
    symbol: 'behaeltnis_grifftiefe_max', widget: 'derived', ui_config: null, visible_when: `${TYP_B} AND ${ERDEINBAU}`, verification_quote: L313,
    create: { section_code: 'C', label_de: 'Größte Tiefe GOK bis Entnahmeelement (Erdeinbau, Grenze 60 cm)', data_type: 'number', unit: 'cm', clause_reference: '§5.3.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-02-D5 (max_rows über die eingetragenen Entnahmetiefen; ohne Eintrag offen); Umstellung von CR-06 STAGED (din1989_2-G-2).' },
  }),
  // L292 (Typ A) and L329 (Typ B) print the same sentence; Typ C has no Einstauvolumen (L657). Consumer-free, no gate reads it.
  WS02({ symbol: 'rueckhalteraum_zugaenglich', widget: 'attestation', ui_config: null, visible_when: TYP_AB, verification_quote: `${L292} — ${L329}` }),
  WS02({
    symbol: 'einbau_fallrohr', widget: 'attestation', ui_config: null, verification_quote: L256,
    create: { section_code: 'B', label_de: 'Einbau in ein Fallrohr vorgesehen', data_type: 'boolean', unit: null, clause_reference: '§5.2.3',
      description: 'Plan 3: Treiber der Temperaturbeständigkeits-Anforderung (-20 °C bis +80 °C gilt nur für den Einbau in Fallrohre).' },
  }),
  WS02({ symbol: 'temperaturbestaendig_fallrohr', widget: 'attestation', ui_config: null, visible_when: 'einbau_fallrohr == true', verification_quote: L256 }),

  // ---- DIN-1989-2-03: test-step register (Tab. 2), Prüfstoff register (Tab. 3), minima and η twins ----
  WS03({
    symbol: 'prueflaeufe', widget: 'register',
    ui_config: {
      title: 'Prüfläufe hydraulischer Wirkungsgrad (Tab. 2)', subtitle: '§6.4.5 / §6.4.6 — je Stufe Q_Zu/Q_Zu,max, Prüfzeit t, gemessene Q_Zu und Q_Ab; η je Zeile nach Gl. 3 / Gl. 5', add_label: '+ Prüflauf', placement: 'section',
      columns: [
        { key: 'stufe', label: 'Stufe Q_Zu/Q_Zu,max (Tab. 2)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB2' } },
        { key: 'q_pct', label: '%', type: 'lookup_value', unit: '%', lookup: { table_code: 'TAB2', key_column: 'stufe', value: 'q_pct' } },
        { key: 't_min', label: 'Prüfzeit t (Tab. 2)', type: 'lookup_value', unit: 'min', lookup: { table_code: 'TAB2', key_column: 'stufe', value: 'pruefzeit_min' } },
        { key: 'q_soll', label: 'Q_Zu Soll', type: 'derived', expr: 'Q_Zu_max * q_pct / 100', unit: 'l/s' }, // Q_Zu_max = the -03 input
        { key: 'belastet', label: 'dauerbelastet (6.4.6)', type: 'boolean' }, // unset = unbelastet (6.4.5)
        { key: 'q_zu', label: 'Q_Zu gemessen', type: 'number', unit: 'l/s', required: true, min: 0, aria_label: 'zugeführter Volumenstrom Q_Zu' },
        { key: 'q_ab', label: 'Q_Ab gemessen', type: 'number', unit: 'l/s', required: true, min: 0, aria_label: 'abgeführter Volumenstrom Q_Ab' },
        { key: 'eta_row', label: 'η = (Q_Zu − Q_Ab) / Q_Zu', type: 'derived', expr: '(q_zu - q_ab) / q_zu' }, // Gl. 3 (L509) / Gl. 5 (L540)
      ],
      footer: ['prueflaeufe_count', 'eta_hydr_unbel_p100', 'eta_hydr_unbel_min', 'eta_hydr_bel_p100', 'eta_hydr_bel_min'],
      note: `${L479} ${L535} Welche Stufe den dokumentierten Wirkungsgrad liefert, nennt der Text nicht (din1989_2-J-2): ausgegeben werden die Stufe 100 % (Bezugsgröße Q_max, §5.4.2) und das Minimum der Kurve (Bild E.1).`,
    },
    verification_quote: `${L479} — ${L483} — ${L509} — ${L535} — ${L540}`,
    create: { section_code: 'C', label_de: 'Prüfläufe hydraulischer Wirkungsgrad (Tab. 2, Gl. 3 / Gl. 5)', data_type: 'json', unit: null, clause_reference: '§6.4.5, §6.4.6, Tab. 2',
      description: 'Plan 3: Zeilen je Prüfstufe (Tab. 2 → % und Prüfzeit gefüllt, Q_Zu / Q_Ab gemessen, unbelastet oder dauerbelastet); η je Zeile nach Gl. 3 / Gl. 5; Ausgaben eta_hydr_unbel_p100 / _min und eta_hydr_bel_p100 / _min (DIN-1989-2-03-D6 … D9); Ablösung der Skalare Q_Zu / Q_Ab / eta_hydr / eta_hyd_bel STAGED (din1989_2-D-6 … D-9, R-4).' },
  }),
  WS03({
    symbol: 'prueflaeufe_count', widget: 'derived', ui_config: null, verification_quote: L479,
    create: { section_code: 'C', label_de: 'Anzahl erfasster Prüfläufe (Tab. 2 druckt 7 Stufen je Zustand)', data_type: 'number', unit: null, clause_reference: '§6.4.5, Tab. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D5 (count_rows über prueflaeufe).' },
  }),
  WS03({
    symbol: 'eta_hydr_unbel_p100', widget: 'derived', ui_config: null, verification_quote: `${L374} — ${L509}`,
    create: { section_code: 'C', label_de: 'η_hydr unbelastet bei 100 % Q_Zu,max (Gl. 3)', data_type: 'number', unit: null, clause_reference: '§5.4.2, §6.4.5, Gl. 3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D6 (η der Zeile Stufe 100 %, unbelastet; Bezugsgröße Q_max nach §5.4.2 — welche Stufe dokumentiert wird, ist din1989_2-J-2); Zwilling zu eta_hydr (Gl. 3) und eta_hydr_unbel_doku (-02).' },
  }),
  WS03({
    symbol: 'eta_hydr_unbel_min', widget: 'derived', ui_config: null, verification_quote: L509,
    create: { section_code: 'C', label_de: 'η_hydr unbelastet — Minimum über alle Stufen (Bild E.1)', data_type: 'number', unit: null, clause_reference: '§6.4.5, Gl. 3, Anhang E',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D8 (min_rows über die unbelasteten Zeilen — die sichere Seite der η-Kurve; din1989_2-J-2).' },
  }),
  WS03({
    symbol: 'eta_hydr_bel_p100', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L378} — ${L535} — ${L540}`,
    create: { section_code: 'C', label_de: 'η_hyd,bel dauerbelastet bei 100 % Q_Zu,max (Gl. 5)', data_type: 'number', unit: null, clause_reference: '§5.4.3, §6.4.6, Gl. 5',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D7 (η der Zeile Stufe 100 %, dauerbelastet); nur für DN ≤ 200 (§5.4.3); Zwilling zu eta_hyd_bel (Gl. 5) und eta_hydr_bel_doku (-02).' },
  }),
  WS03({
    symbol: 'eta_hydr_bel_min', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L378} — ${L540}`,
    create: { section_code: 'C', label_de: 'η_hyd,bel dauerbelastet — Minimum über alle Stufen (Bild E.1)', data_type: 'number', unit: null, clause_reference: '§6.4.6, Gl. 5, Anhang E',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D9 (min_rows über die dauerbelasteten Zeilen); nur für DN ≤ 200.' },
  }),
  WS03({
    symbol: 'v_pruef_leist_min', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L519} — ${L522}`,
    create: { section_code: 'B', label_de: 'Mindestvolumen Vorlagebehälter Leistungsfähigkeit: Q_Zu,max × 90 s (Gl. 4)', data_type: 'number', unit: 'l', clause_reference: '§6.4.6, Gl. 4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D1 (Q_Zu_max × 90); das vorhandene V_Pruef_leist bleibt das eingetragene Ist-Volumen — Gl. 4 druckt eine Ungleichung, die Prüfung ist v_pruef_leist_ok (-D3); Ablösung der Gl. 4 STAGED (din1989_2-R-3).' },
  }),
  WS03({
    symbol: 'v_pruef_trenn_min', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L612} — ${L615}`,
    create: { section_code: 'B', label_de: 'Mindestvolumen Vorlagebehälter Trennwirkung: Q_Zu,max × 180 s (Gl. 6)', data_type: 'number', unit: 'l', clause_reference: '§6.5.1, Gl. 6',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D2 (Q_Zu_max × 180); V_Pruef_trenn bleibt das Ist-Volumen; Prüfung v_pruef_trenn_ok (-D4); Ablösung der Gl. 6 STAGED (din1989_2-R-3).' },
  }),
  WS03({
    symbol: 'v_pruef_leist_ok', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: L522,
    create: { section_code: 'B', label_de: 'V_Prüf (Leistungsfähigkeit) ≥ Q_Zu,max × 90 (1 = erfüllt, 0 = unterschritten)', data_type: 'number', unit: null, clause_reference: '§6.4.6, Gl. 4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D3; ein Gate auf diesen Wert ist STAGED (din1989_2-G-6 — heute prüft kein Gate die Gl. 4).' },
  }),
  WS03({
    symbol: 'v_pruef_trenn_ok', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: L615,
    create: { section_code: 'B', label_de: 'V_Prüf (Trennwirkung) ≥ Q_Zu,max × 180 (1 = erfüllt, 0 = unterschritten)', data_type: 'number', unit: null, clause_reference: '§6.5.1, Gl. 6',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D4; Gate STAGED (din1989_2-G-6).' },
  }),
  // Gl. 4 / Gl. 6 name the Vorlagebehälter of the 6.4.6 / 6.5 tests — not applicable above DN 200 (L403). Consumer-free, no gate reads them.
  WS03({ symbol: 'V_Pruef_leist', widget: 'scalar', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L227} — ${L403} — ${L519}` }),
  WS03({ symbol: 'V_Pruef_trenn', widget: 'scalar', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L227} — ${L403} — ${L612}` }),
  WS03({
    symbol: 'V_pruefmedium_l', widget: 'scalar', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L530} — ${L563}`,
    create: { section_code: 'B', label_de: 'Volumen des Prüfmediums (Tab. 3 gilt je 1000 Liter)', data_type: 'number', unit: 'l', clause_reference: '§6.5.1, Tab. 3',
      description: 'Plan 3: Bezugsvolumen der Prüfstoff-Sollmassen (masse_soll = Konzentration × Volumen je Zeile des Registers pruefstoffe).' },
  }),
  WS03({
    symbol: 'pruefstoffe', widget: 'register', visible_when: DN_LE_200,
    ui_config: {
      title: 'Prüfstoffe (Tab. 3) — Massenbilanz', subtitle: '§6.5.1 / §6.5.2 — je Prüfstoff Sollmasse aus Tab. 3 × Prüfmedium, gefundene Masse im Speicher (Sp.verunr) und bei Typ C im Verwurf', add_label: '+ Prüfstoff', placement: 'section',
      columns: [
        { key: 'stoff', label: 'Prüfstoff (Tab. 3)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB3' } },
        { key: 'konz', label: 'Massenkonzentration (Tab. 3)', type: 'lookup_value', unit: 'g/l', lookup: { table_code: 'TAB3', key_column: 'stoff', value: 'konzentration_g_l' } },
        { key: 'stueck', label: 'Menge je 1000 l (Tab. 3)', type: 'lookup_value', unit: 'Stück', lookup: { table_code: 'TAB3', key_column: 'stoff', value: 'stueck' } },
        { key: 'fussnote', label: 'Fußnote', type: 'lookup_value', lookup: { table_code: 'TAB3', key_column: 'stoff', value: 'fussnote' } },
        { key: 'masse_soll', label: 'Sollmasse zugegeben', type: 'derived', expr: 'konz * V_pruefmedium_l', unit: 'g' }, // Tab. 3 je 1000 l × Prüfmedium
        { key: 'stueck_soll', label: 'Stück zugegeben', type: 'derived', expr: 'if(stueck IS NULL, 0, stueck * V_pruefmedium_l / 1000)' },
        { key: 'masse_speicher_g', label: 'gefunden im Speicher (Sp.verunr)', type: 'number', unit: 'g', required: true, min: 0, aria_label: 'im Speicher gefundene Masse' },
        { key: 'masse_verwurf_g', label: 'gefunden im Verwurf (Typ C)', type: 'number', unit: 'g', min: 0, visible_when: TYP_C, aria_label: 'im Verwurf gefundene Masse' }, // L631
      ],
      footer: ['m_ges_festst_calc', 'm_sp_verunr_calc', 'm_verw_calc', 'eta_rueck_calc', 'eta_verw_calc', 'eta_c_calc'],
      note: `${L631} LDPE-Folie: gefundene Stücke × 10 g eintragen (Fußnote a, Tab. 3).`,
    },
    verification_quote: `${L382} — ${L530} — ${L563} — ${L588} — ${L631} — ${L384}`,
    create: { section_code: 'D', label_de: 'Prüfstoffe nach Tab. 3 — Massenbilanz (Σ zugegeben / Speicher / Verwurf)', data_type: 'json', unit: null, clause_reference: '§6.5.1, §6.5.2, §6.5.3, Tab. 3',
      description: 'Plan 3: Zeilen je Prüfstoff (Tab. 3 → Konzentration und Stückzahl gefüllt, Sollmasse = Konzentration × Prüfmedium, gefundene Massen im Speicher und — bei Typ C — im Verwurf); Σ → m_ges_festst_calc / m_sp_verunr_calc / m_verw_calc (DIN-1989-2-03-D10 … D12), Trennwirkung nach Gl. 7 / 8 / 9 → eta_rueck_calc / eta_verw_calc / eta_c_calc (-D13 … D15); Umstellung der Gl. 7–9 auf die Register-Summen STAGED (din1989_2-R-2, D-10 … D-12).' },
  }),
  WS03({
    symbol: 'm_ges_festst_calc', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L530} — ${L642}`,
    create: { section_code: 'D', label_de: 'Σ zugegebene Prüfstoffe (Σ ges.Festst, aus Tab. 3 × Prüfmedium)', data_type: 'number', unit: 'g', clause_reference: '§6.5.1, Tab. 3, Gl. 7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D10 (sum_rows über masse_soll); Zwilling zum Skalar m_ges_festst (din1989_2-D-10).' },
  }),
  WS03({
    symbol: 'm_sp_verunr_calc', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L631} — ${L642}`,
    create: { section_code: 'D', label_de: 'Σ im Speicher gefundene Prüfstoffe (Σ Sp.verunr)', data_type: 'number', unit: 'g', clause_reference: '§6.5.2, Gl. 7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D11 (sum_rows über masse_speicher_g); Zwilling zum Skalar m_sp_verunr (din1989_2-D-11).' },
  }),
  WS03({
    symbol: 'm_verw_calc', widget: 'derived', ui_config: null, visible_when: `${TYP_C} AND ${DN_LE_200}`, verification_quote: `${L631} — ${L662}`,
    create: { section_code: 'D', label_de: 'Σ im Verwurf gefundene Prüfstoffe (Σ Verw, Typ C)', data_type: 'number', unit: 'g', clause_reference: '§6.5.2, §6.5.3.2, Gl. 8',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D12 (sum_rows über masse_verwurf_g, leere Zellen zählen 0); Zwilling zum Skalar m_verw (din1989_2-D-12).' },
  }),
  WS03({
    symbol: 'eta_rueck_calc', widget: 'derived', ui_config: null, visible_when: DN_LE_200, verification_quote: `${L639} — ${L642}`,
    create: { section_code: 'D', label_de: 'η_Rück = (Σ ges.Festst − Σ Sp.verunr) / Σ ges.Festst (Gl. 7)', data_type: 'number', unit: null, clause_reference: '§6.5.3.1, Gl. 7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D13 über das Register pruefstoffe — die Trennwirkung der Typen A / B (Gl. 7) und der Speicher-Anteil der Typ-C-Bilanz (Gl. 9); Zwilling zu eta_Rueck_AB (Umstellung STAGED din1989_2-R-2).' },
  }),
  WS03({
    symbol: 'eta_verw_calc', widget: 'derived', ui_config: null, visible_when: `${TYP_C} AND ${DN_LE_200}`, verification_quote: `${L657} — ${L662}`,
    create: { section_code: 'D', label_de: 'η_Verw = Σ Verw / Σ ges.Festst (Gl. 8, Typ C)', data_type: 'number', unit: null, clause_reference: '§6.5.3.2, Gl. 8',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D14 über das Register pruefstoffe; Zwilling zu eta_Verw (Gl. 8).' },
  }),
  WS03({
    symbol: 'eta_c_calc', widget: 'derived', ui_config: null, visible_when: `${TYP_C} AND ${DN_LE_200}`, verification_quote: `${L657} — ${L671}`,
    create: { section_code: 'D', label_de: 'η_C = 0,5 (Σ ges.Festst − Σ Sp.verunr + Σ Verw) / Σ ges.Festst (Gl. 9, Typ C)', data_type: 'number', unit: null, clause_reference: '§6.5.3.2, Gl. 9',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D15 über das Register pruefstoffe; Zwilling zu eta_C (Gl. 9).' },
  }),
  WS03({
    symbol: 'filtertrennwirkung_code_ab', widget: 'derived', ui_config: null, visible_when: `${TYP_AB} AND ${DN_LE_200}`, verification_quote: `${L386} — ${L642}`,
    create: { section_code: 'D', label_de: 'Filtertrennwirkung Typ A/B ≥ 0,7 (1 = nachgewiesen, 0 = unterschritten)', data_type: 'number', unit: null, clause_reference: '§5.5, §6.5.3.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D16 (η_Rück nach Gl. 7 ≥ 0,7); abgeleiteter Zwilling zum manuellen Boolean filtertrennwirkung_nachgewiesen — Umstellung von CR-08 STAGED (din1989_2-D-2 / G-4).' },
  }),
  WS03({
    symbol: 'filtertrennwirkung_code_c', widget: 'derived', ui_config: null, visible_when: `${TYP_C} AND ${DN_LE_200}`, verification_quote: `${L386} — ${L671}`,
    create: { section_code: 'D', label_de: 'Filtertrennwirkung Typ C ≥ 0,7 (1 = nachgewiesen, 0 = unterschritten)', data_type: 'number', unit: null, clause_reference: '§5.5, §6.5.3.2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-2-03-D17 (η_C nach Gl. 9 ≥ 0,7); Zwilling zu filtertrennwirkung_nachgewiesen für Typ C (din1989_2-D-2 / G-4).' },
  }),
  // Gl. 8 (eta_Verw) is the Typ-C-only quotient (L657 / L659); the prod field is consumer-free, feeds no equation and no gate reads it.
  WS03({ symbol: 'eta_Verw', widget: 'scalar', ui_config: null, visible_when: TYP_C, verification_quote: `${L657} — ${L662}` }),
  WS03({
    symbol: 'hersteller_verfahren_dokumentiert', widget: 'attestation', ui_config: null, visible_when: DN_GT_200, verification_quote: `${L228} — ${L403}`,
    create: { section_code: 'D', label_de: 'DN > 200: Hersteller hat Filtertrennwirkung und hydraulischen Wirkungsgrad des dauerbelasteten Systems angegeben und das Ermittlungsverfahren nachvollziehbar dokumentiert (§5.1, §6.1)', data_type: 'boolean', unit: null, clause_reference: '§5.1, §6.1',
      description: 'Plan 3: Bestätigung für Filter > DN 200 (kein genormtes Prüfverfahren für 6.4.6 / 6.5); ein Gate IF DN > 200 THEN … ist STAGED (din1989_2-G-4).' },
  }),

  // ---- DIN-1989-2-04: Kennzeichnung checklist and the Kunststoff-only Werkstoffbezeichnung ----
  WS04({
    symbol: 'kennzeichnung', widget: 'select_many',
    ui_config: { title: 'Kennzeichnung (§7, a–i)', subtitle: 'Regenwasserfilter nach dieser Norm sind deutlich sichtbar und dauerhaft zu kennzeichnen mit:', note: L698 },
    enum_values: KENNZEICHNUNG_ITEMS.map((k, i) => ({ value: k.value, label_de: k.label_de, order_index: i })),
    verification_quote: L691,
    create: { section_code: 'A', label_de: 'Vorhandene Kennzeichnungsangaben (§7 a–i)', data_type: 'json', unit: null, clause_reference: '§7',
      description: 'Plan 3: Mehrfachauswahl über die neun gedruckten Kennzeichnungspositionen a)–i); Zwilling zum manuellen Boolean kennzeichnung_vollstaendig (CR-14) — Umstellung STAGED (din1989_2-D-1); Position g) gilt nur bei Kunststoff.' },
  }),
  // L698: the Werkstoffbezeichnung is required for plastics only — but werkstoff_filterelement is a -02 field that reaches no other
  // worksheet in the capture, so the -04 rule would be inert (pending) until the consumer edit lands; NOT emitted — it lives in the
  // STAGED block din1989_2-C-1 together with that edit (fix round 1).
];

// Section rules: none — every candidate section holds a consumed or gate-bearing field (-02 C: V_Rueck_A / V_Rueck_B / behaeltnis_masse /
// tiefe_gok_griff read by CR-03 … CR-06; -03 D: eta_Rueck_AB / eta_C consumed by -04, filtertrennwirkung_nachgewiesen read by CR-08).
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
