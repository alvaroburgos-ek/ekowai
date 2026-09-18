/**
 * DWA-M-1200-2 regulation-table seed builders (Plan 3 Task 16, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.md`
 * (Gelbdruck Juli 2025, 2641 lines, mathpix LaTeX tables; the line is in the
 * `Q` key next to each row — the spans were lifted MECHANICALLY by line number,
 * `JSON.stringify` per span, scratchpad gen-m1200_2-quotes.mjs, never retyped;
 * the transcript's fullwidth punctuation (`，` `：` `／` `－` `）`) inside Tab. 3
 * is kept as printed). Every cell that carries a printed value is asserted to be
 * a substring of its row span at build time (`must`). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts m1200_2 "<transcript>"`.
 * Emitted as `20260917101600_regulation_tables_seed_m1200_2.sql` (no earlier
 * DWA-M-1200-2 table seed exists — nothing superseded).
 *
 * Edition: the title page prints "Juli 2025" (L9) under "Entwurf" (L11) →
 * `'2025-07'`; prod `standards.version` reads "Gelbdruck (Entwurf) — Juli 2025"
 * (read-only query in-session). Printed ⇒ no numbered edition sign-off block.
 *
 * Tables and the ONE policy each carries (spec §7, first-hit cue quoted):
 *   TAB3          Tab. 3 "Arbeitshilfe A" (L544–L557, L563–L573) — the class-keyed
 *                 minimum requirements and log10 targets, ONE row per prod class
 *                 token, one value column per printed parameter (the m1200_1 TAB8
 *                 shape; a printed row covering two sub-classes is seeded twice
 *                 with identical cells and the same span) — `locked` (L544
 *                 "Mindestanforderungen"; L534 "müssen in mindestens 90 % der
 *                 Proben eingehalten werden"). `imported_unverified`: the class
 *                 column prints OCR glyphs (く / ம （B－1／B－2） / ن نコ نコ / ロ — U-1),
 *                 the C-row AFS unit prints "mg/e" (U-2), and the table's notes
 *                 a)–g) are NOT printed in this transcript (X-3).
 *   S3_3_3        §3.3.3 vereinfachtes Validierungsmonitoring (L681 / L683):
 *                 16 paired samples, 15 of 16 (A) / 8 of 16 (B-1, C-1) must reach
 *                 the target, max shortfall 1,0 / 2,0 log10 — keyed on the prod
 *                 class tokens A / B-1 / C-1 (no row for B-2 / C-2 / D — Tab. 3
 *                 prints "－" for them) — `locked` ("muss … erreicht oder
 *                 überschritten werden", L681)
 *   ANHANGC1      Anhang C.1 (L1800 / L1802): the percentile the umfängliche
 *                 Validierung tests — 10 (A) / 50 (B-1, C-1) — `locked` ("muss das
 *                 Leistungsziel erreichen oder übersteigen")
 *   GL_C2_1       Gl. C.2-1 (L1822): the k-factor 1,282 of the 10th-percentile
 *                 estimate — `locked` (a printed constant; the L1860 example table
 *                 prints the same "k-Faktor & k & 1,282")
 *   TAB4          Tab. 4 (L758–L816) validation principles per stage — text cells
 *                 verbatim (mechanisms, influencing factors, method, reference) —
 *                 `locked` (L754 "sind die Validierungsgrundsätze … zusammengefasst"
 *                 — no modal that permits a deviation; O-1 proposes `anhaltswert`).
 *                 `imported_unverified`: the printed TEXT cells carry the OCR "l" for
 *                 "(" ("lanalog auch andere chemische Desinfektion)" L790, "laus
 *                 Polyamid)" / "lengl." L806, "lggf." L765, "lelektrostatische" L805 /
 *                 L806, "Tie-fen-" L816) — kept verbatim, displayed as printed (U-5)
 *   TAB6          Tab. 6 (L1297–L1319) operating parameters + frequency per stage —
 *                 `anhaltswert` (caption L1297 "Beispiel für Betriebsparameter",
 *                 L1293 "zeigt beispielhaft"; the L663 "mindestens … zu
 *                 berücksichtigen" makes the PARAMETER set mandatory — recorded in
 *                 the O-block). `imported_unverified`: the MBR cell prints the two
 *                 frequency lines (Online / Wöchentlich) but the parameter cell lost
 *                 its line break — the split "… Trübung | Schlammalter …" is the
 *                 executor's reading (U-3; `parameter_gedruckt` keeps the cell)
 *   TABB2         Tab. B.2 (L1748–L1780) indicative log10 reductions per stage —
 *                 erreichbar (numbers) and erwartbar (printed text + parsed
 *                 min / max, null for "systemspezifisch") per organism group —
 *                 `anhaltswert` (L1748 "Indikative"; L659 "können … herangezogen
 *                 werden"). `imported_unverified`: the Anmerkung text cells carry the
 *                 same OCR garble ("lund Bakterien)" L1772, "lunter Berücksichtigung"
 *                 L1774); every numeric erreichbar / erwartbar cell is clean (U-6)
 *   S8_2_KOSTEN   §8.2 (L1450–L1465) specific cost ranges per stage (€/m³ SW, 2020)
 *                 — `anhaltswert` (L1450 "grobe Richtwerte"); SR-2: min / max are
 *                 hints beside the engineer's own figure
 *   TABE1_STUFEN  Tab. E.1 (L2172–L2185) reference-plant design / operating
 *                 conditions per stage — `anhaltswert` (L2164 "nur auszugsweise und
 *                 vorläufig als Beispiel")
 *   TABE1_LEISTUNG Tab. E.1 (L2167–L2170) reference-plant 10th percentiles per
 *                 organism — `anhaltswert` (L2164); `imported_unverified`: the
 *                 Clostridium row prints "24,7" (U-4 — null, printed text kept)
 *
 * Key tokens (G-A3): TAB3 / S3_3_3 / ANHANGC1 `klasse` = prod
 * `M12002-02.wassergueteklasse` values (`A B-1 B-2 C-1 C-2 D`, captured
 * m1200_2.prior.json 2026-09-18); TABB2 / TAB6 / TAB4 / TABE1_STUFEN /
 * S8_2_KOSTEN `stufe` = the created stage vocabularies exported below (the
 * verfahrenskette register keys on TABB2's twelve tokens; TAB6 shares mbr, mf_uf,
 * ozon, ro, uv, uv_aop, chlor; TAB4 shares mbr, uv, chlor, ozon, mf_uf (its
 * "Umkehrosmose und Nanofiltration" row is `ro_nf`, not B.2's `ro`); TABE1_STUFEN
 * shares biologisch, mf_uf, ozon, uv; each keeps its own token otherwise); TABE1_LEISTUNG `organismus`
 * = the created register's organism tokens.
 */
import type { RegulationTable, RegulationRow, ValueColumn } from './regulation-tables';

const STD = 'DWA-M-1200-2';
export const M12002_EDITION = '2025-07';
const ED = M12002_EDITION;

