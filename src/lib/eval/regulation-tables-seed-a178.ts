/**
 * DWA-A-178 regulation-table seed builders (Plan 3 Task 14, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-A-178\DWA-A_178.md` (1379 lines;
 * the line is in the `Q` key next to each row — the spans were lifted
 * mechanically by line number, `JSON.stringify` per span). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts a178 "<transcript>"`.
 * Emitted as `20260917101400_regulation_tables_seed_a178.sql` (no earlier
 * DWA-A-178 table seed exists — nothing superseded).
 *
 * Edition: the title page prints "Juni 2019" (L7 / L17); the imprint (L42)
 * "© DWA, 1. Auflage, Stand: korrigierte Fassung Oktober 2019, Hennef 2019" =
 * prod `standards.version` 'Juni 2019 (korrigierte Fassung Oktober 2019)' (read
 * in-session) → token `'2019-06'` (sign-off a178-I-1).
 *
 * The Arbeitsblatt prints ONE value table (Tabelle 1, the η Rechenwerte, with
 * the footnote alternative for η_VS), ONE indicator table (Tabelle 2, text only)
 * and every other figure as a sentence — so the "text-limit" pattern of DWA-M-187
 * applies: one printed sentence per row keyed `parameter`, with `wert / unit /
 * comparator / modal / text` columns, split into three tables by the ONE
 * `override_policy` a table carries (the modal verb per row stays visible):
 *   S6_LIMITS        — "muss" / "festgesetzt" / "festgelegt" / "≥ ≤" rows → locked
 *   S6_2_RECHENWERTE — "wird … angesetzt" / the Straße Vorgaben → locked (a178-O-2)
 *   S6_2_ANHALT      — "kann … angesetzt werden" / "haben sich bewährt" / "üblich" → anhaltswert
 * Tabelle 1 is split the same way: TABELLE1 (η_F / η_RR / η_RRL "Rechenwerte …
 * zur Anwendung in Gl. (5) bis Gl. (7)" → locked, a178-O-1) and TABELLE1_VS (the
 * footnote's η_VS 0 / 0,2 keyed on the CREATED select `vorstufe_typ` → `kann`,
 * spec §7: "choice between the printed alternatives only; still a lookup, the
 * alternative is a second key").
 *
 * Verification status: `md_verified` only where every printed row is lifted AND
 * every cell is legible (TABELLE1_VS, S6_1_4_5, S6_LIMITS, S6_2_RECHENWERTE,
 * S6_2_ANHALT, TABELLE2). TABELLE1 stays `imported_unverified`: the η_VS cell is
 * printed as `$0^{11}$` — the OCR of "0 ¹⁾" (the footnote marker rendered as an
 * exponent); the value 0 is encoded, the marker is recorded (a178-U-1); both
 * captions print "GI. (5) bis GL. (7)" for "Gl." (a178-U-2).
 *
 * Key tokens (G-A3): S6_1_4_5.system_type = prod `system_type` tokens
 * misch/trenn/strasse (capture); TABELLE1_VS.vorstufe_typ = the tokens of the
 * select CREATED by `field-configs/a178.ts`; TABELLE1.komponente = vs/f/rr/rrl
 * (read by `lookup()` literals only); TABELLE2.befund = this task's tokens
 * (a178-J-3), read by a register `lookup_key` (row_key = the token); the three
 * text tables are keyed `parameter` and read by `lookup()` literals.
 */
import type { RegulationTable, RegulationRow, ValueColumn } from './regulation-tables';

const STD = 'DWA-A-178';
export const A178_EDITION = '2019-06';
const ED = A178_EDITION;

