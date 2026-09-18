/**
 * DIN-EN-16941-2 regulation-table seed builders (Plan 3 Task 15, 2026-09-18).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.md`
 * (921 lines; the line is in the `Q` key next to each row — the spans were
 * lifted mechanically by line number, `JSON.stringify` per span, scratchpad
 * gen-16941-quotes.mjs). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts din16941_2 "<transcript>"`.
 * Emitted as `20260917101500_regulation_tables_seed_din16941_2.sql` (no earlier
 * DIN-EN-16941-2 table seed exists — nothing superseded).
 *
 * Edition: printed on the title page — "Dieses Dokument (EN 16941-2:2021)" (L5,
 * L101), CEN acceptance "20. Dezember 2020" (L36) = prod `standards.version`
 * 'EN 16941-2:2021' (read in-session) → token `'2021'`.
 *
 * Tables and the ONE policy each carries (spec §7, first-hit cue quoted):
 *   TABA1        Tab. A.1 (L741) per-person Ertrag / Bedarf — `anhaltswert`
 *                (L547 "Beispiele für typische durchschnittliche …", caption
 *                L737 "Typische Durchschnittswerte")
 *   TABA2/TABA3  Tab. A.2 / A.3 (L762–L766 / L776–L778) printed Größenordnungen
 *                — `anhaltswert` (L753 "typische Größenordnungen"); SR-2: min /
 *                max are HINTS shown beside the engineer's own figure, never a
 *                fill and never a limit (the prod validation_rules that hard-limit
 *                them are din16941_2-G-1)
 *   GL1_LEGENDE  the Gl.-1 legend (L569–L587): per source whether the term is
 *                Q·t·u (flow in l/min with a duration) or V·u (volume in l) —
 *                `locked` (L557 "muss … angewendet werden"); the sixth source
 *                Waschbecken (Q_HWB) has NO Tab.-A.2 row, which is why the
 *                Grauwasserquellen register keys on this table's six tokens
 *   TABD1/TABD2  Tab. D.1 / D.2 (L852–L855 / L870–L873), ONE row per PRINTED
 *                column (Sprühanwendung · WC-Spülung · Gartenbewässerung ·
 *                Reinigung, d. h. Waschmaschine = the tokens of the created
 *                select `richtwert_spalte` on -04; the two shared tokens equal
 *                prod `vorgesehene_nutzung`) and one value column per parameter
 *                (m277e trap 3) — `locked` (L681 "Die Beispiele in Anhang D
 *                sind Mindestanforderungen … müssen … Vorrang haben"; L699
 *                "können zur Orientierung dienen" is the later cue → O-1)
 *   TABD3/TABD4  Tab. D.3 / D.4 status bands (L884–L886 / L900–L901) — `locked`
 *                (L681); the coliform footnote b (L889) and the pH note (L902)
 *                travel as override_quote
 *   ANHANGB      Anhang B system types a)–e) (L788–L806) keyed on prod
 *                `anlagentyp` — `anhaltswert` (L787 "können … klassifiziert
 *                werden", informativ)
 *
 * Verification status: `md_verified` on every table — every printed row is
 * lifted and every cell is legible (the OCR of Tab. A.1 prints
 * "Nicht-TrinkwasserNutzungen" without the second hyphen and the Legionella
 * cell "N/A" with its footnote marker `${ }^{\text {b }}$` — both kept verbatim
 * in the spans, the values encoded are the unambiguous cell texts).
 *
 * Key tokens (G-A3): TABA2.quelle / GL1_LEGENDE.quelle = prod
 * `grauwasser_herkunft` tokens (capture); ANHANGB.anlagentyp = prod `anlagentyp`
 * tokens; TABD1/TABD2.nutzung = the created `richtwert_spalte` tokens
 * (`RICHTWERT_SPALTEN`, exported for the field-config module); TABA1.posten,
 * TABA3.bedarf, TABD3/TABD4.band are read by `lookup()` literals / a register
 * `lookup_key`.
 */
import type { RegulationTable, RegulationRow, ValueColumn } from './regulation-tables';

const STD = 'DIN-EN-16941-2';
export const DIN16941_2_EDITION = '2021';
const ED = DIN16941_2_EDITION;