/** Lifted spans (verbatim, line-cited in the key; generated from the transcript by scratchpad gen-m1200_2-quotes.mjs — JSON.stringify per span, never retyped). */
export const Q = {
  L9: "Juli 2025",
  L11: "\\section*{Entwurf}",
  L534: "Die vorgegebenen Werte für E. coli, Legionella spp. und intestinale Nematoden in Tabelle 3 müssen in mindestens $90 \\%$ der Proben eingehalten werden. Keiner der Werte der Proben darf die maximale Abweichungsgrenze von einer $\\log _{10}$-Stufe für den vorgegebenen Wert für $E$. coli und Legionella spp. und $100 \\%$ des vorgegebenen Werts für intestinale Nematoden überschreiten.",
  L544: "\\caption{Tabelle 3：Arbeitshilfe A：Mindestanforderungen an die Qualität von aufbereitetem Wasser für die landwirtschaftliche und urbane Wasserwiederverwendung sowie Leistungsziele für Aufbereitungs－ einrichtungen in Deutschland}",
  L616: "Wie in Tabelle 3 dargestellt, wird gemäß LAWA (2022) und der zu erwartenden Bundes-WVVO die laut Anhang I der EU-WasserWVVO für die Wassergüteklasse A vorgesehene Überwachung zur Validierung der Leistungsziele bei der landwirtschaftlichen Bewässerung in Deutschland auch für die Güteklassen B und C gefordert (entspricht den Güteklassen B-1 und C-1 nach Tabelle 2).",
  L640: "Für die drei in Tabelle 3 genannten Organismengruppen werden die aus den vorgenannten methodischen Ansätzen ermittelten $\\log _{10}$-Reduktionen für einzelne Aufbereitungsstufen jeweils zu einer Gesamtreduktion addiert (Mehrfachbehandlung, Multibarrierenansatz), siehe Beispiel in Bild 1.",
  L659: "2. Sofern keine Daten von Referenzanlagen vorliegen oder diese nicht anwendbar sind, können als Alternativvariante $\\log _{10}$-Reduktionen und Betriebsdaten aus weiteren Quellen herangezogen werden, die den Anforderungen der Dokumentation als Referenzanlage nach 3.3.5 genügen (insbesondere im Hinblick auf die Festlegung adäquater Betriebsparameter). Diese Daten müssen durch eine unabhängige Einrichtung oder die Genehmigungsbehörde nach 3.3.5 begutachtet werden. Zu den weiteren Quellen für $\\log _{10}$-Reduktionen und Betriebsdaten zählen beispielsweise technische Datenblätter von Lieferanten, veröffentlichte wissenschaftliche und technische Literatur (siehe z. B. die Zusammenstellung in Tabelle B. 1 im Anhang B), Leitlinien von Gesetzgebern (siehe z. B. die Australian Guidelines for Water Recycling (2006), die mit ergänzenden Angaben in Tabelle B. 2 im Anhang $B$ dargestellt sind) und historische Datenbestände von Anlagenbetreibern. Die einzelnen $\\log _{10}$-Reduktionen werden anschließend über den gesamten Aufbereitungszug aufsummiert.",
  L663: "Mit beiden Varianten werden die Mindestanforderungen an die Betriebsbedingungen für die Aufbereitungseinrichtung, insbesondere die relevanten Betriebsparameter und deren Anwendungsbereiche (Betriebsfenster) spezifiziert. Es sind mindestens die Betriebsparameter gemäß Tabelle 6 zu berücksichtigen. Hinweise zu relevanten Einflussfaktoren und relevanten Betriebsparametern können auch Tabelle 5 entnommen werden. Die spezifizierten Mindestanforderungen an die Betriebsparameter sind während der Inbetriebnahmephase und im Regelbetrieb einzuhalten.",
  L668: "1. der Nachweis der Einhaltung der Leistungsziele nach Tabelle 3 separat für jeden Indikatororganismus gemäß 3.3.4 erbracht wird und gleichzeitig",
  L672: "Die Validierung ist die Grundlage zur Erteilung der Aufbereitungsgenehmigung (siehe Merkblatt DWA-M 1200-1:2025 in 7.2).",
  L679: "Beim vereinfachten Validierungsmonitoring werden die zu validierenden $\\log _{10}$-Reduktionen für den gesamten Aufbereitungszug auf Basis eines paarweisen Vergleichs von Zu- und Ablaufproben (sogenannter Binomialansatz) nachgewiesen. Dabei werden $\\log _{10}$-Reduktionen jeweils paarweise aus korrespondierenden Zu- und Ablaufproben berechnet. Abweichend von der Mindestanzahl gemäß EU-WasserWVVO (mindestens drei Proben pro Stichprobenpunkt) und in Anlehnung an die EU-Badegewässerrichtlinie 2006/7/EG sind je 16 korrespondierende Proben im Zulauf und Ablauf zu nehmen. Die Beurteilung erfolgt wie folgt:",
  L681: "I Wassergüte-Klasse A: In mindestens 15 der 16 Proben muss das Leistungsziel für den jeweiligen Indikatororganismus erreicht oder überschritten werden. Falls das Leistungsziel einmal nicht erreicht wird, darf dieses um nicht mehr als $1,0 \\log _{10}$-Stufen unterschritten werden. Das Leistungsziel gilt hierbei ebenfalls als erreicht, wenn der Indikatororganismus in der Ablaufprobe mit < 1 KBE bzw. PFU je 100 ml Probenvolumen vorliegt.",
  L683: "I Wassergüte-Klassen B-1 und C-1: In mindestens 8 der 16 Proben muss das Leistungsziel für den jeweiligen Indikatororganismus erreicht oder überschritten werden. Falls das Leistungsziel nicht erreicht wird, darf dieses um nicht mehr als $2,0 \\log _{10}$-Stufen unterschritten werden. Das Leistungsziel gilt hierbei ebenfalls als erreicht, wenn der Indikatororganismus in der Ablaufprobe mit < 1 KBE bzw. PFU je 100 ml Probenvolumen vorliegt.",
  L684: "2. das umfängliche Validierungsmonitoring, wenn die Genehmigungsbehörde dieses bei Anwendung der Alternativvariante in der Planungsphase vorgibt. Das Vorgehen ist in Anhang C beschrieben.",
  L754: "In Tabelle 4 sind die Validierungsgrundsätze für ausgewählte Verfahren unter anderem gemäß den Australian Guidelines for Water Recycling (2020) zusammengefasst.",
  L758: "\\caption{Tabelle 4: Validierungsgrundsätze und internationale Referenzen für verschiedene Aufbereitungsstufen}",
  L804: "\\hline Ozonbasierte Desinfektion & Inaktivierung durch Oxidationsreaktionen mit z. B. Zellwänden oder genetischem Material, präferentielle Reaktionen mit elektronenreichen Molekülbereichen (z. B. Koh-lenstoff-Stick-stoff-Bindungen) & Ozon-Konzentration, applizierte Ozon-Dosis lggf. bezogen auf DOC), Temperatur, pHWert, Trübung, DOC, Ozon-zehrende Verbindungen, hydraulische Charakteristik & Nachweis der Desinfektionsleistung in Abhängigkeit von der spezifischen Ozondosis (g $\\mathrm{O}_{3} / \\mathrm{g}$ DOC) und sekundär weitere Einflussfaktoren wie Trübung, Ozon-zehrende Verbindungen (Ammonium, Nitrit) und pH. Der Reaktor muss hydraulisch charakterisiert sein durch Strömungssimulationen und/oder Tracer-Versuche. Die Einflussfaktoren sind im Betrieb auf geeignete Weise zu überwachen. Da in Deutschland in der Regel Ozon so dosiert wird, dass kein Restozongehalt gemessen werden kann, kann der Validierungsansatz auf Basis des Ct-Werts (WaterSecure 2017b) in der Regel nicht angewendet werden. & WaterSecure (2017b) \\\\",
  L805: "\\hline Mikrofiltration und Ultrafiltration & Rückhalt durch dichte trennaktive Schicht der porösen Membranen in Folge von Größenausschluss (Siebeffekt) sowie teilweise Ladungseffekte lelektrostatische Abstoßung) und Adsorption & Membraneigenschaften (Porendurchmesser, Oberflächenladung, Hydrophobizität), Membranmodul, Betriebsbedingungen (z. B. Permeatfluss, Transmembrandruck, Wasserausbeute, Überströmung), Wasserqualität (pH, Temperatur, lonenstärke, DOC), Membran-integrität, Fouling und Scaling & In der Regel sollte eine Vorab-Validierung des Membransystems durch den Anbieter erfolgen. Dabei ist ein ,,Challenge-Test\" z. B. mit MS2Phagen als Indikatoren in einem typischen (konservativen) Betriebsregime durchzuführen. Bei der ..NSF 419\"-Zertifizierung wird die minimale und mittlere $\\log _{10}$-Reduktion für Viren bzw. Cryptosporidium mitsamt des maximal zugelassenen Permeatflusses angegeben. Im Betrieb ist die Integrität fortlaufend oder zumindest regelmäßig zu überwachen. Verschiedene Integritätstests können kontinuierlich (z. B. Trübungsmessung oder Partikelzählung im Permeat) oder diskontinuierlich (z. B. Druckhaltetest, Blasentest oder Spiking-Test) durchgeführt werden. & US EPA:1991, US EPA:2001, DVGW W 2135 (A), DVGW W 2136 (A), NSF/ANSI 419 \\\\",
  L806: "\\hline Umkehrosmose und Nanofiltration & Rückhalt durch dichte trennaktive Schicht laus Polyamid) der dichten Membranen in Folge von Größenausschluss (Siebeffekt), Ladungseffekte lelektrostatische Abstoßung), Adsorption & Membraneigenschaften lengl. .,Molecular Weight Cut-off\", Oberflächenladung, Hydrophobizität), Membranmodul (z. B. Spiralwickelmodul), Betriebsbedingungen (Permeatfluss, Transmembrandruck, Wasserausbeute, Überströmung), Wasserqualität (pH, Temperatur, lonenstärke, DOC), Membranintegrität, Fouling und Scaling & In der Regel sollte eine Vorab-Validierung des Membransystems durch den Anbieter erfolgen. Dabei ist ein .,Chal-lenge-Test\" z. B. mit MS2-Phagen als Indikatoren in einem typischen (konservativen) Betriebsregime durchzuführen. Weiterhin ist ein kontinuierlich (online) messbarer Parameter festzulegen, der zur betrieblichen Integritätskontrolle verwendet wird (z. B. Leitfähigkeit oder TOC). Die Integrität muss durch den entsprechenden Parameter fortlaufend im Betrieb überwacht werden. Falls es zu größeren Abweichungen im Betriebsregime kommt oder der OnlineParameter keine aussagekräftigen Informationen liefert, wird ein „Chal-lenge-Test\" in der großtechnischen Anlage empfohlen. & WaterSecure (2017e) \\\\",
  L816: "\\hline Schnellsandfilter (nachgeschaltet) & Rückhalt im Tie-fen-/Medienfilter durch Größenausschluss (Siebeffekt), Ladungseffekte, Adsorption und Hydrodynamik & Medieneigenschaften (z. B. Partikelgrößenverteilung, Filtertiefe), Betriebsbedingungen (z. B. Filtrationsrate, Flockungsmittelzugabe, Betriebsdauer), Wasserqualität (CSB, BSB, AFS, Trübung, Gesamtphosphor) & Notwendigkeit einer fallspezifischen Validierung, da die Leistung stark abhängig vom Standort (Wasserqualität; Filterdesign) und den Betriebsbedingungen ist. & WaterRF (2023), US EPA: 1991, DVGW W 213-3 (A) \\\\",
  L894: "2) Filtration: Für die Wassergüteklassen A bis C ist gemäß Tabelle 3 der Einsatz einer Filtration vor der Desinfektionsstufe gefordert, für die Wassergüteklasse D ist sie optional. Für die Güteklassen A bis C werden die Filtrationsanforderungen mit Trübungswerten von $\\leqslant 2$ NTU spezifiziert. Wenn diese Anforderungen an die Trübung kontinuierlich überwacht und eingehalten werden, kann auch davon ausgegangen werden, dass die Anforderungen zu AFS mit Werten von $\\leqslant 10 \\mathrm{mg} / \\mathrm{l}$ eingehalten werden und somit die bei geringen Feststoffkonzentrationen aufwendige AFS-Messung nicht notwendig ist (siehe Fußnote e) zu Tabelle 3). Weitere Erläuterungen zu Filtrationsverfahren siehe 5.2.",
  L935: "Gemäß Tabelle 3 wird für die Wassergüteklassen A bis C grundsätzlich die Anordnung einer Filtrationsstufe gefordert und durch Anforderungen an die Trübungswerte von $\\leqslant 2$ NTU spezifiziert.",
  L941: "Mit geringen Filtergeschwindigkeiten betriebene Sandfilter werden aus wirtschaftlichen Gründen in Deutschland nur als naturnahe Abwasserbehandlungsverfahren bei einer Bodenpassage ausgeführt, zum Beispiel bei Kläranlagen mit bepflanzten und unbepflanzten Filtern oder bewachsenen Bodenfiltern. In Schwellen- und Entwicklungsländern werden hingegen vermehrt die in der Trinkwasseraufbereitung etablierten Langsamsandfilter eingesetzt. Sie werden mit Filtergeschwindigkeiten von 0,05 $\\mathrm{m} / \\mathrm{h}$ bis $0,5 \\mathrm{~m} / \\mathrm{h}$ als letzte Verfahrensstufe der Abwasserbehandlung betrieben, um Bewässerungswasser bereitzustellen. Als einfache und kostengünstige Technologie ermöglichen sie eine Reduktion von Krankheitserregern bis zu 3 Log $_{10}$-Stufen (WHO 2006). Sie sind zudem in der Lage, die pathogenen Protozoen Giardia spp. und Cryptosporidium spp. zu entfernen, die weitgehend resistent gegen chemische Desinfektionsmittel sind. Die sich ausbildende Schmutzdecke und der obere Bereich des Sandbettes sind maßgeblich für die Mikroorganismenreduktion, während die Eliminationsleistung in tieferen Zonen des Filterbettes abnimmt. Richtlinien für die Auslegung und den Betrieb von Langsamsandfiltern liegen in Deutschland nur für die Aufbereitung von Trinkwasser vor (Arbeitsblatt DVGW W 213-4 (A)).",
  L953: "I Porengröße der Membranen (Mikro- bzw. Ultrafiltration),",
  L1050: "Unter bestimmten Umständen kann es sinnvoll bzw. erforderlich sein, eine Sekundärdesinfektion in das weitere Transport- bzw. Verteilungsnetz zu integrieren. Dies ist im Rahmen des Risikomanagementplans zu prüfen, beispielsweise für die Wassernutzung nach einer Speicherung des aufbereiteten Wassers, da die Stagnation den Mikroorganismen die Zeit für Regeneration und Vermehrung bietet.",
  L1068: "Die Fluenz oder mittlere Bestrahlungsstärke der UV-Bestrahlung lim Weiteren verallgemeinernd als Dosis bezeichnet) wird in $\\mathrm{J} / \\mathrm{m}^{2}$ (international häufig auch in $\\mathrm{mJ} / \\mathrm{cm}^{2}$ ) angegeben und ist das Produkt aus der Bestrahlungsstärke ( $\\mathrm{W} / \\mathrm{m}^{2}$ oder $\\mathrm{mW} / \\mathrm{cm}^{2}$ ) und der Dauer des Bestrahlungsvorgangs ( s ) (Arbeitsblatt DVGW W 294-1 (A)). Die Wahrscheinlichkeit einer irreversiblen Inaktivierung der Zelle erhöht sich, je mehr Treffer eine Zelle durch UV-Quanten erhält. Die Dosis, die eine Zelle im Mittel erhält, lässt sich rechnerisch als Produkt aus der mittleren Bestrahlungsstärke ( $\\mathrm{W} / \\mathrm{m}^{2}$ ) und der mittleren Verweildauer (s) abschätzen. Die Verweildauer ist die Zeit, die eine Zelle der UV-Strahlung ausgesetzt ist. Auf Grundlage der Eingangskonzentration der zu reduzierenden Organismen und der eingesetzten UV-Dosis lässt sich anhand dieser Dosis-Wirkungsbeziehung die erforderliche Kontaktzeit bestimmen (bzw. umgekehrt).",
  L1099: "In der Regel wird die Desinfektionswirkung (wie auch die Entfernung von Spurenstoffen) in Abhängigkeit der spezifischen Ozondosis angegeben (siehe Tabellen B. 1 und B. 2 in Anhang B). Spezifische Ozondosen von $0,5 \\mathrm{~g}$ bis $1,0 \\mathrm{~g} \\mathrm{O}_{3} / \\mathrm{g}$ DOC sind üblich. Dabei erfolgt die Angabe als Nitrit-korrigierter DOC-Wert, da Nitrit eine stark Ozon-zehrende Substanz ist (Zappatini \\& Götz 2015, Merkblatt-Entwurf DWA-M 285-3:2024).",
  L1101: "Die Prozesssteuerung der Ozonung ist über die relative Reduktion des $\\mathrm{SAK}_{254}\\left(\\triangle \\mathrm{SAK}_{254}\\right)$ gebräuchlich. Im Gegensatz zur Ozonung in einigen anderen Ländern, wie zum Beispiel Australien oder USA, wird die Ozonung in Deutschland in der Regel so betrieben, dass keine Restozon-Konzentration gemessen werden kann, und damit das Ct-Konzept nicht angewendet werden kann.",
  L1135: "Laut DIN 19650:1999 in 5.2: S. 3 ist es nicht zulässig, hygienisch-mikrobiologisch unbedenkliches Bewässerungswasser durch Desinfektion von verunreinigtem Wasser mit chemischen Verbindungen zu erreichen. Daher sollte die Desinfektion mit chlorhaltigen Mitteln und Chlordioxid, ähnlich dem Ansatz bei der Trinkwasserversorgung, einzig als Restdesinfektion und zur Verhinderung von Wiederverkeimung bei längeren Transport- und Speicherdauern eingesetzt werden. Dabei ist Chlordioxid das Desinfektionsmittel der Wahl. Chlordioxid kann entweder relativ einfach mit einer Anlage vor Ort hergestellt",
  L1163: "Perameisensäure ist ein in der Medizin sowie Lebensmittelindustrie verbreitetes Desinfektionsmittel. Die Wirkung beruht auf den stark oxidierenden Eigenschaften der Säure, welche die Zellwandstruktur sowie die DNA von Mikroorganismen zerstören. Für eine weitgehende Reduktion von Bakterien und Coliphagen reicht Perameisensäure in Konzentrationen von $5 \\mathrm{mg} / \\mathrm{l} \\mathrm{bis} 6 \\mathrm{mg} / \\mathrm{l}$ mit Reaktionszeiten von 5 min bis 45 min aus, um Bakterien und Coliphagen (Viren, die bestimmte Bakterien befallen) zufriedenstellend zu reduzieren. F+-Bakteriophagen, sporenbildende Bakterien wie Clostridium perfringens sowie parasitäre Protozoen (Cryptosporidium, Giardia) hingegen sind deutlich resistenter bis nicht zu eliminieren. Großtechnische Untersuchungen auf Kläranlagen zeigten eine Bakterien-Reduktion um $2 \\log _{10}$ - bis $3 \\log _{10}$-Stufen, zum Teil nach 6 min bis 10 min Reaktionszeit mit 15 ppm bis 20 ppm Perameisensäure (GnIRSS et al. 2015, Maya et al. 2012, GEHR et al. 2009). Einen Überblick über die Wirksamkeit in Abhängigkeit der Dosierung geben Tabellen B. 1 und B.2.",
  L1283: "Für die Qualitätsüberwachung ist angelehnt an die EU-WasserWVVO, Anhang 1, Abschnitt 2, weiterhin gefordert, dass $90 \\%$ der Proben die Mindestanforderungen gemäß Tabelle 3 einhalten müssen und die weiteren Proben eine maximale Überschreitung von $1 \\log _{10}$-Stufe für E. coli und Legionellen bzw. $100 \\%$ für andere Parameter aufweisen dürfen. Dies gilt vorbehaltlich gegebenenfalls weiterergehender Anforderungen, die aus dem Risikomanagementplan resultieren.",
  L1287: "Die Messhäufigkeit von Betriebsparametern muss die Systemträgheit berücksichtigen. Die Systemträgheit, evaluiert als hydraulische Verweilzeit, bestimmt die Dynamik für Gegenmaßnahmen, sodass kein Wasser der Wiederverwendung zugeführt wird, das die Anforderungen nicht erfüllt. Die regelmäßige Überprüfung der Betriebsparameter dient der Einhaltung der zulässigen Betriebsbedingungen und gewährleistet damit der Einhaltung der Qualitätsanforderungen und Leistungsziele.",
  L1289: "Durch Online-Monitoring von relevanten Betriebsparametern sind der Betriebszustand und die Einhaltung der Anforderungen zu allen Zeitpunkten sicherzustellen und Abweichungen vom zulässigen Betriebsfenster oder Havarien frühzeitig festzustellen, um Gegenmaßnahmen einzuleiten. Die Mess-wertaktualisierung/-abfrage sollte in der Regel wenige Minuten nicht überschreiten beziehungsweise die Systemträgheit widerspiegeln, um rechtzeitig Gegenmaßnahmen einzuleiten. Abweichungen vom zulässigen Betriebsfenster sollten je nach System nach 5 min bis 30 min eine Alarmierung auslösen.",
  L1293: "Tabelle 6 zeigt beispielhaft Messhäufigkeiten zur Überprüfung des Betriebszustands einzelner Aufbereitungsstufen.",
  L1297: "\\caption{Tabelle 6: Beispiel für Betriebsparameter und deren Messhäufigkeit zur Überwachung der zulässigen Betriebsbedingungen von ausgewählten Aufbereitungsstufen (Quelle: Australian Guidelines for Water Recycling 2020, Draft of Chapters 1, 2, 3 and 5 and Appendices 2 and 3, mit Ergänzungen)}",
  L1311: "\\hline Medienfiltration & Trübung, Durchfluss & Online \\\\",
  L1316: "\\hline Umkehrosmose (RO) & Elektrische Leitfähigkeit oder TOC oder DOC & Online \\\\",
  L1317: "\\hline UV-Desinfektion (UV) & UV-Intensität, UV-Transmission, Durchfluss & Online \\\\",
  L1318: "\\hline UV/erweiterte Oxidation (AOP) & UV-Intensität, UV-Transmission, Durchfluss & Online \\\\",
  L1319: "\\hline Chlorung $\\left(\\mathrm{Cl}_{2}\\right)$ & Freies Restchlor und Kontaktzeit, pH-Wert, Temperatur & Online oder zumindest täglich \\\\",
  L1450: "Für die einzelnen Stufen der Wasseraufbereitung sind nachfolgend spezifische Kosten in Euro je Kubikmeter ( $€ / \\mathrm{m}^{3}$ ) Schmutzwasser (SW) wiedergegeben. Hierbei handelt es sich um grobe Richtwerte, die auf Basis von Kostenkurven und weiteren Erfahrungswerten zusammengestellt und mithilfe von Baupreisindizes auf das Jahr 2020 umgerechnet wurden. Die unteren Werte beziehen sich auf große Kläranlagen mit Ausbaugrößen von ca. 100.000 E , die oberen Werte stehen für kleinere Anlagen von ca. 10.000 E :",
  L1453: "\\hline I Mechanisch-biologische Abwasserbehandlung: & $0,7 € / \\mathrm{m}^{3}$ bis 1,6 \\\\",
  L1454: "\\hline I Sandfiltration (nachgeschaltet): & zusätzlich $0,15 € / \\mathrm{m}^{3}$ bis $0,2 € / \\mathrm{m}^{3} \\mathrm{SW}$, \\\\",
  L1455: "\\hline I UV-Desinfektion (nachgeschaltet): & zusätzlich $0,03 € / \\mathrm{m}^{3}$ bis $0,06 € / \\mathrm{m}^{3} \\mathrm{SW}$, \\\\",
  L1456: "\\hline I Ozonung zur Desinfektion (nachgeschaltet): & zusätzlich $0,03 € / \\mathrm{m}^{3}$ bis $0,06 € / \\mathrm{m}^{3} \\mathrm{SW}$, \\\\",
  L1457: "\\hline I Ozonung zum Spurenstoffrückhalt (nachgeschaltet): & zusätzlich $0,08 € / \\mathrm{m}^{3}$ bis $0,22 € / \\mathrm{m}^{3} \\mathrm{SW}$, \\\\",
  L1458: "\\hline I Aktivkohleadsorption zum Spurenstoffrückhalt: & zusätzlich $0,08 € / \\mathrm{m}^{3}$ bis $0,35 € / \\mathrm{m}^{3} \\mathrm{SW}$. \\\\",
  L1462: "Kommt das Membranbelebungsverfahren zum Einsatz, ersetzt dies die mechanisch-biologische Abwasserbehandlung, die Sandfiltration und gegebenenfalls die Desinfektion. Ein gegebenenfalls notwendiger gezielter Spurenstoffrückhalt kann durch eine ergänzende simultane oder nachgeschaltete Aktivkohleadsorption erfolgen:",
  L1464: "I Membranbelebungsverfahren: $0,85 € / \\mathrm{m}^{3}$ bis $1,7 € / \\mathrm{m}^{3} \\mathrm{SW}$.",
  L1465: "l Aktivkohleadsorption Membranbelebungsverfahren: zusätzlich $0,05 € / \\mathrm{m}^{3}$ bis $0,20 € / \\mathrm{m}^{3} \\mathrm{SW}$.",
  L1748: "Tabelle B.2: Indikative $\\log _{10}$-Reduktionen, denen Aufbereitungsstufen zuzuordnen sind (Australian Guidelines for Water Recycling, Draft of Chapters 1, 2, 3 and 5 and Appendices 2 and 3, 2020), mit Ergänzungen zur Einordnung",
  L1753: "\\hline Mechanische Stufe (primary treatment) & 0 & 0 & 0 & 0 & 0 & 0 & Die mechanische Behandlungsstufe führt in der Regel nur zu einer sehr geringen Reduzierung der Pathogenen. \\\\",
  L1754: "\\hline Biologische Behandlung (secondary treatment) & 2 & 2 & 2 & 0,5-1 & 0,5-1 & 1-2 & Konservative Standardwerte auf der Grundlage der berichteten Ergebnisse ${ }^{11,2,3]}$. Diese können auf der Grundlage von systemspezifischen Tests zur Reduzierung von Pathogenen erhöht werden. In Ermangelung solcher Studien wurden nominale $\\log _{10}$-Reduktionswerte von $0,5 \\mathrm{Log}$ für Protozoen und bis zu 1 Log für Bakterien, Viren und Helminthen angewendet ${ }^{2 \\text { ). }}$ \\\\",
  L1755: "\\hline Koagulation, Flockung und Filtration & 2 & 4 & 4 & 1-2 & 2,5-4 & 2,5-4 & Die Leistung ist sehr unterschiedlich und hängt vom Vorhandensein, der Art, der Gestaltung und der Effektivität des Betriebs und von Verfahren wie Koagulation, Flockung, Sedimentation, Flotation und Filtration ab. \\\\",
  L1756: "\\hline Membran-Bioreaktor (MBR) & 6 & 6 & 6 & 1,5-4 & 2-4 & 2-4 & In der Praxis wird die Reduktion der Pathogenen weitgehend durch das Membranverfahren erreicht. ${ }^{31,71,81}$ \\\\",
  L1757: "\\hline Mikro- oder Ultrafiltration (MF/UF) & 3 & 6 & 6 & $0{ }^{\\text {dl }}$ & 4 & 4 & Die $\\log _{10}$-Reduktionen für die Membranfiltration basieren in der Regel auf den Lieferantengarantien, wobei höhere $\\log _{10}$-Reduktionen eher mit UF als mit MF erreicht werden. ${ }^{31,91,101}$ \\\\",
  L1758: "\\hline Ozon mit oder ohne biologische Nachbehandlung (z. B. biologisch aktivierte Aktivkohlefiltration) & 4 & 3 & 4 & 4 & 0 & 4 & Die $\\log _{10}$-Reduktionen basieren auf dem Erreichen einer (residualen) Ozonkonzentration*Zeit von $1 \\mathrm{mg} \\cdot \\mathrm{min} / \\mathrm{l}$ bei $\\geqslant 10^{\\circ} \\mathrm{C}$. ${ }^{9,111,12]}$ Höhere Konzentrationen können die $\\log _{10}$-Reduktionen erhöhen. ${ }^{\\mathrm{e}}$ \\\\",
  L1759: "\\hline Umkehrosmose (RO) & 6 & 6 & 6 & \\multicolumn{3}{|c|}{1,5-4} & Anlagen zur Umkehrosmose erreichen in der Praxis sehr viel größere $\\log _{10}$ Reduktionswerte als diejenigen, die routinemäßig und ohne Weiteres validiert werden können. Folglich können $\\log _{10}$-Reduktionen in der Größenordnung von $1 \\log _{10}$ bis $2 \\log _{10}$-Stufen routinemäßig validiert werden, wenn die Online-Betriebsüberwachung von Leitfähigkeit oder TOC den kritischen Grenzparameter bildet. $\\log _{1_{0}}$-Reduktionen von 2,5 bis 4 können erreicht werden, wenn die operative Online- oder Offline-Überwachung von Sulfat oder Fluoreszenzfarbstoffen den kritischen Grenzwertparameter darstellt. ${ }^{315,133}$ \\\\",
  L1760: "\\hline Desinfektion mit ultra-violettem Licht (UV) & 6 & 6 & 6 & \\multicolumn{3}{|c|}{4} & Eine validierte Niederdrucklampen-UV-Dosis von $186 \\mathrm{~mJ} / \\mathrm{cm}^{2}$ kann eine Inaktivierung von $4 \\log _{10}$-Stufen für Viren bewirken. Eine UV-Dosis von $22 \\mathrm{~mJ} / \\mathrm{cm}^{2}$ kann eine Inaktivierung von 4 Log $_{10}$-Stufen für Protozoen und Bakterien bewirken. ${ }^{9,14,15), 161,17)}$ \\\\",
  L1771: "\\hline UV/erweitertes Oxidationsverfahren (AOP) & 6 & 6 & 6 & \\multicolumn{3}{|c|}{4-6} & Hauptbeitrag durch UV. Aber auch die Dosis des Oxidationsmittels sorgt für Inaktivierung ${ }^{31,51}$ \\\\",
  L1772: "\\hline Chlor ( $\\mathrm{Cl}_{2}$ ) & 6 & 0 & 6 & 4 & 0 & 4 & Ein Ct-Wert, der mit einer Inaktivierung von $4 \\log _{10}$-Stufen für Viren lund Bakterien) verbunden ist, beträgt $\\geqslant 15 \\mathrm{mg} \\cdot \\mathrm{min} / \\mathrm{l}(\\mathrm{d} . \\mathrm{h} .0,5 \\mathrm{mg} / \\mathrm{l}$ für 30 min$)$ bei einem pH -Wert $\\leqslant 7,5$ und einer Temperatur von $\\geqslant 10^{\\circ} \\mathrm{C}$. ${ }^{9,18], 197}$ \\\\",
  L1773: "\\hline Boden-Aquifer-Behandlung (Oberflächenausbringung, Sickerwasserreinigung) & 6 & 6 & 6 & \\multicolumn{3}{|c|}{systemspezifisch} & Die Log-Reduktionen sind abhängig von der Bodenbeschaffenheit, sowie von den Bedingungen und der Verweilzeit im Grundwasserleiter. ${ }^{4,51,6)}$ \\\\",
  L1774: "\\hline Teiche & 5 & 5 & 5 & \\multicolumn{3}{|c|}{systemspezifisch} & Die $\\log _{10}$-Reduktionen hängen vom Design der Teiche und der Verweilzeit ab. Bei einer minimalen hydraulischen Verweilzeit (lunter Berücksichtigung von Kurzschlüssen) von gesicherten $\\geqslant 25$ Tagen kann eine Reduzierung der Helminthen um $4 \\log _{10}$ angenommen werden. Die $\\log _{10}$-Reduktionen für andere Krankheitserreger sind variabler und können bis auf 1 Log absinken ${ }^{10]}$. \\\\",
  L1777: "a) Obere $\\log _{10}$-Reduktionen, die in Felduntersuchungen und Laborversuchen mit Protozoen nachgewiesen wurden mit $\\log _{10}$-Reduktionen auf der Grundlage von Cryptosporidium und Log ${ }_{10}$-Reduktionen für Viren, die von Fall zu Fall validiert wurden. \\\\",
  L1778: "b) $\\log _{10}$-Reduktionen sind in der Praxis oft durch praktische Einschränkungen bei der operativen Überwachung und der Qualität der verfügbaren Daten begrenzt. \\\\",
  L1779: "d) US EPA 815-C-01-001 (2001): Der Bundesstaat Kalifornien unterscheidet zwischen MF und UF hinsichtlich prävalidierter $\\log _{10}$-Reduktionen für Viren (MF bis zu 0,5, UF bis zu 4 Log ${ }_{10}$-Stufen). In Kalifornien werden die Log ${ }_{10}$-Reduktionen mittels mikrobieller oder partikulärer Challenge-Tests für spezifische Produkte ermittelt und gewährt. In der Mehrheit der amerikanischen Bundesstaaten werden weder für MF noch für UF $\\log _{10}$-Reduktionen für Viren vergeben. Einer der Hauptgründe liegt darin, dass die Integritätsüberwachungsmethoden nicht in der Lage sind, jeden Virendurchbruch in Folge eines Membrandefekts festzustellen. NSF/ANSI 419 (2018) listet Produkte und zertifizierte minimale (und durchschnittliche) Log ${ }_{10}$-Reduktionen für Cryptosporidium und Viren unter Spezifikation des maximal erlaubten Permeatflusses für die Trinkwasseraufbereitung (https://info.nsf.org/Certified/pdwe/listings.asp). DVGW W 213-5 liefert eine eindeutige Definition von UF (in Abgrenzung zu MF): „Filtration durch Membranen, die in der Lage sind, Partikel im Größenbereich von $0,02 \\mu \\mathrm{~m}$ bis $0,03 \\mu \\mathrm{~m}$ um mindestens $99,99 \\%$ (4 Log ${ }_{10}$-Stufen) zurückzuhalten. Anmerkung: Der Nachweis des Rückhaltevermogens erfolgt mittels standardisierter Testverfahren.\" \\\\",
  L1780: "e) Derzeitige Anwendungen der Abwasserozonung in Deutschland erzeugen in der Regel kein residuales Ozon, daher ist die Anwendbarkeit des Verfahrens eingeschränkt. Stattdessen kann der Zusammenhang zwischen spezifischer Ozondosis $\\mathrm{mgO}_{3} / \\mathrm{mgDOC}$ und Desinfektionsleistung herangezogen werden. \\\\",
  L1800: "I Klasse A: Das 10. Perzentil der Verteilung der $\\log _{10}$-Reduktionen muss das Leistungsziel erreichen oder übersteigen.",
  L1802: "I Klassen B-1 und C-1: Das 50. Perzentil (Median) der Verteilung der $\\log _{10}$-Reduktionen muss das Leistungsziel erreichen oder übersteigen.",
  L1805: "1. die analytische Berechnung des geforderten Perzentils über gepaarte Auswertung der $\\log _{10}$-Reduktionswerte (Basisvariante) sowie",
  L1806: "2. das Monte-Carlo-Verfahren zur Berechnung des geforderten Perzentils und die ungepaarte Auswertung (Alternativvariante, vorteilhaft bei ungleicher Probenanzahl im Zu- und Ablauf) (Seis et al. 2024 und 2025).",
  L1814: "Die Basisvariante (gepaarte Auswertung) hat den Vorteil, dass sie analytisch lösbar und damit einfach anzuwenden ist. Abweichend von der Mindestanzahl gemäß EU-WasserWVVO (mindestens drei Proben pro Stichprobenpunkt) ist eine Probenanzahl N von 16 je Zu- und Ablauf vorzusehen (in Anlehnung an die EU-Badegewässerrichtlinie, Richtlinie 2006/7/EG).",
  L1817: "$\\log _{10}$-Reduktion $=\\log _{10}$ ( $C_{\\text {Zulauf }} / C_{\\text {Ablauf }}$ )",
  L1819: "Für den Fall, dass die Konzentration im Ablauf $C_{\\text {Ablauf }}$ unterhalb der Nachweisgrenze ist, ist die $\\log _{10}$ Reduktion mit der Nachweisgrenze zu ermitteln.",
  L1821: "Aus der Gesamtheit der ermittelten $\\log _{10}$-Reduktionswerte kann das geforderte Perzentil analytisch berechnet werden, wobei der Median, der Mittelwert (MW) und die Standardabweichung der Stichprobe (SD) verwendet werden. Die Ermittlung ist beispielhaft in Bild C. 1 dargestellt.",
  L1822: "10. Perzentil $=\\mathrm{MW}-1,282 \\cdot \\mathrm{SD}$ (als Schätzwert der Wahrscheinlichkeitsverteilung; Klasse A)",
  L1823: "50. Perzentil = Median (Klassen B-1 und C-1)",
  L1830: "\\hline $\\mathbf{1}$ & $\\mathrm{x}_{1}=\\mathbf{8 , 4} \\cdot \\mathbf{1 0} 0^{5}$ & $\\mathrm{y}_{1}=0,3$ \\\\",
  L1831: "\\hline $\\mathbf{2}$ & $\\mathrm{x}_{2}=\\mathbf{1 , 6 \\cdot 1 0} \\mathbf{1 0}^{6}$ & $\\mathrm{y}_{2}=0,5$ \\\\",
  L1832: "\\hline $\\mathbf{3}$ & $\\mathrm{x}_{3}=7,2 \\cdot 10^{5}$ & $\\mathrm{y}_{3}<0,05$ \\\\",
  L1844: "\\hline $\\operatorname{LRV}_{1}=6,45$ \\\\",
  L1845: "\\hline $\\operatorname{LRV}_{2}=6,51$ \\\\",
  L1846: "\\hline $\\operatorname{LRV}_{3}>7,16$ \\\\",
  L1858: "\\hline Mittelwert & MW & 6,58 \\\\",
  L1859: "\\hline Standardabweichung & SD & 0,30 \\\\",
  L1860: "\\hline k-Faktor & k & 1,282 \\\\",
  L1861: "\\hline 10. Perzentil & & 6,20 \\\\",
  L1862: "\\hline Leistungsziel & & 6,00 \\\\",
  L1885: "Die Alternativvariante (Monte-Carlo-Verfahren) liefert eine sehr hohe Flexibilität, kann nicht-normalverteilte $\\log _{10}$-Reduktionen und ungleiche Probenumfänge in Zu- und Ablaufproben berücksichtigen. Im Gegensatz zur Basisvariante liefert die Alternativvariante nicht nur einen Schätzwert für das 10. Perzentil, sondern berücksichtigt die existierende Parameterunsicherheit in Form eines Vertrauensintervalls. Falls ein Vertrauensintervall vollumfänglich oberhalb des Leistungsziels liegt, kann eine Validierung auch bei niedrigerem Probenumfang als valide angesehen werden. Abweichend von der Mindestanzahl gemäß EU-WasserWVVO (mindestens drei Proben pro Stichprobenpunkt) ist eine Probenanzahl $N$ von mindestens 10 je Zu- und Ablauf vorzusehen. Für die Berechnung von Vertrauensintervallen ist die Angabe eines Konfidenzniveaus $\\alpha$ erforderlich. Für $10 \\leqslant N<16$ wird ein Konfidenzniveau von $\\alpha=0,1$ als ausreichend betrachtet. Bei $N \\geqslant 16$ kann analog zu Anhang C. 2 auf den Schätzwert für $\\alpha=0,5$ zurückgegriffen werden. Die Alternativvariante liefert grundsätzlich ein vollständigeres Bild über die vorhandene Datenqualität und eine robustere Schätzung des 10. Perzentils, erfordert jedoch detaillierte statistische Expertise. Für eine detaillierte Beschreibung der Alternativvariante (Monte-Carlo-Verfahren) sei auf SeIS et al. (2025) verwiesen. Eine Illustration der Alternativvariante findet sich in Bild C.2.",
  L2164: "\\caption{Tabelle E.1: Vorabzug einer Referenzanlage der Klasse A (Beispiel: Schweinfurt, siehe Anhang D.3) aus dem Referenzanlagen-Register samt Leistungsdaten und relevanten Betriebsparametern (nur auszugsweise und vorläufig als Beispiel, wird im Weißdruck durch finale Werte und Beschreibung der Verfahrenskette ergänzt)}",
  L2167: "\\hline E. coli & $\\geq$ 6,4 (Leistungsziel erreicht) & 20/20 & Stichproben ( 100 ml , ohne verbesserte Nachweisgrenze), gepaarte Auswertung, 10. Perzentil (Basisvariante) \\\\",
  L2168: "\\hline Somatische Coliphagen ${ }^{\\text {a) }}$ & $(\\geqslant 5,1)^{\\mathrm{a})}$ & (11/11) ${ }^{\\text {a) }}$ & Stichproben $(20 \\mathrm{ml}, 100 \\mathrm{ml}$ bzw. 1000 ml , ohne verbesserte Nachweisgrenze), gepaarte Auswertung, 10. Perzentil (Basisvariante; hier vereinfacht angewendet, obwohl $N \\geqslant 16$ Proben nicht erfültt) ${ }^{\\text {a) }}$ \\\\",
  L2169: "\\hline F-spezifische Coliphagen ${ }^{\\text {a) }}$ & $(\\geqslant 4,2)^{\\mathrm{a})}$ & (11/11) ${ }^{\\text {a) }}$ & Stichproben $(20 \\mathrm{ml}, 100 \\mathrm{ml}$ bzw. 1000 ml , ohne verbesserte Nachweisgrenze), gepaarte Auswertung, 10. Perzentil (Basisvariante; hier vereinfacht angewendet, obwohl $\\mathrm{N} \\geqslant 16$ Proben nicht erfüllt ${ }^{\\text {a) }}$ \\\\",
  L2170: "\\hline Clostridium-perfrin-gens-Sporen & 24,7 (Leistungsziel erreicht) & 12/13 & Stichproben ( 100 ml , ohne verbesserte Nachweisgrenze), ungepaarte Auswertung, 10. Perzentil (Alternativvariante) \\\\",
  L2172: "\\hline Mechanisch-biologische Behandlung mit Nachklärung & HRT in Belebung (im Trockenwetter) = 20,4 h, Schlammalter $=24 \\mathrm{~d}$, P-Fällung vor Nachklärung & - & \\\\",
  L2173: "\\hline Keramische Ultrafiltration & Nominale Porengröße 30 nm , Flux $=90 \\mathrm{l} / \\mathrm{m}^{2} / \\mathrm{h} \\mathrm{bis} 120 \\mathrm{l} / \\mathrm{m}^{2} / \\mathrm{h}$, Flockung mit Al ( $10 \\mathrm{mg} / \\mathrm{l}$ ), CEB (Frequenz ca. 2/Tag, NaOH + NaOCl $>\\mathrm{HCl}+\\mathrm{H}_{2} \\mathrm{O}_{2}$ ) & Trübung im Filtrat $=(0,1 \\mathrm{NTU}$ bis) 0,2 NTU (max.), Flux $\\leqslant 120 \\mathrm{l} / \\mathrm{m}^{2} \\mathrm{~h}$ & \\\\",
  L2183: "\\hline Ozonung & $0,6 \\mathrm{~g} \\mathrm{O}_{3} / \\mathrm{g}$ DOC, HRT in $\\mathrm{O}_{3}=20 \\mathrm{~min}$ & (min. $\\triangle \\mathrm{SAK}_{254}$ & \\\\",
  L2184: "\\hline Biologisch aktiver GAK-Filter (2-stufig) & - & (min.) EBCT $=25 \\mathrm{~min}$ & \\\\",
  L2185: "\\hline UV-Desinfektion & UV-Dosis $=400 \\mathrm{~J} / \\mathrm{m}^{2}$ bis $500 \\mathrm{~J} / \\mathrm{m}^{2}$ & Trübung $=0,3 \\mathrm{NTU}$ bis 1,1 NTU, UV-Transmission = $94 \\% / \\mathrm{cm}$ bis $99 \\% / \\mathrm{cm}$, (max. Durchfluss) & \\\\",
  L549_552: "\\hline く & Mechanisch－ biologische Behandlung， Filtration， Desinfektion & $\\leq 10^{\\mathrm{a})}$ & $\\leq 100$ & \\multirow{5}{*}{\\begin{tabular}{l}\nLegionella spp．： $<1.000 \\mathrm{KBE} / \\mathrm{L}$ ， wenn das Risiko der Aerosolbil－ dung besteht； \\\\\nintestinale Nematoden （Eier von Hel－ minthen）：$\\leq 1$ Ei pro Liter für die Bewässerung von Weide－ flächen oder Futterpflanzen\n\\end{tabular}} & $\\mathrm{BSB}_{5} \\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\text {d）}}$ AFS $\\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\mathrm{g})}$ Trübung $\\leq 2 \\mathrm{NTU}{ }^{\\mathrm{fl}}$ & E．coli $\\geqslant 5,0$ Somatische Coliphagen， insg．$\\geq 6,0^{\\text {g）}}$ f－spezifsche Coliphagen， insg．$\\geq 6,0^{\\text {g）}}$ Clostridium－perfrin－ gens－Sporen $\\geqslant 4,0 \\mathrm{bzw}$ ．sulfatre－ duzierende Sporen－ bildner $\\geqslant 5,0$ \\\\",
  L553_554: "\\hline \\multirow{2}{*}{ம （B－1／B－2）} & \\multirow{2}{*}{Mechanisch－ biologische Behandlung， Filtration， Desinfektion} & \\multirow{2}{*}{$\\leq 100^{\\mathrm{a})}$} & \\multirow{2}{*}{$\\leq 100$} & & \\multirow{2}{*}{$\\mathrm{BSB}_{5}$ gemäß Richtlinie 91／271／EWG ${ }^{\\text {d）}}$ AFS $\\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\mathrm{e})}$ Trübung $\\leq 2 \\mathrm{NTU}^{\\mathrm{fl}}$} & B－1： E．coli $\\geqslant 5,0$ Somatische Coliphagen， insg．$\\geq 6,0^{\\mathrm{g})}$ f－spezifsche Coliphagen， insg．$\\geqslant 6,0^{\\text {g）}}$ Clostridium－perfrin－ gens－Sporen $\\geq 4,0$ bzw．sulfatreduzie－ rende Sporenbild－ ner $\\geqslant 5,0$ \\\\\n\\hline & & & & & & B－2： － \\\\",
  L555_556: "\\hline \\multirow{2}{*}{ن نコ نコ} & \\multirow{2}{*}{Mechanisch－ biologische Behandlung， Filtration， Desinfektion} & \\multirow{2}{*}{$\\leq 100$} & \\multirow{2}{*}{$\\leq 400$} & & \\multirow{2}{*}{$\\mathrm{BSB}_{5}$ gemäß Richtlinie 91／271／EWG ${ }^{\\text {d）}}$ AFS $\\leq 10 \\mathrm{mg} / \\mathrm{e}^{\\mathrm{e}}$ Trübung $\\leq 2$ NTU ${ }^{\\text {fl }}$} & C－1： E．coli $\\geqslant 5,0$ Somatische Coliphagen， insg．$\\geqslant 6,0^{\\text {g）}}$ f－spezifsche Coliphagen， insg．$\\geqslant 6,0^{\\text {g）}}$ Clostridium－perfrin－ gens－Sporen $\\geq 4,0$ bzw．sulfatreduzie－ rende Sporenbild－ ner $\\geqslant 5,0$ \\\\\n\\hline & & & & & & C－2：－ \\\\",
  L570_573: "\\hline ロ & Mechanischbiologische Behandlung, Desinfektion & $\\leq 10.000^{\\mathrm{a})}$ & - ${ }^{\\text {al,c) }}$ & \\begin{tabular}{l}\nLegionella spp.: < $1.000 \\mathrm{KBE} / \\mathrm{L}$, wenn das Risiko der Aerosolbildung besteht; \\\\\nintestinale Nematoden (Eier von Helminthen): $\\leq 1$ Ei pro Liter für die Bewässerung von Weideflächen oder Futterpflanzen\n\\end{tabular} & $\\mathrm{BSB}_{5}$ und AFS gemäß Richtlinie 91/271/EWG ${ }^{\\text {d),e) }}$ & - ${ }^{\\text {a) }}$ \\\\",
  L761_764: "\\hline Belebungsverfahren & Adsorption an Schlamm, biolog. Abbau (Predation) & Stark fallspezifisch & \\begin{tabular}{l}\nOption A: Analyse historischer Betriebsdaten \\\\\nOption B: Fallspezifische Validierung mit einer Vor-Ort-Monitoringkampagne\n\\end{tabular} & WaterRF (2023a) \\\\",
  L765_774: "\\hline MembranBioreaktor & Rückhalt an der Membran, Adsorption an Schlamm und Membran, biolog. Abbau (Predation) & Trockensubstanzgehalt, Schlammalter, hydraulische Verweilzeit, Membran-Fouling / Reinigung / Alter, Membranintegrität & \\begin{tabular}{l}\nStufe 1: Analyse historischer Betriebsdaten, Definition von Referenz-Betriebsparametern \\\\\nStufe 2 (optional): „Challenge-Tests“ ggf. mit zudosierten Indikatoren/Surrogaten, z. B. anwendbar, wenn höhere $\\log _{10}$ - $\\operatorname{Re-}$ duktionen als in Stufe 1 zu demonstrieren sind \\\\\nStufe 2.1: Vorabvalidierung des Herstellers/Anbieters lggf. im Pilotmaßstab, konservative Betriebsbedingungen)\n\\end{tabular} & WaterSecure (2017a) \\\\\n\\hline MembranBioreaktor & & & \\begin{tabular}{l}\nStufe 2.2: (optional) Validierung nach Inbetriebnahme \\\\\nStufe 2.3: Betriebliches Monitoring mit Bezug auf $\\mathrm{Log}_{10}$-Reduktionen, mit länger werdenden Probenahmezyklen (z. B. jährlich ab zweitem Betriebsjahr) \\\\\nStufe 3: Bestimmung einer Korrelation zwischen der Entfernung von Zielorganismen und kontinuierlich messbaren Parametern (z. B. Trübung), Bestimmung von kritischen Prozessbedingungen/Prozesslimits\n\\end{tabular} & WaterSecure (2017a) \\\\",
  L784_789: "\\hline UV-Desinfektion & Inaktivierung der DNA-Replikationsfähigkeit von Mikroorganismen durch UV-Bestrahlung & Durchflussrate, Bestrahlungsdosis, UV-Transmission des Wassers & \\begin{tabular}{l}\nPrävalidierung: Erfolgt in der Regel durch den Hersteller gemäß DVGW W 294 (nicht für Viren) bzw. der EPAGuideline. Nachweis einer Referenzdosis $\\geqslant 40 \\mathrm{~mJ} / \\mathrm{cm}^{2}$, Definition der erforderlichen Betriebsparameter, Zuordnung von $\\log _{10}$-Reduktionen in Abhängigkeit von der UV-Transmission. Der Nachweis nach EPA-Guideline erfolgt produktspezifisch anhand eines der folgenden Ansätze: \\\\\n1. UV-Intensitäts-Setpoint-Ansatz \\\\\n2. Ansatz der berechneten RED lengl. „Reduction Equivalent Dose“, empfohlene Challenge-Mikroorganismen: MS2- und T1UV-Phagen) mit RED = f (Durchfluss, UV Transmissivität des Wassers, UVLampenleistung, UV-Intensität am Sensor gemessen, Validierungsfaktor). Diese berechnete Dosis wird mit den tabellierten UVDosen zur Inaktivierung für Giardia, Cryptosporidium und Viren verglichen). \\\\\nBetriebliche Überwachung: Überwachung der relevanten Parameter (Durchfluss, Lampenstatus, UVIntensität, Licht-Transmission, Trübung).\n\\end{tabular} & WaterSecure (2017c), Hoyer (1998), DVGW W 294-1 (A): (2023), US EPA:2006, US EPA:2017 \\\\",
  L790_794: "\\hline Chlorbasierte Desinfektion lanalog auch andere chemische Desinfektion) & Inaktivierung durch Oxidationsreaktionen mit z. B. Zellwänden oder genetischem Material Restchlorgehalte ermöglichen De-pot-Wirkung & Durchflussrate, Applizierte ChlorDosis (Ct-Wert = Konzentration • Kontaktzeit), pHWert (bestimmt Speziierung der ChlorKomponenten), Temperatur, Trübung, Zehrstoffe, residuale Chlor-Konzentration & \\begin{tabular}{l}\nNachweis des Ct-Werts in der großtechnischen Anlage: hydraulische Charakterisierung (Verweilzeitverteilung) des Desinfektionsreaktors, ggf. durch Strömungssimulation und/oder Tracer-Versuch. \\\\\nAlternative: Challenge-Test mit Zielorganismen für Validierung. \\\\\nBetriebliches Monitoring muss relevante Parameter möglichst kontinuierlich überwachen, um Einhaltung des Ct-Werts zu überprüfen.\n\\end{tabular} & WaterSecure (2017d), US EPA:1999 \\\\",
  L1300_1303: "\\hline Membran-Bioreaktor (MBR) & pH-Wert, Sauerstoff im Bioreaktor, Transmembrandruck, Durchfluss, Trübung Schlammalter, hydraulischer Verweilzeit, Trockensubstanz (TS) im Belebungsbecken & \\begin{tabular}{l}\nOnline \\\\\nWöchentlich\n\\end{tabular} \\\\",
  L1304_1310: "\\hline Mikro- oder Ultrafiltration (MF/UF) & \\begin{tabular}{l}\nTrübung \\\\\nIntegritätsmessung (z. B. Druckhaltetest)\n\\end{tabular} & \\begin{tabular}{l}\nOnline \\\\\nTäglich\n\\end{tabular} \\\\",
  L1312_1315: "\\hline Ozonung/Biologisch aktiver GAK-Filter (Ozon/BAK) & Spezifische Ozondosis oder $\\triangle \\mathrm{SAK}_{254}$ Temperatur, pH, Trübung & \\begin{tabular}{l}\nOnline \\\\\nOnline\n\\end{tabular} \\\\",
} as const;