/** Lifted spans (verbatim, line-cited in the key; generated from the transcript by scratchpad gen-a178-quotes.js — JSON.stringify per span). */
export const Q = {
  L451: "Wird ein Fremdwasserzufluss festgestellt, sind Sanierungsvorschläge zu erarbeiten, die einen verfahrensgerechten Betrieb des Retentionsbodenfilters ermöglichen. Vor der Planung des Retentionsbodenfilters muss geprüft werden, ob die Maßnahmen erfolgreich waren. Kann ein relevanter Fremdwasserzufluss zu einem Retentionsbodenfilterbecken nicht beseitigt werden, müssen entweder betriebliche Maßnahmen vorgesehen werden (z. B. alternierende Beschickung hydraulisch getrennter Filterbeete) oder der Bau der Anlage muss unterbleiben.",
  L461: "Ein Eintrag feinpartikulärer Feststoffe (AFS63), der das in Misch- und Trennsystemen sowie bei der Straßenentwässerung übliche Frachtaufkommen von bis zu $1.000 \\mathrm{~kg} /(\\mathrm{ha} \\cdot \\mathrm{a})$ (FUCHS et al. 2010) deutlich überschreitet, erzeugt ein erhebliches Kolmationsrisiko. Er ist in der Regel nicht durch Abschwemmungen von den Entwässerungsflächen erklärbar, sondern auf besondere Aktivitäten oder Eigenschaften von Einzugsgebiet und Kanalnetz zurückzuführen. Zur Abschätzung des zu erwartenden Feststoffeintrags in das Retentionsbodenfilterbecken sind folgende Maßnahmen hilfreich:",
  L575: "Der Retentionsraum dient der Zwischenspeicherung der durch Filtration zu behandelnden Abflüsse. Weiterhin findet im Retentionsraum von Durchlauffilterbecken eine Sedimentation statt, die den über den Filterbeckenüberlauf entlasteten Volumenstrom mechanisch reinigt. Bei diesen Anlagen sollte der Retentionsraum deshalb so gestaltet werden, dass eine gleichmäßige Durchströmung möglich ist. Nutzbare Einstauhöhen liegen zwischen $h_{R R}=0,3 \\mathrm{~m}$ und 2 m .",
  L583: "Die Deckschicht schützt die Bodenfilteroberfläche gegen Erosion und äußere Kolmation, solange die Filtervegetation noch nicht etabliert ist. Sie besteht aus einer 5 cm starken Schicht aus kantengerundetem oder gebrochenem mineralischem Material ( 2 mm bis 8 mm ). Das Material der Deckschicht sollte frost- und tausalzbeständig sein.",
  L589: "Die erforderliche Höhe des Filterkörpers beträgt im konsolidierten Zustand:",
  L590: "l Mischsystem $h_{\\mathrm{FK}} \\geq 0,75 \\mathrm{~m}$,",
  L591: "1 Trennsystem und Straßenentwässerung $h_{\\mathrm{FK}} \\geq 0,50 \\mathrm{~m}$.",
  L606: "Die genannten Anforderungen werden mehrheitlich mit natürlichen Gesteinskörnungen aus mineralischen Vorkommen, wie z. B. Quarz, Basalt, Kalkbrechsand, Lava, erreicht. Eine ausreichende Basenausstattung muss unter Umständen durch Zumischung von Calciumcarbonat hergestellt werden. Bindige Böden, organische Beimischungen und rezyklierte Gesteinskörnungen dürfen nicht verwendet werden. Wie bei der Deckschicht sollten die verwendeten Filtermaterialien frost- und tausalzbeständig sein. Als Filtermaterial sind kantengerundete und gebrochene Materialien aus natürlichen Vorkommen der Korngruppe $0 / 2 \\mathrm{~mm}$ nach TL Gestein-StB 04/07 (Kategorie $\\mathrm{G}_{\\mathrm{F}} 85$, Gehalt an Feinanteilen $f_{3}$ ) geeignet. Es ist demnach unter anderem ein maximaler Überkornanteil von $\\leq 15$ Massen- $\\%$ und ein maximaler Feinanteil $(<0,063 \\mathrm{~mm})$ von $\\leq 3$ Massen- $\\%$ festgelegt. Feinanteile sind ebenso wie Überkornanteile nachteilig für den Filterbetrieb und die Reinigungsleistung. Es muss eine steile Körnungslinie mit $U=d_{60} / d_{10}<5$ eingehalten werden.",
  L608: "Das Filtermaterial muss einen Calciumcarbonatgehalt von $\\geq 20$ Massen- $\\%$ aufweisen. Der geforderte Calciumcarbonatgehalt kann bei geringer Ausstattung der regional vorkommenden Gesteinskörnungen durch technisches Zumischen carbonatreichen Materials erreicht werden. Der carbonatische Anteil im Filtermaterial sollte im oberen zulässigen Korngrößenspektrum liegen, um einen raschen Austrag aus dem Filterkörper zu vermeiden. Die Anforderungen an die Korngrößenverteilung des Filtermaterials beziehen sich immer auf das eingebaute Material, schließen die gegebenenfalls erforderlichen Carbonatzumischungen ein. Auch die Schadstofffreiheit bezieht sich auf das gegebenenfalls meliorierte Filtermaterial.",
  L619: "Zur Bepflanzung werden vorkultivierte Schilfpflanzen (Phragmites communis) eingesetzt. Als Pflanzdichte haben sich 4 bis 8 Pflanzen je Quadratmeter bewährt. Eine Fertigstellungspflege ist erforderlich. In der Etablierungsphase von in der Regel einer Vegetationsperiode muss die Wasser- und Nährstoffversorgung gewährleistet werden.",
  L635: "Die Abdichtung gewährleistet dauerhaft einen kontrollierten Filterbetrieb und die Möglichkeit des Einstaus und ist daher zwingend erforderlich. Die Abdichtung muss mit Kunststoffdichtungsbahnen einer Stärke von mindestens 2 mm ausgeführt werden. Die Abdichtung ist beidseitig gegen mechanische Beschädigungen durch ein Geotextil zu schützen. Grundsätze und Ausführungsbeispiele sind im Merkblatt DWA-M 176 dargestellt.",
  L639: "Die Drosselung des Dränabflusses dient der Einhaltung der Filtergeschwindigkeit und damit auch der Vergleichmäßigung der Filterflächenbelastung. Es ist sicherzustellen, dass bei Volleinstau des Retentionsraums die spezifische Drosselabflussspende auf $q_{\\text {Dr,RBF }}=0,05 \\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)$ begrenzt ist. Eine Steuerung oder Regelung des Drosselabflusses ist nicht erforderlich.",
  L663: "Wenn es die Höhenverhältnisse zulassen, kann aus Kostengründen und zur Unterhaltungsoptimierung eine Regenrückhaltelamelle (Rückhalteraum) über dem Retentionsraum des Retentionsbodenfilterbeckens angeordnet werden. Diese ist, wie eine nachgeschaltete Regenrückhalteanlage, mit einer eigenen Drosseleinrichtung auszustatten (siehe 6.2.3).",
  L671: "Bestehende Entlastungsbauwerke können in der Regel als Vorstufe genutzt werden, wenn sie eine Entlastungsrate von $e_{0} \\leq 55 \\%$ einhalten und regelgerecht betrieben werden. In Einzelfällen kann im Bestand eine höhere Entlastungsrate zugelassen werden. Für Stauraumkanäle mit unten liegender Entlastung ist diese Ausnahme nicht zulässig, weil bei diesen Anlagen mit einem erhöhten Feststoffaustrag zu rechnen ist.",
  L673: "Es ist sicherzustellen, dass im langjährigen Mittel $n \\geq 10$ Entlastungen pro Jahr gegeben sind, um einer Unterlast des Filters zu begegnen.",
  L677: "Gemäß 6.1.3 ist ein unbelüfteter Grobstoffrückhalt vorzusehen, der für den Rückhalt mineralischer Grobpartikel (Sand und Kies) ausgelegt ist. Das erforderliche spezifische Sammelvolumen wird auf mindestens $0,5 \\mathrm{~m}^{3} / \\mathrm{ha} A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}}$ festgelegt.",
  L683: "Bei der Straßenentwässerung gelten außerhalb von Wasserschutzgebieten die Vorgaben für das Trennsystem. Innerhalb von Wasserschutzgebieten ist zum Schutz gegen Havarien ein zusätzlicher Auffangraum für Leichtflüssigkeiten gemäß RiStWag vorzusehen.",
  L689: "Die Bemessung von Retentionsbodenfilterbecken für die Standardanwendung nutzt den Parameter AFS63. Zur Gewährleistung eines wartungsarmen Betriebs und zur Minimierung des Kolmationsrisikos wird eine maximal zulässige AFS63-Filterflächenbelastung von $b_{\\text {krit }}=7 \\mathrm{~kg} /\\left(\\mathrm{m}^{2} \\cdot \\mathrm{a}\\right)$ festgesetzt. Bei der Bemessung beziehen sich alle konzentrations- und frachtbezogenen Angaben auf AFS63.",
  L714: "Im Trennsystem ist bei einer mittleren Jahresniederschlagshöhe von $>1.000 \\mathrm{~mm} / \\mathrm{a}$ eine Filterfläche $\\operatorname{von} A_{\\mathrm{F}}=100 \\mathrm{~m}^{2}$ je Hektar befestigter, angeschlossener Fläche ( $A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}}$ ) anzusetzen, um einer Filterüberlastung entgegenzuwirken.",
  L716: "Die AFS63-Zulauffracht zum Retentionsbodenfilter kann über mittlere spezifische Jahresfrachtpotenziale ( $b_{\\mathrm{R}, \\mathrm{a}}$ ), bezogen auf $A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a},}$ abgeschätzt werden. Als Rechenwert zur Vorbemessung der Bodenfilteroberfläche wird eine flächenspezifische Fracht von $b_{\\mathrm{R}, \\mathrm{a}}=530 \\mathrm{~kg} /(\\mathrm{ha} \\cdot \\mathrm{a})$ angesetzt. Bei der Zulauffrachtermittlung im Rahmen der Nachweisführung sind alle Komponenten des Entwässerungssystems zu berücksichtigen, die zu einer Frachtminderung beitragen (z. B. vorgelagerte Regenbecken, Entlastungen, Grabensysteme etc.).",
  L718: "Da die AFS63-Konzentration im Schmutzwasser der Konzentration im Oberflächenabfluss sehr ähnlich ist und der bei Mischwasserentlastungen entlastete Schmutzwasseranteil sehr gering ist, kann die Zulauffracht zum Retentionsbodenfilterbecken im Rahmen der Vorbemessung ebenfalls anhand der Oberflächenfracht abgeleitet werden. Die Summe aller Einzelfrachten aus dem angeschlossenen Einzugsgebiet ist dann mit der Entlastungsrate der Vorstufe zu multiplizieren (GI. 3).",
  L739: "\\hline $e_{0}$ & (\\%) & mittlere Jahresentlastungsrate der Vorstufe \\\\",
  L767: "Für diese Berechnung kann eine konstante Abflussspende des Drosselorgans des Retentionsbodenfilterbeckens von $q_{\\mathrm{Dr}, \\mathrm{RBF}}=0,05 \\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)$ gemäß 6.1.4.10 angesetzt werden. Für die nachfolgende Nachweisrechnung muss die Kennlinie des geplanten Drosselorgans angesetzt werden.",
  L775: "Das nutzbare Retentionsvolumen des Retentionsbodenfilterbeckens ( $V_{\\text {RBF }}$ ) ergibt sich aus dem Volumen des Retentionsraums und dem nutzbaren Porenvolumen des Filterkörpers. Das Porenvolumen wird pauschal mit $15 \\%$ des Filterkörpervolumens angesetzt. Die Böschungsneigung des Retentionsraums ergibt sich aus der örtlichen Situation und der konstruktiven Gestaltung.",
  L777: "Das nutzbare Volumen einer gegebenenfalls erforderlichen Regenrückhaltelamelle ( $V_{\\text {RLL }}$ ) ist zusätzlich zu berechnen.",
  L781: "Wurden durch die Aufsichtsbehörden keine spezifischen Behandlungsziele formuliert, kann die Bemessung eines Retentionsbodenfilterbeckens zur reinen Behandlung der Niederschlagsabflüsse von Verkehrsflächen stark vereinfacht entsprechend den folgenden Vorgaben erfolgen:",
  L782: "I spezifische Bodenfilteroberfläche $A_{\\mathrm{F}}=100 \\mathrm{~m}^{2} / \\mathrm{ha}$ angeschlossener befestigte Fläche ( $A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}}$ );",
  L783: "I nutzbare Einstauhöhe im Retentionsraum $h_{\\mathrm{RR}} \\geq 0,5 \\mathrm{~m}$.",
  L784: "Derart bemessene Retentionsbodenfilterbecken können sicher betrieben werden und reinigen mit hohem Wirkungsgrad mehr als $90 \\%$ des Jahresabflusses. Zusätzliche Nachweise des Retentionsbodenfilterbeckens sind nicht erforderlich.",
  L786: "Werden durch die Aufsichtsbehörden spezifische Reinigungsziele formuliert, folgen die Bemessung und der Nachweis eines Retentionsbodenfilterbeckens zur Straßenabflussbehandlung den Vorgaben für das Trennsystem.",
  L792: "Der Nachweis der Retentionsbodenfilteranlage im Trenn- und Mischsystem basiert auf einer Kontinuumssimulation mit mindestens 10 Jahren Niederschlagsbelastung. Das Modell bezieht sich hierbei auf die Retentionsbodenfilteranlage und umfasst somit die Vorstufe einschließlich einstauender Kanalnetzvolumina sowie das Retentionsbodenfilterbecken.",
  L794: "Bei Retentionsbodenfilterbecken zur reinen Behandlung von Straßenoberflächenwasser, die entsprechend der oben getroffenen Festlegungen bemessen sind und für die keine besonderen Reinigungsziele formuliert wurden, kann auf das Nachweisverfahren verzichtet werden.",
  L797: "l $V Q_{\\text {RBFA,zu }}\\left(\\mathrm{m}^{3} / \\mathrm{a}\\right)$ mittleres jährliches Zuflussvolumen zur Retentionsbodenfilteranlage",
  L806: "I $t_{\\mathrm{RR}, \\mathrm{E}, \\mathrm{n}=1}$ (h) mittlere jährliche Einstaudauer des Retentionsraums (Mischsystem)",
  L815: "b_{F}=\\frac{\\left(V Q_{D r, R B F} \\cdot \\eta_{F}\\right) \\cdot C_{R B F A, z u} \\cdot\\left(1-\\eta_{V S}\\right)}{A_{F} \\cdot 1.000} \\tag{5}",
  L822: "b_{F}=\\frac{\\left(V Q_{D r, R B F} \\cdot \\eta_{F}+V Q_{F U} \\cdot \\eta_{R R}\\right) \\cdot C_{R B F A, z u} \\cdot\\left(1-\\eta_{V S}\\right)}{A_{F} \\cdot 1.000} \\tag{6}",
  L829: "b_{F}=\\frac{\\left(V Q_{D r, R B F} \\cdot \\eta_{F}+V Q_{F U} \\cdot \\eta_{R R}+V Q_{D r, R R L} \\cdot \\eta_{R R L}\\right) \\cdot C_{R B F A, z u} \\cdot\\left(1-\\eta_{V S}\\right)}{A_{F} \\cdot 1.000} \\tag{7}",
  L862: "\\caption{Tabelle 1: Rechenwerte der mittleren Frachtrückhaltegrade der einzelnen Komponenten der Retentionsbodenfilteranlage, bezogen auf AFS63, zur Anwendung in GI. (5) bis GL. (7)}",
  L867: "\\caption{Tabelle 1: Rechenwerte der mittleren Frachtrückhaltegrade der einzelnen Komponenten der Retentionsbodenfilteranlage, bezogen auf AFS63, zur Anwendung in GI. (5) bis GL. (7)}",
  L869_873: "\\hline Parameter & $\\eta_{\\mathrm{vs}}$ & $\\eta_{\\text {F }}$ & $\\eta_{\\text {RR }}$ & $\\eta_{\\text {RRL }}$ \\\\\n\\hline AFS63 & $0^{11}$ & 0,95 & 0,50 & 0,60 \\\\\n\\hline \\multicolumn{5}{|l|}{\\begin{tabular}{l}\nAnmerkung \\\\\n1) Bei vorhandenen RKB $\\left(q_{\\mathrm{A}} \\leq 10 \\mathrm{~m} / \\mathrm{h}\\right)$ oder RÜB-DB kann für AFS63 $\\eta_{\\mathrm{VS}}=0,2$ angesetzt werden.",
  L873: "1) Bei vorhandenen RKB $\\left(q_{\\mathrm{A}} \\leq 10 \\mathrm{~m} / \\mathrm{h}\\right)$ oder RÜB-DB kann für AFS63 $\\eta_{\\mathrm{VS}}=0,2$ angesetzt werden.",
  L879: "Der Nachweis ist erfüllt, wenn in der betreffenden Anlagenkonfiguration (GL. 5 bis GL. 7) die nachgewiesene Bodenfilteroberflächenbelastung $b_{\\mathrm{F}}$ die zulässige Bodenfilteroberflächenbelastung $b_{\\text {krit }}$ gemäß 6.2.2.1 einhält:",
  L884: "4 \\mathrm{~kg} /\\left(\\mathrm{m}^{2} \\cdot \\mathrm{a}\\right) \\leq b_{F} \\leq b_{\\text {krit }}=7 \\mathrm{~kg} /\\left(\\mathrm{m}^{2} \\cdot \\mathrm{a}\\right) \\tag{9}",
  L904: "B_{\\mathrm{RBFA}, \\mathrm{ab}}=B_{\\mathrm{VS}}+B_{\\mathrm{Dr}, \\mathrm{RBF}}+B_{\\mathrm{FU}}+B_{\\mathrm{RRL}} \\tag{11}",
  L953: "\\eta_{F}=\\frac{\\left(C_{R B F, z u} \\cdot V Q_{D R, R B F, z u}\\right)-\\left(B_{R B F, a b} \\cdot 1.000\\right)}{C_{R B F, z u} \\cdot V Q_{R B F, z u}} \\tag{13}",
  L967_970: "$B_{\\text {RBF,ab }}(\\mathrm{kg} / \\mathrm{a})$ & \\begin{tabular}{l} \nmittlerer jährlicher Frachtaustrag aus dem Retentionsbodenfilterbecken, \\\\\nSumme aus Restfracht filtriert, Entlastung über den Filterbeckenüberlauf \\\\\nund, wenn vorhanden, aus Regenrückhaltelamelle",
  L975: "Wird die Wirksamkeit der Vorstufe für AFS63 mit Null angenommen, entspricht die Zulaufkonzentration zum Retentionsbodenfilterbecken $C_{\\text {RBF,zu }}$ der nach GL. (8) ermittelten Zulaufkonzentration zur Retentionsbodenfilteranlage $C_{\\text {RBF, zu }}$. Weist die Vorstufe einen nennenswerten Wirkungsgrad auf, muss eine entsprechende Abminderung erfolgen.",
  L979: "Im Mischsystem muss die Einstaudauer des Retentionsraums für $n=1 \\leq 48 \\mathrm{~h}$ sein. Die Beschickungshäufigkeit muss im langjährigen Mittel $\\geq 10$ a sein.",
  L983: "Entsprechen die Nachweisgrößen nicht den vorgegebenen Zielgrößen, erfolgt eine Iteration, bei der die Bodenfilteroberfläche $A_{\\mathrm{F}}$ und/oder die Einstauhöhe $h_{\\mathrm{RR}}$ so lange variiert werden, bis alle Vorgaben und Nachweise erfüllt sind.",
  L1078: "Durch eine regelmäßige Begehung des Retentionsbodenfilterbeckens können anhand von einfachen Indikatoren wertvolle Hinweise zum Betriebszustand der Anlage und zur Minderung betrieblicher Risiken gewonnen werden (siehe Tabelle 2). Weitere Hinweise sind in Arbeitsblatt DWA-A 147 enthalten.",
  L1085: "\\hline \\multirow[t]{5}{*}{Schilf} & üppiger Wuchs auf der gesamten Filterfläche & hohe, gleichmäßige Filterbelastung \\\\",
  L1086: "\\hline & lückenhafter Schilfbewuchs, dünne Halme & geringe Filterbelastung \\\\",
  L1087: "\\hline & Halmwurzeln & lang anhaltender Filterüberstau \\\\",
  L1088: "\\hline & abgeknickte Pflanzen im Zulaufbereich & unzureichende Energieumwandlung im Einlauf- und Verteilungsbauwerk \\\\",
  L1089: "\\hline & hoher Anteil von Begleitpflanzen (Ampfer, Brennnessel etc.) & geringe Beschickungshäufigkeit \\\\",
  L1090: "\\hline \\multirow[t]{5}{*}{Bodenfilteroberfläche} & zulaufnahe Erosionsspuren & schlechte Energieumwandlung im Zulaufbauwerk \\\\",
  L1091: "\\hline & fehlende Sedimentschicht nach mehreren Betriebsjahren, Moosbewuchs & sehr geringe Feststoffbelastung \\\\",
  L1092: "\\hline & Tierbauten z. B. von Mäusen, Kaninchen & lange Trockenzeiten \\\\",
  L1093: "\\hline & unstrukturierte Sedimente & lange Filterüberstauzeiten \\\\",
  L1094: "\\hline & krümelstrukturierte Sedimente, durch Würmer besiedelt & ausreichend lange Trockenzeiten \\\\",
  L1104: "\\hline \\multirow[t]{5}{*}{Ablaufbauwerk} & Dränablauf klar, farb- und geruchlos & funktionstüchtiger Filter mit guter Reinigungsleistung \\\\",
  L1105: "\\hline & schleimiger Belag (Biofilmbildung) & Reinigungsleistung des Filterkörpers eingeschränkt \\\\",
  L1106: "\\hline & schwarze oder rote Beläge (Mangan-, Eisenausfällungen) & Sauerstoffmangel durch zu geringe Trockenzeiten und/oder unzulässiger Teileinstau \\\\",
  L1107: "\\hline & weiße Beläge an verzinkten, nicht eingestauten Bauteilen & extremer Sauerstoffmangel im Filter (Schwefelsäurebildung) \\\\",
  L1108: "\\hline & Feinpartikel im Ablaufschacht & Kurzschlussverbindungen im Filterkörper (z. B. aufgrund von Tierbauten) \\\\",
  L1121: "I betriebliche hydraulische Durchlässigkeit des Filterkörpers und der Sedimentschicht (betrieblicher $k_{\\mathrm{f}}$-Wert, $k_{\\mathrm{f}, \\mathrm{b}}$-Wert), Werte $k_{\\mathrm{f}, \\mathrm{b}}<10^{-6} \\mathrm{~m} / \\mathrm{s}$ sind ein Hinweis auf Kolmation.",
  L723: "B_{\\mathrm{RBF}, \\mathrm{zu}}=\\sum\\left(A_{\\mathrm{E}, \\mathrm{~b}, \\mathrm{a}, \\mathrm{i}} \\cdot b_{\\mathrm{R}, \\mathrm{a}}\\right) \\tag{2}",
  L730: "B_{\\mathrm{RBF}, \\mathrm{zu}}=\\sum\\left(A_{\\mathrm{E}, \\mathrm{~b}, \\mathrm{a}, \\mathrm{i}} \\cdot b_{\\mathrm{R}, \\mathrm{a}} \\cdot e_{0}\\right) \\tag{3}",
  L737: "\\hline $A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}, \\mathrm{i}}$ & (ha) & befestigte, angeschlossene Teilflächen im Einzugsgebiet der Retentionsbodenfilteranlage \\\\",
  L799: "l $V Q_{\\mathrm{Dr}, \\mathrm{RBF}}\\left(\\mathrm{m}^{3} / \\mathrm{a}\\right)$ mittleres jährliches Abflussvolumen über das Drosselorgan des Retentionsbodenfiterbeckens",
  L801: "I $V Q_{F \\ddot{U}} \\quad\\left(\\mathrm{~m}^{3} / \\mathrm{a}\\right) \\quad$ mittleres jährliches Abflussvolumen über den Filterbeckenüberlauf",
  L802: "I $V Q_{\\mathrm{Dr}, \\mathrm{RRL}}\\left(\\mathrm{m}^{3} / \\mathrm{a}\\right)$ mittleres jährliches Abflussvolumen des Drosselorgans einer Regenrückhaltelamelle",
  L819: "Stoffliche Bodenfilteroberflächenbelastung bei Durchlauffilterbecken:",
  L826: "Stoffliche Bodenfilteroberflächenbelastung bei Durchlauffilterbecken mit Regenrückhaltelamelle:",
  L915: "\\hline $A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}}$ & (ha) & Summe aller befestigten, angeschlossenen Flächen im Einzugsgebiet der Retentionsbodenfilteranlage \\\\",
  L1104_1108: "\\hline \\multirow[t]{5}{*}{Ablaufbauwerk} & Dränablauf klar, farb- und geruchlos & funktionstüchtiger Filter mit guter Reinigungsleistung \\\\\n\\hline & schleimiger Belag (Biofilmbildung) & Reinigungsleistung des Filterkörpers eingeschränkt \\\\\n\\hline & schwarze oder rote Beläge (Mangan-, Eisenausfällungen) & Sauerstoffmangel durch zu geringe Trockenzeiten und/oder unzulässiger Teileinstau \\\\\n\\hline & weiße Beläge an verzinkten, nicht eingestauten Bauteilen & extremer Sauerstoffmangel im Filter (Schwefelsäurebildung) \\\\\n\\hline & Feinpartikel im Ablaufschacht & Kurzschlussverbindungen im Filterkörper (z. B. aufgrund von Tierbauten) \\\\",
} as const;