/** Lifted spans (verbatim, line-cited in the key; generated from the transcript by scratchpad gen-16941-quotes.mjs — JSON.stringify per span). */
export const Q = {
  L5: "Dieses Dokument (EN 16941-2:2021) wurde vom Technischen Komitee CEN/TC 165 „Abwassertechnik“ erarbeitet, dessen Sekretariat von DIN (Deutschland) gehalten wird.",
  L36: "Diese Europäische Norm wurde vom CEN am 20. Dezember 2020 angenommen.",
  L101: "Dieses Dokument (EN 16941-2:2021) wurde vom Technischen Komitee CEN/TC 165 „Abwassertechnik“ erarbeitet, dessen Sekretariat von DIN gehalten wird.",
  L140: "- direkte Anwendungssysteme ohne Aufbereitung;",
  L219: "Menge und Verschmutzung der unterschiedlichen Arten von Grauwasser hängen von dessen Herkunft ab. Der Verschmutzungsgrad von Grauwasser aus Küchenspüle oder Geschirrspüler ist höher, als der von gering verschmutztem Grauwasser und kann eine intensivere Behandlung erfordern.",
  L238: "Es wird darauf hingewiesen, dass die Grauwasserabflussraten erheblich von den angeschlossenen Quellen abhängen. Zum Beispiel kann eine Dusche einen Abfluss zwischen $0,1 \\mathrm{l} / \\mathrm{s}$ (oder weniger) und $0,3 \\mathrm{l} / \\mathrm{s}$ aufweisen, während eine volle Badewanne typischerweise einen Abfluss zwischen $0,4 \\mathrm{l} / \\mathrm{s}$ und $0,5 \\mathrm{l} / \\mathrm{s}$ aufweist. Das Grauwassersystem muss in der Lage sein, solche schwankenden Zulaufraten zu bewältigen.",
  L246: "Grauwasser muss in separaten Abwasserleitungssystemen gesammelt werden und von den Sammeleinrichtungen durch Schwerkraft zum Grauwassersystem fließen können. Falls dies nicht möglich ist, sind Pumpen vorzusehen (siehe 5.6).",
  L268: "Behandlungsarten müssen einen oder mehrere der folgenden Teilschritte einschließen:",
  L286: "d) ob das System ausschließlich für Grauwasser vorgesehen ist, oder in Verbindung mit einem Regenwassersammelsystem betrieben wird.",
  L292: "Die Werkstoffe (z. B. Beton, Stahl, Polyvinylchlorid (PVC-U), Polyethylen (PE), Polypropylen (PP), glasfaserverstärkter Kunststoff (GRP-UP)), die für Speichereinrichtungen verwendet werden, müssen den in EN 12566-3 beschriebenen Werkstoffeigenschaften entsprechen. Werkstoffe für Bauteile in Kontakt mit Wasser müssen korrosionsbeständig sein.",
  L296: "Wenn vorgefertigte Teile verwendet werden, muss der Hersteller die Außenmaße, Zugangs- und Anschlussmaße sowie Grenzabmaße (Toleranzen) angeben. Einzelne Speichereinrichtungen dürfen miteinander verbunden werden.",
  L300: "Die Nennkapazität ist das maximale Wasservolumen, das in der Speichereinrichtung zurückgehalten werden kann, und ist vom Hersteller oder Planer anzugeben.",
  L302: "Die Kapazität kann gemessen oder berechnet werden.",
  L306: "Unterirdische Speichereinrichtungen müssen auftretenden Höchstlasten und Belastungen während Betrieb, Einbau, Nutzung und Wartung standhalten. Dies muss entweder durch Berechnung oder Prüfung erfolgen.",
  L308: "Oberirdische Speichereinrichtungen müssen der Wirkung von hydrostatischem Druck ohne übermäßige Verformung standhalten, ohne dass ihre Funktion nachteilig beeinflusst wird. Dies muss entweder durch Berechnung oder Prüfung erfolgen.",
  L327: "Für den Personenzugang müssen die Maße nach EN 476 berücksichtigt werden. Wenn kein Personenzugang vorgesehen ist, muss eine Öffnung (d.h. Breite einer rechtwinkligen oder Durchmesser einer runden Öffnung) mit mindestens 400 mm vorhanden sein.",
  L338: "Die Kapazität des Überlaufs muss größer oder gleich sein wie die des Zuflusses.",
  L345: "Die Grauwasserbehandlungsanlage muss eine Nachspeisung haben, wenn kontinuierlich Wasser benötigt wird. Das nachgespeiste Wasser kann eingeleitet werden in",
  L350: "Im Falle einer Nachspeisung mit Trinkwasser muss das Trinkwassersystem mit einer geeigneten Sicherungseinrichtung ausgestattet sein (siehe 5.5.2).",
  L352: "Die Möglichkeit einer Überflutung der Nachspeisung (z. B. durch Rückfluss) muss ausgeschlossen werden, z. B. durch Installation der Sicherungseinrichtung oberhalb der Rückstaulinie.",
  L360: "Um Verschwendung von Trinkwasser zu vermeiden, muss eine Speichereinrichtung mit ventilgesteuerten Zuläufen ein Warnsystem haben, so dass jegliches Versagen leicht erkennbar ist.",
  L364: "Um zu verhindern, dass Nicht-Trinkwasser in die Trinkwasser- oder öffentliche Wasserversorgung eindringt, muss die Nachspeisung mit einer Sicherungseinrichtung ausgestattet sein, die gegen Verunreinigung durch Flüssigkeiten der Kategorie 5 (freier Auslauf) nach EN 1717 absichert, wie beschrieben in:",
  L377: "A freier Auslauf (das Doppelte des Innendurchmessers der Zulauföffnung mit mindestens 20 mm )",
  L378: "$D$ Innendurchmesser des Zuleitungsrohrs (Zulauföffnung)",
  L380: "- EN 13077, Familie A Typ B, „AB Freier Auslauf mit nicht kreisförmigem Überlauf“ Rohrtrenner (siehe Bild 3):",
  L395: "Wo der Rückflussverhinderer die Speichereinrichtung direkt mit Wasser versorgt und die Gefahr besteht, dass Gerüche in das Gebäude gelangen können, muss ein Geruchsverschluss vorgesehen werden.",
  L401: "Bei Anlagen, bei denen gesammeltes Grauwasser nicht durch Schwerkraft verteilt wird, müssen für eine kontinuierliche Verfügbarkeit des Grauwassers eine oder mehrere Pumpen vorgesehen werden.",
  L405: "Durchfluss und benötigter Förderdruck der Pumpe müssen nach EN 12056-4 und der Normenreihe EN 12050 bestimmt werden.",
  L419: "Mehrpumpenanlagen müssen EN 12056-4 oder der Normenreihe EN12050 entsprechen und erforderlichenfalls mit einer Reservepumpe ausgestattet sein.",
  L461: "Pumpen müssen mit einer Pumpensteuerung zur automatischen Kontrolle des Pumpenbetriebs, einschließlich einer Handnotbetätigung, ausgestattet sein. Die Steuerung muss manuelle Bedienung ermöglichen.",
  L511: "Für die Gesamtauslegung des Systems muss der niedrigste berechnete Wert für den Ertrag oder den Bedarf verwendet werden. Es wird empfohlen, die Speicherung von behandeltem Grauwasser zu minimieren. Da es im Allgemeinen eine unbegrenzte Nachlieferung von nicht behandeltem Grauwasser gibt, wird normalerweise eine Speicherung in Höhe von bis zu 50 \\% des Tagesbedarfs ausreichend sein.",
  L518: "a) ein vereinfachtes Verfahren, bei dem das im Bad anfallende Grauwasser zur Toilettenspülung und/oder zum Reinigen der Wäsche innerhalb einer Wohneinheit verwendet wird (siehe 6.2.3);",
  L519: "b) ein differenziertes Verfahren, bei dem das im Bad anfallende Grauwasser z. B. zur Toilettenspülung, zum Reinigen der Wäsche und zur Gartenbewässerung in Wohn-, Gewerbe-, Industrie- und öffentlichen Gebäuden verwendet wird (siehe 6.2.4).",
  L521: "Wenn ein Grundstück als Standort für ein Hotel, Wohnheim oder ähnliche Unterbringungsarten vorgesehen ist, oder wenn mehr als ein Grundstück durch ein Grauwassersystem versorgt werden muss, sollte das differenzierte Verfahren angewendet werden.",
  L525: "Es wird empfohlen, den Bedarf als Grundlage für die Spezifikation des Grauwassersystems zu betrachten, um zu vermeiden, dass Wasser gesammelt und behandelt wird, das nicht verwendet werden kann. Mögliche Nicht-Trinkwasser-Anwendungen sollten in nachfolgender Reihenfolge berücksichtigt werden:",
  L531_535: "Zur Reduktion des Behandlungsaufwands sollte die Sammlung wie folgt präferiert werden:\ne) Duschen und Badewannen;\nf) Handwaschbecken;\ng) Waschmaschinen;\nh) Küchenspülen und/oder Geschirrspüler.",
  L537: "Wenn Waschmaschinen Wasser sowohl aus dem Grauwassersystem entnehmen als auch in dieses einspeisen, muss ein geeigneter Behandlungsschritt im System vorgesehen werden und nur geeignetes Grauwasser verwendet werden.",
  L543: "Das vereinfachte Verfahren beruht auf der Abwägung folgender Annahmen und ist nur für Wohngebäude anwendbar:",
  L547: "Für die Berechnung der täglichen Behandlungskapazität des Grauwassersystems muss der durchschnittliche tägliche Ertrag und der Bedarf je Person berücksichtigt werden. Beispiele für typische durchschnittliche tägliche Grauwassererträge und Bedarfsmengen sind in Anhang A (Tabelle A.1) enthalten.",
  L557: "Die folgende Gleichung (1) muss zur Bestimmung des Grauwasserertrags, $Y_{\\mathrm{G}}$, in Liter je Tag (l/d), angewendet werden:",
  L560_561: "Y_{\\mathrm{G}}=n \\cdot\\left(Q_{\\mathrm{S}} \\cdot t_{\\mathrm{S}} \\cdot u_{\\mathrm{S}}+V_{\\mathrm{BT}} \\cdot u_{\\mathrm{BT}}+Q_{\\mathrm{HWB}} \\cdot t_{\\mathrm{HWB}} \\cdot u_{\\mathrm{HWB}}+V_{\\mathrm{WM}} \\cdot u_{\\mathrm{WM}}+Q_{\\mathrm{KS}} \\cdot t_{\\mathrm{KS}} \\cdot u_{\\mathrm{KS}}+V_{\\mathrm{DW}}\\right.  \\tag{1}\\\\\n\\left.\\cdot u_{\\mathrm{DW}}\\right)",
  L567: "$Y_{\\mathrm{G}} \\quad$ der Grauwasserertrag in Liter je Tag (l/d);",
  L568: "n die Anzahl von Personen (p);",
  L569_575: "$Q_{\\mathrm{s}} \\quad$ der Grauwasserabfluss der Dusche in Liter je Minute (l/min);\n$t_{\\mathrm{s}} \\quad$ die Dauer je Duschvorgang in Minuten (min);\n```\n\n\n\\begin{tabular}{|l|l|}\n\\hline $u_{\\mathrm{s}}$ & die Häufigkeit des Duschvorgangs je Person und je Tag (1/(p ⋅ d)); \\\\",
  L576_577: "\\hline $V_{\\text {BT }}$ & das Wasservolumen je Nutzung der Badewanne in Liter (l) (keine Vollfüllung); \\\\\n\\hline $u_{\\mathrm{BT}}$ & die Häufigkeit der Nutzung der Badewanne je Person und je Tag (1/(p ⋅ d)); \\\\",
  L578_580: "\\hline $Q_{\\text {HWB }}$ & der Grauwasserabfluss des Waschbeckens in Liter je Minute (l/min); \\\\\n\\hline $t_{\\text {HWB }}$ & die Dauer je Nutzung des Waschbeckens in Minuten (min); \\\\\n\\hline $u_{\\text {HWB }}$ & die Häufigkeit der Nutzung des Waschbeckens je Person und je Tag (1/(p ⋅ d)); \\\\",
  L581_582: "\\hline $V_{\\text {WM }}$ & der Abfluss der Waschmaschine je Waschvorgang in Liter (l); \\\\\n\\hline $u_{\\text {WM }}$ & die Anzahl der Waschvorgänge der Waschmaschine je Person und je Tag (1/(p ⋅ d)); \\\\",
  L583_585: "\\hline $Q_{\\mathrm{KS}}$ & der Abfluss am Ablauf (Warm- und Kaltwasser) der Küchenspüle in Liter je Minute (l/min); \\\\\n\\hline $t_{\\mathrm{KS}}$ & die Dauer je Nutzung der Küchenspüle in Minuten (min); \\\\\n\\hline $u_{\\mathrm{KS}}$ & die Häufigkeit der Nutzung des Ablaufs der Küchenspüle je Person und je Tag (1/(p ⋅ d)); \\\\",
  L586_587: "\\hline $V_{\\text {DW }}$ & der Abfluss des Geschirrspülers je Spülvorgang in Liter (l); \\\\\n\\hline $u_{\\text {DW }}$ & die Häufigkeit der Spülvorgänge des Geschirrspülers je Person und je Tag (1/(p ⋅ d)). \\\\",
  L595: "Die folgende Gleichung (2) muss für die Bestimmung des Grauwasserbedarfs, $D_{\\mathrm{G}}$, in Liter je Tag (l/d) angewendet werden, wenn das behandelte Grauwasser z. B. für die Toiletten- und Urinalspülung, zum Reinigen von Wäsche, zur Gartenbewässerung, für Reinigungsarbeiten usw. genutzt wird.",
  L597: "ANMERKUNG Wenn mehr als ein WC-Typ angeschlossen ist, kann der Bedarf für jedes einzelne WC berechnet werden, oder es kann angenommen werden, dass alle WCs gleich benutzt werden. In dem Fall kann ein Standardbedarf für jeden Typ berechnet und für diese Ergebnisse der Durchschnittswert ermittelt werden.",
  L600: "D_{\\mathrm{G}}=n \\cdot\\left(V_{\\mathrm{T}} \\cdot u_{\\mathrm{T}}+V_{\\mathrm{U}} \\cdot u_{\\mathrm{U}}+V_{\\mathrm{WM}} \\cdot u_{\\mathrm{WM}}\\right)+V_{\\mathrm{misc}} \\tag{2}",
  L607_611: "\\hline $D_{\\text {G }}$ & der Grauwasserbedarf in Liter je Tag (l/d); \\\\\n\\hline n & die Anzahl von Personen (p); \\\\\n\\hline $V_{\\mathrm{T}}$ & das für eine WC-Spülung benötigte Wasservolumen in Liter (l); \\\\\n\\hline $u_{\\mathrm{T}}$ & die Häufigkeit der WC-Nutzung je Person und je Tag (1/(p • d)); \\\\\n\\hline $V_{\\mathrm{U}}$ & das für eine Urinal-Spülung benötigte Wasservolumen in Liter (l); \\\\",
  L616_619: "\\hline $u_{\\mathrm{U}}$ & die Häufigkeit der Urinal-Nutzung je Person und je Tag (1/(p ⋅ d)); \\\\\n\\hline $V_{\\text {WM }}$ & das für einen Waschvorgang der Waschmaschine erforderliche Wasservolumen in Liter (l); \\\\\n\\hline $u_{\\text {WM }}$ & die Häufigkeit der Waschvorgänge der Waschmaschine je Person und je Tag (1/(p • d)); \\\\\n\\hline $V_{\\text {misc }}$ & ist das für andere Zwecke erforderliche Wasservolumen (z. B. Gartenbewässerung, Reinigung) in Liter je Tag (l/d). \\\\",
  L619: "\\hline $V_{\\text {misc }}$ & ist das für andere Zwecke erforderliche Wasservolumen (z. B. Gartenbewässerung, Reinigung) in Liter je Tag (l/d). \\\\",
  L627: "Die Qualität des behandelten Grauwassers ermöglicht andere Nutzungen, z. B. Gartenbewässerung, Reinigung, Kühlen usw. Der Bedarf hängt von einer Reihe von Faktoren ab und ist abzuschätzen.",
  L633: "Die Position der unterirdischen Speichereinrichtung muss einen Mindestabstand von 3 m von Bäumen oder Pflanzen einhalten, die ein größeres Wurzelsystem ausbilden. Eine Rasenfläche ist erlaubt. Pflanzen mit weniger als 3 m Abstand von der Speichereinrichtung können den Einbau von Wurzelschutz erfordern.",
  L681: "Grauwassernutzungsanlagen müssen unbedingt in der Art geplant und installiert werden, dass das NichtTrinkwasser für den vorgesehenen Gebrauch taugt und keine Gefährdung der Gesundheit darstellt. Die Beispiele in Anhang D sind Mindestanforderungen. Strengere nationale oder im Rahmen der Planung festgelegte Vorgaben müssen vor den Werten in Anhang D Vorrang haben.",
  L683: "Eine Risikobewertung muss durchgeführt werden, um festzustellen, ob die Anlage sicher und zweckmäßig ist. Dies sollte während der Planungsphase erfolgen.",
  L695: "Weitere Untersuchungen und die zu untersuchenden Parameter hängen von der Nutzung des Grauwassers ab .",
  L697: "Die Probenahmestelle muss im Verteilungssystem für das behandelte Grauwasser eingebaut sein. Alle Proben müssen als Stichproben während der laufenden Behandlung im Grauwassersystem entnommen werden.",
  L699: "Die Beispiele im Anhang D können zur Orientierung dienen, wenn keine nationalen Anforderungen vorliegen.",
  L701: "Die Wasserqualität kann, wie in den Beispielen in Tabelle D. 1 gezeigt, für Parameter mit Gesundheitsrisiken gemessen werden, und nach Tabelle D. 2 für Parameter bezüglich des Systembetriebs, die zusammen einen Anhaltspunkt für die Wasserqualität liefern, die mit einem gut geplanten und gewarteten System für die Mehrheit der Betriebsbedingungen erreicht werden kann.",
  L703: "Die Ergebnisse aus der bakteriologischen Überwachung können mit Hilfe von Tabelle D. 3 beurteilt werden. Die Ergebnisse der allgemeinen Systemüberwachung sollten mit Hilfe von Tabelle D. 4 beurteilt werden.",
  L724: "- dem Datum der durchgeführten Überprüfungen und detaillierte Auflistung der Wartungsarbeiten.",
  L737: "\\caption{Tabelle A. 1 - Typische Durchschnittswerte für den täglichen Grauwasserertrag und -bedarf}",
  L739_745: "\\hline \\multirow[t]{2}{*}{Nutzer} & \\multirow[t]{2}{*}{Ertrag ${ }^{\\text {a }}$} & \\multicolumn{3}{|c|}{Bedarf} \\\\\n\\hline & & WC & Wäsche waschen ${ }^{\\text {b }}$ & Andere Nicht-TrinkwasserNutzungen ${ }^{\\text {c }}$ \\\\\n\\hline 1 Person & 60 & 35 & 15 & 10 \\\\\n\\hline \\multicolumn{5}{|c|}{\\begin{tabular}{l}\na Ertrag von Dusche, Badewanne und/oder Waschbecken. \\\\\nb Diese Zahlen beruhen auf einem mittleren täglichen Bedarf. Es ist anzumerken, dass Waschmaschinen üblicherweise 30 l bis 60 l je Zyklus benötigen. \\\\\nc Zum Beispiel Gartenbewässerung.",
  L741: "\\hline 1 Person & 60 & 35 & 15 & 10 \\\\",
  L743: "a Ertrag von Dusche, Badewanne und/oder Waschbecken. \\\\",
  L744: "b Diese Zahlen beruhen auf einem mittleren täglichen Bedarf. Es ist anzumerken, dass Waschmaschinen üblicherweise 30 l bis 60 l je Zyklus benötigen. \\\\",
  L745: "c Zum Beispiel Gartenbewässerung.",
  L753: "Die folgende Tabelle A. 2 und Tabelle A. 3 enthalten typische Größenordnungen des Wasserverbrauchs zur Bestimmung des Grauwasserertrags und -bedarfs.",
  L755: "ANMERKUNG Energieeffizienzkennzeichen der Europäischen Union für Waschmaschinen zum Verkauf oder zur Vermietung müssen Effizienzdaten bezogen auf Baumwollwäsche bei $60^{\\circ} \\mathrm{C}$ angeben. Für Waschmaschinen sind auch Informationen zum Wasserverbrauch (W) und Beladung (l) enthalten. Sind die Leistungsdaten der Waschmaschine nicht bekannt, kann ein Wasserbedarf von etwa $8 \\mathrm{l} / \\mathrm{kg}$ Wäsche angenommen werden.",
  L759: "\\caption{Tabelle A. 2 - Typische Größenordnungen von Wassernutzungen}",
  L762: "\\hline Abfluss von Duschen ( $Q_{\\mathrm{S}}$ ) & (l/min) & 5 bis 15 \\\\",
  L763: "\\hline Abfluss von Wasser aus der Badewanne je Nutzung (keine Vollfüllung) ( $V_{\\mathrm{BT}}$ ) & (l) & 70 bis 200 \\\\",
  L764: "\\hline Abfluss von Wasser durch Waschmaschinen je Waschvorgang ( $V_{\\text {WM }}$ ) & (l/Zyklus) & 30 bis 60 \\\\",
  L765: "\\hline Abfluss (Warm- und Kaltwasser) von Küchenspülen ( $Q_{\\mathrm{KS}}$ ) & (l/min) & 5 bis 15 \\\\",
  L766: "\\hline Abfluss von Wasser durch Geschirrspüler je Spülvorgang ( $V_{\\text {DW }}$ ) & (l) & 10 bis 20 \\\\",
  L773: "\\caption{Tabelle A. 3 - Typische Größenordnungen für den Wasserbedarf}",
  L776: "\\hline Wasservolumen zur WC-Spülung ( $V_{\\mathrm{T}}$ ) & (l/Spülung) & 3 bis 8 \\\\",
  L777: "\\hline Wasservolumen zur Urinal-Druckspülung je Spülvorgang ( $V_{\\mathrm{U}}$ ) & (l/Spülung) & 1 bis 2 \\\\",
  L778: "\\hline Wasservolumen für die Waschmaschine je Waschvorgang ( $V_{\\text {WM }}$ ) & (l/Waschvorgang) & 30 bis 60 \\\\",
  L787: "Grauwassernutzungsanlagen unterscheiden sich erheblich nach Komplexität und Größe und können nach der Art der Behandlung wie folgt klassifiziert werden:",
  L788_794: "a) Anlagen für die direkte Nutzung (ohne Behandlung)\n\nDiese Anlagen verwenden einfache Geräte zur Sammlung von Grauwasser aus Einrichtungen und fördern es direkt zum Ort der Nutzung, ohne Behandlung und geringer oder keiner Speicherungsdauer, z. B. ein Grauwasser-Umstellventil.\n\nEs ist möglich, Grauwasser ohne Behandlung zu nutzen, vorausgesetzt, dass eine längere Speicherung nicht erforderlich ist. Da die Qualität von unbehandeltem Grauwasser sich schnell verschlechtert, muss das gesammelte Grauwasser so schnell wie möglich genutzt werden.\n\nIst die Behandlung nicht Teil der Grauwassernutzugsanlage, sind Nutzungen auf unterirdische Bewässerung und Anwendungen ohne Versprühen beschränkt.",
  L794: "Ist die Behandlung nicht Teil der Grauwassernutzugsanlage, sind Nutzungen auf unterirdische Bewässerung und Anwendungen ohne Versprühen beschränkt.",
  L795_797: "b) Anlagen mit kurzzeitiger Rückhaltung\n\nDiese Anlagen verwenden eine sehr einfache Behandlungstechnik, wie Abschöpfen von Fremdmaterial an der Oberfläche des gesammelten Grauwassers und Absetzen von Partikeln am Tankboden. Sie zielen darauf ab, Geruchsbildungen und Verschlechterungen der Wasserqualität zu vermeiden, indem sichergestellt wird, dass das behandelte Grauwasser nicht für eine längere Dauer gespeichert wird.",
  L798_800: "c) einfache physikalische/chemische Anlagen\n\nDiese Anlagen verwenden Filter zur Entfernung von Fremdmaterial aus dem gesammelten Grauwasser vor der Speicherung, wobei generell chemische Desinfektionsmittel eingesetzt werden, um das Bakterienwachstum während der Speicherung zu stoppen.",
  L801_803: "d) biologische Anlagen\n\nDiese Anlagen verwenden aerobe oder anaerobe Bakterien zur Beseitigung von unerwünschtem organischem Material im gesammelten Grauwasser. Im Falle aerober Behandlung können technische Einrichtungen oder Wasserpflanzen zur Belüftung des Wassers verwendet werden.",
  L804_806: "e) biologisch-mechanische Anlagen\n\nDiese Anlagen verbinden biologische und mechanische Behandlung, z. B. Entfernung organischer Substanz durch mikrobielle Kulturen und Feststoffe durch Abtrennung. Durch Belüftung wird die bakterielle Aktivität unterstützt.",
  L848: "\\caption{Tabelle D. 1 — Beispiele für Richtwerte zur bakteriologischen Überwachung nach der Normenreihe BS 8525}",
  L850_858: "\\hline \\multirow{2}{*}{Parameter KBE/ 100 ml} & SprühAnwendung & \\multicolumn{3}{|c|}{Anwendung ohne Versprühen} & \\multicolumn{2}{|c|}{Prüfverfahren} & \\multirow[t]{2}{*}{System-Typ} \\\\\n\\hline & Hochdruckreinigung, Gartensprenger und Autowäsche & WC-Spülung & Garten bewässerung & Reinigung, d. h. Waschmaschine & Spray-Anwendung & Anwendung ohne Versprühen & \\\\\n\\hline Escherichia coli & Nicht nachweisbar & 250 & 250 & Nicht nachweisbar & EN ISO 9308-1 & EN ISO 9308-3 & Einzelstandorte und kommunale Wohnbereiche \\\\\n\\hline Intestinale Enterokokken & Nicht nachweisbar & 100 & 100 & Nicht nachweisbar & EN ISO 7899-2 oder EN ISO 7899-1 & EN ISO 7899-1 & Einzelstandorte und kommunale Wohnbereiche \\\\\n\\hline Legionella pneumophila & 10 & N/A ${ }^{\\text {b }}$ & N/A & N/A & EN ISO 11731 & N/A & Falls Analyse auf Grund von Gefährdungsabschätzung erforderlich ist (siehe 5.10) \\\\\n\\hline Gesamt Coliforme ${ }^{\\mathrm{a}}$ & 10 & 1000 & 1000 & 10 & EN ISO 9308-1 & EN ISO 9308-3 & Einzelstandorte und kommunale Wohnbereiche \\\\\n\\hline \\multicolumn{8}{|c|}{\\begin{tabular}{l}\na „Gesamt Coliforme“ ist ein Indikator-Parameter zur Feststellung der Einsatzfähigkeit der Anlage. Die für behandeltes Grauwasser angegebenen bakteriologischen Richtwerte geben die Notwendigkeit zur Prüfung der Qualität des behandelten Wassers für Versorgung und Nutzung an. \\\\\nb $\\mathrm{N} / \\mathrm{A}=$ Nicht zutreffend (en $=$ not available).",
  L852: "\\hline Escherichia coli & Nicht nachweisbar & 250 & 250 & Nicht nachweisbar & EN ISO 9308-1 & EN ISO 9308-3 & Einzelstandorte und kommunale Wohnbereiche \\\\",
  L853: "\\hline Intestinale Enterokokken & Nicht nachweisbar & 100 & 100 & Nicht nachweisbar & EN ISO 7899-2 oder EN ISO 7899-1 & EN ISO 7899-1 & Einzelstandorte und kommunale Wohnbereiche \\\\",
  L854: "\\hline Legionella pneumophila & 10 & N/A ${ }^{\\text {b }}$ & N/A & N/A & EN ISO 11731 & N/A & Falls Analyse auf Grund von Gefährdungsabschätzung erforderlich ist (siehe 5.10) \\\\",
  L855: "\\hline Gesamt Coliforme ${ }^{\\mathrm{a}}$ & 10 & 1000 & 1000 & 10 & EN ISO 9308-1 & EN ISO 9308-3 & Einzelstandorte und kommunale Wohnbereiche \\\\",
  L857: "a „Gesamt Coliforme“ ist ein Indikator-Parameter zur Feststellung der Einsatzfähigkeit der Anlage. Die für behandeltes Grauwasser angegebenen bakteriologischen Richtwerte geben die Notwendigkeit zur Prüfung der Qualität des behandelten Wassers für Versorgung und Nutzung an. \\\\",
  L858: "b $\\mathrm{N} / \\mathrm{A}=$ Nicht zutreffend (en $=$ not available).",
  L866: "\\caption{Tabelle D. 2 - Beispiele für Werte zur allgemeinen Systemkontrolle nach der Normenreihe BS 8525}",
  L868_874: "\\hline \\multirow[t]{2}{*}{Parameter ${ }^{\\text {a }}$} & Sprühanwendung & \\multicolumn{3}{|l|}{Anwendung ohne Versprühen} & \\multirow[t]{2}{*}{Prüfung} & \\multirow[t]{2}{*}{System-Typ} \\\\\n\\hline & Hochdruckreinigung, Gartensprenger und Autowäsche & WCSpülung & Garten-bewässerung & Reinigung, d. h. Wasch-maschine & & \\\\\n\\hline Trübung (NTU) & < 10 & < 10 & N/A & < 10 & EN ISO 7027-1 & alle Systeme \\\\\n\\hline pH & 5 bis 9,5 & 5 bis 9,5 & 5 bis 9,5 & 5 bis 9,5 & EN ISO 10523 & alle Systeme \\\\\n\\hline Rest-Chlor (mg/l) & < 2,0 & < 2,0 & < 0,5 & < 2,0 & EN ISO 7393-2 & alle Systeme, wenn verwendet \\\\\n\\hline Rest-Brom (mg/l) & 0,0 & < 5,0 & 0,0 & < 5,0 & EN ISO 10304-1 & alle Systeme, wenn verwendet \\\\\n\\hline \\multicolumn{7}{|c|}{a Zusätzlich zu diesen Parametern sollten alle Systeme auf Schwebstoffe und Färbung geprüft werden. Das behandelte Grauwasser sollte visuell klar, frei von aufschwimmenden Rückständen und für alle Verwendungszwecke farblich unbedenklich sein. Eine Färbung ist besonders für die Verwendung in der Waschmaschine relevant.} \\\\",
  L870: "\\hline Trübung (NTU) & < 10 & < 10 & N/A & < 10 & EN ISO 7027-1 & alle Systeme \\\\",
  L871: "\\hline pH & 5 bis 9,5 & 5 bis 9,5 & 5 bis 9,5 & 5 bis 9,5 & EN ISO 10523 & alle Systeme \\\\",
  L872: "\\hline Rest-Chlor (mg/l) & < 2,0 & < 2,0 & < 0,5 & < 2,0 & EN ISO 7393-2 & alle Systeme, wenn verwendet \\\\",
  L873: "\\hline Rest-Brom (mg/l) & 0,0 & < 5,0 & 0,0 & < 5,0 & EN ISO 10304-1 & alle Systeme, wenn verwendet \\\\",
  L874: "\\hline \\multicolumn{7}{|c|}{a Zusätzlich zu diesen Parametern sollten alle Systeme auf Schwebstoffe und Färbung geprüft werden. Das behandelte Grauwasser sollte visuell klar, frei von aufschwimmenden Rückständen und für alle Verwendungszwecke farblich unbedenklich sein. Eine Färbung ist besonders für die Verwendung in der Waschmaschine relevant.} \\\\",
  L881: "\\caption{Tabelle D. 3 — Beispiel für die Auswertung von Ergebnissen aus der bakteriologischen Überwachung nach der Normenreihe BS 8525}",
  L884: "\\hline < G & grün & System unter Kontrolle \\\\",
  L885: "\\hline G bis 10 G & gelb & erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs \\\\",
  L886: "\\hline $>10 \\mathrm{G}^{\\mathrm{b}}$ & rot & Nutzung des Grauwassers ausschließen, bis Problem gelöst ist \\\\",
  L888: "a $\\mathrm{G}=$ Richtwert siehe Tabelle D.1. \\\\",
  L889: "b Bei Abwesenheit von E. coli, intestinalen Enterokokken und Legionella, falls zutreffend, besteht keine Notwendigkeit, die Anlage außer Betrieb zu nehmen, wenn die gemessenen Werte von Coliformen den Richtwert um das 10fache überschreiten und eine erneute Probenahme zur Bestätigung der Ergebnisse durchgeführt wird.",
  L897: "\\caption{Tabelle D. 4 - Beispiel für die Auswertung von Ergebnissen der Systemüberwachung nach der Normenreihe BS 8525}",
  L900: "\\hline < G & grün & System unter Kontrolle \\\\",
  L901: "\\hline > G & gelb & erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs \\\\",
  L902: "\\hline \\multicolumn{3}{|c|}{Bei der Überwachung des pH-Werts wird das System als unter Kontrolle angenommen (Status „grün“), wenn das Niveau innerhalb des in Tabelle D. 3 empfohlenen Bereichs liegt. Liegen die Werte außerhalb des Bereichs, erhält das System den Status „gelb“ und eine erneute Probenahme ist erforderlich. Treten Färbung oder abgesetzte Stoffe in störender Größe auf, ist es unerlässlich, die Funktion des Systems zu prüfen, um das Problem zu lösen.} \\\\",
  L903: "\\hline \\multicolumn{3}{|l|}{a $\\mathrm{G}=$ Richtwert siehe Tabelle D.2.} \\\\",
} as const;

