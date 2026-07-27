# Wave-1 Regulatory Encoding Audit — DWA-A-138-1

**Ledger header**
- Model: `claude-opus-5` (pinned) · Effort: high
- CLI version: `2.1.218 (Claude Code)` — raw output of `claude --version`; no update offered, proceeding per startup rule.
- Session date: 2026-07-27
- Scope: ONE standard, DWA-A-138-1 (Oktober 2024). Read-only. No prod writes, no migrations, no map-node edits.

## Sources used (verified present this session)

| Artifact | Path | Verified |
|---|---|---|
| Standard PDF | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf` | 105 pages (pdftotext page count), text-extractable |
| Reasoning map | `C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-138-1\` | 131 `.md` files |
| KOSTRA A | `C:\Users\Ekowai\Desktop\Blumen Forscheln\KOSTRA_DWD_2020_137089_61b26dc5 (1).pdf` | 3 pages |
| KOSTRA B | `C:\Users\Ekowai\Downloads\03_Consulting_&_Advisory\Germany\Heinsberg\Paula- Wildblumentöchter Forschelnd\Infiltration project\Documentation\Stage 1\KOSTRA_DWD_2020_136089_e33a778e.pdf` | present |

### Page-offset re-verification (R-3: re-derived, not trusted)

The briefing asserted **printed page + 2 = PDF page**. I re-derived it independently from printed footers rather than accepting it.

**COMMAND**
```powershell
$t=[System.IO.File]::ReadAllText("$sp\a138_full.txt",[System.Text.Encoding]::UTF8); $pages=$t -split "`f"
foreach($i in 41,49,51,54,64,71,73){ $lines=($pages[$i-1] -split "`r?`n") | Where-Object { $_.Trim() -ne '' }; "=== PDFPAGE $i === LAST: [" + $lines[-1].Trim() + "]" }
```
**RAW OUTPUT**
```
=== PDFPAGE 41 === LAST: [Oktober 2024      DWA-Regelwerk       39]
=== PDFPAGE 49 === LAST: [Oktober 2024      DWA-Regelwerk   47]
=== PDFPAGE 51 === LAST: [Oktober 2024      DWA-Regelwerk        49]
=== PDFPAGE 54 === LAST: [52      DWA-Regelwerk      Oktober 2024]
=== PDFPAGE 64 === LAST: [62      DWA-Regelwerk       Oktober 2024]
=== PDFPAGE 71 === LAST: [Oktober 2024      DWA-Regelwerk       69]
=== PDFPAGE 73 === LAST: [Oktober 2024      DWA-Regelwerk    71]
```
Second confirmation run over the table pages:
```
PDFPAGE 26  LASTLINE: [24    DWA-Regelwerk    Oktober 2024]
PDFPAGE 29  LASTLINE: [Oktober 2024    DWA-Regelwerk    27]
PDFPAGE 44  LASTLINE: [42    DWA-Regelwerk    Oktober 2024]
PDFPAGE 48  LASTLINE: [46    DWA-Regelwerk    Oktober 2024]
PDFPAGE 58  LASTLINE: [56    DWA-Regelwerk    Oktober 2024]
PDFPAGE 74  LASTLINE: [72    DWA-Regelwerk    Oktober 2024]
PDFPAGE 75  LASTLINE: [Oktober 2024    DWA-Regelwerk    73]
```
**VERDICT: offset +2 CONFIRMED at 14 independent pages.** All "printed p.N" references below therefore map to PDF page N+2. Cross-check: the map's `source_page` frontmatter uses **printed** page numbers (confirmed by `tab-09` = printed 42 and `tab-12` = printed 49, both exact).

---

# T1 — KOSTRA reality check

## COMMAND (metadata)
```powershell
& "C:\Users\Ekowai\scoop\shims\pdfinfo.exe" "C:\Users\Ekowai\Desktop\Blumen Forscheln\KOSTRA_DWD_2020_137089_61b26dc5 (1).pdf"
```
## RAW OUTPUT
```
Title:
Creator:
Producer:        Qt 5.15.2
CreationDate:    Sat Jan  7 05:15:04 2023 W. Europe Standard Time
Pages:           3
Encrypted:       no
Page size:       842 x 595 pts (A4)
File size:       1625180 bytes
PDF version:     1.4
```

## COMMAND (content extraction)
```powershell
& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout -f 1 -l 3 "C:\Users\Ekowai\Desktop\Blumen Forscheln\KOSTRA_DWD_2020_137089_61b26dc5 (1).pdf" "$sp\kostra137089.txt"
[System.IO.File]::ReadAllText("$sp\kostra137089.txt",[System.Text.Encoding]::UTF8)
```
## RAW OUTPUT (verbatim, all 3 pages, abridged only by removing blank runs)
```
                Starkniederschlagshöhen und -spenden gemäß KOSTRA-DWD-2020

                                    Rasterfeld 137089
                                      (Zeile 137, Spalte 89)

    Regenspende und Bemessungsniederschlagswerte in Abhängigkeit von Wiederkehrzeit T und Dauerstufe D

                                         Wiederkehrzeit T
Dauerstufe D      1a      2a     3a     5a     10 a     20 a     30 a     50 a     100 a

                                                                              Seite 1 von 3
Angaben in mm: Bemessungsniederschlagswerte h(n)      Datenbasis: KOSTRA-DWD-2020 des Deutschen Wetterdienstes, Stand 12/2022.
Angaben in l / (s ha): Regenspende R(n)               Für die Richtigkeit und Aktualität der Angaben wird keine Gewähr übernommen. Erstellt 01/2023.
--- page 2 ---
                Starkniederschlagshöhen und -spenden gemäß KOSTRA-DWD-2020
                                    Rasterfeld 137089
                                      (Zeile 137, Spalte 89)
    Örtliche Unsicherheiten in Abhängigkeit von Wiederkehrzeit T und Dauerstufe D     Parameter für abweichende T und D
                                                                                      Lokationsparameter ξ (Xi)      14,36908811
                                                                                      Skalenparameter α (Alpha)      4,35265727
                                                                                      Formparameter κ (Kappa)        -0,1
                                                                                      1. Koutsoyiannis-Parameter θ (Theta)  0,03436509
                                                                                      2. Koutsoyiannis-Parameter η (Eta)    0,74125535
                                                                                      Parameter für dauerstufenübergreifende
                                                                                      Extremwertschätzung nach KOUTSOYIANNIS et al. 1998.
                                                                                      Siehe auch Anwendungshilfe zu KOSTRA-DWD-2020
                                                                                      des Deutschen Wetterdienstes.
                                                                                      Seite 2 von 3
--- page 3 ---
                                    Rasterfeld 137089
                     Übersichtskarte des Rasterfeldes 137089, M 1 : 100 000
                                                                              Seite 3 von 3