// ---------------------------------------------------------------------------
// Helpers: verbatim fragments are cut out of the lifted spans (never retyped).
// ---------------------------------------------------------------------------
/** The substring of a lifted span from `start` up to (not including) `end` (or to the end of the span). */
export function frag(span: string, start: string, end?: string): string {
  const i = span.indexOf(start);
  if (i < 0) throw new Error(`fragment start not found: ${start}`);
  const j = end ? span.indexOf(end, i) : -1;
  if (end && j < 0) throw new Error(`fragment end not found: ${end}`);
  return (j < 0 ? span.slice(i) : span.slice(i, j)).trim();
}
/** Build-time assertion that a printed fragment is inside its span (SR-1: every encoded cell is lifted, never retyped). */
export function must(span: string, printed: string): string {
  if (!span.includes(printed)) throw new Error(`printed fragment not in span: ${printed}`);
  return printed;
}
/** The cells of one printed `\hline a & b & c \\` row (LaTeX row → trimmed cell strings; nested tabular blocks stay inside their cell). */
export function cells(row: string): string[] {
  return row.replace(/^\\hline\s*/, '').replace(/\s*\\\\\s*$/, '').split('&').map((c) => c.trim());
}
/** `\begin{tabular}{l} … \end{tabular}` wrapper and trailing `\\` line ends removed; the printed lines stay, joined by newlines. */
export function deTab(cell: string): string {
  return cell.replace(/\\begin\{tabular\}\{l\}\s*/g, '').replace(/\s*\\end\{tabular\}/g, '').split('\n').map((l) => l.replace(/\s*\\\\\s*$/, '').trim()).filter(Boolean).join('\n');
}
/** German decimal "0,5" → 0.5 (digits and one comma only — anything else throws so a garbled cell never becomes a number). */
export function deNum(s: string): number {
  const m = /^\d+(?:,\d+)?$/.exec(s.trim());
  if (!m) throw new Error(`not a printed number: ${s}`);
  return Number(s.trim().replace(',', '.'));
}