/** Build-time SR-1 guard: every seeded cell text must be printed inside the row's own quote span. */
function inSpan(quote: string, cell: string | null, where: string): void {
  if (cell !== null && !quote.includes(cell)) throw new Error(`${where}: cell "${cell}" is not inside its verbatim_quote`);
}

// ---------------------------------------------------------------------------
// Tabelle 1 — Rechenwerte der mittleren Frachtrückhaltegrade (§6.2.2.3, L865–L877). The body is ONE printed row
// (L870 "AFS63 & $0^{11}$ & 0,95 & 0,50 & 0,60") under the four η columns (L869) — transposed into one row per
// component (the A138 TAB14 pattern: the five-line span L869–L873 incl. the Anmerkung is the quote of every row).
// η_VS prints "0" with the footnote marker (OCR "$0^{11}$", a178-U-1); the footnote (L873) permits 0,2 for RKB
// (q_A ≤ 10 m/h) / RÜB-DB — carried in `eta_alt` + `bedingung` on the vs row and as its own table TABELLE1_VS.
// Policy `locked`: the caption reads "Rechenwerte … zur Anwendung in GI. (5) bis GL. (7)" (L867) — "zur Anwendung"
// = "anzusetzen" in the spec §7 wording table; "Rechenwert" itself is not listed there (a178-O-1 proposes locked,
// names anhaltswert as the alternative).
// ---------------------------------------------------------------------------
export const TABELLE1_KOMPONENTEN: ReadonlyArray<{ komponente: string; label: string; eta: number; printed: string; eta_alt: number | null; bedingung: string | null }> = [
  { komponente: 'vs', label: 'η_VS — Vorstufe', eta: 0, printed: '$0^{11}$', eta_alt: 0.2, bedingung: 'Bei vorhandenen RKB $\\left(q_{\\mathrm{A}} \\leq 10 \\mathrm{~m} / \\mathrm{h}\\right)$ oder RÜB-DB kann für AFS63 $\\eta_{\\mathrm{VS}}=0,2$ angesetzt werden.' }, // L870 + L873
  { komponente: 'f', label: 'η_F — Filtration (Filterkörper)', eta: 0.95, printed: '0,95', eta_alt: null, bedingung: null }, // L870
  { komponente: 'rr', label: 'η_RR — Retentionsraum / Sedimentationskammer', eta: 0.5, printed: '0,50', eta_alt: null, bedingung: null }, // L870
  { komponente: 'rrl', label: 'η_RRL — Regenrückhaltelamelle', eta: 0.6, printed: '0,60', eta_alt: null, bedingung: null }, // L870
];
export function tabelle1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TABELLE1_KOMPONENTEN.map((r, i) => {
    inSpan(Q.L869_873, r.printed, `TABELLE1 ${r.komponente}`);
    inSpan(Q.L869_873, r.bedingung, `TABELLE1 ${r.komponente} bedingung`);
    return { row_key: r.komponente, keys: { komponente: r.komponente }, group_label: null, label_de: r.label, order_index: i, values: { eta_afs63: r.eta, eta_alt: r.eta_alt, bedingung: r.bedingung }, verbatim_quote: Q.L869_873 };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABELLE1', title_de: 'Rechenwerte der mittleren Frachtrückhaltegrade der einzelnen Komponenten der Retentionsbodenfilteranlage, bezogen auf AFS63', clause_reference: '§6.2.2.3, Tab. 1', page_ref: null,
    key_columns: ['komponente'], value_columns: [{ name: 'eta_afs63', type: 'number', unit: '-' }, { name: 'eta_alt', type: 'number', unit: '-' }, { name: 'bedingung', type: 'string' }],
    override_policy: 'locked', override_quote: Q.L867,
    verification_status: 'imported_unverified', rows }; // a178-U-1 / U-2
}