Quelle Rasterdaten: KOSTRA-DWD-2020 des Deutschen Wetterdienstes, Stand 12/2022.
Kartendarstellung: © Bundesamt für Kartographie und Geodäsie (2023)
```

## COMMAND (second file)
```powershell
& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout -f 1 -l 1 "C:\Users\Ekowai\Downloads\03_Consulting_&_Advisory\Germany\Heinsberg\Paula- Wildblumentöchter Forschelnd\Infiltration project\Documentation\Stage 1\KOSTRA_DWD_2020_136089_e33a778e.pdf" "$sp\kostra136089.txt"
```
## RAW OUTPUT
```
                Starkniederschlagshöhen und -spenden gemäß KOSTRA-DWD-2020
                                    Rasterfeld 136089
                                      (Zeile 136, Spalte 89)
    Regenspende und Bemessungsniederschlagswerte in Abhängigkeit von Wiederkehrzeit T und Dauerstufe D
```

## VERDICT: **(b) — per-Rasterfeld (grid-cell) data exports for one specific location.**

Both files are 3-page DWD **data exports** for a single grid cell each — `Rasterfeld 137089 (Zeile 137, Spalte 89)` and `Rasterfeld 136089 (Zeile 136, Spalte 89)`. The numbers are exactly grid-cell IDs, as suspected. Neither is the KOSTRA-DWD-2020 methodology/standard. Page 2 explicitly defers the *methodology* elsewhere: *"Siehe auch **Anwendungshilfe zu KOSTRA-DWD-2020** des Deutschen Wetterdienstes."* — i.e. the normative/methodological document is a **different, still-absent** artifact. They also carry a disclaimer, *"Für die Richtigkeit und Aktualität der Angaben wird keine Gewähr übernommen"*, which is not normative-source language.

The two cells are adjacent (row 136 vs 137, same column 89) and sit under `Stage 1` / `Stage 2` of one client's *Infiltration project* — further evidence these are **project deliverables for the Heinsberg site**, not library sources.

### Corroboration from DWA-A-138-1's own printed pages

**Printed p.42 (PDF p.44), §5.3.3.5:**
> "Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende r<sub>D(n)</sub> erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). Als Regendaten sind **örtliche** Niederschlag-/Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen **können** die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. Der aktuelle Stand des Arbeitsblatts DWA-A 138-1:2024 bezieht sich auf KOSTRA-DWD-2020 (2023)."

The governing word is **"örtliche"** (site-local). DWA-A-138-1 does not print, and cannot print, any r<sub>D(n)</sub> value — the value is inherently a function of the project's location.

**Printed p.50 (PDF p.52), §5.3.4.1:**
> "Bei Verwendung von KOSTRA-Regenspenden **sind** die exakten Werte des DWD (DWD-Vorgabe) der Regenstatistik **zu verwenden**."

**Printed p.99 (PDF p.101), software annex:**
> "Das direkte Einlesen von KOSTRA-Regendaten ist möglich, Regendaten selbst sind **nicht enthalten**."

### Corroboration from the map's own encoding

`cr-a138-req-05` already encodes the condition:
```
Condition (encoded): `r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL`
```
The encoding **already treats KOSTRA as a per-project grid-cell input the engineer supplies**. Its `NR cap` note ("Governing threshold defers to an out-of-library document") is therefore self-contradictory: there is no out-of-library *threshold* to quote — there is a project input to collect.

## REVERSAL (R-5) — the campaign premise is WRONG

**Campaign belief:** "Locating KOSTRA-DWD-2020 unblocks ~22 NR nodes in this map."

**Evidence-based reversal:** The located files are **grid-cell data exports = PROJECT DATA (`engineer_input`)**, not a normative source. Therefore:

1. The 22 nodes **DO NOT lift to VA** on the strength of these files. Not one of them.
2. The correct treatment is a **re-classification, not a lift**: `r_D(n)` is `engineer_input` (site-specific, supplied per project from the project's own Rasterfeld export), and `doc-kostra-dwd-2020`'s `data_class: standard_fixed` is **wrong** — a location-dependent quantity is by definition not standard-fixed.
3. Once `r_D(n)` is reclassified as `engineer_input`, the NR cap on those 22 nodes is **not justified by KOSTRA at all**. The equations themselves (Gl. 3, 10, 11, 12, 13, 14, 16, 19, 23, 25, 28–32, 35, 37, 40, 41) are **printed in full in DWA-A-138-1's own pages** and are VA-able from this PDF today. I verified this directly for Gl.(14) at printed p.56 and Gl.(19) at printed p.59, both fully printed with their `mit`-blocks.
4. Even obtaining the *real* KOSTRA-DWD-2020 methodology (the **Anwendungshilfe**, which is what page 2 of the export points at, and which is **still not located**) would not change this: it would supply a method for interpolating between duration steps, not a normative constant for these equations.

**Net effect on the corpus' largest NR block: the "KOSTRA unblocks 22" line item should be struck.** The 22 nodes need an `engineer_input` re-classification decision (ratification item R-4 below), not a document acquisition.

### Honest caveat on the exports themselves
The numeric table cells of both KOSTRA exports are **not text-extractable** — only the row/column headers survive:
```
CHARS: 585
Dauerstufe D
1a  2a  3a  5a  10 a  20 a  30 a  50 a  100 a
```
The h(n)/R(n) value grid is rendered as vector/graphic content. Only the distribution parameters on page 2 extracted as text (ξ=14,36908811; α=4,35265727; κ=-0,1; θ=0,03436509; η=0,74125535 — for Rasterfeld 137089). **I therefore cannot quote any r<sub>D(n)</sub> value from these files**, and I have not invented one. This is listed under HONEST RESIDUE.

---

# T2 — §5.3.3.3 Nachweisverfahren and `dp-01-verfahrenswahl`

## COMMAND (locate the section)
```powershell
$pages = $t -split "`f"
for($i=0;$i -lt $pages.Count;$i++){ if($pages[$i] -match '5\.3\.3\.3'){ "PDFPAGE $($i+1): " + (($pages[$i] -split "`n" | Where-Object { $_ -match '5\.3\.3\.3' }) -join ' || ') } }
```
## RAW OUTPUT
```
TOTAL PAGES: 105
PDFPAGE 8:   5.3.3.3  Nachweisverfahren ...........................................  39
PDFPAGE 41:  5.3.3.3 Nachweisverfahren
PDFPAGE 64:  den-Rigolen-Elements im Nachweisverfahren empfohlen (5.3.3.3). Bei der Muldenbemessung ist die
PDFPAGE 66:  Bei einer Bemessung des Mulden-Rigolen-Elements im Nachweisverfahren (5.3.3.3) ist der Bemes-
PDFPAGE 68:  den-Rigolen-Systeme wird das Nachweisverfahren gemäß 5.3.3.3 empfohlen.
PDFPAGE 73:  Nachweisverfahren gemäß 5.3.3.3 empfohlen.
```

### CORRECTION TO THE BRIEFING
The briefing scoped §5.3.3.3 as "PDF pp ~41-52". **It is not.** §5.3.3.3 occupies **PDF p.41 only (printed p.39)**, ending mid-page where §5.3.3.4 Bemessungshäufigkeiten begins. PDF pp.42–52 are §5.3.3.4 through §5.3.4.2, a different scope.

## §5.3.3.3 — VERBATIM, complete (PDF p.41 = printed p.39)

> **5.3.3.3 Nachweisverfahren**
>
> Für zentrale Versickerungsanlagen sowie auch bei gekoppelten/vernetzten Systemen (z. B. Mulden-Rigolen-Systeme in Reihe, Sickerschachtkaskade etc.) **ist der hydrologisch-hydraulische Nachweis mit einer Niederschlag-Abfluss-Langzeitsimulation zu empfehlen.** Hierfür **müssen** aktuelle, kontinuierlich aufgezeichnete Niederschlagszeitreihen, die das Niederschlagsgeschehen des Planungsstandorts repräsentieren, über eine Dauer von **mindestens zehn Jahren** vorliegen. Die zeitliche Auflösung der Niederschlagsreihen **sollte 5 min nicht überschreiten**. Dabei sind möglichst aktuelle Niederschlagszeitreihen zu verwenden. Veränderungen des Starkniederschlagsgeschehens in Folge des Klimawandels können gegebenenfalls durch die Verwendung von Niederschlagszeitreihen, die im Down-Scalingverfahren unter Berücksichtigung von unterschiedlichen Klima-Szenarien erstellt werden können, berücksichtigt werden. Damit sind Veränderungen des Starkniederschlagsgeschehens in Folge des Klimawandels berücksichtigt und die Sicherheit der Bemessung erhöht. Die Aussagefähigkeit und Verlässlichkeit der Langzeitsimulation nimmt mit der Länge der verwendeten Niederschlagszeitreihe zu. **Empfohlen wird** daher eine Länge der Zeitreihe, die dem dreifachen Wert der statistischen Wiederkehrzeit T<sub>n</sub> entspricht gemäß Gl. (1):
>
> **M ≥ 3 · T<sub>n</sub>     (1)**
>
> mit
> M — a — Simulationszeitraum/Länge Niederschlagzeitreihe
> T<sub>n</sub> — a — statistische Wiederkehrzeit
>
> Stehen keine langjährigen Aufzeichnungen des Niederschlags zur Verfügung, ist als Alternative zur Übertragung von nicht direkt benachbarten Niederschlagszeitreihen der Einsatz von synthetischen Regenreihen vorzuziehen (BROMMUNDT et al. 2007, HABERLAND et al. 2007).
>
> Für die Niederschlag-Abfluss-Langzeitsimulation sind geeignete Modellansätze für die Abflussbildung (z. B. erweiterte Grenzwertmethode) und für die Abflusskonzentration (z. B. linearer Einzelspeicher) zu verwenden. Bei dezentralen Versickerungsanlagen kann in der Regel auf die Modellierung der Abflusskonzentration verzichtet werden.
>
> Beim Nachweisverfahren ergibt sich die Bemessungs-/Versagenshäufigkeit aus der statistischen Auswertung der Simulationsergebnisse (siehe Arbeitsblatt DWA-A 117).

## The governing counterpart — §5.3.3.1 / §5.3.3.2 (PDF p.39 = printed p.37), VERBATIM

> **5.3.3.1 Vorbemerkungen**
> […] Die Bemessung von Versickerungsanlagen erfolgt auf der Grundlage der Bemessungsansätze des Arbeitsblatts DWA-A 117 „Bemessung von Regenrückhalteräumen". Danach erfolgen die Berechnungen **entweder** nach einem
> ▪ einfachen Bemessungsverfahren unter Verwendung statistischer Niederschlagsauswertungen („Einfaches Verfahren") **oder** durch
> ▪ Nachweis der Leistungsfähigkeit durch eine Niederschlag-Abfluss-Langzeitsimulation („Nachweisverfahren").
>
> **5.3.3.2 Einfaches Verfahren**
> Für die Anwendung des Einfachen Verfahrens nach Arbeitsblatt DWA-A 117:2013 **gelten** (in Übereinstimmung mit DIN EN 752) und unter Beachtung wirtschaftlicher und ingenieurtechnischer Aspekte für das gesamte Einzugsgebiet bis zur Stelle der betrachteten Versickerungsanlage **die folgenden Bedingungen**:
> ▪ Das Einzugsgebiet A<sub>E</sub> hat eine Fläche von **maximal 200 ha** oder die Fließzeit t<sub>f</sub> bis zur Versickerungsanlage beträgt **maximal 15 min**.
> ▪ Die gewählte bzw. zulässige Überschreitungshäufigkeit des Speichervolumens beträgt **n ≥ 0,1/a bzw. T<sub>n</sub> ≤ 10 a**.
> ▪ Die spezifische Versickerungs-/Abflussleistung bezogen auf den Bemessungswert der Zuflüsse A<sub>C</sub> ist **q<sub>S</sub> ≥ 2 l/(s·ha)**.
> ▪ Die Regenhäufigkeit wird mit der Bemessungshäufigkeit gleichgesetzt.
>
> Für die Bemessung von dezentralen Versickerungsanlagen **kann in der Regel** das Einfache Verfahren angewendet werden. **Die Einhaltung der Bedingungen für das Einfache Verfahren sind bei der Bemessung nachzuweisen.**
> Für das Einfache Verfahren wird die Vorgehensweise nach Bild 5 **empfohlen**.

> **Extraction artifact note (SR-3 honesty).** `pdftotext -layout` emitted this sentence with the word `(gelten` fused into the parenthesis: `"nach Arbeitsblatt DWA-A 117:2013 (gelten in Übereinstimmung mit DIN EN 752) und unter Beachtung … die folgenden Bedingungen:"`. This is a column-order artifact of the two-column render, not the printed word order. I have reconstructed the reading above as `"… nach Arbeitsblatt DWA-A 117:2013 gelten (in Übereinstimmung mit DIN EN 752) und unter Beachtung … die folgenden Bedingungen:"`. **The substance — that four conditions "gelten" for applying the Einfaches Verfahren — is unambiguous either way**, but the exact printed word order at this one clause should be eyeballed on the rendered page before it is quoted in a customer-facing artefact.

## Tab.12 — VERBATIM (PDF p.51 = printed p.49)

> **Tabelle 12: Empfehlung hydrologischer Grundlagen für Versickerungsanlagen**
>
> | Kriterium | Dezentrale und einfache zentrale Versickerungsanlagen | Zentrale Versickerung und vernetzte Mulden-Rigolen-Systeme <sup>3)</sup> |
> |---|---|---|
> | **Empfohlenes Verfahren** | Einfaches Verfahren (Lastfallkonzept) | Nachweisverfahren (Langzeitkontinuumsimulation) |
> | Regen | statistische Starkregen (z. B. KOSTRA) | geeignete, kontinuierliche Regenreihen für min. 10 Jahre |
> | Bemessungshäufigkeit n (1/a) <sup>2)</sup> | 0,02 – 0,5 | |
> | Maßgebliche Dauerstufe D (min) | *Flächenversickerung:* 10 – 15 · *Versickerungsanlagen mit Speicherfunktion <sup>1)</sup>:* wird schrittweise bestimmt (Iteration) | entfällt |
> | Abflussbildung | Bestimmung der Rechenwerte A<sub>C</sub> unter Berücksichtigung eines konstanten Abflussbeiwerts | flächenspezifische Prozessmodellierung |
> | Abflusskonzentration | in der Regel ohne Berücksichtigung; ggf. Abminderungsfaktor f<sub>A</sub> | entfällt oder Übertragungsfunktion |
>
> ANMERKUNGEN
> 1) Einzelanlagen (Mulden, Rigolen, Mulden-Rigolen-Elemente, Schachtversickerung, Becken) oder parallel geschaltete Mulden-Rigolen-Systeme;
> 2) nach Tabelle 8 und unter Berücksichtigung der Anwendungsgrenzen des Einfachen Verfahrens;
> 3) Mulden-Rigolen-Systeme in Reihenschaltung.

## T2 finding — surfaced, NOT decided (per instruction)

The printed text supports **neither (i) nor (ii) cleanly — it is a two-part hybrid**, and the two parts carry *different* modal force:

- **The choice of the Nachweisverfahren is RECOMMENDATORY.** Every governing verb is a recommendation: Tab.12's own **caption** is *"**Empfehlung** hydrologischer Grundlagen"*; its decisive row is labelled *"**Empfohlenes** Verfahren"*; §5.3.3.3 says the Nachweis *"ist … **zu empfehlen**"*; and all four downstream cross-references (printed pp.62, 64, 66, 71) say *"**empfohlen**"*. There is **no printed sentence anywhere in this document that makes the Nachweisverfahren mandatory above a threshold.**
- **The applicability limits of the Einfaches Verfahren are BINDING.** §5.3.3.2 states four conditions that *"**gelten**"*, and closes with *"Die Einhaltung der Bedingungen für das Einfache Verfahren **sind bei der Bemessung nachzuweisen**."* — a demonstrable-compliance obligation.

The correct reading is therefore: **the engineer may choose the method (SR-2 selection), but if the Einfaches Verfahren is chosen, its four conditions are mandatory and must be demonstrated.** Exceeding a Tab.12 boundary does not *force* the Nachweisverfahren; breaching a §5.3.3.2 condition does *forbid* the Einfaches Verfahren. These are not the same rule and must not be collapsed into one gate.

**This is a ratification item (R-1 below). I have not set the modal-verb severity.**

### Consequential encoding findings from T2

- `dp-01-verfahrenswahl` frames the question as "Tab.12 gives thresholds but 5.3.3 uses modal verbs." **Tab.12 gives no method-selection thresholds at all** — it is a two-column recommendation matrix keyed on facility *type* (dezentral/einfach zentral vs. zentral/vernetzt), not on any numeric threshold. The numeric thresholds live in §5.3.3.2, a different subsection. The decision point is mis-framed at its premise.
- `tab-12` node is `data_class: standard_fixed` and titled *"Tab.12 Verfahrenswahl (Einfaches/Nachweis)"* with the body claim *"Method selection … thresholds."* Against a table whose printed caption is **"Empfehlung"** and whose row reads **"Empfohlenes Verfahren"**, `standard_fixed` is the wrong class and "thresholds" is not what the table contains. → **SEV-2 content mismatch** (see T3 #5).
- **Bonus, resolves `dp-03-f-z-15`.** Printed p.48 (PDF p.50) states verbatim: *"Je nach Risikomaß gemäß Arbeitsblatt DWA-A 117 werden Zuschlagsfaktoren **zwischen 1,1 und 1,2** empfohlen. Insbesondere bei kleinen spezifischen Versickerungs-/Abflussleistungen bezogen auf A<sub>C</sub> (q<sub>S,AC</sub> ≤ 5 l/(s·ha)) wird ein Zuschlagsfaktor **f<sub>Z</sub> = 1,2 erforderlich**."* So f<sub>Z</sub> **is a range 1,1–1,2** (SR-2 engineer selection) with a **conditionally mandatory point value 1,2** when q<sub>S,AC</sub> ≤ 5. REQ-15's encoding `(q_S_AC > 5 OR f_Z == 1.2)` is the correct contrapositive of *"q<sub>S,AC</sub> ≤ 5 ⟹ f<sub>Z</sub> = 1,2"* — **the CR logic is CORRECT**; only the missing range-selection record for the 1,1–1,2 band is outstanding.
- **Bonus, resolves part of `dp-02-n-range`.** Tab.12 prints the design-frequency band verbatim as **"Bemessungshäufigkeit n (1/a): 0,02 – 0,5"**. The map's `dp-02-n-range` is titled *"Bemessungshaeufigkeit n {0.1..0.5}"*. **The printed lower bound is 0,02, not 0,1.** The 0,1 figure comes from §5.3.3.2's *Einfaches-Verfahren* condition (`n ≥ 0,1/a`), which is a narrower applicability limit, not the general range. → **SEV-2: dp-02 states a range the standard does not print.**

---

# T3 — VA spot-audit (8 nodes)

## COMMAND (node selection)
```powershell
Get-ChildItem -Path $d -Filter *.md | ForEach-Object { $t=[System.IO.File]::ReadAllText($_.FullName,[System.Text.Encoding]::UTF8); $p=[regex]::Match($t,'(?m)^provenance:\s*(\S+)').Groups[1].Value; $sp=[regex]::Match($t,'(?m)^source_page:\s*(.*)$').Groups[1].Value.Trim(); if($p -eq 'VA' -and $sp -ne '' -and ($_.BaseName -match '^(eq|cr|tab)-')){ "{0,-24} page={1}" -f $_.BaseName,$sp } }
```
62 VA nodes with a `source_page` were returned across eq-/cr-/tab-. I sampled **8**: 4 eq-, 2 tab-, 2 cr-.

## COMMAND (table-caption ground truth — used for #5 and #6)
```powershell
for($i=12;$i -lt $pages.Count;$i++){ foreach($l in ($pages[$i] -split "`r?`n")){ if($l -match '^\s*Tabelle\s+(\d+)\s*:'){ "PDFPAGE $($i+1) (printed $($i-1)): " + $l.Trim() } } }
```
## RAW OUTPUT
```
PDFPAGE 18 (printed 16): Tabelle 1: Im Arbeitsblatt verwendete Abkürzungen
PDFPAGE 19 (printed 17): Tabelle 2: Im Arbeitsblatt verwendete Formelzeichen
PDFPAGE 26 (printed 24): Tabelle 3: Überprüfung der Umsetzbarkeit einer entwässerungstechnischen Versickerung
PDFPAGE 27 (printed 25): Tabelle 4: Verwendung, Art und Herkunft von Grundlagendaten für die Ersteinschätzung
PDFPAGE 29 (printed 27): Tabelle 5: Kategorisierung von Niederschlagswasser bebauter oder befestigter Flächen
PDFPAGE 33 (printed 31): Tabelle 6: Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine be-
PDFPAGE 35 (printed 33): Tabelle 7: Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung
PDFPAGE 42 (printed 40): Tabelle 8: Hinweise zur Festlegung von Bemessungs- und Überflutungshäufigkeiten für Versicke-
PDFPAGE 44 (printed 42): Tabelle 9: Empfohlene Abflussbeiwerte für das Einfache Verfahren (Quelle: in Abstimmung mit DIN 1986-100:
PDFPAGE 48 (printed 46): Tabelle 10: Beispiele Kriterien zur Festlegung von fOrt
PDFPAGE 48 (printed 46): Tabelle 11: Korrekturfaktoren Infiltrationsrate (Quelle: in Anlehnung an BAKEMAN et al. 2014)
PDFPAGE 51 (printed 49): Tabelle 12: Empfehlung hydrologischer Grundlagen für Versickerungsanlagen
PDFPAGE 58 (printed 56): Tabelle 13: Größenordnungen AS,m nach Bodenart
PDFPAGE 75 (printed 73): Tabelle 14: Zusammenstellung der Planungs- und Bemessungsvorgaben von Versickerungs-
```

## Per-node results

### 1. `eq-gl1-a138-13` — claims printed p.39 — **CONFIRMED**
Encoded: `M >= 3 * T_n`. PDF p.41 (printed 39) prints verbatim:
> "**M ≥ 3 · T<sub>n</sub>     (1)** … M a Simulationszeitraum/Länge Niederschlagzeitreihe · T<sub>n</sub> a statistische Wiederkehrzeit"

Formula, equation number and page all match. ✅

### 2. `eq-gl4-a138-12` — claims printed p.44 — **CONFIRMED**
Encoded: `Q_S = k_i * A_S * 10^3`. PDF p.46 (printed 44), §5.3.3.6:
> "Die Versickerungsleistung ergibt sich nach Gl. (4) als Produkt aus der Versickerungsfläche und der bemessungsrelevanten Infiltrationsrate.
> **Q<sub>S</sub> = k<sub>i</sub> ⋅ A<sub>S</sub> · 10<sup>3</sup>     (4)**
> Q<sub>S</sub> l/s Versickerungsleistung · k<sub>i</sub> m/s bemessungsrelevante Infiltrationsrate nach Gl. (5) · A<sub>S</sub> m² erforderliche Versickerungsfläche, anlagenspezifisch"

Exact match. ✅

### 3. `eq-gl8-a138-13` — claims printed p.48 — **FORMULA CONFIRMED / PAGE OFF-BY-ONE (SEV-3)**
Encoded: `V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3`. The equation is printed on **printed p.47 (PDF p.49)**, as the last line of §5.3.3.7:
> "**V<sub>VA</sub> = (Q<sub>zu</sub> – Q<sub>S</sub> – Q<sub>Dr</sub>) · D · 60 · f<sub>Z</sub> · f<sub>A</sub> · 10<sup>–3</sup>     (8)**"

Printed p.48 (PDF p.50) contains only the continuation `mit`-block (V<sub>VA</sub>, Q<sub>zu</sub>, Q<sub>S</sub>, Q<sub>Dr</sub>, D, f<sub>Z</sub>, f<sub>A</sub>). The formula itself matches the encoding **exactly**; the cited page points at the variable list, not the equation. Defensible but imprecise — a reader following the citation does not land on Gl.(8). ⚠️

### 4. `eq-gl17-a138-18` — claims printed p.59 — **CONFIRMED**
Encoded: `A_S_m = (b_R + h_R) * L_R + b_R * h_R`. PDF p.61 (printed 59), §6.4.2:
> "**A<sub>S,m</sub> = (b<sub>R</sub> + 2 · h<sub>R</sub>/2) · L<sub>R</sub> + (b<sub>R</sub> · h<sub>R</sub>/2) · 2 = (b<sub>R</sub> + h<sub>R</sub>) · L<sub>R</sub> + b<sub>R</sub> · h<sub>R</sub>     (17)**"

The encoding captures the **simplified right-hand form**, which the standard itself prints as the reduced result. Exact match. ✅

### 5. `tab-12` — claims printed p.49 — **PAGE CONFIRMED / CONTENT MISMATCH (SEV-2)**
Caption is at printed p.49 (PDF p.51) — page ✅. But:
- Node title: *"Tab.12 **Verfahrenswahl** (Einfaches/Nachweis)"*; node body: *"Method selection … **thresholds**"*; `data_class: standard_fixed`.
- Printed caption: **"Tabelle 12: *Empfehlung* hydrologischer Grundlagen für Versickerungsanlagen"**; decisive row: **"*Empfohlenes* Verfahren"**.

The table contains **no method-selection thresholds** — it is a recommendation matrix keyed on facility type. Classifying a document-declared *Empfehlung* as `standard_fixed` inverts its normative force. ❌

### 6. `tab-10` — claims printed p.45 — **PAGE-WRONG (SEV-1)**
Node asserts *"PDF PRINTED p.45 (caption located via pdftotext -layout)"*. The caption is at **printed p.46 (PDF p.48)**. The TOC independently agrees (`Tabelle 10: Beispiele Kriterien zur Festlegung von fOrt …… 46`). Printed p.45 contains Gl.(5) and Gl.(6) and only *references* Tabelle 10. The provenance claim — that the caption was located at p.45 — is **factually false**. ❌

Secondary: node title *"Tab.10 Korrekturfaktor f_Ort"* vs printed *"Beispiele Kriterien zur Festlegung von f<sub>Ort</sub>"* — the table gives **criteria for choosing** f<sub>Ort</sub>, it does not tabulate factor values.

### 7. `cr-a138-req-14` — claims printed p.48 — **CONFIRMED**
Encoded condition: `verify Gl. 8 iterated`. PDF p.50 (printed 48):
> "Die maßgebende Dauer des Bemessungsregens D **muss** im Einfachen Verfahren schrittweise bestimmt werden. Bei diesem iterativen Verfahren wird die Bemessungsgleichung Gl. (8) für unterschiedliche Wertepaare der Dauerstufe D und zugehöriger Regenspende r<sub>D,n</sub> berechnet, um ein eindeutiges Maximum für das erforderliche Speichervolumen zu finden (siehe Arbeitsblatt DWA-A 117)."

Page and substance both confirmed. ✅
**However** — the printed modal verb is **"muss"**, while the CR carries `severity: warn`. Flagged as ratification item R-2; I did not change it.

### 8. `cr-a138-req-19` — claims printed p.72 — **PAGE DEFENSIBLE / CONTENT MISMATCH (SEV-1)**
Encoded condition: `phase_4_gate_result IN {PASS, CONDITIONAL}`, `severity: block`, `provenance: VA`.

Printed p.72 (PDF p.74) does open §6.9 and does reference Tab.14:
> "**6.9 Zusammenstellung Planungs- und Bemessungsvorgaben** — In der Tabelle 14 werden die Planungs- und Bemessungsvorgaben aus 6.2 bis 6.8 zusammengestellt."

So the page citation is defensible (Tab.14 itself is on printed p.73). **But the encoded condition has no printed counterpart whatsoever.** Tabelle 14 (verbatim, printed p.73) is a specification matrix — k<sub>f</sub>-Wert maßgebliche Bodenschicht ≥ 1·10<sup>–6</sup> m/s (≥ 1·10<sup>–5</sup> for Versickerungsbecken); Mächtigkeit bewachsene Bodenzone ≥ 20 cm; k<sub>f</sub>-Wert bewachsene Bodenzone ca. 1·10<sup>–5</sup> m/s; Einstauhöhe (0 / i.d.R. ≤ 30 / i.d.R. ≥ 50 cm); Freibord Überlauf ≥ 10 / ≥ 35 cm; Böschungsneigung i.d.R. 1:1,5 oder flacher / ≤ 1:1,5; Entleerungszeit (n = 1/a) ≤ 84 h.

There is **no "Phase 4", no "gate", and no PASS/CONDITIONAL vocabulary** anywhere in DWA-A-138-1. `phase_4_gate_result` is an application-workflow construct. A `severity: block` CR carrying `provenance: VA` against a condition that is not printed in the source is a **provenance-integrity defect**: VA asserts PDF confirmation, and the PDF confirms the *page*, not the *condition*. ❌

## T3 score: **4 CONFIRMED / 1 page-off-by-one / 2 content-mismatch / 1 page-wrong.**

## Escalation — the tab- page defect is systematic, not a one-off

Node #6 prompted a sweep of **all 8 `tab-` nodes**, every one of which asserts *"caption located via pdftotext -layout"*. Re-derived against the caption ground truth above:

| node | claims printed p. | actual caption printed p. | delta | verdict |
|---|---|---|---|---|
| `tab-03` | 22 | **24** | −2 | ❌ PAGE-WRONG |
| `tab-05` | 26 | **27** | −1 | ❌ PAGE-WRONG |
| `tab-08` | 40 | 40 | 0 | ✅ |
| `tab-09` | 42 | 42 | 0 | ✅ |
| `tab-10` | 45 | **46** | −1 | ❌ PAGE-WRONG |
| `tab-11` | 45 | **46** | −1 | ❌ PAGE-WRONG |
| `tab-12` | 49 | 49 | 0 | ✅ (page only; content mismatch stands) |
| `tab-13` | **44** | **56** | **−12** | ❌❌ PAGE-WRONG |
| `tab-14` | 72 | **73** | −1 | ❌ PAGE-WRONG |

**6 of 9 `tab-` page claims are wrong**, and every one of them carries the identical provenance sentence claiming the caption was located by tool. That sentence cannot be true for six nodes. **SEV-1: the `tab-` node provenance line is unreliable as a class and should be re-derived wholesale, not spot-fixed.**

### Worst case — `tab-13`, a compounded defect (SEV-1)
- Page claim off by **12 pages** (44 vs 56).
- Title claim: *"Tab.13 Bodenart-Abschaetzung **k_f**"*, body: *"Soil-type -> **k_f** estimate"*.
- Printed reality (PDF p.58 = printed p.56):
  > **Tabelle 13: Größenordnungen A<sub>S,m</sub> nach Bodenart**
  > | Bodenart | Erforderliche, mittlere Versickerungsfläche A<sub>S,m</sub> |
  > |---|---|
  > | Mittel-/Feinsand | 0,10 · A<sub>C</sub> |
  > | schluffiger Sand, sandiger Schluff, Schluff | 0,20 · A<sub>C</sub> |

  Tabelle 13 estimates **A<sub>S,m</sub> (infiltration area) as a fraction of A<sub>C</sub>** — it says nothing about k<sub>f</sub>. The node's own trailing clause (*"backs a_s_m_determination_method=soil_estimate"*) is correct, so the title and the mechanism contradict each other **within the same node**. A node marked `provenance: VA` names the wrong quantity and the wrong page.

---

# T4 — Boundary check

## COMMAND
```powershell
foreach($doc in 'doc-kostra-dwd-2020','doc-dwa-a-118','doc-din-1986-100','doc-dwa-a-531'){
  "===== DEPENDENTS OF $doc ====="
  Get-ChildItem -Path $d -Filter *.md | ForEach-Object { $t=[System.IO.File]::ReadAllText($_.FullName,[System.Text.Encoding]::UTF8);
    if($t -match [regex]::Escape("[[$doc]]") -and $_.BaseName -ne $doc -and $_.BaseName -ne '_index'){
      $p=[regex]::Match($t,'(?m)^provenance:\s*(\S+)').Groups[1].Value
      $hasRef = if($t -match '`references::`\s*\[\[' + [regex]::Escape($doc)){'REF-EDGE'}else{'NO-REF-EDGE'}
      "  {0,-22} prov={1,-3} {2}" -f $_.BaseName,$p,$hasRef } } }
```
## RAW OUTPUT
```
===== DEPENDENTS OF doc-kostra-dwd-2020 =====
  cr-a138-req-05         prov=NR  REF-EDGE
  cr-a138-req-31         prov=NR  REF-EDGE
  cr-a138-req-32         prov=NR  REF-EDGE
  eq-gl10-a138-26        prov=NR  REF-EDGE
  eq-gl11-a138-16        prov=NR  REF-EDGE
  eq-gl12-a138-16        prov=NR  REF-EDGE
  eq-gl13-a138-16        prov=NR  REF-EDGE
  eq-gl14-a138-17        prov=NR  REF-EDGE
  eq-gl16-a138-17        prov=NR  REF-EDGE
  eq-gl19-a138-18        prov=NR  REF-EDGE
  eq-gl23-a138-18        prov=NR  REF-EDGE
  eq-gl25-a138-18        prov=NR  REF-EDGE
  eq-gl28-a138-19        prov=NR  REF-EDGE
  eq-gl29-a138-19        prov=NR  REF-EDGE
  eq-gl3-a138-10         prov=NR  REF-EDGE
  eq-gl30-a138-20        prov=NR  REF-EDGE
  eq-gl31-a138-20        prov=NR  REF-EDGE
  eq-gl32-a138-20        prov=NR  REF-EDGE
  eq-gl35-a138-21        prov=NR  REF-EDGE
  eq-gl37-a138-21        prov=NR  REF-EDGE
  eq-gl40-a138-21        prov=NR  REF-EDGE
  eq-gl41-a138-22        prov=NR  REF-EDGE
===== DEPENDENTS OF doc-dwa-a-118 =====
  cr-a138-req-08         prov=NR  REF-EDGE
  cr-a138-req-29         prov=NR  REF-EDGE
  tab-08                 prov=VC  REF-EDGE
===== DEPENDENTS OF doc-din-1986-100 =====
  cr-a138-req-22         prov=NR  REF-EDGE
  cr-a138-req-23         prov=NR  REF-EDGE
  eq-gl10-a138-26        prov=NR  REF-EDGE
===== DEPENDENTS OF doc-dwa-a-531 =====
  (no dependents)
```

## Mechanical result: **PASS**

All 28 dependent nodes cap at **NR** or **VC** (22 NR + 3 for A-118 incl. one VC + 3 for DIN 1986-100), and **every single one carries a `references::` edge** to its doc node. `in_library: false` is set on all 4 doc nodes. **Zero violations of the cap-and-edge invariant.** The KOSTRA block is exactly the 22 nodes the campaign counted.

## Content-expansion check: **PASS with one commendation**

I found **no** case where external-document content was expanded into this map's own fields/equations/tables. The two reproduction cases are handled correctly:

- **`tab-08`** reproduces Tabelle 8, whose printed caption is *"(Quelle: **in Anlehnung an** Arbeitsblatt DWA-A 118:2024)"*. The node correctly caps at **VC**, states the reproduction provenance explicitly (*"Values are `in Anlehnung an` DWA-A 118:2024, which is NOT in the library; the governing row must be quoted from that standard to reach VA"*), and carries the `references::` edge. **This is the Content Boundary Rule applied correctly** and is the model the `tab-` class should follow.
- DIN 1986-100's substantive thresholds used in the map (A<sub>C</sub> > 800 m², n = 0,033/a, T<sub>n</sub> = 30 a, T<sub>n</sub> = 100 a for the >70 % roof case) are all **printed in DWA-A-138-1's own §5.3.4.1 on printed pp.49–50**, so encoding them is in-boundary — they are this guideline's own printed pages, not an expansion of DIN 1986-100.

## Violations / gaps found

**V-1 (SEV-2) — `doc-dwa-a-531` is an orphan.** Zero dependents, yet DWA-A 531 is cited 4× in the PDF and is one of the **two named alternatives** for the design-rain input at printed p.42: *"Als Regendaten sind örtliche Niederschlag-/Starkregenauswertungen **gemäß Arbeitsblatt DWA-A 531 oder** aktuellen KOSTRA-Datensätzen … zu verwenden."* Every node that references KOSTRA for r<sub>D(n)</sub> should equally reference A-531, since the standard treats them as interchangeable sources. 22 nodes are missing that edge.

**V-2 (SEV-1) — `DWA-A 117` has NO doc node at all.**
```
COMMAND: Get-ChildItem -Path $d -Filter *.md | ForEach-Object { if((ReadAllText) -match 'A[- ]?117'){ $_.BaseName } }
RAW OUTPUT: (empty — zero matches across all 131 nodes)
```
Yet the citation census over the PDF is:
```
DWA-A 117 mentions: 10        DIN 1986-100 mentions: 10
DWA-A 118 mentions: 6         DIN EN 752 mentions: 9
DWA-A 531 mentions: 4         KOSTRA mentions: 12
```
DWA-A 117 is the **most-cited external document in the standard tied for first**, and it is *foundational*, not incidental — printed p.37: *"Die Bemessung von Versickerungsanlagen erfolgt **auf der Grundlage der Bemessungsansätze des Arbeitsblatts DWA-A 117**."* It also governs three encoded quantities: the Einfaches-Verfahren applicability conditions (*"nach Arbeitsblatt DWA-A 117:2013"*, printed p.37), the f<sub>Z</sub> range 1,1–1,2 (*"Je nach Risikomaß **gemäß Arbeitsblatt DWA-A 117**"*, printed p.48), and the f<sub>A</sub> Abminderungsfaktor (printed p.48). Per the Content Boundary Rule these should carry `in_library: false` + NR/VC caps via a `doc-dwa-a-117` node. **They currently carry no cap at all** — `eq-gl8-a138-13` and `cr-a138-req-14` are plain `VA`. This is the mirror image of the KOSTRA problem: KOSTRA is **over**-capped (22 nodes NR for project data), while A-117 is **un**-capped (a genuinely absent normative source with zero nodes).

**V-3 (SEV-3) — `DIN EN 752` has no doc node** (9 mentions; governs §5.3.3.4 Bemessungshäufigkeiten and the §5.3.3.2 conditions). Same class as V-2, lower blast radius.

**V-4 (SEV-3) — `tab-09` lacks reproduction-provenance.** Tabelle 9's printed caption is *"Empfohlene Abflussbeiwerte für das Einfache Verfahren **(Quelle: in Abstimmung mit DIN 1986-100:2016, ergänzt)**"*. `tab-09` is plain `VA` with no `references::` edge and no reproduction note — unlike `tab-08`, which handles the identical situation correctly. The table *is* printed in this guideline so `VA` is arguably defensible, but the provenance trail is missing.

---

# RATIFICATION ITEMS

**R-1 — Normativity of the Einfaches/Nachweis method choice (`dp-01-verfahrenswahl`). [T2]**
Governing quotes:
> §5.3.3.3, printed p.39 / PDF p.41: *"Für zentrale Versickerungsanlagen sowie auch bei gekoppelten/vernetzten Systemen … **ist der hydrologisch-hydraulische Nachweis mit einer Niederschlag-Abfluss-Langzeitsimulation zu empfehlen.**"*
> Tab.12 caption, printed p.49 / PDF p.51: *"Tabelle 12: **Empfehlung** hydrologischer Grundlagen für Versickerungsanlagen"*, row *"**Empfohlenes** Verfahren"*.
> §5.3.3.2, printed p.37 / PDF p.39: *"Für die Anwendung des Einfachen Verfahrens … **gelten** … **die folgenden Bedingungen**: …"* and *"**Die Einhaltung der Bedingungen für das Einfache Verfahren sind bei der Bemessung nachzuweisen.**"*

Decision required: ratify the two-part reading (method choice = SR-2 engineer selection at recommendation strength; §5.3.3.2 conditions = binding demonstrable obligation) and assign the modal-verb severity to each half separately. **Not decided by me.**

**R-2 — Severity of `cr-a138-req-14` (currently `warn`). [T3 #7]**
> Printed p.48 / PDF p.50: *"Die maßgebende Dauer des Bemessungsregens D **muss** im Einfachen Verfahren schrittweise bestimmt werden."*

"muss" against `severity: warn`. Decision required: raise to `block`, or ratify `warn` with rationale.

**R-3 — f<sub>Z</sub> range selection 1,1–1,2 (`dp-03-f-z-15`). [T2]**
> Printed p.48 / PDF p.50: *"Je nach Risikomaß gemäß Arbeitsblatt DWA-A 117 werden Zuschlagsfaktoren **zwischen 1,1 und 1,2** empfohlen. Insbesondere bei kleinen spezifischen Versickerungs-/Abflussleistungen bezogen auf A<sub>C</sub> (q<sub>S,AC</sub> ≤ 5 l/(s·ha)) wird ein Zuschlagsfaktor **f<sub>Z</sub> = 1,2 erforderlich**."*

Per SR-2 this is a range that must be surfaced as an explicit engineer selection, never auto-picked. REQ-15's conditional logic is confirmed correct; what is missing is the selection record for the 1,1–1,2 band. Note the range is attributed to **DWA-A 117** (V-2), so it may additionally warrant a VC cap.

**R-4 — Re-classification of r<sub>D(n)</sub> / KOSTRA from `standard_fixed` to `engineer_input`, and the disposition of the 22 capped nodes. [T1]**
> Printed p.42 / PDF p.44: *"Als Regendaten sind **örtliche** Niederschlag-/Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden."*
> KOSTRA export, page 1: *"**Rasterfeld 137089 (Zeile 137, Spalte 89)**"*.

Decision required: confirm r<sub>D(n)</sub> is project data supplied per site from the project's own Rasterfeld export, reclassify `doc-kostra-dwd-2020`, and decide whether the 22 nodes lift to VA on the strength of their own printed equations (my evidence says they can) or stay capped pending the *Anwendungshilfe*. **This is a campaign-level call, not mine.**

**R-5 — Internal modal-verb divergence on the DWD exact values. [T1]**
> Printed p.42 / PDF p.44: *"Bei KOSTRA-Datensätzen **können** die exakten Werte des DWD (DWD-Vorgabe) verwendet werden."* (permissive)
> Printed p.50 / PDF p.52: *"Bei Verwendung von KOSTRA-Regenspenden **sind** die exakten Werte des DWD (DWD-Vorgabe) der Regenstatistik **zu verwenden**."* (mandatory)

The standard contradicts itself on whether DWD exact values are optional or required. Decision required on which governs. (Plausible reading: p.50 is mandatory *within the Überflutungsnachweis* scope while p.42 is the general permission — but that is a domain call, not a textual one.)

**R-6 — `dp-02-n-range` lower bound. [T2]**
> Tab.12, printed p.49 / PDF p.51: *"Bemessungshäufigkeit n (1/a) … **0,02 – 0,5**"*
> §5.3.3.2, printed p.37 / PDF p.39: *"Die gewählte bzw. zulässige Überschreitungshäufigkeit des Speichervolumens beträgt **n ≥ 0,1/a** bzw. T<sub>n</sub> ≤ 10 a."*

The node states `{0.1..0.5}`; the standard prints 0,02–0,5 generally and n ≥ 0,1/a only as an Einfaches-Verfahren applicability limit. Decision required on which is the encoded range and whether the 0,1 bound is conditional on method.

---

# HONEST RESIDUE

1. **KOSTRA r<sub>D(n)</sub> numeric values — NOT VERIFIABLE.** The h(n)/R(n) value grids in both export PDFs are non-text (vector/graphic); `pdftotext` recovers only headers (`CHARS: 585` for the whole of page 1). I can quote the distribution parameters from page 2 but **not a single design-rainfall value**. I have not substituted a plausible number. Marked **NR**.
2. **KOSTRA-DWD-2020 methodology — STILL ABSENT.** The exports point to *"Anwendungshilfe zu KOSTRA-DWD-2020 des Deutschen Wetterdienstes"*, which I did not locate anywhere on this box. The actual methodology remains unavailable; only per-cell data was found. Marked **NR**.
3. **DWA-A 117, DWA-A 118, DWA-A 531, DIN 1986-100, DIN EN 752 — all out of library.** No content from any of them is verified in-session. Every claim I make about them is limited to how DWA-A-138-1 *cites* them. Marked **NR** (V-2/V-3 flag the two with no doc node).
4. **§5.3.3.2 clause word order.** The `(gelten` token position is an extraction artifact of the two-column layout. Substance is unambiguous; exact printed word order at that one clause is **VC, not VA**, until eyeballed on the rendered page.
5. **T3 is a sample of 8 of 62** eligible VA nodes (plus a full 9-node sweep of the `tab-` class prompted by finding #6). The 44 unsampled eq-/cr- VA nodes are **unaudited** — given a 6-of-9 defect rate in the `tab-` class, I cannot assert the eq-/cr- classes are clean. The 4/4 clean eq- result is encouraging but not sufficient.
6. **`bild-07`, `anh-a`, `dp-04`, `dp-05`, and all 28 `section-` nodes** were not audited (out of the T1–T4 scope).
7. **Tabelle 14's full cell matrix** extracted with heavy column interleaving due to rotated headers. I transcribed the values I could read unambiguously; the facility-column alignment for a few cells (particularly the Mulden-Rigolen-Element/System spans) should be confirmed visually before any of those thresholds is encoded. Marked **VC** for cell-to-column assignment, **VA** for the values themselves.
8. **Prod DB not consulted.** Many nodes assert *"GENERATED from prod `equations` … verification_status=verified_against_standard, source_quote present"*. I did not query prod (read-only PDF/map audit), so I verified those claims **against the PDF only**, which is the higher authority per SR-3 anyway. Any divergence between prod `source_quote` and the PDF is unexamined.

---

# REVERSALS

**REV-1 (primary, T1) — "Locating KOSTRA-DWD-2020 unblocks ~22 NR nodes" is FALSE.**
The located files are per-Rasterfeld grid-cell data exports (`Rasterfeld 137089 / 136089`) = **project data**, not the normative methodology. They cannot lift any node to VA. The real methodology (the DWD *Anwendungshilfe*) remains unlocated, and obtaining it would not lift these nodes either, because r<sub>D(n)</sub> is inherently site-specific — DWA-A-138-1 itself says the rain data must be *"örtliche"* (printed p.42). The correct action is **re-classification to `engineer_input`**, not document acquisition. The campaign line item should be struck and replaced with ratification item R-4. *(The map's own `cr-a138-req-05`, which already encodes `kostra_grid_cell IS NOT NULL`, independently corroborates this.)*

**REV-2 (T2) — "§5.3.3.3 spans PDF pp.41–52" is FALSE.** It occupies PDF p.41 (printed p.39) only, terminating mid-page at §5.3.3.4. Pages 42–52 are different subsections.

**REV-3 (T2) — "Tab.12 gives thresholds" (the stated premise of `dp-01-verfahrenswahl`) is FALSE.** Tab.12 is captioned *"Empfehlung"*, its decisive row is *"Empfohlenes Verfahren"*, and it is keyed on facility type, not on any numeric threshold. The numeric thresholds the decision point is reaching for live in §5.3.3.2 (printed p.37). The decision point is mis-framed and `tab-12`'s `data_class: standard_fixed` inverts the table's declared normative force.

**REV-4 (T3) — the `tab-` node provenance claims are not trustworthy as a class.** Six of nine assert a caption location that is demonstrably wrong, all under an identical *"caption located via pdftotext -layout"* sentence. Worst case `tab-13` is off by 12 pages **and** names the wrong physical quantity (k<sub>f</sub> vs A<sub>S,m</sub>). Any downstream work that trusted `tab-` `source_page` values needs re-derivation.

**REV-5 (T4) — the "external docs are all correctly capped" posture is half right.** The cap-and-edge invariant passes cleanly (28/28). But the map is simultaneously **over-capping KOSTRA** (22 nodes NR for what is project data) and **entirely failing to cap DWA-A 117** (zero nodes, despite being the declared foundation of the whole §5.3.3 design method and the source of the f<sub>Z</sub> range). Net document-boundary risk is higher, not lower, than the clean invariant suggests.

**NON-REVERSAL / premise confirmed (R-5 discipline cuts both ways):**
- The **+2 page offset** premise was correct — independently re-derived at 14 pages.
- **REQ-15's f<sub>Z</sub> logic** `(q_S_AC > 5 OR f_Z == 1.2)` is a **correct** encoding of the printed rule. I looked for a defect here and there isn't one.
- The **T4 cap-and-edge invariant** genuinely passes; `tab-08` is an exemplary application of the Content Boundary Rule.
- The **4 sampled eq- nodes** matched their printed formulas exactly (3 exact page hits, 1 off-by-one). The equation encodings themselves look sound.