// ---------------------------------------------------------------------------
// Tokens (G-A3).
// ---------------------------------------------------------------------------
/** Prod `M12002-02.wassergueteklasse` enum values (captured). */
export const KLASSE_TOKENS = ['A', 'B-1', 'B-2', 'C-1', 'C-2', 'D'] as const;
export type Klasse = (typeof KLASSE_TOKENS)[number];
/** The classes whose Tab.-3 log10 column prints targets (L549 / L553 "B－1：" / L555 "C－1："); B-2 / C-2 print "－" (L554 / L556), D "-" (L573). */
export const LEISTUNGSZIEL_KLASSEN = ['A', 'B-1', 'C-1'] as const;
/** The five Tab.-3 indicator organisms (L549: E. coli · somatische Coliphagen · f-spezifische Coliphagen · Clostridium-perfringens-Sporen bzw. sulfatreduzierende Sporenbildner). */
export const ORGANISMUS_TOKENS = ['e_coli', 'somatische_coliphagen', 'f_spez_coliphagen', 'clostridium', 'sulfatreduzierer'] as const;
export type Organismus = (typeof ORGANISMUS_TOKENS)[number];
/** TAB3 log10 value column per organism. */
export const ORGANISMUS_LOG10_COLUMN: Record<Organismus, string> = {
  e_coli: 'log10_e_coli', somatische_coliphagen: 'log10_somatische_coliphagen', f_spez_coliphagen: 'log10_f_coliphagen', clostridium: 'log10_clostridium', sulfatreduzierer: 'log10_sulfatreduzierer',
};
/** Tab. B.2 stages (L1753–L1774), the vocabulary of the verfahrenskette register. */
export const STUFE_TOKENS = ['mechanisch', 'biologisch', 'koagulation_flockung_filtration', 'mbr', 'mf_uf', 'ozon', 'ro', 'uv', 'uv_aop', 'chlor', 'boden_aquifer', 'teiche'] as const;
export type Stufe = (typeof STUFE_TOKENS)[number];
/** Tab. 6 stages (L1300–L1319); shared tokens with TABB2 where the printed stage is the same, `medienfiltration` is Tab. 6's own. */
export const TAB6_TOKENS = ['mbr', 'mf_uf', 'medienfiltration', 'ozon', 'ro', 'uv', 'uv_aop', 'chlor'] as const;
/** Tab. 4 stages (L761–L816); own tokens where the printed stage differs from Tab. B.2 (belebung, ro_nf, schnellsand). */
export const TAB4_TOKENS = ['belebung', 'mbr', 'uv', 'chlor', 'ozon', 'mf_uf', 'ro_nf', 'schnellsand'] as const;
/** §8.2 cost items (L1453–L1458, L1464, L1465). */
export const KOSTEN_TOKENS = ['mech_bio', 'sandfiltration', 'uv', 'ozon_desinfektion', 'ozon_spurenstoff', 'aktivkohle', 'mbr', 'aktivkohle_mbr'] as const;
/** Tab. E.1 stages (L2172–L2185): shared tokens (biologisch, mf_uf, ozon, uv — J-5 mapping) + `bak` (Tab. E.1's own). */
export const TABE1_TOKENS = ['biologisch', 'mf_uf', 'ozon', 'bak', 'uv'] as const;
/** Routine-sample parameters = the Tab.-3 quality columns (L548 / L549). */
export const PROBE_PARAMETER_TOKENS = ['e_coli', 'enterokokken', 'bsb5', 'afs', 'truebung', 'legionella', 'nematoden'] as const;