// ---------------------------------------------------------------------------
// Tabelle 1, Anmerkung 1) — η_VS by Vorstufe type (L873): "Bei vorhandenen RKB (q_A ≤ 10 m/h) oder RÜB-DB kann für
// AFS63 η_VS = 0,2 angesetzt werden." Keyed on the CREATED select `vorstufe_typ` (a178-J-1): the two named types
// carry the permitted 0,2, every other Vorstufe the printed base value 0 (L870). Policy `kann` (the printed
// alternative 0 / 0,2 — spec §7 row 3, cue quoted from this very footnote); the value column lists the two
// printed alternatives for the widget's `kann` select (a178-O-4 records that the select offers 0,2 for every row).
// `stauraum_unten` (L671 "Für Stauraumkanäle mit unten liegender Entlastung ist diese Ausnahme nicht zulässig")
// is its own token so the e_0 exception can be gated later (a178-G-7); η_VS for it is the base value 0.
// ---------------------------------------------------------------------------
export const VORSTUFE_TYPEN = [
  { value: 'rkb_le10', label_de: 'Regenklärbecken RKB (q_A ≤ 10 m/h)', eta_vs: 0.2, quote: 'L873' },
  { value: 'rueb_db', label_de: 'Regenüberlaufbecken als Durchlaufbecken (RÜB-DB)', eta_vs: 0.2, quote: 'L873' },
  { value: 'stauraum_unten', label_de: 'Stauraumkanal mit unten liegender Entlastung', eta_vs: 0, quote: 'L671' },
  { value: 'sonstige', label_de: 'sonstige Vorstufe (Grobstoffrückhalt, RÜB ohne DB, Stauraumkanal mit oben liegender Entlastung)', eta_vs: 0, quote: 'L870' },
] as const;
export function tabelle1VsAsTable(): RegulationTable {
  const rows: RegulationRow[] = VORSTUFE_TYPEN.map((r, i) => {
    inSpan(Q.L869_873, r.eta_vs === 0.2 ? '0,2' : '$0^{11}$', `TABELLE1_VS ${r.value}`);
    return { row_key: r.value, keys: { vorstufe_typ: r.value }, group_label: null, label_de: `${r.label_de}: η_VS = ${r.eta_vs === 0.2 ? '0,2' : '0'}`, order_index: i, values: { eta_vs: r.eta_vs }, verbatim_quote: Q.L869_873 };
  });
  const etaCol: ValueColumn = { name: 'eta_vs', type: 'number', unit: '-', values: ['0', '0.2'] };
  return { standard_code: STD, edition: ED, table_code: 'TABELLE1_VS', title_de: 'Frachtrückhaltegrad der Vorstufe η_VS nach Vorstufentyp (Tabelle 1, Anmerkung 1)', clause_reference: '§6.2.2.3, Tab. 1 Anmerkung 1)', page_ref: null,
    key_columns: ['vorstufe_typ'], value_columns: [etaCol],
    override_policy: 'kann', override_quote: Q.L873,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// §6.1.4.5 Filterkörper — erforderliche Höhe h_FK by system (L589–L591). Keyed on prod `system_type` (misch /
// trenn / strasse; Trennsystem and Straßenentwässerung share the printed line L591). Policy `locked` (L589
// "Die erforderliche Höhe … beträgt", "≥").
// ---------------------------------------------------------------------------
export const S6_1_4_5_HFK = [
  { system_type: 'misch', label_de: 'Mischsystem', h_fk: 0.75, printed: '0,75', line: 'L590' },
  { system_type: 'trenn', label_de: 'Trennsystem', h_fk: 0.5, printed: '0,50', line: 'L591' },
  { system_type: 'strasse', label_de: 'Straßenentwässerung', h_fk: 0.5, printed: '0,50', line: 'L591' },
] as const;
export function s6145AsTable(): RegulationTable {
  const rows: RegulationRow[] = S6_1_4_5_HFK.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.printed, `S6_1_4_5 ${r.system_type}`);
    return { row_key: r.system_type, keys: { system_type: r.system_type }, group_label: null, label_de: `${r.label_de}: h_FK ≥ ${r.printed} m`, order_index: i, values: { h_fk_min_m: r.h_fk }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'S6_1_4_5', title_de: 'Erforderliche Höhe des Filterkörpers h_FK nach Entwässerungssystem (§6.1.4.5)', clause_reference: '§6.1.4.5', page_ref: null,
    key_columns: ['system_type'], value_columns: [{ name: 'h_fk_min_m', type: 'number', unit: 'm' }],
    override_policy: 'locked', override_quote: Q.L589,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Text-limit rows (one printed sentence per row). `printed` is the fragment asserted inside the span; `wert` the
// number it carries; `comparator` the printed operator (null when the sentence prints none — a178-J-6 class);
// `modal` the printed verb that decided the table (policy) the row sits in.
// ---------------------------------------------------------------------------
type TextRow = { parameter: string; label_de: string; wert: number; unit: string; comparator: string | null; modal: string; printed: string; line: keyof typeof Q };
const TEXT_COLUMNS: ValueColumn[] = [{ name: 'wert', type: 'number' }, { name: 'unit', type: 'string' }, { name: 'comparator', type: 'string' }, { name: 'modal', type: 'string' }, { name: 'text', type: 'string' }];
function textTable(code: string, title: string, clause: string, policy: RegulationTable['override_policy'], overrideQuote: string, rows: ReadonlyArray<TextRow>): RegulationTable {
  const out: RegulationRow[] = rows.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.printed, `${code} ${r.parameter}`);
    return { row_key: r.parameter, keys: { parameter: r.parameter }, group_label: null, label_de: r.label_de, order_index: i, values: { wert: r.wert, unit: r.unit, comparator: r.comparator, modal: r.modal, text: quote }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: code, title_de: title, clause_reference: clause, page_ref: null, key_columns: ['parameter'], value_columns: TEXT_COLUMNS, override_policy: policy, override_quote: overrideQuote, verification_status: 'md_verified', rows: out };
}

/** S6_LIMITS — the printed "muss" / "festgesetzt" / "festgelegt" / "≥ ≤" figures (locked). */
export const S6_LIMITS_ROWS: ReadonlyArray<TextRow> = [
  { parameter: 'b_krit', label_de: 'b_krit — maximal zulässige AFS63-Filterflächenbelastung', wert: 7, unit: 'kg/(m²·a)', comparator: '=', modal: 'festgesetzt', printed: 'b_{\\text {krit }}=7 \\mathrm{~kg} /\\left(\\mathrm{m}^{2} \\cdot \\mathrm{a}\\right)', line: 'L689' },
  { parameter: 'b_f_min', label_de: 'b_F — untere Grenze der zulässigen Bodenfilteroberflächenbelastung (Gl. 9)', wert: 4, unit: 'kg/(m²·a)', comparator: '≤ b_F', modal: 'Gl. (9)', printed: '4 \\mathrm{~kg} /\\left(\\mathrm{m}^{2} \\cdot \\mathrm{a}\\right) \\leq b_{F}', line: 'L884' },
  { parameter: 'v_spez_min', label_de: 'Spezifisches Sammelvolumen des Grobstoffrückhalts (Trennsystem)', wert: 0.5, unit: 'm³/ha', comparator: '≥', modal: 'wird … festgelegt', printed: 'mindestens $0,5 \\mathrm{~m}^{3} / \\mathrm{ha} A_{\\mathrm{E}, \\mathrm{b}, \\mathrm{a}}$', line: 'L677' },
  { parameter: 'e_0_max', label_de: 'e_0 — Entlastungsrate der Vorstufe (Mischsystem, Bestand)', wert: 55, unit: '%', comparator: '≤', modal: 'einhalten', printed: '$e_{0} \\leq 55 \\%$', line: 'L671' },
  { parameter: 'n_entlastungen_min', label_de: 'n — Entlastungen pro Jahr im langjährigen Mittel (Mischsystem)', wert: 10, unit: '1/a', comparator: '≥', modal: 'ist sicherzustellen', printed: '$n \\geq 10$ Entlastungen pro Jahr', line: 'L673' },
  { parameter: 't_rr_e_n1_max', label_de: 't_RR,E,n=1 — Einstaudauer des Retentionsraums (Mischsystem)', wert: 48, unit: 'h', comparator: '≤', modal: 'muss', printed: 'für $n=1 \\leq 48 \\mathrm{~h}$', line: 'L979' },
  { parameter: 'n_rbf_min', label_de: 'Beschickungshäufigkeit im langjährigen Mittel', wert: 10, unit: '1/a', comparator: '≥', modal: 'muss', printed: '$\\geq 10$ a sein', line: 'L979' },
  { parameter: 'h_rr_min', label_de: 'h_RR — nutzbare Einstauhöhe, untere Grenze', wert: 0.3, unit: 'm', comparator: '≥', modal: 'liegen zwischen', printed: '$h_{R R}=0,3 \\mathrm{~m}$', line: 'L575' },
  { parameter: 'h_rr_max', label_de: 'h_RR — nutzbare Einstauhöhe, obere Grenze', wert: 2, unit: 'm', comparator: '≤', modal: 'liegen zwischen', printed: 'und 2 m', line: 'L575' },
  { parameter: 'q_dr_rbf_max', label_de: 'q_Dr,RBF — spezifische Drosselabflussspende bei Volleinstau', wert: 0.05, unit: 'l/(s·m²)', comparator: '≤', modal: 'ist sicherzustellen … begrenzt', printed: '$q_{\\text {Dr,RBF }}=0,05 \\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)$ begrenzt', line: 'L639' },
  { parameter: 'kdb_min_mm', label_de: 'Kunststoffdichtungsbahn — Mindeststärke', wert: 2, unit: 'mm', comparator: '≥', modal: 'muss', printed: 'Stärke von mindestens 2 mm', line: 'L635' },
  { parameter: 'u_max', label_de: 'U = d_60/d_10 — Ungleichförmigkeitsgrad des Filtermaterials', wert: 5, unit: '-', comparator: '<', modal: 'muss … eingehalten werden', printed: '$U=d_{60} / d_{10}<5$', line: 'L606' },
  { parameter: 'feinanteil_max', label_de: 'Feinanteil (< 0,063 mm) des Filtermaterials', wert: 3, unit: 'Massen-%', comparator: '≤', modal: 'festgelegt', printed: 'maximaler Feinanteil $(<0,063 \\mathrm{~mm})$ von $\\leq 3$ Massen- $\\%$', line: 'L606' },
  { parameter: 'ueberkorn_max', label_de: 'Überkornanteil des Filtermaterials', wert: 15, unit: 'Massen-%', comparator: '≤', modal: 'festgelegt', printed: 'maximaler Überkornanteil von $\\leq 15$ Massen- $\\%$', line: 'L606' },
  { parameter: 'caco3_min', label_de: 'Calciumcarbonatgehalt des Filtermaterials', wert: 20, unit: 'Massen-%', comparator: '≥', modal: 'muss', printed: 'Calciumcarbonatgehalt von $\\geq 20$ Massen- $\\%$', line: 'L608' },
  { parameter: 'deckschicht_cm', label_de: 'Deckschicht — Stärke', wert: 5, unit: 'cm', comparator: '=', modal: 'besteht aus', printed: '5 cm starken Schicht', line: 'L583' },
  { parameter: 'langzeitsimulation_min_a', label_de: 'Kontinuumssimulation — Mindestdauer der Niederschlagsbelastung', wert: 10, unit: 'a', comparator: '≥', modal: 'basiert auf … mindestens', printed: 'mindestens 10 Jahren', line: 'L792' },
];
export function s6LimitsAsTable(): RegulationTable {
  return textTable('S6_LIMITS', 'Festgelegte Grenzwerte des Arbeitsblatts (§6.1 / §6.2, gedruckte Sätze)', '§6.1.4, §6.2.1, §6.2.2', 'locked', Q.L689, S6_LIMITS_ROWS);
}

/** S6_2_RECHENWERTE — "wird … angesetzt" / the Straße Vorgaben (locked; a178-O-2). */
export const S6_2_RECHENWERTE_ROWS: ReadonlyArray<TextRow> = [
  { parameter: 'b_r_a', label_de: 'b_R,a — Rechenwert des spezifischen AFS63-Jahresfrachtpotenzials (Vorbemessung)', wert: 530, unit: 'kg/(ha·a)', comparator: '=', modal: 'wird … angesetzt', printed: '$b_{\\mathrm{R}, \\mathrm{a}}=530 \\mathrm{~kg} /(\\mathrm{ha} \\cdot \\mathrm{a})$', line: 'L716' },
  { parameter: 'porenvolumen_pct', label_de: 'Nutzbares Porenvolumen des Filterkörpers (Anteil des Filterkörpervolumens)', wert: 15, unit: '%', comparator: '=', modal: 'wird pauschal … angesetzt', printed: 'pauschal mit $15 \\%$ des Filterkörpervolumens', line: 'L775' },
  { parameter: 'a_f_strasse_m2_ha', label_de: 'A_F — spezifische Bodenfilteroberfläche je ha A_E,b,a (vereinfachte Bemessung Straßenabflüsse)', wert: 100, unit: 'm²/ha', comparator: '=', modal: 'Vorgabe (kann … stark vereinfacht)', printed: '$A_{\\mathrm{F}}=100 \\mathrm{~m}^{2} / \\mathrm{ha}$', line: 'L782' },
  { parameter: 'h_rr_min_strasse', label_de: 'h_RR — nutzbare Einstauhöhe (vereinfachte Bemessung Straßenabflüsse)', wert: 0.5, unit: 'm', comparator: '≥', modal: 'Vorgabe (kann … stark vereinfacht)', printed: '$h_{\\mathrm{RR}} \\geq 0,5 \\mathrm{~m}$', line: 'L783' },
];
export function s62RechenwerteAsTable(): RegulationTable {
  return textTable('S6_2_RECHENWERTE', 'Rechenwerte und Vorgaben der Bemessung (§6.2.2, gedruckte Sätze)', '§6.2.2.1, §6.2.2.2', 'locked', Q.L716, S6_2_RECHENWERTE_ROWS);
}

/** S6_2_ANHALT — "kann … angesetzt werden" / "haben sich … bewährt" / "üblich" (anhaltswert; a178-O-3). */
export const S6_2_ANHALT_ROWS: ReadonlyArray<TextRow> = [
  { parameter: 'q_dr_rbf_vorbemessung', label_de: 'q_Dr,RBF — konstante Abflussspende für die Berechnung des Drosselabflusses (Gl. 4)', wert: 0.05, unit: 'l/(s·m²)', comparator: '=', modal: 'kann … angesetzt werden', printed: '$q_{\\mathrm{Dr}, \\mathrm{RBF}}=0,05 \\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)$', line: 'L767' },
  { parameter: 'pflanzdichte_min', label_de: 'Pflanzdichte Schilf — untere Grenze', wert: 4, unit: 'Pflanzen/m²', comparator: '≥', modal: 'haben sich … bewährt', printed: '4 bis 8 Pflanzen je Quadratmeter', line: 'L619' },
  { parameter: 'pflanzdichte_max', label_de: 'Pflanzdichte Schilf — obere Grenze', wert: 8, unit: 'Pflanzen/m²', comparator: '≤', modal: 'haben sich … bewährt', printed: '4 bis 8 Pflanzen je Quadratmeter', line: 'L619' },
  { parameter: 'feststoffeintrag_ueblich_max', label_de: 'Übliches AFS63-Frachtaufkommen (Misch-, Trennsystem, Straßenentwässerung)', wert: 1000, unit: 'kg/(ha·a)', comparator: '≤', modal: 'üblich … bis zu', printed: 'bis zu $1.000 \\mathrm{~kg} /(\\mathrm{ha} \\cdot \\mathrm{a})$', line: 'L461' },
];
export function s62AnhaltAsTable(): RegulationTable {
  return textTable('S6_2_ANHALT', 'Anhaltswerte des Arbeitsblatts (§5.2.4, §6.1.4.7, §6.2.2.1, gedruckte Sätze)', '§5.2.4, §6.1.4.7, §6.2.2.1', 'anhaltswert', Q.L767, S6_2_ANHALT_ROWS);
}

// ---------------------------------------------------------------------------
// Tabelle 2 — Einfache Indikatoren zur Einschätzung des Betriebszustands (§8.3.1, L1080–L1111). 15 printed rows in
// three `\multirow` groups (Schilf / Bodenfilteroberfläche / Ablaufbauwerk = `group_label`, the register picker's
// optgroup); keyed by this task's `befund` tokens (a178-J-3), the printed Befund and Hinweis cells as values.
// Policy `anhaltswert` (L1078 "können anhand von einfachen Indikatoren wertvolle Hinweise … gewonnen werden").
// ---------------------------------------------------------------------------
export const TABELLE2_BEFUNDE: ReadonlyArray<{ befund: string; bereich: string; befund_text: string; hinweis: string; line: keyof typeof Q }> = [
  { befund: 'ueppiger_wuchs', bereich: 'Schilf', befund_text: 'üppiger Wuchs auf der gesamten Filterfläche', hinweis: 'hohe, gleichmäßige Filterbelastung', line: 'L1085' },
  { befund: 'lueckenhafter_bewuchs', bereich: 'Schilf', befund_text: 'lückenhafter Schilfbewuchs, dünne Halme', hinweis: 'geringe Filterbelastung', line: 'L1086' },
  { befund: 'halmwurzeln', bereich: 'Schilf', befund_text: 'Halmwurzeln', hinweis: 'lang anhaltender Filterüberstau', line: 'L1087' },
  { befund: 'abgeknickte_pflanzen', bereich: 'Schilf', befund_text: 'abgeknickte Pflanzen im Zulaufbereich', hinweis: 'unzureichende Energieumwandlung im Einlauf- und Verteilungsbauwerk', line: 'L1088' },
  { befund: 'begleitpflanzen', bereich: 'Schilf', befund_text: 'hoher Anteil von Begleitpflanzen (Ampfer, Brennnessel etc.)', hinweis: 'geringe Beschickungshäufigkeit', line: 'L1089' },
  { befund: 'erosionsspuren', bereich: 'Bodenfilteroberfläche', befund_text: 'zulaufnahe Erosionsspuren', hinweis: 'schlechte Energieumwandlung im Zulaufbauwerk', line: 'L1090' },
  { befund: 'fehlende_sedimentschicht', bereich: 'Bodenfilteroberfläche', befund_text: 'fehlende Sedimentschicht nach mehreren Betriebsjahren, Moosbewuchs', hinweis: 'sehr geringe Feststoffbelastung', line: 'L1091' },
  { befund: 'tierbauten', bereich: 'Bodenfilteroberfläche', befund_text: 'Tierbauten z. B. von Mäusen, Kaninchen', hinweis: 'lange Trockenzeiten', line: 'L1092' },
  { befund: 'unstrukturierte_sedimente', bereich: 'Bodenfilteroberfläche', befund_text: 'unstrukturierte Sedimente', hinweis: 'lange Filterüberstauzeiten', line: 'L1093' },
  { befund: 'kruemelstruktur', bereich: 'Bodenfilteroberfläche', befund_text: 'krümelstrukturierte Sedimente, durch Würmer besiedelt', hinweis: 'ausreichend lange Trockenzeiten', line: 'L1094' },
  { befund: 'draenablauf_klar', bereich: 'Ablaufbauwerk', befund_text: 'Dränablauf klar, farb- und geruchlos', hinweis: 'funktionstüchtiger Filter mit guter Reinigungsleistung', line: 'L1104' },
  { befund: 'schleimiger_belag', bereich: 'Ablaufbauwerk', befund_text: 'schleimiger Belag (Biofilmbildung)', hinweis: 'Reinigungsleistung des Filterkörpers eingeschränkt', line: 'L1105' },
  { befund: 'schwarze_rote_belaege', bereich: 'Ablaufbauwerk', befund_text: 'schwarze oder rote Beläge (Mangan-, Eisenausfällungen)', hinweis: 'Sauerstoffmangel durch zu geringe Trockenzeiten und/oder unzulässiger Teileinstau', line: 'L1106' },
  { befund: 'weisse_belaege', bereich: 'Ablaufbauwerk', befund_text: 'weiße Beläge an verzinkten, nicht eingestauten Bauteilen', hinweis: 'extremer Sauerstoffmangel im Filter (Schwefelsäurebildung)', line: 'L1107' },
  { befund: 'feinpartikel_ablaufschacht', bereich: 'Ablaufbauwerk', befund_text: 'Feinpartikel im Ablaufschacht', hinweis: 'Kurzschlussverbindungen im Filterkörper (z. B. aufgrund von Tierbauten)', line: 'L1108' },
];
export function tabelle2AsTable(): RegulationTable {
  const rows: RegulationRow[] = TABELLE2_BEFUNDE.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.befund_text, `TABELLE2 ${r.befund} befund`);
    inSpan(quote, r.hinweis, `TABELLE2 ${r.befund} hinweis`);
    if (i === 0 || i === 5 || i === 10) inSpan(quote, r.bereich, `TABELLE2 ${r.befund} bereich`); // the \multirow head rows print the Bereich
    return { row_key: r.befund, keys: { befund: r.befund }, group_label: r.bereich, label_de: r.befund_text, order_index: i, values: { bereich: r.bereich, befund_text: r.befund_text, hinweis: r.hinweis }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABELLE2', title_de: 'Einfache Indikatoren zur Einschätzung des Betriebszustands des Retentionsbodenfilters', clause_reference: '§8.3.1, Tab. 2', page_ref: null,
    key_columns: ['befund'], value_columns: [{ name: 'bereich', type: 'string' }, { name: 'befund_text', type: 'string' }, { name: 'hinweis', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q.L1078,
    verification_status: 'md_verified', rows };
}

/** The live DWA-A-178 set (seven tables). */
export function a178SeedTables(): RegulationTable[] {
  return [tabelle1AsTable(), tabelle1VsAsTable(), s6145AsTable(), s6LimitsAsTable(), s62RechenwerteAsTable(), s62AnhaltAsTable(), tabelle2AsTable()];
}

