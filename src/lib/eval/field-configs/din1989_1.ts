/**
 * DIN-1989-1 — Plan 3 Task 2 field configs (registers, selections, lookup_fill,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts din1989_1`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from the
 * transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md`; the
 * line is in the constant's name. Prod facts come from the captured
 * `din1989_1.prior.json` (2026-09-17, read-only): section codes are single
 * letters per worksheet (-02: B Auffangflächen · C Aufbereitung · D Speicher;
 * -04: A Zweck (bemessungsverfahren) · B Eingangsparameter · C Regenwasserertrag ·
 * D Betriebswasserbedarf · E Nutzvolumen; -05: B Versickerung · C Rückstau ·
 * D Inbetriebnahme; -06: C Inspektion & Wartung).
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/din1989_1-STAGED-plan3-rulings.sql):
 *   - `sicherungseinrichtung_typ` visible_when (L565) — the field is consumed
 *     by DIN-1989-1-05, the emitter refuses hiding a producer → din1989_1-C-1;
 *   - a scalar `speicheroeffnung_dn_min` lookup_fill on TAB2 — its second key
 *     (Einzelvolumen / Domhöhe band) is no scalar field; the per-tank minimum
 *     is a derived column of `speicher_behaelter` and the governing scalar is
 *     DIN-1989-1-02-D3 (max over rows) → din1989_1-I-1; the CR-04 re-point is
 *     din1989_1-G-3;
 *   - the Mischwasser ⇒ no Rückstauverschluss gate (L669) → din1989_1-G-1;
 *   - the Hybridbehälter ≤ halber Tagesbedarf gate (L591) → din1989_1-G-2
 *     (+ consumer edit din1989_1-C-2);
 *   - retiring the scalar inputs A_A/e/P_d/n/A_Bew/BS_a and re-pointing
 *     Gl. 1 / Gl. 2+3 onto the register sums → din1989_1-R-1 / R-2.
 *
 * The LaTeX token `${ }` is written `${'$'}{ }` inside String.raw (no template
 * interpolation).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';

const STD = 'DIN-1989-1';

// ---- lifted cue sentences (transcript line in the name) ----
const L362 = 'Bei der Regenwassernutzung in Haushalten gilt im allgemeinen der Grundsatz, dass möglichst alle verfügbaren Auffangflächen die nach 5.2 qualitativ geeignet sind, genutzt werden sollten.';
const L420 = 'Bei Verwendung mehrerer Behälter zur Speicherung, sind diese unter Berücksichtigung der vorgenannten Faktoren in Reihe zu schalten. Der Zu- und Überlauf ist im ersten Behälter anzuordnen. Die Wasserentnahme sollte im letzten Behälter installiert werden.';
const L459 = 'Einzelbehälter können miteinander verbunden werden. Dabei sind die vom Hersteller vorgesehenen Verbindungsteile zu verwenden.';
const L461 = 'Bei der Auswahl unterirdischer Speicher sind unter Berücksichtigung des Einbauortes und der Bodenbeschaffenheit die Stand- und Auftriebssicherheit ebenso wie die zu erwartenden Verkehrslasten zu beachten. Speicher, Revisionsschächte und Abdeckungen müssen den Belastungsklassen nach Tabelle 1 entsprechen.';
const L467 = 'Tabelle 1 - Belastungsklassen für unterirdische Regenwasserspeicher unter Verkehrsbelastung';
const L469 = 'Zu wählende Abdeckung nach DIN EN 124';
const L486 = 'Zur Durchführung von Inspektion und Wartung dürfen die Öffnungen der Speicher die folgenden Durchmesser nicht unterschreiten (siehe auch E DIN 1989-3):';
const L490 = 'Tabelle 2 - Speicheröffnungen';
const L591 = 'Hybridbehälter sind in Bezug auf die Betriebswasserpumpe als Vorlagebehälter zu betrachten und entsprechend zu dimensionieren. Ihr Volumen sollte nicht größer als der halbe Tagesbedarf an Betriebswasser sein.';
const L653 = 'Gestatten die vorhandenen Bodenverhältnisse eine Regenwasserversickerung, sollte das aus dem Speicher überlaufende Wasser versickert werden (Schacht, Rigole, Mulde oder Mulden-Rigole). Bei Metalldächern sind die landesspezifischen Regelungen zur Versickerung zu beachten.';
const L659 = 'Baugrundsätze und Bemessung von Regenwasserversickerungsanlagen sind im ATV-Arbeitsblatt A 138 festgelegt. Bei der Bemessung von Versickerungsanlagen kann ggf. die Rückhaltewirkung von Regenwasserspeichern berücksichtigt werden.';
const L661 = 'Das unmittelbare Einleiten von gesammeltem Niederschlagswasser (Versickerung) in ein Gewässer (Grundwasser) stellt eine Gewässerbenutzung dar. Für das Versickern von Niederschlagswasser ist nach § 7 Wasserhaushaltsgesetz (WHG) grundsätzlich eine Erlaubnis bei der zuständigen Wasserbehörde zu beantragen. Die Regelungen der Bundesländer für die Versickerung von Niederschlagswasser und ggf. vorhandene Regelungen zur erlaubnisfreien Versickerung sind zu beachten.';
const L667 = 'Falls der Überlauf von Regenwasserspeichern der Mischwasserkanalisation oder von in Kellerräumen aufgestellten Regenwasserspeichern der Regenwasserkanalisation zugeführt wird, ist dieser rückstaufrei (siehe Bild 2) oder über eine Hebeanlage (siehe Bild 3) auszuführen.';
const L669 = 'Ein Anschluss an einen Mischwasserkanal über einen Rückstauverschluss ist nicht zulässig.';
const L783 = 'Bei der Auswahl des Speichervolumens (Nennvolumens) ist zu berücksichtigen, dass verfahrensbedingt ein Mindestwasservolumen für die Nutzung nicht zur Verfügung steht. Das vom Hersteller angegebene Nennvolumen besteht aus dem Mindestwasservolumen und dem Nutzvolumen, das Gegenstand der folgenden Bemessungsverfahren ist.';
const L796 = '- ein verkürztes Verfahren für kleine Anlagen (z. B. Ein- und Zweifamilienhäuser), bei dem keine Berechnungen durchgeführt werden müssen;';
const L802 = 'Dieses Verfahren kann bei Ein- und Zweifamilienhäusern oder vergleichbar anderen Gebäuden oder Nutzungsarten angewendet werden, wenn folgende Bedingungen vorliegen: - Niederschlagshöhen von 500 mm bis 800 mm je Jahr - ganzjährige häusliche Nutzung - konstante Personenzahl und Nutzung - Dachflächen als Auffangflächen';
// L808 prints "V" for "l" (OCR) twice — quoted as printed; the attestation LABEL reads the physically meaningful "l/m²" (sign-off din1989_1-U-5).
const L808 = String.raw`Das Nutzvolumen sollte einerseits $25 \mathrm{~V} / \mathrm{m}^{2}$ bis $50 \mathrm{~V} / \mathrm{m}^{2}$ angeschlossener Auffangfläche (nicht für Gründächer) betragen und andererseits sollten 800 l bis 1000 l Nutzvolumen je Nutzer vorgesehen werden.`;
const L830 = 'Für die Ermittlung des Ertragsbeiwertes sind Lage, Neigung, Ausrichtung und Beschaffenheit der Auffangfläche zu Berücksichtigen. Als Planungsgrundlage für Neigung und Beschaffenheit der Auffangfläche können die Werte nach Tabelle 3 verwendet werden.';
const L857 = 'Die jährliche theoretisch speicherbare Regenwassermenge ist nach Gleichung (1) zu berechnen:';
const L860 = String.raw`E_{\mathrm{R}}=A_{\mathrm{A}} \times e \times h_{\mathrm{N}} \times \eta \tag{1}`;
const L873 = 'Der jährliche Betriebswasserbedarf kann aus den Bedarfswerten nach Tabelle 4 ermittelt werden.';
const L892 = 'ANMERKUNG Sollten Waschmaschinen angeschlossen werden, würde sich der personenbezogene Tagesbedarf um 10 Liter erhöhen.';
const L897 = String.raw`Der Betriebswasserbedarf im Haushalt setzt sich zusammen aus personenbezogenen Angaben (z. B. Toilette) nach $B W_{\mathrm{a}}=P_{\mathrm{d}} \times n \times 365$`;
const L904 = String.raw`und aus flächenbezogenen Angaben (Grünflächen und Garten) nach $B W_{\mathrm{a}}=A_{\text {Bew. }} \times B S_{\mathrm{a}}$`;
const L955 = 'Die Inbetriebnahme ist durch einen Fachkundigen durchzuführen. Zur Inbetriebnahme ist ein Probelauf mit Wasser mit mehreren Schaltspielen (z. B. der Betriebswasserpumpe und der Nachspeiseeinrichtung) erforderlich. Vor, während bzw. nach diesem Probelauf sind z. B. zu prüfen:';
const L970 = 'Über die durchgeführte Inbetriebnahme und die Übergabe der Unterlagen ist zweckmäßigerweise ein Inbetriebnahme- und Einweisungsprotokoll anzufertigen (siehe Anhang B).';
const L995 = 'Inspektions- und Wartungsarbeiten an Regenwassernutzungsanlagen müssen durch den Betreiber oder einen Fachkundigen in Zeitintervallen nach Tabelle 5 durchgeführt werden und für die in Tabelle 5 aufgeführten Anlagenteile in folgendem Umfang inspiziert bzw. gewartet werden.';
const L1067 = 'Längere oder kürzere Zeitintervalle können sich durch spezielle anlagen- und betriebstechnische Randbedingungen ergeben.';
const L1093 = String.raw`\hline Nr. & Anlagenteil, Apparat ${'$'}{ }^{1)}$ & Bemerkungen \\`;

/** Anhang B (L1094–L1108): the 15 printed Inbetriebnahme rows, labels lifted verbatim. */
export const INBETRIEBNAHME_PRUEFPUNKTE = [
  { value: 'dachablaeufe', label_de: 'Dachabläufe' },                                                        // L1094
  { value: 'dachrinnen_regenfallrohre', label_de: 'Dachrinnen, Regenfallrohre' },                            // L1095
  { value: 'filtersysteme', label_de: 'Filtersysteme' },                                                      // L1096
  { value: 'regenwasserspeicher', label_de: 'Regenwasserspeicher' },                                          // L1097
  { value: 'betriebswasserpumpe', label_de: 'Betriebswasserpumpe' },                                          // L1098
  { value: 'nachspeisung_freier_auslauf', label_de: 'Nachspeisung, Freier Auslauf' },                         // L1099
  { value: 'systemsteuerung', label_de: 'Systemsteuerung' },                                                  // L1100
  { value: 'rohrleitungen', label_de: 'Rohrleitungen' },                                                      // L1101
  { value: 'wasserzaehler', label_de: 'Wasserzähler' },                                                       // L1102
  { value: 'rueckflussverhinderer', label_de: 'Rückflussverhinderer' },                                       // L1103
  { value: 'rueckstauverschluesse', label_de: 'Rückstauverschlüsse' },                                        // L1104
  { value: 'geruchverschluesse', label_de: 'Geruchverschlüsse' },                                             // L1105
  { value: 'hebeanlage', label_de: 'Hebeanlage' },                                                            // L1106
  { value: 'entnahmearmaturen', label_de: 'Entnahmearmaturen' },                                              // L1107
  { value: 'kennzeichnung', label_de: 'Kennzeichnung Leitungen, Entnahmestellen und Hinweisschild' },         // L1108
] as const;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('DIN-1989-1-02');
const WS04 = on('DIN-1989-1-04');
const WS05 = on('DIN-1989-1-05');
const WS06 = on('DIN-1989-1-06');