// ---------------------------------------------------------------------------
// TAB3 — Tab. 3 "Arbeitshilfe A" (L544–L557 + L563–L573 "Tabelle 3 (Ende)"): ONE row per prod class token, one value
// column per printed parameter. Printed rows: A (L549–L552, the five-line row incl. the Legionella / Nematoden tabular),
// "B (B－1／B－2)" (L553–L554; L554 prints "B－2： －"), "C (C-1/C-2)" (L555–L556; "C－2：－"), D (L570–L573, Tab. 3 (Ende)).
// B-1 / B-2 (C-1 / C-2) share their printed row's cells and span. Comparators as printed: E. coli / Enterokokken / BSB5 /
// AFS / Trübung "≤" (max = inclusive), Legionella "<1.000 KBE/L" (STRICT), Nematoden "≤ 1 Ei pro Liter", log10 targets "≥".
// "-" → null. "BSB5 gemäß Richtlinie 91／271／EWG" → bsb5_max null + the printed text (a bare pointer to another document —
// content-boundary rule, never expanded). Class tokens (U-1): the class column prints glyphs (く · ம （B－1／B－2） · ن نコ نコ · ロ);
// assigned from the caption order A, B, C, D (L547 header order = Tab. 2 L500–L520), the printed sub-labels "B－1：" /
// "B－2：" (L553 / L554) and "C－1：" / "C－2：" (L555 / L556) inside the rows, the prose L616 ("für die Güteklassen B und C
// gefordert (entspricht den Güteklassen B-1 und C-1)"), L893 ("für die Wassergüteklasse B bis D … für die Güteklasse A …
// BSB5 ≤ 10 mg/l") and L894 ("Für die Wassergüteklassen A bis C … Filtration … für die Wassergüteklasse D ist sie optional" —
// the D row's Zielvorgabe prints no "Filtration"). The C-row AFS cell prints "AFS $\leq 10 \mathrm{mg} / \mathrm{e}^{\mathrm{e}}$"
// (unit OCR "mg/e" for "mg/l e)") — the 10 is unambiguous (U-2). Notes a)–g) are not printed in this transcript (X-3).
// `leistungsziele` 1/0 = whether the log10 column prints targets (A, B-1, C-1) or "－" (B-2, C-2, D).
// Policy `locked` (caption L544 "Mindestanforderungen …" — L534 "müssen in mindestens $90 \%$ der Proben eingehalten werden").
// ---------------------------------------------------------------------------
export function tab3AsTable(): RegulationTable {
  const A = Q.L549_552, B = Q.L553_554, C = Q.L555_556, D = Q.L570_573;
  const ZIEL_ABC = must(A, 'Mechanisch－ biologische Behandlung， Filtration， Desinfektion');
  must(B, ZIEL_ABC); must(C, ZIEL_ABC);
  const ZIEL_D = must(D, 'Mechanischbiologische Behandlung, Desinfektion');
  // E. coli / Enterokokken cells
  must(A, '$\\leq 10^{\\mathrm{a})}$'); must(A, '$\\leq 100$');
  must(B, '$\\leq 100^{\\mathrm{a})}$'); must(B, '\\multirow{2}{*}{$\\leq 100$}');
  must(C, '\\multirow{2}{*}{$\\leq 100$}'); must(C, '\\multirow{2}{*}{$\\leq 400$}');
  must(D, '$\\leq 10.000^{\\mathrm{a})}$'); must(D, '- ${ }^{\\text {al,c) }}$');
  // Fallspezifische Anforderungen (printed in the A row's tabular and again in the D row)
  const LEG_BED = frag(A, 'wenn das Risiko der Aerosolbil－ dung besteht', '；');
  must(A, '$<1.000 \\mathrm{KBE} / \\mathrm{L}$'); must(D, '< $1.000 \\mathrm{KBE} / \\mathrm{L}$');
  const NEM_BED = frag(A, 'für die Bewässerung von Weide－ flächen oder Futterpflanzen', '\n');
  must(A, '$\\leq 1$ Ei pro Liter'); must(D, '$\\leq 1$ Ei pro Liter');
  // Chemisch-physikalische Parameter
  must(A, '$\\mathrm{BSB}_{5} \\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\text {d）}}$'); must(A, 'AFS $\\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\mathrm{g})}$'); must(A, 'Trübung $\\leq 2 \\mathrm{NTU}{ }^{\\mathrm{fl}}$');
  const BSB5_RL = frag(B, '$\\mathrm{BSB}_{5}$ gemäß Richtlinie 91／271／EWG', ' ${'); must(C, BSB5_RL);
  must(B, 'AFS $\\leq 10 \\mathrm{mg} / \\mathrm{l}^{\\mathrm{e})}$'); must(B, 'Trübung $\\leq 2 \\mathrm{NTU}^{\\mathrm{fl}}$');
  must(C, 'AFS $\\leq 10 \\mathrm{mg} / \\mathrm{e}^{\\mathrm{e}}$'); must(C, 'Trübung $\\leq 2$ NTU ${ }^{\\text {fl }}$'); // U-2: unit OCR "mg/e"
  const BSB5_AFS_D = frag(D, '$\\mathrm{BSB}_{5}$ und AFS gemäß Richtlinie 91/271/EWG', ' ${');
  // Leistungsziele (log10)
  for (const s of [A, B, C]) { must(s, 'E．coli $\\geqslant 5,0$'); must(s, 'Somatische Coliphagen， insg．'); must(s, 'f－spezifsche Coliphagen， insg．'); }
  must(A, 'insg．$\\geq 6,0^{\\text {g）}}$'); must(B, 'insg．$\\geq 6,0^{\\mathrm{g})}$'); must(C, 'insg．$\\geqslant 6,0^{\\text {g）}}$');
  must(A, 'gens－Sporen $\\geqslant 4,0 \\mathrm{bzw}$'); must(B, 'gens－Sporen $\\geq 4,0$ bzw'); must(C, 'gens－Sporen $\\geq 4,0$ bzw');
  must(A, 'bildner $\\geqslant 5,0$'); must(B, 'ner $\\geqslant 5,0$'); must(C, 'ner $\\geqslant 5,0$');
  must(B, 'B－1：'); must(B, 'B－2： －'); must(C, 'C－1：'); must(C, 'C－2：－'); must(D, '- ${ }^{\\text {a) }}$');

  type R = { klasse: Klasse; group: string | null; quote: string; ec: number; ent: number | null; bsb5: number | null; bsb5_text: string; afs: number | null; afs_text: string; ntu: number | null; log: boolean; ziel: string };
  const R: R[] = [
    { klasse: 'A',   group: null,          quote: A, ec: 10,    ent: 100,  bsb5: 10,   bsb5_text: 'BSB5 ≤ 10 mg/l d)', afs: 10,   afs_text: 'AFS ≤ 10 mg/l', ntu: 2,    log: true,  ziel: ZIEL_ABC }, // L549–L552
    { klasse: 'B-1', group: 'B (B－1／B－2)', quote: B, ec: 100,   ent: 100,  bsb5: null, bsb5_text: BSB5_RL,             afs: 10,   afs_text: 'AFS ≤ 10 mg/l', ntu: 2,    log: true,  ziel: ZIEL_ABC }, // L553
    { klasse: 'B-2', group: 'B (B－1／B－2)', quote: B, ec: 100,   ent: 100,  bsb5: null, bsb5_text: BSB5_RL,             afs: 10,   afs_text: 'AFS ≤ 10 mg/l', ntu: 2,    log: false, ziel: ZIEL_ABC }, // L553–L554 ("B－2： －")
    { klasse: 'C-1', group: 'C (C－1／C－2)', quote: C, ec: 100,   ent: 400,  bsb5: null, bsb5_text: BSB5_RL,             afs: 10,   afs_text: 'AFS ≤ 10 mg/l', ntu: 2,    log: true,  ziel: ZIEL_ABC }, // L555
    { klasse: 'C-2', group: 'C (C－1／C－2)', quote: C, ec: 100,   ent: 400,  bsb5: null, bsb5_text: BSB5_RL,             afs: 10,   afs_text: 'AFS ≤ 10 mg/l', ntu: 2,    log: false, ziel: ZIEL_ABC }, // L555–L556 ("C－2：－")
    { klasse: 'D',   group: null,          quote: D, ec: 10000, ent: null, bsb5: null, bsb5_text: BSB5_AFS_D,          afs: null, afs_text: BSB5_AFS_D,     ntu: null, log: false, ziel: ZIEL_D },   // L570–L573
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.klasse, keys: { klasse: r.klasse }, group_label: r.group, label_de: `Wassergüteklasse ${r.klasse}`, order_index: i,
    values: {
      zielvorgabe: r.ziel,
      e_coli_max: r.ec, enterokokken_max: r.ent,
      legionella_max: 1000, legionella_bedingung: LEG_BED,   // "<1.000 KBE/L" — STRICT "<"
      nematoden_max: 1, nematoden_bedingung: NEM_BED,        // "≤ 1 Ei pro Liter"
      bsb5_max: r.bsb5, bsb5_text: r.bsb5_text, afs_max: r.afs, afs_text: r.afs_text, truebung_max: r.ntu,
      log10_e_coli: r.log ? 5 : null, log10_somatische_coliphagen: r.log ? 6 : null, log10_f_coliphagen: r.log ? 6 : null,
      log10_clostridium: r.log ? 4 : null, log10_sulfatreduzierer: r.log ? 5 : null,
      leistungsziele: r.log ? 1 : 0,
    },
    verbatim_quote: r.quote,
  }));
  const value_columns: ValueColumn[] = [
    { name: 'zielvorgabe', type: 'string' },
    { name: 'e_coli_max', type: 'number', unit: 'KBE/100 ml' }, { name: 'enterokokken_max', type: 'number', unit: 'KBE/100 ml' },
    { name: 'legionella_max', type: 'number', unit: 'KBE/l' }, { name: 'legionella_bedingung', type: 'string' },
    { name: 'nematoden_max', type: 'number', unit: 'Eier/l' }, { name: 'nematoden_bedingung', type: 'string' },
    { name: 'bsb5_max', type: 'number', unit: 'mg/l' }, { name: 'bsb5_text', type: 'string' }, { name: 'afs_max', type: 'number', unit: 'mg/l' }, { name: 'afs_text', type: 'string' }, { name: 'truebung_max', type: 'number', unit: 'NTU' },
    { name: 'log10_e_coli', type: 'number', unit: 'log10' }, { name: 'log10_somatische_coliphagen', type: 'number', unit: 'log10' }, { name: 'log10_f_coliphagen', type: 'number', unit: 'log10' },
    { name: 'log10_clostridium', type: 'number', unit: 'log10' }, { name: 'log10_sulfatreduzierer', type: 'number', unit: 'log10' },
    { name: 'leistungsziele', type: 'number' },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TAB3', title_de: 'Arbeitshilfe A — Mindestanforderungen an die Qualität von aufbereitetem Wasser und Leistungsziele je Wassergüteklasse (Tab. 3)', clause_reference: '§3.1, Tab. 3', page_ref: null,
    key_columns: ['klasse'], value_columns,
    override_policy: 'locked', override_quote: `${Q.L544} — ${Q.L534}`, // L544 — L534
    verification_status: 'imported_unverified', rows }; // m1200_2-U-1 / -U-2 / -X-3
}