/** Build-time SR-1 guard: every seeded cell text must be printed inside the row's own quote span. */
function inSpan(quote: string, cell: string | null, where: string): void {
  if (cell !== null && !quote.includes(cell)) throw new Error(`${where}: cell "${cell}" is not inside its verbatim_quote`);
}

// ---------------------------------------------------------------------------
// Tab. A.1 — Typische Durchschnittswerte für den täglichen Grauwasserertrag und -bedarf (L737–L745). ONE printed
// body row "1 Person & 60 & 35 & 15 & 10" (L741) under the headers Ertrag a / Bedarf: WC / Wäsche waschen b / Andere
// Nicht-TrinkwasserNutzungen c (L739–L740) — transposed into one row per Posten; the footnotes a / b / c (L743–L745)
// ride in `fussnote`. Policy `anhaltswert`: L547 "Beispiele für typische durchschnittliche tägliche Grauwassererträge
// und Bedarfsmengen" — L737 "Typische Durchschnittswerte".
// ---------------------------------------------------------------------------
export const TABA1_POSTEN = [
  { value: 'ertrag', label_de: 'Ertrag je Person (Dusche, Badewanne und/oder Waschbecken)', l_pd: 60, printed: '60', spalte: 'Ertrag', fussnote: 'a Ertrag von Dusche, Badewanne und/oder Waschbecken.' },
  { value: 'bedarf_wc', label_de: 'Bedarf WC je Person', l_pd: 35, printed: '35', spalte: 'WC', fussnote: null },
  { value: 'bedarf_waesche', label_de: 'Bedarf Wäsche waschen je Person', l_pd: 15, printed: '15', spalte: 'Wäsche waschen', fussnote: 'b Diese Zahlen beruhen auf einem mittleren täglichen Bedarf. Es ist anzumerken, dass Waschmaschinen üblicherweise 30 l bis 60 l je Zyklus benötigen.' },
  { value: 'bedarf_andere', label_de: 'Bedarf andere Nicht-Trinkwasser-Nutzungen je Person (z. B. Gartenbewässerung)', l_pd: 10, printed: '10', spalte: 'Andere Nicht-TrinkwasserNutzungen', fussnote: 'c Zum Beispiel Gartenbewässerung.' },
] as const;
export function tabA1AsTable(): RegulationTable {
  const rows: RegulationRow[] = TABA1_POSTEN.map((r, i) => {
    inSpan(Q.L741, `& ${r.printed} `, `TABA1 ${r.value}`);
    inSpan(Q.L739_745, r.spalte, `TABA1 ${r.value} spalte`);
    inSpan(Q.L739_745, r.fussnote, `TABA1 ${r.value} fussnote`);
    return { row_key: r.value, keys: { posten: r.value }, group_label: null, label_de: `${r.label_de}: ${r.printed} l/(p·d)`, order_index: i, values: { l_pd: r.l_pd, spalte: r.spalte, fussnote: r.fussnote }, verbatim_quote: Q.L739_745 };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABA1', title_de: 'Typische Durchschnittswerte für den täglichen Grauwasserertrag und -bedarf je Person (Tabelle A.1)', clause_reference: 'Anhang A, Tab. A.1; §6.2.3', page_ref: null,
    key_columns: ['posten'], value_columns: [{ name: 'l_pd', type: 'number', unit: 'l/(p·d)' }, { name: 'spalte', type: 'string' }, { name: 'fussnote', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: `${Q.L547} — ${Q.L737}`,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. A.2 — Typische Größenordnungen von Wassernutzungen (L759–L766): five sources, each printed as
// "Wassernutzung & Einheit & Größenordnung". Keyed on the prod `grauwasser_herkunft` tokens (Waschbecken / Q_HWB has
// no printed row). Policy `anhaltswert` (L753 "typische Größenordnungen"). SR-2: `min` / `max` are hints, never limits.
// ---------------------------------------------------------------------------
type RangeRow = { value: string; label_de: string; symbol: string; unit: string; min: number; max: number; groessenordnung: string; line: keyof typeof Q };
export const TABA2_QUELLEN: ReadonlyArray<RangeRow> = [
  { value: 'dusche', label_de: 'Abfluss von Duschen (Q_S)', symbol: 'Q_S', unit: 'l/min', min: 5, max: 15, groessenordnung: '5 bis 15', line: 'L762' },
  { value: 'badewanne', label_de: 'Abfluss von Wasser aus der Badewanne je Nutzung, keine Vollfüllung (V_BT)', symbol: 'V_BT', unit: 'l', min: 70, max: 200, groessenordnung: '70 bis 200', line: 'L763' },
  { value: 'waschmaschine', label_de: 'Abfluss von Wasser durch Waschmaschinen je Waschvorgang (V_WM)', symbol: 'V_WM', unit: 'l/Zyklus', min: 30, max: 60, groessenordnung: '30 bis 60', line: 'L764' },
  { value: 'kuechenspuele', label_de: 'Abfluss (Warm- und Kaltwasser) von Küchenspülen (Q_KS)', symbol: 'Q_KS', unit: 'l/min', min: 5, max: 15, groessenordnung: '5 bis 15', line: 'L765' },
  { value: 'geschirrspueler', label_de: 'Abfluss von Wasser durch Geschirrspüler je Spülvorgang (V_DW)', symbol: 'V_DW', unit: 'l', min: 10, max: 20, groessenordnung: '10 bis 20', line: 'L766' },
];
function rangeTable(code: string, keyColumn: string, title: string, clause: string, rows: ReadonlyArray<RangeRow>, overrideQuote: string): RegulationTable {
  const out: RegulationRow[] = rows.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, `(${r.unit})`, `${code} ${r.value} unit`);
    inSpan(quote, r.groessenordnung, `${code} ${r.value} groessenordnung`);
    return { row_key: r.value, keys: { [keyColumn]: r.value }, group_label: null, label_de: `${r.label_de}: ${r.groessenordnung} ${r.unit}`, order_index: i, values: { symbol: r.symbol, unit: r.unit, min: r.min, max: r.max, groessenordnung: r.groessenordnung }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: code, title_de: title, clause_reference: clause, page_ref: null,
    key_columns: [keyColumn], value_columns: [{ name: 'symbol', type: 'string' }, { name: 'unit', type: 'string' }, { name: 'min', type: 'number' }, { name: 'max', type: 'number' }, { name: 'groessenordnung', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: overrideQuote, verification_status: 'md_verified', rows: out };
}
export function tabA2AsTable(): RegulationTable {
  return rangeTable('TABA2', 'quelle', 'Typische Größenordnungen von Wassernutzungen — Grauwasserertrag (Tabelle A.2, Hinweiswerte)', 'Anhang A, Tab. A.2; §6.2.4.2', TABA2_QUELLEN, `${Q.L753} — ${Q.L759}`);
}

// Tab. A.3 — Typische Größenordnungen für den Wasserbedarf (L773–L778): WC-Spülung / Urinal-Druckspülung / Waschmaschine.
export const TABA3_BEDARF: ReadonlyArray<RangeRow> = [
  { value: 'wc', label_de: 'Wasservolumen zur WC-Spülung (V_T)', symbol: 'V_T', unit: 'l/Spülung', min: 3, max: 8, groessenordnung: '3 bis 8', line: 'L776' },
  { value: 'urinal', label_de: 'Wasservolumen zur Urinal-Druckspülung je Spülvorgang (V_U)', symbol: 'V_U', unit: 'l/Spülung', min: 1, max: 2, groessenordnung: '1 bis 2', line: 'L777' },
  { value: 'waschmaschine', label_de: 'Wasservolumen für die Waschmaschine je Waschvorgang (V_WM)', symbol: 'V_WM', unit: 'l/Waschvorgang', min: 30, max: 60, groessenordnung: '30 bis 60', line: 'L778' },
];
export function tabA3AsTable(): RegulationTable {
  return rangeTable('TABA3', 'bedarf', 'Typische Größenordnungen für den Wasserbedarf — Grauwasserbedarf (Tabelle A.3, Hinweiswerte)', 'Anhang A, Tab. A.3; §6.2.4.3', TABA3_BEDARF, `${Q.L753} — ${Q.L773}`);
}

// ---------------------------------------------------------------------------
// Gl. (1) legend (L565–L589): the six greywater sources and the FORM of their per-person term — Q·t·u for the
// flow-based sources (Dusche, Waschbecken, Küchenspüle: "in Liter je Minute (l/min)" + "die Dauer je … in Minuten (min)")
// and V·u for the volume-based ones (Badewanne, Waschmaschine, Geschirrspüler: "in Liter (l)"). Keyed on the prod
// `grauwasser_herkunft` tokens. Policy `locked` (L557 "Die folgende Gleichung (1) muss … angewendet werden").
// ---------------------------------------------------------------------------
type LegendRow = { value: string; label_de: string; groesse: 'Q' | 'V'; unit_qv: 'l/min' | 'l'; mit_dauer: boolean; legende_qv: string; legende_t: string | null; legende_u: string; line: keyof typeof Q };
export const GL1_QUELLEN: ReadonlyArray<LegendRow> = [
  { value: 'dusche', label_de: 'Dusche (Q_S · t_S · u_S)', groesse: 'Q', unit_qv: 'l/min', mit_dauer: true, legende_qv: 'der Grauwasserabfluss der Dusche in Liter je Minute (l/min)', legende_t: 'die Dauer je Duschvorgang in Minuten (min)', legende_u: 'die Häufigkeit des Duschvorgangs je Person und je Tag (1/(p ⋅ d))', line: 'L569_575' },
  { value: 'badewanne', label_de: 'Badewanne (V_BT · u_BT)', groesse: 'V', unit_qv: 'l', mit_dauer: false, legende_qv: 'das Wasservolumen je Nutzung der Badewanne in Liter (l) (keine Vollfüllung)', legende_t: null, legende_u: 'die Häufigkeit der Nutzung der Badewanne je Person und je Tag (1/(p ⋅ d))', line: 'L576_577' },
  { value: 'waschbecken', label_de: 'Waschbecken (Q_HWB · t_HWB · u_HWB)', groesse: 'Q', unit_qv: 'l/min', mit_dauer: true, legende_qv: 'der Grauwasserabfluss des Waschbeckens in Liter je Minute (l/min)', legende_t: 'die Dauer je Nutzung des Waschbeckens in Minuten (min)', legende_u: 'die Häufigkeit der Nutzung des Waschbeckens je Person und je Tag (1/(p ⋅ d))', line: 'L578_580' },
  { value: 'waschmaschine', label_de: 'Waschmaschine (V_WM · u_WM)', groesse: 'V', unit_qv: 'l', mit_dauer: false, legende_qv: 'der Abfluss der Waschmaschine je Waschvorgang in Liter (l)', legende_t: null, legende_u: 'die Anzahl der Waschvorgänge der Waschmaschine je Person und je Tag (1/(p ⋅ d))', line: 'L581_582' },
  { value: 'kuechenspuele', label_de: 'Küchenspüle (Q_KS · t_KS · u_KS)', groesse: 'Q', unit_qv: 'l/min', mit_dauer: true, legende_qv: 'der Abfluss am Ablauf (Warm- und Kaltwasser) der Küchenspüle in Liter je Minute (l/min)', legende_t: 'die Dauer je Nutzung der Küchenspüle in Minuten (min)', legende_u: 'die Häufigkeit der Nutzung des Ablaufs der Küchenspüle je Person und je Tag (1/(p ⋅ d))', line: 'L583_585' },
  { value: 'geschirrspueler', label_de: 'Geschirrspüler (V_DW · u_DW)', groesse: 'V', unit_qv: 'l', mit_dauer: false, legende_qv: 'der Abfluss des Geschirrspülers je Spülvorgang in Liter (l)', legende_t: null, legende_u: 'die Häufigkeit der Spülvorgänge des Geschirrspülers je Person und je Tag (1/(p ⋅ d))', line: 'L586_587' },
];
export function gl1LegendeAsTable(): RegulationTable {
  const rows: RegulationRow[] = GL1_QUELLEN.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.legende_qv, `GL1_LEGENDE ${r.value} qv`);
    inSpan(quote, r.legende_t, `GL1_LEGENDE ${r.value} t`);
    inSpan(quote, r.legende_u, `GL1_LEGENDE ${r.value} u`);
    inSpan(quote, `(${r.unit_qv})`, `GL1_LEGENDE ${r.value} unit`);
    return { row_key: r.value, keys: { quelle: r.value }, group_label: null, label_de: r.label_de, order_index: i,
      values: { groesse: r.groesse, unit_qv: r.unit_qv, mit_dauer: r.mit_dauer ? 1 : 0, legende_qv: r.legende_qv, legende_t: r.legende_t, legende_u: r.legende_u }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'GL1_LEGENDE', title_de: 'Grauwasserquellen der Gleichung (1) — Form des Ertragsterms je Quelle (Q·t·u bzw. V·u)', clause_reference: '§6.2.4.2, Gl. (1)', page_ref: null,
    key_columns: ['quelle'], value_columns: [{ name: 'groesse', type: 'string' }, { name: 'unit_qv', type: 'string' }, { name: 'mit_dauer', type: 'number' }, { name: 'legende_qv', type: 'string' }, { name: 'legende_t', type: 'string' }, { name: 'legende_u', type: 'string' }],
    override_policy: 'locked', override_quote: Q.L557,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Anhang D — Tab. D.1 (L848–L862) and Tab. D.2 (L866–L877): the four PRINTED use columns become the rows (one value
// column per parameter, m277e trap 3). `RICHTWERT_SPALTEN` = the tokens of the created select `richtwert_spalte`
// (-04); `wc_spuelung` / `gartenbewaesserung` are spelled like prod `vorgesehene_nutzung` so the later derivation
// (din16941_2-D-2) is a plain equality. A printed "Nicht nachweisbar" / "N/A" cell keeps a null number beside its
// text; the register's status expressions compare the TEXT ("Nicht nachweisbar" ⇒ any detection exceeds the
// Richtwert, "N/A" ⇒ not assessed) and use the number for the D.3 / D.4 bands. Policy `locked` (L681).
// ---------------------------------------------------------------------------
export const RICHTWERT_SPALTEN = [
  { value: 'sprueh', label_de: 'Sprühanwendung (Hochdruckreinigung, Gartensprenger und Autowäsche)', spalte: 'Hochdruckreinigung, Gartensprenger und Autowäsche' },
  { value: 'wc_spuelung', label_de: 'WC-Spülung (Anwendung ohne Versprühen)', spalte: 'WC-Spülung' },
  { value: 'gartenbewaesserung', label_de: 'Gartenbewässerung (Anwendung ohne Versprühen)', spalte: 'Garten bewässerung' },
  { value: 'reinigung_waschmaschine', label_de: 'Reinigung, d. h. Waschmaschine (Anwendung ohne Versprühen)', spalte: 'Reinigung, d. h. Waschmaschine' },
] as const;
type D1Cell = { g: number | null; text: string };
const NN: D1Cell = { g: null, text: 'Nicht nachweisbar' };
const NA: D1Cell = { g: null, text: 'N/A' };
const n = (g: number, text = String(g)): D1Cell => ({ g, text });
// Column order of the printed rows L852–L855: Sprüh | WC | Garten | Reinigung; test methods: Spray-Anwendung | Anwendung ohne Versprühen.
const TABD1_CELLS: Record<string, { e_coli: D1Cell; enterokokken: D1Cell; legionella: D1Cell; coliforme: D1Cell; verfahren: { e_coli: string; enterokokken: string; legionella: string; coliforme: string } }> = {
  sprueh: { e_coli: NN, enterokokken: NN, legionella: n(10), coliforme: n(10), verfahren: { e_coli: 'EN ISO 9308-1', enterokokken: 'EN ISO 7899-2 oder EN ISO 7899-1', legionella: 'EN ISO 11731', coliforme: 'EN ISO 9308-1' } },
  wc_spuelung: { e_coli: n(250), enterokokken: n(100), legionella: NA, coliforme: n(1000), verfahren: { e_coli: 'EN ISO 9308-3', enterokokken: 'EN ISO 7899-1', legionella: 'N/A', coliforme: 'EN ISO 9308-3' } },
  gartenbewaesserung: { e_coli: n(250), enterokokken: n(100), legionella: NA, coliforme: n(1000), verfahren: { e_coli: 'EN ISO 9308-3', enterokokken: 'EN ISO 7899-1', legionella: 'N/A', coliforme: 'EN ISO 9308-3' } },
  reinigung_waschmaschine: { e_coli: NN, enterokokken: NN, legionella: NA, coliforme: n(10), verfahren: { e_coli: 'EN ISO 9308-3', enterokokken: 'EN ISO 7899-1', legionella: 'N/A', coliforme: 'EN ISO 9308-3' } },
};
const D1_PARAMS = ['e_coli', 'enterokokken', 'legionella', 'coliforme'] as const;
export function tabD1AsTable(): RegulationTable {
  const rows: RegulationRow[] = RICHTWERT_SPALTEN.map((s, i) => {
    const c = TABD1_CELLS[s.value];
    inSpan(Q.L850_858, s.spalte, `TABD1 ${s.value} spalte`);
    const values: RegulationRow['values'] = { spalte: s.spalte };
    for (const p of D1_PARAMS) {
      inSpan(Q.L850_858, c[p].text, `TABD1 ${s.value} ${p}`);
      inSpan(Q.L850_858, c.verfahren[p], `TABD1 ${s.value} verfahren ${p}`);
      values[`${p}_g`] = c[p].g;
      values[`${p}_text`] = c[p].text;
      values[`verfahren_${p}`] = c.verfahren[p];
    }
    return { row_key: s.value, keys: { nutzung: s.value }, group_label: null, label_de: `${s.label_de}: E. coli ${c.e_coli.text} · Enterokokken ${c.enterokokken.text} · Legionella ${c.legionella.text} · Coliforme ${c.coliforme.text} KBE/100 ml`, order_index: i, values, verbatim_quote: Q.L850_858 };
  });
  const cols: ValueColumn[] = [{ name: 'spalte', type: 'string' }];
  for (const p of D1_PARAMS) cols.push({ name: `${p}_g`, type: 'number', unit: 'KBE/100 ml' }, { name: `${p}_text`, type: 'string' }, { name: `verfahren_${p}`, type: 'string' });
  return { standard_code: STD, edition: ED, table_code: 'TABD1', title_de: 'Beispiele für Richtwerte zur bakteriologischen Überwachung nach BS 8525 — je Anwendung (Tabelle D.1)', clause_reference: 'Anhang D, Tab. D.1; §10, §11', page_ref: null,
    key_columns: ['nutzung'], value_columns: cols,
    override_policy: 'locked', override_quote: `${Q.L681} — ${Q.L848}`,
    verification_status: 'md_verified', rows };
}

// Tab. D.2 (L870–L873): Trübung (NTU) · pH · Rest-Chlor (mg/l) · Rest-Brom (mg/l) per printed column + the Prüfung column.
type D2Row = { truebung: D1Cell; ph: { min: number; max: number; text: string }; rest_chlor: D1Cell; rest_brom: D1Cell };
const PH = { min: 5, max: 9.5, text: '5 bis 9,5' };
const TABD2_CELLS: Record<string, D2Row> = {
  sprueh: { truebung: n(10, '< 10'), ph: PH, rest_chlor: n(2, '< 2,0'), rest_brom: n(0, '0,0') },
  wc_spuelung: { truebung: n(10, '< 10'), ph: PH, rest_chlor: n(2, '< 2,0'), rest_brom: n(5, '< 5,0') },
  gartenbewaesserung: { truebung: NA, ph: PH, rest_chlor: n(0.5, '< 0,5'), rest_brom: n(0, '0,0') },
  reinigung_waschmaschine: { truebung: n(10, '< 10'), ph: PH, rest_chlor: n(2, '< 2,0'), rest_brom: n(5, '< 5,0') },
};
const TABD2_VERFAHREN = { truebung: 'EN ISO 7027-1', ph: 'EN ISO 10523', rest_chlor: 'EN ISO 7393-2', rest_brom: 'EN ISO 10304-1' } as const;
export function tabD2AsTable(): RegulationTable {
  const rows: RegulationRow[] = RICHTWERT_SPALTEN.map((s, i) => {
    const c = TABD2_CELLS[s.value];
    for (const cell of [c.truebung.text, c.ph.text, c.rest_chlor.text, c.rest_brom.text, ...Object.values(TABD2_VERFAHREN)]) inSpan(Q.L868_874, cell, `TABD2 ${s.value}`);
    return { row_key: s.value, keys: { nutzung: s.value }, group_label: null, label_de: `${s.label_de}: Trübung ${c.truebung.text} NTU · pH ${c.ph.text} · Rest-Chlor ${c.rest_chlor.text} mg/l · Rest-Brom ${c.rest_brom.text} mg/l`, order_index: i,
      values: {
        spalte: s.spalte, truebung_max: c.truebung.g, truebung_text: c.truebung.text, ph_min: c.ph.min, ph_max: c.ph.max, ph_text: c.ph.text,
        rest_chlor_max: c.rest_chlor.g, rest_chlor_text: c.rest_chlor.text, rest_brom_max: c.rest_brom.g, rest_brom_text: c.rest_brom.text,
        verfahren_truebung: TABD2_VERFAHREN.truebung, verfahren_ph: TABD2_VERFAHREN.ph, verfahren_rest_chlor: TABD2_VERFAHREN.rest_chlor, verfahren_rest_brom: TABD2_VERFAHREN.rest_brom,
      }, verbatim_quote: Q.L868_874 };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABD2', title_de: 'Beispiele für Werte zur allgemeinen Systemkontrolle nach BS 8525 — je Anwendung (Tabelle D.2)', clause_reference: 'Anhang D, Tab. D.2; §10, §11', page_ref: null,
    key_columns: ['nutzung'], value_columns: [
      { name: 'spalte', type: 'string' }, { name: 'truebung_max', type: 'number', unit: 'NTU' }, { name: 'truebung_text', type: 'string' }, { name: 'ph_min', type: 'number' }, { name: 'ph_max', type: 'number' }, { name: 'ph_text', type: 'string' },
      { name: 'rest_chlor_max', type: 'number', unit: 'mg/l' }, { name: 'rest_chlor_text', type: 'string' }, { name: 'rest_brom_max', type: 'number', unit: 'mg/l' }, { name: 'rest_brom_text', type: 'string' },
      { name: 'verfahren_truebung', type: 'string' }, { name: 'verfahren_ph', type: 'string' }, { name: 'verfahren_rest_chlor', type: 'string' }, { name: 'verfahren_rest_brom', type: 'string' },
    ],
    override_policy: 'locked', override_quote: `${Q.L681} — ${Q.L866}`,
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Tab. D.3 (L881–L893) / Tab. D.4 (L897–L906): status bands. `code` 1 / 2 / 3 is the register's numeric status
// (grün / gelb / rot); `status` = the prod `bewertung_status` tokens (gruen / gelb / rot, capture).
// ---------------------------------------------------------------------------
type BandRow = { band: string; ergebnis: string; ergebnis_text: string; status: 'gruen' | 'gelb' | 'rot'; status_text: string; auswertung: string; code: number; line: keyof typeof Q };
/** `ergebnis` = the printed cell verbatim (LaTeX where the transcript has it, e.g. `>10 \mathrm{G}`); `ergebnis_text` = the plain rendering for labels / badges (fix round 1). */
const BAND_COLUMNS: ValueColumn[] = [{ name: 'ergebnis', type: 'string' }, { name: 'ergebnis_text', type: 'string' }, { name: 'status', type: 'string' }, { name: 'status_text', type: 'string' }, { name: 'auswertung', type: 'string' }, { name: 'code', type: 'number' }];
function bandTable(code: string, title: string, clause: string, rows: ReadonlyArray<BandRow>, overrideQuote: string): RegulationTable {
  const out: RegulationRow[] = rows.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.ergebnis, `${code} ${r.band} ergebnis`);
    inSpan(quote, r.status_text, `${code} ${r.band} status`);
    inSpan(quote, r.auswertung, `${code} ${r.band} auswertung`);
    return { row_key: r.band, keys: { band: r.band }, group_label: null, label_de: `${r.ergebnis_text} → ${r.status_text}: ${r.auswertung}`, order_index: i, values: { ergebnis: r.ergebnis, ergebnis_text: r.ergebnis_text, status: r.status, status_text: r.status_text, auswertung: r.auswertung, code: r.code }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: code, title_de: title, clause_reference: clause, page_ref: null, key_columns: ['band'], value_columns: BAND_COLUMNS, override_policy: 'locked', override_quote: overrideQuote, verification_status: 'md_verified', rows: out };
}
export const TABD3_BAENDER: ReadonlyArray<BandRow> = [
  { band: 'lt_g', ergebnis: '< G', ergebnis_text: '< G', status: 'gruen', status_text: 'grün', auswertung: 'System unter Kontrolle', code: 1, line: 'L884' },
  { band: 'g_bis_10g', ergebnis: 'G bis 10 G', ergebnis_text: 'G bis 10 G', status: 'gelb', status_text: 'gelb', auswertung: 'erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs', code: 2, line: 'L885' },
  { band: 'gt_10g', ergebnis: '>10 \\mathrm{G}', ergebnis_text: '> 10 G', status: 'rot', status_text: 'rot', auswertung: 'Nutzung des Grauwassers ausschließen, bis Problem gelöst ist', code: 3, line: 'L886' },
];
export function tabD3AsTable(): RegulationTable {
  return bandTable('TABD3', 'Auswertung der bakteriologischen Überwachung — Statusbänder (Tabelle D.3)', 'Anhang D, Tab. D.3; §11', TABD3_BAENDER, `${Q.L681} — ${Q.L889}`);
}
export const TABD4_BAENDER: ReadonlyArray<BandRow> = [
  { band: 'lt_g', ergebnis: '< G', ergebnis_text: '< G', status: 'gruen', status_text: 'grün', auswertung: 'System unter Kontrolle', code: 1, line: 'L900' },
  { band: 'gt_g', ergebnis: '> G', ergebnis_text: '> G', status: 'gelb', status_text: 'gelb', auswertung: 'erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs', code: 2, line: 'L901' },
];
export function tabD4AsTable(): RegulationTable {
  return bandTable('TABD4', 'Auswertung der Systemüberwachung — Statusbänder (Tabelle D.4)', 'Anhang D, Tab. D.4; §11', TABD4_BAENDER, `${Q.L681} — ${Q.L902}`);
}

// ---------------------------------------------------------------------------
// Anhang B (L787–L806): Arten von Grauwassernutzungsanlagen a)–e), keyed on the prod `anlagentyp` tokens (capture).
// Only a) prints a use restriction (L794). Policy `anhaltswert` (L787 "können … klassifiziert werden", informativ).
// ---------------------------------------------------------------------------
type AnhangBRow = { value: string; bezeichnung: string; beschreibung: string; nutzungsbeschraenkung: string | null; line: keyof typeof Q };
export const ANHANGB_TYPEN: ReadonlyArray<AnhangBRow> = [
  { value: 'direkt', bezeichnung: 'Anlagen für die direkte Nutzung (ohne Behandlung)', beschreibung: 'Diese Anlagen verwenden einfache Geräte zur Sammlung von Grauwasser aus Einrichtungen und fördern es direkt zum Ort der Nutzung, ohne Behandlung und geringer oder keiner Speicherungsdauer, z. B. ein Grauwasser-Umstellventil.', nutzungsbeschraenkung: 'Ist die Behandlung nicht Teil der Grauwassernutzugsanlage, sind Nutzungen auf unterirdische Bewässerung und Anwendungen ohne Versprühen beschränkt.', line: 'L788_794' },
  { value: 'kurzzeit', bezeichnung: 'Anlagen mit kurzzeitiger Rückhaltung', beschreibung: 'Diese Anlagen verwenden eine sehr einfache Behandlungstechnik, wie Abschöpfen von Fremdmaterial an der Oberfläche des gesammelten Grauwassers und Absetzen von Partikeln am Tankboden. Sie zielen darauf ab, Geruchsbildungen und Verschlechterungen der Wasserqualität zu vermeiden, indem sichergestellt wird, dass das behandelte Grauwasser nicht für eine längere Dauer gespeichert wird.', nutzungsbeschraenkung: null, line: 'L795_797' },
  { value: 'physikalisch_chemisch', bezeichnung: 'einfache physikalische/chemische Anlagen', beschreibung: 'Diese Anlagen verwenden Filter zur Entfernung von Fremdmaterial aus dem gesammelten Grauwasser vor der Speicherung, wobei generell chemische Desinfektionsmittel eingesetzt werden, um das Bakterienwachstum während der Speicherung zu stoppen.', nutzungsbeschraenkung: null, line: 'L798_800' },
  { value: 'biologisch', bezeichnung: 'biologische Anlagen', beschreibung: 'Diese Anlagen verwenden aerobe oder anaerobe Bakterien zur Beseitigung von unerwünschtem organischem Material im gesammelten Grauwasser. Im Falle aerober Behandlung können technische Einrichtungen oder Wasserpflanzen zur Belüftung des Wassers verwendet werden.', nutzungsbeschraenkung: null, line: 'L801_803' },
  { value: 'biologisch_mechanisch', bezeichnung: 'biologisch-mechanische Anlagen', beschreibung: 'Diese Anlagen verbinden biologische und mechanische Behandlung, z. B. Entfernung organischer Substanz durch mikrobielle Kulturen und Feststoffe durch Abtrennung. Durch Belüftung wird die bakterielle Aktivität unterstützt.', nutzungsbeschraenkung: null, line: 'L804_806' },
];
export function anhangBAsTable(): RegulationTable {
  const rows: RegulationRow[] = ANHANGB_TYPEN.map((r, i) => {
    const quote = Q[r.line];
    inSpan(quote, r.bezeichnung, `ANHANGB ${r.value} bezeichnung`);
    inSpan(quote, r.beschreibung, `ANHANGB ${r.value} beschreibung`);
    inSpan(quote, r.nutzungsbeschraenkung, `ANHANGB ${r.value} nutzungsbeschraenkung`);
    return { row_key: r.value, keys: { anlagentyp: r.value }, group_label: null, label_de: r.bezeichnung, order_index: i, values: { bezeichnung: r.bezeichnung, beschreibung: r.beschreibung, nutzungsbeschraenkung: r.nutzungsbeschraenkung }, verbatim_quote: quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'ANHANGB', title_de: 'Arten von Grauwassernutzungsanlagen nach Art der Behandlung (Anhang B)', clause_reference: 'Anhang B; §5.1', page_ref: null,
    key_columns: ['anlagentyp'], value_columns: [{ name: 'bezeichnung', type: 'string' }, { name: 'beschreibung', type: 'string' }, { name: 'nutzungsbeschraenkung', type: 'string' }],
    override_policy: 'anhaltswert', override_quote: Q.L787,
    verification_status: 'md_verified', rows };
}

/** The live DIN-EN-16941-2 table set (Plan 3 Task 15). */
export function din169412SeedTables(): RegulationTable[] {
  return [tabA1AsTable(), tabA2AsTable(), tabA3AsTable(), gl1LegendeAsTable(), tabD1AsTable(), tabD2AsTable(), tabD3AsTable(), tabD4AsTable(), anhangBAsTable()];
}