const UNTERIRDISCH = "speicher_aufstellung == 'unterirdisch'";

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- DIN-1989-1-02: Tab. 1 (cover class) and Tab. 2 (tank openings) ----
  WS02({
    symbol: 'belastungsklasse', widget: 'select_one', enum_values: 'keep_prod', ui_config: null,
    visible_when: UNTERIRDISCH, // L461: Belastungsklassen apply to unterirdische Speicher; keller/oberirdisch have no traffic load
    verification_quote: L461,
  }),
  WS02({
    symbol: 'abdeckung_klasse', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
    lookup: { table_code: 'TAB1', role: 'value', keys: [{ column: 'belastungsklasse', from_symbol: 'belastungsklasse' }], value: 'abdeckung_din_en_124' },
    visible_when: UNTERIRDISCH,
    verification_quote: `${L467} — ${L469}`, // L467 caption, L469 column head
    create: { section_code: 'D', label_de: 'Zu wählende Abdeckung nach DIN EN 124 (Tab. 1)', data_type: 'text', unit: null, clause_reference: '§7, Tab. 1',
      description: 'Plan 3: Abdeckungsklasse (A 15 · B 125 · D 400) aus Tab. 1 zur gewählten Belastungsklasse; Klasse 6 (Sonderlasten nach Angabe des AG) hat keine Abdeckung in der Tabelle.' },
  }),
  WS02({
    symbol: 'speicher_behaelter', widget: 'register',
    ui_config: {
      title: 'Speicher / Einzelbehälter', subtitle: '§7 — je Behälter Aufstellung, Einzelvolumen und Mindestöffnung nach Tab. 2', add_label: '+ Behälter', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'werkstoff', label: 'Werkstoff', type: 'text' },
        // labels = the two printed Tab. 2 kinds (L493–L496); `keller` (prod speicher_aufstellung) has no Tab. 2 row
        { key: 'aufstellung', label: 'Aufstellung', type: 'enum', required: true, options: ['oberirdisch', 'unterirdisch'], option_labels: { oberirdisch: 'oberirdische Speicher', unterirdisch: 'unterirdischen Speicher' }, discriminator: true },
        { key: 'einzelvolumen_l', label: 'Einzelvolumen', type: 'number', unit: 'l', required: true, min: 0 },
        { key: 'domhoehe_mm', label: 'Domhöhe', type: 'number', unit: 'mm', min: 0, visible_when: "aufstellung == 'unterirdisch'" },
        // Tab. 2 row heads: ≤ 3000 l / > 3000 l Einzelvolumen (oberirdisch), Domhöhe ≤ 450 mm / > 450 mm (unterirdisch) — L493–L496
        { key: 'groesse_band', label: 'Tab.-2-Zeile', type: 'derived', expr: "if(aufstellung == 'oberirdisch', if(einzelvolumen_l <= 3000, 'le3000', 'gt3000'), if(domhoehe_mm <= 450, 'dom_le450', 'dom_gt450'))", display: 'badge',
          value_labels: { le3000: '≤ 3000 l', gt3000: '> 3000 l', dom_le450: 'Domhöhe ≤ 450 mm', dom_gt450: 'Domhöhe > 450 mm' } },
        { key: 'oeffnung_min_mm', label: 'Öffnung min. (Tab. 2)', type: 'derived', expr: "lookup('TAB2', aufstellung, groesse_band, 'oeffnung_min_mm')" },
        { key: 'oeffnung_ist_mm', label: 'Öffnung vorh.', type: 'number', unit: 'mm', min: 0 },
        { key: 'oeffnung_ok', label: 'Öffnung ≥ Tab. 2', type: 'derived', expr: 'if(oeffnung_ist_mm >= oeffnung_min_mm, 1, 0)', display: 'badge', value_labels: { '1': 'erfüllt', '0': 'unterschritten' } },
      ],
      footer: ['speicher_einzelvolumen_sum', 'speicheroeffnung_min_erf'],
      note: L420,
    },
    verification_quote: `${L459} ${L420} ${L486} ${L490}`, // L459 + L420 (mehrere Behälter), L486 + L490 (Tab. 2)
    create: { section_code: 'D', label_de: 'Speicher / Einzelbehälter (Tab. 2)', data_type: 'json', unit: null, clause_reference: '§6.3, §7, Tab. 2',
      description: 'Plan 3: Zeilen je Einzelbehälter (Aufstellung, Einzelvolumen, Domhöhe, vorhandene Öffnung); Mindestöffnung je Zeile aus Tab. 2; Σ Einzelvolumen → speicher_einzelvolumen_sum (DIN-1989-1-02-D2), maßgebende Mindestöffnung → speicheroeffnung_min_erf (DIN-1989-1-02-D3); Umstellung von CR-04 STAGED (din1989_1-G-3).' },
  }),
  WS02({
    symbol: 'nennvolumen', widget: 'derived', ui_config: null, verification_quote: L783,
    create: { section_code: 'D', label_de: 'Nennvolumen = Mindestwasservolumen + Nutzvolumen (§16.1)', data_type: 'number', unit: 'l', clause_reference: '§16.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-02-D1 (mindestwasservolumen + V_n, beide von DIN-1989-1-04 übernommen).' },
  }),
  WS02({
    symbol: 'speicher_einzelvolumen_sum', widget: 'derived', ui_config: null, verification_quote: `${L459} ${L420}`,
    create: { section_code: 'D', label_de: 'Σ Einzelvolumen der Behälter', data_type: 'number', unit: 'l', clause_reference: '§6.3, §7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-02-D2 (sum_rows über speicher_behaelter).' },
  }),
  WS02({
    symbol: 'speicheroeffnung_min_erf', widget: 'derived', ui_config: null, verification_quote: `${L486} ${L490}`,
    create: { section_code: 'D', label_de: 'Maßgebende Mindestöffnung nach Tab. 2 (größter Wert über alle Behälter)', data_type: 'number', unit: 'mm', clause_reference: '§7, Tab. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-02-D3 (max_rows über die Tab.-2-Mindestöffnungen der Behälterzeilen); die Prüfung speicheroeffnung_dn ≥ speicheroeffnung_min_erf ist STAGED (din1989_1-G-3, ersetzt CR-04 ≥ 200).' },
  }),

  // ---- DIN-1989-1-04: registers for Tab. 3 / Tab. 4 rows and their sums ----
  WS04({
    symbol: 'auffangflaechen', widget: 'register',
    ui_config: {
      title: 'Auffangflächen', subtitle: '§16.3.4 Tab. 3 — je Fläche Art, A_A und e', add_label: '+ Fläche', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'art', label: 'Art der Auffangfläche', type: 'lookup_key', required: true, lookup: { table_code: 'TAB3' } },
        { key: 'a_a', label: 'A_A', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Auffangfläche A_A' },
        { key: 'e', label: 'e (Tab. 3)', type: 'lookup_value', required: true, lookup: { table_code: 'TAB3', key_column: 'art', value: 'e' } },
        { key: 'e_override', label: 'abweichend', type: 'boolean' },
        { key: 'a_e', label: 'A_A·e', type: 'derived', expr: 'a_a * e' },
      ],
      override: { flag_key: 'e_override', applies_to: ['e'], policy: 'anhaltswert' },
      footer: ['sum_a_e'],
      note: L362,
    },
    verification_quote: `${L362} ${L830}`, // L362 (alle verfügbaren Auffangflächen) + L830 (Tab. 3 als Planungsgrundlage)
    create: { section_code: 'B', label_de: 'Auffangflächen (Tab. 3)', data_type: 'json', unit: null, clause_reference: '§5.3, §16.3.3, §16.3.4, Tab. 3',
      description: 'Plan 3: Zeilen je Auffangfläche (Art nach Tab. 3 → e gefüllt, A_A); Σ A_A·e → sum_a_e (DIN-1989-1-04-D1); Umstellung von Gl. 1 und Ablösung der Skalare A_A/e STAGED (din1989_1-R-1).' },
  }),
  WS04({
    symbol: 'verbraucher', widget: 'register',
    ui_config: {
      title: 'Verbraucher (personenbezogen)', subtitle: '§16.3.7 Tab. 4 — je Verbrauchergruppe Typ, Personen, Tagesbedarf', add_label: '+ Verbrauchergruppe', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'typ', label: 'Verbraucher (Tab. 4)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB4_PERSON' } },
        { key: 'n', label: 'n (Personen)', type: 'number', required: true, min: 0, aria_label: 'Anzahl der Personen n' },
        { key: 'p_d', label: 'P_d (Tab. 4)', type: 'lookup_value', required: true, unit: 'l/(Person·d)', lookup: { table_code: 'TAB4_PERSON', key_column: 'typ', value: 'p_d' } },
        { key: 'p_d_override', label: 'abweichend', type: 'boolean' },
        { key: 'waschmaschine', label: 'Waschmaschine angeschlossen (+10 l)', type: 'boolean' },
        { key: 'p_d_eff', label: 'P_d wirksam', type: 'derived', expr: "p_d + if(waschmaschine, lookup('TAB4_WASCHMASCHINE', 'waschmaschine', 'p_d_zusatz'), 0)" },
        { key: 'bw_row', label: 'BW_a (Zeile)', type: 'derived', expr: 'p_d_eff * n * 365' }, // 365 printed in Gl. 2 (L898)
      ],
      override: { flag_key: 'p_d_override', applies_to: ['p_d'], policy: 'anhaltswert' },
      footer: ['bw_person'],
      note: L892,
    },
    verification_quote: `${L873} ${L897} ${L892}`, // L873 (Tab. 4 kann), L897–L898 (Gl. 2), L892 (Waschmaschine)
    create: { section_code: 'B', label_de: 'Verbraucher (personenbezogen, Tab. 4)', data_type: 'json', unit: null, clause_reference: '§16.3.7, Tab. 4',
      description: 'Plan 3: Zeilen je Verbrauchergruppe (Typ nach Tab. 4 → P_d gefüllt, +10 l bei Waschmaschine, n Personen); Σ P_d·n·365 → bw_person (DIN-1989-1-04-D2); Ablösung der Gl.-2/3-Zeilen und der Skalare P_d/n STAGED (din1989_1-R-2).' },
  }),
  WS04({
    symbol: 'bewaesserungsflaechen', widget: 'register',
    ui_config: {
      title: 'Bewässerungsflächen (flächenbezogen)', subtitle: '§16.3.7 Tab. 4 — je Fläche Typ, A_Bew und spezifischer Jahresbedarf BS_a', add_label: '+ Bewässerungsfläche', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'typ', label: 'Bewässerung (Tab. 4)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB4_FLAECHE' } },
        { key: 'a_bew', label: 'A_Bew', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Bewässerungsfläche A_Bew' },
        { key: 'bs_a_min', label: 'BS_a min (Tab. 4)', type: 'lookup_value', unit: 'l/m²', lookup: { table_code: 'TAB4_FLAECHE', key_column: 'typ', value: 'bs_a_min' } },
        { key: 'bs_a_max', label: 'BS_a max (Tab. 4)', type: 'lookup_value', unit: 'l/m²', lookup: { table_code: 'TAB4_FLAECHE', key_column: 'typ', value: 'bs_a_max' } },
        // SR-2: the Grünland rows print ranges — the engineer picks BS_a inside them (din1989_1-J-1); single-value rows have min = max.
        { key: 'bs_a', label: 'BS_a gewählt', type: 'number', unit: 'l/m²', required: true, min: 0, aria_label: 'spezifischer Jahresbedarf BS_a' },
        { key: 'bs_in_range', label: 'im Tab.-4-Bereich', type: 'derived', expr: 'if(bs_a >= bs_a_min AND bs_a <= bs_a_max, 1, 0)', display: 'badge', value_labels: { '1': 'im Bereich', '0': 'außerhalb Tab. 4' } },
        { key: 'bw_row', label: 'BW_a (Zeile)', type: 'derived', expr: 'a_bew * bs_a' },
      ],
      footer: ['bw_flaeche'],
    },
    verification_quote: `${L873} ${L904}`, // L873 + L904–L905 (Gl. 3)
    create: { section_code: 'B', label_de: 'Bewässerungsflächen (flächenbezogen, Tab. 4)', data_type: 'json', unit: null, clause_reference: '§16.3.7, Tab. 4',
      description: 'Plan 3: Zeilen je Bewässerungsfläche (Typ nach Tab. 4 → BS_a-Bereich, gewählter BS_a innerhalb des Bereichs, A_Bew); Σ A_Bew·BS_a → bw_flaeche (DIN-1989-1-04-D3); Ablösung der Skalare A_Bew/BS_a STAGED (din1989_1-R-2).' },
  }),
  WS04({
    symbol: 'sum_a_e', widget: 'derived', ui_config: null, verification_quote: `${L857} ${L860}`,
    create: { section_code: 'C', label_de: 'Σ (A_A · e) über alle Auffangflächen (Gl. 1-Term)', data_type: 'number', unit: 'm²', clause_reference: '§16.3.6, Gl. 1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-04-D1 (sum_rows über auffangflaechen); Umstellung von Gl. 1 auf diesen Wert STAGED (din1989_1-R-1).' },
  }),
  WS04({
    symbol: 'bw_person', widget: 'derived', ui_config: null, verification_quote: L897,
    create: { section_code: 'D', label_de: 'Betriebswasserjahresbedarf personenbezogen Σ (P_d · n · 365)', data_type: 'number', unit: 'l/a', clause_reference: '§16.3.7, Gl. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-04-D2 (sum_rows über verbraucher).' },
  }),
  WS04({
    symbol: 'bw_flaeche', widget: 'derived', ui_config: null, verification_quote: L904,
    create: { section_code: 'D', label_de: 'Betriebswasserjahresbedarf flächenbezogen Σ (A_Bew · BS_a)', data_type: 'number', unit: 'l/a', clause_reference: '§16.3.7, Gl. 3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-04-D3 (sum_rows über bewaesserungsflaechen).' },
  }),
  WS04({
    symbol: 'bw_a_total', widget: 'derived', ui_config: null, verification_quote: `${L897} ${L904}`,
    create: { section_code: 'D', label_de: 'Betriebswasserjahresbedarf gesamt (personen- + flächenbezogen)', data_type: 'number', unit: 'l/a', clause_reference: '§16.3.7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-04-D4 (bw_person + bw_flaeche); Ablösung der beiden BW_a-Gleichungen Gl. 2 und Gl. 3 durch diese Summe STAGED (din1989_1-R-2).' },
  }),
  WS04({
    symbol: 'tagesbedarf', widget: 'derived', ui_config: null, verification_quote: `${L591} ${L897}`,
    create: { section_code: 'D', label_de: 'Tagesbedarf an Betriebswasser (BW_a / 365)', data_type: 'number', unit: 'l/d', clause_reference: '§11, §16.3.7',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-04-D5; Grenze für das Hybridbehälter-Volumen (≤ halber Tagesbedarf, §11) — Gate STAGED (din1989_1-G-2), Übernahme nach DIN-1989-1-03 STAGED (din1989_1-C-2).' },
  }),
  WS04({
    symbol: 'verkuerzt_band_beachtet', widget: 'attestation', ui_config: null, visible_when: "bemessungsverfahren == 'verkuerzt'",
    verification_quote: `${L796} ${L802} ${L808}`,
    create: { section_code: 'E', label_de: 'Verkürztes Verfahren (§16.2): Das Nutzvolumen sollte einerseits 25 l/m² bis 50 l/m² angeschlossener Auffangfläche (nicht für Gründächer) betragen und andererseits sollten 800 l bis 1000 l Nutzvolumen je Nutzer vorgesehen werden — Bedingungen (Niederschlagshöhen von 500 mm bis 800 mm je Jahr; ganzjährige häusliche Nutzung; konstante Personenzahl und Nutzung; Dachflächen als Auffangflächen) geprüft und Bänder beachtet', data_type: 'boolean', unit: null, clause_reference: '§16.2',
      description: 'Plan 3: Bestätigung der §16.2-Bänder (SR-2-Bereich, keine Berechnung) — sichtbar nur im verkürzten Verfahren; V_n wird dann von Hand eingetragen.' },
  }),

  // ---- DIN-1989-1-05: overflow infiltration conditionals, Kanalart driver, Anhang B checklist ----
  WS05({ symbol: 'versickerung_bemessung_a138', widget: 'attestation', ui_config: null, visible_when: 'ueberlauf_versickerung == true', verification_quote: `${L653} ${L659}` }),
  WS05({ symbol: 'whg_erlaubnis', widget: 'attestation', ui_config: null, visible_when: 'ueberlauf_versickerung == true', verification_quote: `${L653} ${L661}` }),
  WS05({
    symbol: 'kanalart', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'mischwasser', label_de: 'Mischwasserkanalisation', order_index: 0 }, // L667
      { value: 'regenwasser', label_de: 'Regenwasserkanalisation', order_index: 1 }, // L667
    ],
    verification_quote: `${L667} ${L669}`,
    create: { section_code: 'C', label_de: 'Kanalart des Überlaufanschlusses (§14)', data_type: 'enum', unit: null, clause_reference: '§14',
      description: 'Plan 3: Treiber der Rückstau-Logik — Mischwasserkanal schließt den Rückstauverschluss aus (Gate STAGED, din1989_1-G-1); Regenwasserkanal erlaubt ihn für Erdspeicher.' },
  }),
  WS05({
    symbol: 'inbetriebnahme_pruefpunkte', widget: 'select_many',
    ui_config: { title: 'Inbetriebnahme- und Einweisungsprotokoll (Anhang B)', subtitle: 'Nr. 1–15 — Anlagenteil, Apparat; Nicht zutreffendes ist zu streichen, fehlendes zu ergänzen.', note: L955 },
    enum_values: INBETRIEBNAHME_PRUEFPUNKTE.map((p, i) => ({ value: p.value, label_de: p.label_de, order_index: i })),
    verification_quote: `${L970} ${L1093}`,
    create: { section_code: 'D', label_de: 'Geprüfte Anlagenteile bei der Inbetriebnahme (Anhang B, Nr. 1–15)', data_type: 'json', unit: null, clause_reference: '§17.2, Anhang B',
      description: 'Plan 3: Mehrfachauswahl über die 15 Zeilen des Anhang-B-Protokolls (informativ); ersetzt keine Prüfung, dokumentiert sie.' },
  }),

  // ---- DIN-1989-1-06: Tab. 5 catalogue register ----
  WS06({
    symbol: 'wartungsplan', widget: 'register',
    ui_config: {
      title: 'Inspektions- und Wartungsplan (Tab. 5)', subtitle: '§18 — je Anlagenteil Intervalle nach Tab. 5, Erledigung und Bemerkung', add_label: '+ Anlagenteil', placement: 'section',
      columns: [
        { key: 'anlagenteil', label: 'Anlagenteil/Apparat (Tab. 5)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB5' } },
        { key: 'inspektion', label: 'Inspektion', type: 'lookup_value', lookup: { table_code: 'TAB5', key_column: 'anlagenteil', value: 'inspektion_intervall' } },
        { key: 'wartung', label: 'Wartung', type: 'lookup_value', lookup: { table_code: 'TAB5', key_column: 'anlagenteil', value: 'wartung_intervall' } },
        { key: 'erledigt_am', label: 'erledigt am', type: 'date' },
        { key: 'bemerkung', label: 'Bemerkung', type: 'text' },
      ],
      footer: ['wartungsplan_rows'],
      note: L1067,
    },
    verification_quote: `${L995} ${L1067}`,
    create: { section_code: 'C', label_de: 'Inspektions- und Wartungsplan (Tab. 5)', data_type: 'json', unit: null, clause_reference: '§18, Tab. 5',
      description: 'Plan 3: Katalogregister über die 17 Anlagenteile der Tab. 5 (Intervalle gefüllt, Erledigungsdatum); Zeilenzahl → wartungsplan_rows (DIN-1989-1-06-D1); die Hebeanlage-Intervalle b/c/d sind eine Zelle (din1989_1-J-2).' },
  }),
  WS06({
    symbol: 'wartungsplan_rows', widget: 'derived', ui_config: null, verification_quote: L995,
    create: { section_code: 'C', label_de: 'Anzahl erfasster Anlagenteile im Wartungsplan (Tab. 5 druckt 17)', data_type: 'number', unit: null, clause_reference: '§18, Tab. 5',
      description: 'Plan 3: Ausgabe der Gleichung DIN-1989-1-06-D1 (count_rows über wartungsplan); Vollständigkeitsprüfung gegen 17 STAGED (kein Gate).' },
  }),
];

/**
 * §16.2 (L796): the verkürztes Verfahren needs no calculation — the Gl. 1–4 inputs (section B "Eingangsparameter",
 * every field consumer-free in the capture) hide while it is selected; sections C/D/E stay (E_R, BW_a, V_n are
 * consumed by -02/-04/-06 and V_n is typed by hand in that case).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [
  { standard: STD, worksheet: 'DIN-1989-1-04', section_code: 'B', visible_when: "bemessungsverfahren != 'verkuerzt'", verification_quote: L796 },
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