// ---------------------------------------------------------------------------
// S3_3_3 — §3.3.3 vereinfachtes Validierungsmonitoring (L679 "sind je 16 korrespondierende Proben im Zulauf und Ablauf zu
// nehmen"; L681 class A: "In mindestens 15 der 16 Proben … nicht mehr als 1,0 log10-Stufen unterschritten"; L683 classes
// B-1 / C-1: "In mindestens 8 der 16 Proben … nicht mehr als 2,0 log10-Stufen"). Keyed on the prod class tokens; B-1 and C-1
// share the printed sentence L683. No row for B-2 / C-2 / D — a lookup for those classes finds no row (manual_required), which
// is the printed fact (Tab. 3 "－"). `nachweisgrenze_regel` = the "< 1 KBE bzw. PFU je 100 ml" clause (target counts as met).
// Policy `locked` ("muss … erreicht oder überschritten werden", L681).
// ---------------------------------------------------------------------------
export function s333AsTable(): RegulationTable {
  must(Q.L681, 'In mindestens 15 der 16 Proben'); must(Q.L681, 'nicht mehr als $1,0 \\log _{10}$-Stufen');
  must(Q.L683, 'In mindestens 8 der 16 Proben'); must(Q.L683, 'nicht mehr als $2,0 \\log _{10}$-Stufen');
  const NWG = frag(Q.L681, 'Das Leistungsziel gilt hierbei ebenfalls als erreicht'); must(Q.L683, NWG);
  type R = { klasse: Klasse; quote: string; pass: number; short: number };
  const R: R[] = [{ klasse: 'A', quote: Q.L681, pass: 15, short: 1.0 }, { klasse: 'B-1', quote: Q.L683, pass: 8, short: 2.0 }, { klasse: 'C-1', quote: Q.L683, pass: 8, short: 2.0 }];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.klasse, keys: { klasse: r.klasse }, group_label: null, label_de: `Wassergüteklasse ${r.klasse}`, order_index: i,
    values: { n_total: 16, n_pass_min: r.pass, max_shortfall_log10: r.short, nachweisgrenze_regel: NWG }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'S3_3_3', title_de: 'Vereinfachtes Validierungsmonitoring — Beurteilung der 16 gepaarten Proben je Wassergüteklasse (§3.3.3)', clause_reference: '§3.3.3', page_ref: null,
    key_columns: ['klasse'],
    value_columns: [{ name: 'n_total', type: 'number' }, { name: 'n_pass_min', type: 'number' }, { name: 'max_shortfall_log10', type: 'number', unit: 'log10' }, { name: 'nachweisgrenze_regel', type: 'string' }],
    override_policy: 'locked', override_quote: `${Q.L679} — ${Q.L681}`, // L679 — L681
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// ANHANGC1 — Anhang C.1 (L1800 class A: "Das 10. Perzentil … muss das Leistungsziel erreichen oder übersteigen"; L1802 classes
// B-1 und C-1: "Das 50. Perzentil (Median) …"). Keyed on the prod class tokens (B-1 / C-1 share L1802). Policy `locked`.
// ---------------------------------------------------------------------------
export function anhangC1AsTable(): RegulationTable {
  must(Q.L1800, 'Klasse A: Das 10. Perzentil'); must(Q.L1802, 'Klassen B-1 und C-1: Das 50. Perzentil (Median)');
  type R = { klasse: Klasse; quote: string; p: number };
  const R: R[] = [{ klasse: 'A', quote: Q.L1800, p: 10 }, { klasse: 'B-1', quote: Q.L1802, p: 50 }, { klasse: 'C-1', quote: Q.L1802, p: 50 }];
  const rows: RegulationRow[] = R.map((r, i) => ({
    row_key: r.klasse, keys: { klasse: r.klasse }, group_label: null, label_de: `Wassergüteklasse ${r.klasse}`, order_index: i,
    values: { percentile: r.p, kriterium: frag(r.quote, 'Das ') }, verbatim_quote: r.quote,
  }));
  return { standard_code: STD, edition: ED, table_code: 'ANHANGC1', title_de: 'Umfängliches Validierungsmonitoring — geprüftes Perzentil der log10-Reduktionen je Wassergüteklasse (Anhang C.1)', clause_reference: 'Anhang C.1', page_ref: null,
    key_columns: ['klasse'], value_columns: [{ name: 'percentile', type: 'number' }, { name: 'kriterium', type: 'string' }],
    override_policy: 'locked', override_quote: Q.L1800, // L1800
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// GL_C2_1 — Gl. C.2-1 (L1822 "10. Perzentil = MW - 1,282 · SD (als Schätzwert der Wahrscheinlichkeitsverteilung; Klasse A)"):
// the k-factor as ONE row so the per-organism p10 equations and the k twin single-source it (the L1860 example table prints
// "k-Faktor & k & 1,282" — the constant is not an example value). Policy `locked` (a printed constant of the equation).
// ---------------------------------------------------------------------------
export function glC21AsTable(): RegulationTable {
  must(Q.L1822, '10. Perzentil $=\\mathrm{MW}-1,282 \\cdot \\mathrm{SD}$'); must(Q.L1860, 'k-Faktor & k & 1,282');
  const rows: RegulationRow[] = [{ row_key: 'k', keys: { konstante: 'k' }, group_label: null, label_de: 'k-Faktor (10. Perzentil, Normalverteilung)', order_index: 0, values: { wert: 1.282, gedruckt: frag(Q.L1822, '10. Perzentil', ' (als') }, verbatim_quote: Q.L1822 }];
  return { standard_code: STD, edition: ED, table_code: 'GL_C2_1', title_de: 'Gl. C.2-1 — k-Faktor des 10.-Perzentil-Schätzwerts (Anhang C.2)', clause_reference: 'Anhang C.2, Gl. C.2-1', page_ref: null,
    key_columns: ['konstante'], value_columns: [{ name: 'wert', type: 'number' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'locked', override_quote: Q.L1822, // L1822
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TAB4 — Tab. 4 (L758–L816) "Validierungsgrundsätze und internationale Referenzen für verschiedene Aufbereitungsstufen": one
// row per printed stage, the four text cells verbatim (nested tabular wrappers removed, printed lines kept). The MBR stage is
// printed as two consecutive rows (L765–L769 + L770–L774: the second continues the Validierungsmethodik cell) → ONE seeded row
// whose span covers both and whose methodik joins the two cells. Policy `locked` (L754 — the table summarises principles and
// references; nothing printed permits a deviation; m1200_2-O-1 proposes `anhaltswert`).
// ---------------------------------------------------------------------------
export function tab4AsTable(): RegulationTable {
  type R = { token: (typeof TAB4_TOKENS)[number]; quote: string };
  const R: R[] = [
    { token: 'belebung', quote: Q.L761_764 }, { token: 'mbr', quote: Q.L765_774 }, { token: 'uv', quote: Q.L784_789 }, { token: 'chlor', quote: Q.L790_794 },
    { token: 'ozon', quote: Q.L804 }, { token: 'mf_uf', quote: Q.L805 }, { token: 'ro_nf', quote: Q.L806 }, { token: 'schnellsand', quote: Q.L816 },
  ];
  const rows: RegulationRow[] = R.map((r, i) => {
    const printedRows = r.quote.split(/\n(?=\\hline )/).map((x) => cells(x)); // the MBR span holds two printed rows
    const c = printedRows[0];
    const methodik = printedRows.map((p) => deTab(p[3])).join('\n');
    return { row_key: r.token, keys: { stufe: r.token }, group_label: null, label_de: deTab(c[0]), order_index: i,
      values: { bezeichnung: deTab(c[0]), mechanismen: deTab(c[1]), einflussfaktoren: deTab(c[2]), methodik, referenz: deTab(c[4]) }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB4', title_de: 'Validierungsgrundsätze und internationale Referenzen je Aufbereitungsstufe (Tab. 4)', clause_reference: '§3.3.5, Tab. 4', page_ref: null,
    key_columns: ['stufe'],
    value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'mechanismen', type: 'string' }, { name: 'einflussfaktoren', type: 'string' }, { name: 'methodik', type: 'string' }, { name: 'referenz', type: 'string' }],
    override_policy: 'locked', override_quote: `${Q.L754} — ${Q.L758}`, // L754 — L758
    verification_status: 'imported_unverified', rows }; // m1200_2-U-5
}

// ---------------------------------------------------------------------------
// TAB6 — Tab. 6 (L1297–L1319): operating parameters and their measuring frequency per stage. `parameter_gedruckt` /
// `frequenz_gedruckt` keep the printed cells; `parameter_online` / `parameter_periodisch` / `frequenz_periodisch` are the
// two printed frequency lines matched to the parameter lines: MF/UF prints two parameter lines (Trübung | Integritätsmessung)
// against Online | Täglich (L1304–L1310, unambiguous); MBR prints Online | Wöchentlich (L1300–L1303) but the parameter cell lost
// its line break — the split after "Trübung" is the executor's reading (U-3, `imported_unverified`); Ozon/BAK prints Online |
// Online (L1312–L1315) so both lines are online. Policy `anhaltswert` (caption L1297 "Beispiel für Betriebsparameter …";
// L1293 "zeigt beispielhaft"; the O-2 block records L663 "Es sind mindestens die Betriebsparameter gemäß Tabelle 6 zu
// berücksichtigen" for the PARAMETER set).
// ---------------------------------------------------------------------------
export function tab6AsTable(): RegulationTable {
  const freqLines = (cell: string) => deTab(cell).split('\n');
  type R = { token: (typeof TAB6_TOKENS)[number]; quote: string; online: string; periodisch: string | null };
  const mbr = cells(Q.L1300_1303), mfuf = cells(Q.L1304_1310), ozon = cells(Q.L1312_1315);
  const R: R[] = [
    { token: 'mbr', quote: Q.L1300_1303, online: frag(mbr[1], 'pH-Wert, Sauerstoff', ' Schlammalter'), periodisch: frag(mbr[1], 'Schlammalter') }, // U-3 split
    { token: 'mf_uf', quote: Q.L1304_1310, online: freqLines(mfuf[1])[0], periodisch: freqLines(mfuf[1])[1] },
    { token: 'medienfiltration', quote: Q.L1311, online: cells(Q.L1311)[1], periodisch: null },
    { token: 'ozon', quote: Q.L1312_1315, online: ozon[1], periodisch: null }, // both printed lines are "Online"
    { token: 'ro', quote: Q.L1316, online: cells(Q.L1316)[1], periodisch: null },
    { token: 'uv', quote: Q.L1317, online: cells(Q.L1317)[1], periodisch: null },
    { token: 'uv_aop', quote: Q.L1318, online: cells(Q.L1318)[1], periodisch: null },
    { token: 'chlor', quote: Q.L1319, online: cells(Q.L1319)[1], periodisch: null },
  ];
  const rows: RegulationRow[] = R.map((r, i) => {
    const c = cells(r.quote);
    const freq = freqLines(c[2]);
    must(r.quote, r.online);
    return { row_key: r.token, keys: { stufe: r.token }, group_label: null, label_de: deTab(c[0]), order_index: i,
      values: { bezeichnung: deTab(c[0]), parameter_gedruckt: deTab(c[1]), parameter_online: r.online, parameter_periodisch: r.periodisch, frequenz_online: freq[0], frequenz_periodisch: r.periodisch ? freq[1] : null, frequenz_gedruckt: freq.join(' / ') },
      verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TAB6', title_de: 'Beispiel für Betriebsparameter und deren Messhäufigkeit je Aufbereitungsstufe (Tab. 6)', clause_reference: '§6.4, Tab. 6', page_ref: null,
    key_columns: ['stufe'],
    value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'parameter_gedruckt', type: 'string' }, { name: 'parameter_online', type: 'string' }, { name: 'parameter_periodisch', type: 'string' }, { name: 'frequenz_online', type: 'string' }, { name: 'frequenz_periodisch', type: 'string' }, { name: 'frequenz_gedruckt', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: `${Q.L1297} — ${Q.L1293}`, // L1297 — L1293
    verification_status: 'imported_unverified', rows }; // m1200_2-U-3
}

// ---------------------------------------------------------------------------
// TABB2 — Tab. B.2 (L1748–L1780): indicative log10 reductions per stage — "Erreichbare" (numbers, note a) and "Erwartbare"
// (note b; printed as "0,5-1" / "4" / "1,5-4" / "systemspezifisch"; RO / UV / AOP / Boden-Aquifer / Teiche print ONE
// multicolumn cell for the three organism groups). `*_erwartbar_text` keeps the printed cell, `*_erwartbar_min/max` the parsed
// bounds (equal for a single figure, null for "systemspezifisch"); MF/UF viruses print "$0{ }^{\text {dl }}$" = 0 with note d).
// `anmerkung` = the printed "Anmerkungen zur Validierung" cell (Chlor: the Ct ≥ 15 mg·min/l, pH ≤ 7,5, ≥ 10 °C condition).
// Policy `anhaltswert` (L1748 "Indikative log10-Reduktionen"; L659 "können … herangezogen werden").
// ---------------------------------------------------------------------------
export function tabB2AsTable(): RegulationTable {
  const parseRange = (cell: string): { text: string; min: number | null; max: number | null } => {
    const text = cell.replace(/^\\multicolumn\{3\}\{\|c\|\}\{(.*)\}$/, '$1').trim();
    if (text === 'systemspezifisch') return { text, min: null, max: null };
    if (text === '$0{ }^{\\text {dl }}$') return { text, min: 0, max: 0 }; // printed "0 d)" (note d, L1779)
    const m = /^(\d+(?:,\d+)?)(?:-(\d+(?:,\d+)?))?$/.exec(text);
    if (!m) throw new Error(`unparsed Tab. B.2 cell: ${cell}`);
    return { text, min: deNum(m[1]), max: deNum(m[2] ?? m[1]) };
  };
  type R = { token: Stufe; quote: string };
  const R: R[] = [
    { token: 'mechanisch', quote: Q.L1753 }, { token: 'biologisch', quote: Q.L1754 }, { token: 'koagulation_flockung_filtration', quote: Q.L1755 }, { token: 'mbr', quote: Q.L1756 },
    { token: 'mf_uf', quote: Q.L1757 }, { token: 'ozon', quote: Q.L1758 }, { token: 'ro', quote: Q.L1759 }, { token: 'uv', quote: Q.L1760 },
    { token: 'uv_aop', quote: Q.L1771 }, { token: 'chlor', quote: Q.L1772 }, { token: 'boden_aquifer', quote: Q.L1773 }, { token: 'teiche', quote: Q.L1774 },
  ];
  const rows: RegulationRow[] = R.map((r, i) => {
    const c = cells(r.quote);
    const gemeinsam = c.length === 6; // one multicolumn erwartbar cell for the three groups
    const erw = gemeinsam ? [c[4], c[4], c[4]] : [c[4], c[5], c[6]];
    const [v, p, b] = erw.map(parseRange);
    return { row_key: r.token, keys: { stufe: r.token }, group_label: null, label_de: c[0], order_index: i,
      values: {
        bezeichnung: c[0], viren_erreichbar: deNum(c[1]), protozoen_erreichbar: deNum(c[2]), bakterien_erreichbar: deNum(c[3]),
        viren_erwartbar_text: v.text, viren_erwartbar_min: v.min, viren_erwartbar_max: v.max,
        protozoen_erwartbar_text: p.text, protozoen_erwartbar_min: p.min, protozoen_erwartbar_max: p.max,
        bakterien_erwartbar_text: b.text, bakterien_erwartbar_min: b.min, bakterien_erwartbar_max: b.max,
        erwartbar_gemeinsam: gemeinsam, anmerkung: c[gemeinsam ? 5 : 7],
      }, verbatim_quote: r.quote };
  });
  const num = (name: string): ValueColumn => ({ name, type: 'number', unit: 'log10' });
  return { standard_code: STD, edition: ED, table_code: 'TABB2', title_de: 'Indikative log10-Reduktionen je Aufbereitungsstufe — erreichbar / erwartbar für Viren, Protozoen, Bakterien (Tab. B.2)', clause_reference: 'Anhang B, Tab. B.2', page_ref: null,
    key_columns: ['stufe'],
    value_columns: [
      { name: 'bezeichnung', type: 'string' }, num('viren_erreichbar'), num('protozoen_erreichbar'), num('bakterien_erreichbar'),
      { name: 'viren_erwartbar_text', type: 'string' }, num('viren_erwartbar_min'), num('viren_erwartbar_max'),
      { name: 'protozoen_erwartbar_text', type: 'string' }, num('protozoen_erwartbar_min'), num('protozoen_erwartbar_max'),
      { name: 'bakterien_erwartbar_text', type: 'string' }, num('bakterien_erwartbar_min'), num('bakterien_erwartbar_max'),
      { name: 'erwartbar_gemeinsam', type: 'boolean' }, { name: 'anmerkung', type: 'string' },
    ],
    override_policy: 'anhaltswert', override_quote: `${Q.L1748} — ${frag(Q.L659, 'können als Alternativvariante', ' die den Anforderungen')}`, // L1748 — L659
    verification_status: 'imported_unverified', rows }; // m1200_2-U-6 (text cells; the numeric credit cells are clean)
}

// ---------------------------------------------------------------------------
// S8_2_KOSTEN — §8.2 (L1450 "grobe Richtwerte … mithilfe von Baupreisindizes auf das Jahr 2020 umgerechnet"): specific costs
// per stage in €/m³ Schmutzwasser, min / max parsed from the printed "a € / m³ bis b € / m³ SW" cells (L1453–L1458 tabular,
// L1464 / L1465 the MBR alternative). `zusaetzlich` = the printed "zusätzlich" (an add-on to the mechanical-biological
// treatment). Policy `anhaltswert`; SR-2: the register shows min / max as hints beside the engineer's own Kostenkennwert.
// ---------------------------------------------------------------------------
export function s82KostenAsTable(): RegulationTable {
  must(Q.L1450, 'grobe Richtwerte'); must(Q.L1450, 'auf das Jahr 2020 umgerechnet');
  type R = { token: (typeof KOSTEN_TOKENS)[number]; quote: string };
  const R: R[] = [
    { token: 'mech_bio', quote: Q.L1453 }, { token: 'sandfiltration', quote: Q.L1454 }, { token: 'uv', quote: Q.L1455 }, { token: 'ozon_desinfektion', quote: Q.L1456 },
    { token: 'ozon_spurenstoff', quote: Q.L1457 }, { token: 'aktivkohle', quote: Q.L1458 }, { token: 'mbr', quote: Q.L1464 }, { token: 'aktivkohle_mbr', quote: Q.L1465 },
  ];
  const rows: RegulationRow[] = R.map((r, i) => {
    const line = r.quote.replace(/^\\hline\s*/, '').replace(/\s*\\\\\s*$/, '');
    const [bez, kosten] = line.includes('&') ? line.split('&').map((x) => x.trim()) : [line.split(':')[0] + ':', line.slice(line.indexOf(':') + 1).trim()];
    const nums = [...kosten.matchAll(/(\d+,\d+)/g)].map((m) => deNum(m[1]));
    if (nums.length !== 2) throw new Error(`§8.2 cell without two figures: ${kosten}`);
    const bezeichnung = bez.replace(/^[Il]\s+/, '').replace(/:$/, '').trim();
    return { row_key: r.token, keys: { stufe: r.token }, group_label: null, label_de: bezeichnung, order_index: i,
      values: { bezeichnung, kosten_min_eur_m3: nums[0], kosten_max_eur_m3: nums[1], zusaetzlich: kosten.includes('zusätzlich'), bezugsjahr: 2020, gedruckt: kosten }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'S8_2_KOSTEN', title_de: 'Spezifische Kosten je Aufbereitungsstufe in €/m³ Schmutzwasser, Preisstand 2020 (§8.2)', clause_reference: '§8.2', page_ref: null,
    key_columns: ['stufe'],
    value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'kosten_min_eur_m3', type: 'number', unit: '€/m³ SW' }, { name: 'kosten_max_eur_m3', type: 'number', unit: '€/m³ SW' }, { name: 'zusaetzlich', type: 'boolean' }, { name: 'bezugsjahr', type: 'number' }, { name: 'gedruckt', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q.L1450, // L1450
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABE1_STUFEN / TABE1_LEISTUNG — Tab. E.1 (L2164–L2185) "Vorabzug einer Referenzanlage der Klasse A (Beispiel: Schweinfurt …
// nur auszugsweise und vorläufig als Beispiel)": the reference plant's design parameters / operating conditions per stage
// (tokens shared with TABB2 where the printed stage is the same — "Mechanisch-biologische Behandlung mit Nachklärung" →
// biologisch, "Keramische Ultrafiltration" → mf_uf, "Ozonung" → ozon, "UV-Desinfektion" → uv — m1200_2-J-5; the BAK filter
// keeps its own token) and the 10th percentiles per organism with the sample counts. The Clostridium row prints "24,7" — a
// log10 reduction of 24,7 is not a readable value (the inventory reads "≥ 4,7") → `p10_log10` null, the printed cell kept
// (U-4; `imported_unverified`). Policy `anhaltswert` (L2164).
// ---------------------------------------------------------------------------
export function tabE1StufenAsTable(): RegulationTable {
  type R = { token: (typeof TABE1_TOKENS)[number]; quote: string };
  const R: R[] = [{ token: 'biologisch', quote: Q.L2172 }, { token: 'mf_uf', quote: Q.L2173 }, { token: 'ozon', quote: Q.L2183 }, { token: 'bak', quote: Q.L2184 }, { token: 'uv', quote: Q.L2185 }];
  const rows: RegulationRow[] = R.map((r, i) => {
    const c = cells(r.quote);
    return { row_key: r.token, keys: { stufe: r.token }, group_label: null, label_de: c[0], order_index: i,
      values: { bezeichnung: c[0], auslegung: c[1], betriebsbedingungen: c[2] }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABE1_STUFEN', title_de: 'Referenzanlage Klasse A (Beispiel Schweinfurt) — Auslegungsparameter und einzuhaltende Betriebsbedingungen je Stufe (Tab. E.1)', clause_reference: 'Anhang E, Tab. E.1', page_ref: null,
    key_columns: ['stufe'], value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'auslegung', type: 'string' }, { name: 'betriebsbedingungen', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q.L2164, // L2164
    verification_status: 'md_verified', rows };
}
export function tabE1LeistungAsTable(): RegulationTable {
  type R = { token: Organismus; quote: string; p10: number | null };
  const R: R[] = [
    { token: 'e_coli', quote: Q.L2167, p10: deNum(must(Q.L2167, '6,4')) },
    { token: 'somatische_coliphagen', quote: Q.L2168, p10: deNum(must(Q.L2168, '5,1')) },
    { token: 'f_spez_coliphagen', quote: Q.L2169, p10: deNum(must(Q.L2169, '4,2')) },
    { token: 'clostridium', quote: Q.L2170, p10: null }, // U-4: prints "24,7"
  ];
  const rows: RegulationRow[] = R.map((r, i) => {
    const c = cells(r.quote);
    return { row_key: r.token, keys: { organismus: r.token }, group_label: null, label_de: deTab(c[0]), order_index: i,
      values: { organismus_gedruckt: c[0], p10_log10: r.p10, p10_gedruckt: c[1], proben_gedruckt: c[2], methodik: c[3] }, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABE1_LEISTUNG', title_de: 'Referenzanlage Klasse A (Beispiel Schweinfurt) — 10. Perzentil der log10-Reduktion je Indikatororganismus (Tab. E.1)', clause_reference: 'Anhang E, Tab. E.1', page_ref: null,
    key_columns: ['organismus'], value_columns: [{ name: 'organismus_gedruckt', type: 'string' }, { name: 'p10_log10', type: 'number', unit: 'log10' }, { name: 'p10_gedruckt', type: 'string' }, { name: 'proben_gedruckt', type: 'string' }, { name: 'methodik', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q.L2164, // L2164
    verification_status: 'imported_unverified', rows }; // m1200_2-U-4
}

/** The live DWA-M-1200-2 set (ten tables). */
export function m12002SeedTables(): RegulationTable[] {
  return [tab3AsTable(), s333AsTable(), anhangC1AsTable(), glC21AsTable(), tab4AsTable(), tab6AsTable(), tabB2AsTable(), s82KostenAsTable(), tabE1StufenAsTable(), tabE1LeistungAsTable()];
}
