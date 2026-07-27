# Wave-1 regulatory-encoding audit — DWA-A-262E

**Scope:** one standard, DWA-A-262E (November 2017). Read-only audit. No fixes applied, no DB writes, no map edits.
**Session date:** 2026-07-27. Model: claude-opus-5.

## Sources actually opened this session

| item | path | status |
|---|---|---|
| PDF (ground truth, SR-3) | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).pdf` | opened, text-extractable, 77 pdftotext pages (76 printed + trailing empty) |
| Reasoning map | `C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-262E\` | 131 files |
| Extraction dir | `…\scratchpad\262E_full.txt`, `…\scratchpad\262E_clean.txt`, `…\scratchpad\pages\pdf001..077.txt` | generated this session |

Watermark line `Von der DWA lizenziert für ID: <…>, <04.12.2025 03:37>` stripped from every quote below.

### Map inventory (re-derived, R-3)

```
COMMAND:
Get-ChildItem $d -File | Group-Object {($_.BaseName -split '-')[0]} | Select-Object Name,Count

RAW OUTPUT:
Name    Count
----    -----
cr         60
doc         8
dp          8
eq         18
section    33
tab         3
_index      1
```

Total 131 files (130 nodes + index). Matches the index's own claim of 60 cr / 18 eq / 33 section / 3 tab / 8 doc / 8 dp.

---

## Page-offset derivation (done from THIS PDF, no assumption)

```
COMMAND:
& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout "C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).pdf" "<scratch>\262E_full.txt"
$t=[System.IO.File]::ReadAllText("$out\262E_full.txt",[System.Text.Encoding]::UTF8); $pages=$t -split "`f"
foreach($i in 8,12,20,35,63){ …last 2 non-blank lines… }

RAW OUTPUT (footers):
=== PDFPAGE  8 ===  "6         DWA Set of Rules                        November 2017"
=== PDFPAGE 12 ===  "10        DWA Set of Rules                        November 2017"
=== PDFPAGE 20 ===  "18        DWA Set of Rules                        November 2017"
=== PDFPAGE 35 ===  "November 2017          DWA Set of Rules    33"
=== PDFPAGE 63 ===  "November 2017          DWA Set of Rules    61"
```

Five samples: pdf 8→6, 12→10, 20→18, 35→33, 63→61.
**Derived offset: printed = pdftotext page − 2 (i.e. pdftotext page = printed + 2).** Every "printed p.N" below was read off that page's own running footer.

**Independent cross-check available in the document itself:** the *List of Tables* on printed p.9 (pdf 11) prints the printed page of every table. It agrees with the footer arithmetic everywhere I checked (Table 1→20, Table 2→21, Table 3→23, Table 4→25, Table 10→28, Table 24→66).

### REVERSAL #0 — the map's stated page method is wrong

`_index.md` §"Page convention" states:

> "Verified this session: eq (1) sits between footer "18" (line 1074) and footer "19" (line 1142) → printed **18**"

That inference is inverted. Text lying *between* the footer-18 line and the footer-19 line is the body of the page whose footer is **19**. Equation (1) is printed on **p.19** (pdf 21) — verified verbatim below. This single methodological error is the source of a systematic −1 across all 18 equation nodes and much of the CR/section set.

---

# T1 — NEW DEFECT CLASS N-1: source-absent vocabulary

## Method

Full text extracted once, watermark lines dropped, then every distinctive token of every `cr-` node's condition/title probed against the PDF (whole text and per-page files).

```
COMMAND:
$d=<map>; Get-ChildItem $d -File -Filter "cr-*.md" | … extract source_page/provenance/severity/data_class/owner + "Condition:" …

RAW OUTPUT (60 rows, abridged to the distinctive-vocabulary column):
cr-req-01   COND=system_size_category IN {small_wwts, municipal_wwtp}
cr-req-02a  COND=wastewater_significantly_different == False
cr-req-02c  COND=Q_GW_taeglich >= 75
cr-req-03   COND=x_Q_max == 8
cr-req-04a  COND=q_F>=0.05 AND q_F<=0.15
cr-req-04b  COND=q_R_Tr>=0.2 AND q_R_Tr<=0.7
cr-req-05   COND=m_multiplier >= 1
cr-req-06   COND=f_S_QM>=6 AND f_S_QM<=9
cr-req-07   COND=m_T_aM>=0.25 AND m_T_aM<=1
cr-req-08   COND=pretreatment_selected != none
cr-req-09   COND=attest_a262_10_req_09 == True
cr-req-10   COND=attest_a262_18_req_10 == True
cr-req-101  COND=f_A_F_CSB_Betrieb <= 27
cr-req-102  COND=t_Sicker_min_aM >= 6
cr-req-103  COND=f_A_F_CSB_KomKA_in <= 20
cr-req-104  COND=q_F_T_KomKA_in <= 80
cr-req-11   COND=f_red >= 0.5
cr-req-110  COND=A_Fo1_spez_KomKA >= 1
cr-req-111  COND=A_Fo2_spez_KomKA >= 1
cr-req-112  COND=f_A_F01_CSB <= 80
cr-req-11b  COND=t_Reg <= 6
cr-req-12   COND=if wastewater_type==greywater_only then w_s_d >= 75
cr-req-13   COND=B_d_TKN <= B_A_TKN_zul
cr-req-130  COND=A_Fu_spez_VFK_KomKA >= 1
cr-req-131  COND=f_V_CSB_VFK_KomKA <= 100
cr-req-14   COND=RV <= 2
cr-req-141  COND=q_F_T_Betrieb <= 240
cr-req-142  COND=q_AWF_aM <= 500
cr-req-15   COND=fines_fraction <= 2
cr-req-150  COND=f_A_Fu_CSB <= 16
cr-req-16   COND=U < 5
cr-req-17   COND=IF lining_type IN {mineral_seal_clay, unsealed_subsoil} THEN k_f_subsoil_m_s <= 1e-8
cr-req-18a  COND=IF lining_type==geomembrane THEN geomembrane_thickness_mm >= 1.5
cr-req-18c  COND=IF lining_type==geomembrane THEN geotextile_robustness_class IN {GRK4, GRK5}
cr-req-19eff-a COND=effluent_BOD5_mg_l <= 40
cr-req-19eff-b COND=effluent_COD_mg_l <= 150
cr-req-20   COND=IF nitrification_required THEN effluent_S_NH4_mg_l <= 10
cr-req-20b  COND=IF nitrification_required THEN effluent_temperature_C >= 12
cr-req-21   COND=maintenance_plan_documented == True
cr-req-22   COND=climate_zone != permafrost
cr-req-30   COND=aufenthaltszeit >= 2
cr-req-33   COND=IF filter_type==raw_wastewater_filter THEN f_A_F_CSB <= 100
cr-req-34   COND=… q_F_T <= 250
cr-req-35   COND=… q_Beschickung_Fo >= 10
cr-req-36   COND=… h_Beschickung_Fo 20-50
cr-req-40   COND=A_Fo_spez_VFS_KA >= 4
cr-req-41   COND=A_Fo_min_VFS_KA >= 16
cr-req-50   COND=A_Fo1_spez >= 1
cr-req-51   COND=A_Fo2_spez >= 1
cr-req-60   COND=A_Fo_spez_VFG_KA >= 1
cr-req-61   COND=A_Fo_min_VFG_KA >= 4
cr-req-70   COND=A_Fu_spez >= 1
cr-req-71   COND=A_Fu_min >= 4
cr-req-81   COND=l_Rieselr >= 6
cr-req-82   COND=L_Rieselr <= 18
cr-req-83   COND=B_FGR >= 0.5
cr-req-84   COND=h_Beschickung_Fu >= 20
cr-req-90   COND=A_F_spez_HFK_KA >= 1
cr-req-91   COND=f_A_ANF_CSB <= 200
cr-req-92   COND=L_HF_min >= 2
```

## Vocabulary presence sweep

```
COMMAND (bash, per probe): grep -c -i -- "<probe>" 262E_clean.txt ; grep -l -i -- "<probe>" pages/*.txt | head -1

RAW OUTPUT:
REQ-01/enum small_wwts     | probe="small wastewater treatment system"      | hits=41 | firstPDFpage=5
REQ-01/enum municipal_wwtp | probe="municipal wastewater treatment plant"   | hits=32 | firstPDFpage=8
REQ-02a                    | probe="differs significantly in nature"        | hits=1  | firstPDFpage=12
REQ-02c/greywater          | probe="greywater production can be set at"     | hits=1  | firstPDFpage=23
REQ-03/xQmax               | probe="xQ,max = 8"                             | hits=1  | firstPDFpage=21
REQ-04a                    | probe="0.05 l/(s·ha)"                          | hits=1  | firstPDFpage=21
REQ-04b                    | probe="0.7 l/(s·ha)"                           | hits=1  | firstPDFpage=21
REQ-06                     | probe="values between 6 and 9"                 | hits=1  | firstPDFpage=22
REQ-07                     | probe="Usually mT,aM is between 0.25 and 1"    | hits=1  | firstPDFpage=22
REQ-11/f_red               | probe="fred ≥ 0.5"                             | hits=1  | firstPDFpage=34
REQ-11b/t_Reg              | probe="maximum calculation of 6 months"        | hits=1  | firstPDFpage=35
REQ-13/TKN                 | probe="BA,TKN, zul"                            | hits=2  | firstPDFpage=35
REQ-14/RV                  | probe="RV > 2"                                 | hits=1  | firstPDFpage=46
REQ-15/fines               | probe="content of fines"                       | hits=1  | firstPDFpage=48
REQ-16/U                   | probe="uniformity coefficient"                 | hits=2  | firstPDFpage=20
REQ-17/kf                  | probe="does not require additional sealing"    | hits=1  | firstPDFpage=48
REQ-18a                    | probe="≥ 1.5 mm UV-resistant"                  | hits=1  | firstPDFpage=47
REQ-18c                    | probe="robustness class of GRK4 or GRK5"       | hits=1  | firstPDFpage=47
REQ-19eff                  | probe="BOD5 ≤ 40 mg/l"                         | hits=1  | firstPDFpage=12
REQ-20/NH4                 | probe="SNH4 ≤ 10 mg/l"                         | hits=2  | firstPDFpage=12
REQ-21/maint               | probe="must be carefully documented"           | hits=1  | firstPDFpage=65
REQ-22/permafrost          | probe="permafrost"                             | hits=2  | firstPDFpage=5
REQ-33..36/rawfilter       | probe="Raw Wastewater Filter"                  | hits=28 | firstPDFpage=5
enum geomembrane           | probe="geomembrane"                            | hits=1  | firstPDFpage=47
enum mineral_seal_clay     | probe="mineral seal with clay"                 | hits=1  | firstPDFpage=47
enum unsealed_subsoil      | probe="unsealed subsoil"                       | hits=0  | firstPDFpage=NONE
campaign Phase 4           | probe="Phase 4"                                | hits=0  | firstPDFpage=NONE
campaign gate_result       | probe="gate_result"                            | hits=0  | firstPDFpage=NONE
campaign CONDITIONAL       | probe="CONDITIONAL"                            | hits=0  | firstPDFpage=NONE
campaign attestation       | probe="attestation"                            | hits=0  | firstPDFpage=NONE
campaign verdict           | probe="verdict"                                | hits=0  | firstPDFpage=NONE
```

Three probes returned 0 only because my probe string straddled a pdftotext line wrap. Re-probed:

```
COMMAND: for p in "of m = 1" "is a prerequisite" "of ≥ 2 h at QTr,h,max" "subsoil with a permeability"; do grep -l -- "$p" pages/*.txt; grep -h -- "$p" 262E_clean.txt; done

RAW OUTPUT:
--- probe: of m = 1 ---                    pages/pdf021.txt   "of m = 1."
--- probe: is a prerequisite ---           pages/pdf047.txt   "A functioning pretreatment step according to Section 4.2 is a prerequisite for long-term operation of"
--- probe: of ≥ 2 h at QTr,h,max ---       pages/pdf022.txt   "of ≥ 2 h at QTr,h,max"
--- probe: subsoil with a permeability --- pages/pdf048.txt   "A subsoil with a permeability value kf ≤ 10 m/s does not require additional sealing. Determination of"
```
(the `10` in the last line is `10⁻⁸`; the superscript `-8` is emitted by pdftotext on the preceding line — see the verbatim block in T3/REQ-17.)

## T1 VERDICT

**0 of 60 `cr-` nodes carry source-absent vocabulary.** No campaign/project vocabulary anywhere in the map: `Phase 4` = 0 hits, `gate_result` = 0, `CONDITIONAL` = 0, `verdict` = 0 in the PDF **and** none of those tokens appears in any CR condition either. Every enum literal, named threshold and coined symbol in every CR condition resolves to printed text in DWA-A-262E.

Two nuances, reported honestly rather than inflated:

* `unsealed_subsoil` is a snake_case identifier the standard never spells; the *concept* is printed verbatim (printed p.46: "A subsoil with a permeability value kf ≤ 10⁻⁸ m/s does not require additional sealing"). Identifier-level coinage, not normative-vocabulary invention. **Not** an N-1 hit.
* `attest_a262_10_req_09` / `attest_a262_18_req_10` (REQ-09/REQ-10) are pure workflow vocabulary with no source counterpart — but both nodes are already `provenance: VC`, `source_page:` blank, i.e. they do **not** claim source authority. **Not** an N-1 hit under the class definition (VA + block + absent vocabulary).

### T1 side-finding — one source-absent *document identifier* (N-1 adjacent, on a `doc-` node)

`doc-din-en-iso-grain.md` is titled **"DIN EN ISO 17892-4 / grain-size analysis"** and `source_document: DIN EN ISO 17892-4 / grain-size analysis`.

```
COMMAND: grep -c "17892" 262E_clean.txt ; grep -n "14688" 262E_clean.txt
RAW OUTPUT:
0
569:  DIN EN ISO 14688-1, Geotechnische Erkundung und Untersuchung – Benennung, Beschreibung und
3870: DIN EN ISO 14688-1 (Norm…)
```

**"DIN EN ISO 17892" appears zero times in DWA-A-262E.** The standard's §2 References (printed p.11, pdf 13) lists **DIN EN ISO 14688-1** ("Geotechnische Erkundung und Untersuchung – Benennung, Beschreibung und Klassifizierung von Boden – Teil 1"), which is the standard actually cited in Table 20's column header (printed p.47). The node also carries `(DWA-A-262E printed p.46)` for a citation that is on printed p.47. **SEV-2** (the node is `provenance: NR`, so it does not stamp a fabricated identifier as verified — but the identifier is invented).

---

# T2 — NEW DEFECT CLASS N-2: `tab-` provenance reliability

Three `tab-` nodes. All three carry the generated boilerplate `**Provenance basis.** Rendered PDF p.N (scoop pdftotext -layout).` — the same unverified-generated-provenance signature seen on DWA-A-138-1.

Authoritative cross-check used: the standard's own *List of Tables*, printed p.9 (pdf 11).

```
COMMAND: (PowerShell) print pdf 11 with watermark lines removed
RAW OUTPUT (excerpt):
List of Tables
Table 1:  Wastewater specific mass loads per population equivalent in g/(P ⋅d) .....................  20
Table 2:  Greywater specific mass loads per population equivalent in g/(P⋅d) .........................  21
Table 3:  Requirements for raw wastewater filters for use as primary treatment ..................  23
Table 4:  … small wastewater treatment systems ...........................................  25
Table 10: … municipal wastewater treatment plants .......................................  28
Table 24: Scope and timing of self-inspection and maintenance checks for municipal
          wastewater treatment plants .....................................................................  66
```

```
COMMAND: grep -n "Table 24" pages/*.txt ; grep -n "Table 1:" pages/*.txt ; grep -n "Table 2:" pages/*.txt
RAW OUTPUT:
pdf011.txt:59:  Table 24: … (List of Tables entry)
pdf067.txt:54:  Table 24 provides an overview of the scope and timing of maintenance checks for municipal
pdf068.txt:4:   Table 24: Scope and timing of self-inspection and maintenance checks for municipal wastewater
pdf011.txt:13:  Table 1: … (List of Tables entry)
pdf022.txt:6:   Table 1: Wastewater specific mass loads per population equivalent in g/(P⋅d)
pdf011.txt:14:  Table 2: … (List of Tables entry)
pdf023.txt:9:   Table 2: Greywater specific mass loads per population equivalent in g/(P⋅d)
```

| node | claimed `source_page` | actual printed page (pdf page) | table present there? | quantity claim | verdict |
|---|---|---|---|---|---|
| `tab-a262-01-massloads` | **19** | **20** (pdf 22) | yes | correct | **PAGE-WRONG** (→20) |
| `tab-a262-02-greywater` | **20** | **21** (pdf 23) | yes | correct | **PAGE-WRONG** (→21) |
| `tab-a262-24-maint` | **59** | **66** (pdf 68) | yes | correct | **PAGE-WRONG** (→66) |

Printed p.59 (pdf 61) contains §5.5 "Inlet and Outlet Construction" — no table at all. Printed p.19/20 mismatch is off-by-one; the Table-24 claim is off by **seven** pages.

**Quantity checks (all CONFIRMED, verbatim, printed p.20 / pdf 22):**

> Table 1: Wastewater specific mass loads per population equivalent in g/(P⋅d)
> BSB5 (BOD5) 60 / 40 / 10 / 30 · CSB (COD) 120 / 80 / 25 / 60 · TS 70 / 25 / 8 / 16 · TKN 11 / 10 / 4.4 (>12°C) / 8.5 · GesN (TN) 11 / 10 / 10 / 10 · Pges (TP) 1.8 / 1.6 / 1.6 / 1.6
> NOTES 1) From Standard ATV-DVWK-A 198:2003, except for TN.

**printed p.21 / pdf 23:**
> Table 2: Greywater specific mass loads per population equivalent in g/(P⋅d)
> BSB5 (BOD5) 18 / 31 · CSB (COD) 47 / 57 · TS 13 / 7 · TKN 1 / — · GesN (TN) 1 / 1 · Pges (TP) 0.5 / 0.4

**printed p.66 / pdf 68:**
> Table 24: Scope and timing of self-inspection and maintenance checks for municipal wastewater treatment plants
> Check | Frequency ; Type | Location | Interval ; Sludge level | Pretreatment, each chamber / component | Depending on the type of pretreatment, 1x per quarter …

## T2 VERDICT

**Table reliability 0/3 on page (0 %); 3/3 on quantity.** The N-2 class fully reproduces on DWA-A-262E: `tab-` node `source_page` is a generated, unverified field. The values themselves were read correctly — only the page provenance is fabricated.

---

# T3 — VA spot-audit

The brief asked for 10 VA nodes. Because T2 exposed a systematic page problem I widened the sample and re-executed page verification for **99 VA nodes carrying a `source_page`** (56 cr + 18 eq + 25 section). All page results below are from opening the cited page and the true page.

## T3.a — sample of 10 (the requested mix), with verbatim quotes

### 1. `cr-req-03` — claimed p.18, `x_Q_max == 8` → **PAGE-WRONG (actual printed 19)**
Printed p.19 (pdf 21), verbatim:
> The hourly peak flow for municipal wastewater must be set at xQ,max = 8 h/d.

Value CONFIRMED. Printed p.18 (pdf 20) is the tail of the symbol list — `xQ,max h/d peak factor — hourly peak runoff for municipal wastewater` — a definition, not the "= 8" rule.

### 2. `cr-req-04a` — claimed p.19, `q_F>=0.05 AND q_F<=0.15` → **CONFIRMED**
Printed p.19 (pdf 21), verbatim:
> The determination of extraneous water and stormwater must be based on Standard DWA-A 118 with qF (0.05 l/(s·ha) to 0.15 l/(s·ha)) and qR,Tr (0.2 l/(s·ha) to 0.7 l/(s·ha)).

Also CONFIRMS `cr-req-04b` (p.19) and `cr-req-05` (p.19, next sentence): "If m (lump-sum multiplier) is assumed, m should be chosen depending on the length of the sewer network, and must be a minimum of m = 1."

### 3. `cr-req-06` — claimed p.19, `f_S_QM>=6 AND f_S_QM<=9` → **PAGE-WRONG (actual printed 20)**
Printed p.20 (pdf 22), verbatim:
> For fS,QM, values between 6 and 9 should be selected (corresponding to Standard ATV-DVWK-A 198:2003).

Value CONFIRMED.

### 4. `cr-req-18a` — claimed p.44, `geomembrane_thickness_mm >= 1.5` → **PAGE-WRONG (actual printed 45)**
Printed p.45 (pdf 47), §5.3 Lining, verbatim:
> plastic water-resistant geomembrane which must be embedded in the slope: thickness of ≥ 1.5 mm UV-resistant, flexible material preferably made of polyethylene. For liner installation without welds in small wastewater treatment systems, the thickness of the polyethylene-based liner can be ≥ 1 mm.

Value CONFIRMED; the missing weld-free branch (`dp-req18a-weld-branch`) is **CONFIRMED present in the source**.

### 5. `cr-req-17` — claimed p.44, `k_f_subsoil_m_s <= 1e-8` for `{mineral_seal_clay, unsealed_subsoil}` → **PAGE-WRONG (actual printed 45 and 46)**
Printed p.45 (pdf 47), mineral-seal branch, verbatim (superscript `-8` emitted on its own line by pdftotext):
> mineral seal with clay material: The material must be installed in layers of approximately 30 cm, and must be compacted to a minimum of 95% Proctor density. … Alternatively, this can be achieved by using a base layer ≥ 60 cm of a bentonite mixture. A kf-value of ≤ 10⁻⁸ m/s must be demonstrated. Determination of the kf-value

Printed p.46 (pdf 48), unsealed-subsoil branch, verbatim:
> A subsoil with a permeability value kf ≤ 10⁻⁸ m/s does not require additional sealing. Determination of the kf-value must occur before the filter media is installed, and be conducted according to DIN 18130-1 on a minimum of three soil samples.

Value CONFIRMED for both branches; **one node cites one page for a threshold that spans two pages.**

### 6. `cr-req-19eff-a` / `-b` / `cr-req-20` / `cr-req-20b` — claimed p.4 → **PAGE-WRONG (actual printed 10)**
Printed p.4 (pdf 6) contains only the gender-language note and "Previous Versions". The actual text, printed p.10 (pdf 12), §1 Scope, verbatim:
> Generally, the treatment plants described herein are able to meet the wastewater treatment requirements according to the Size Class #1, Appendix 1, Part C of the German Wastewater Ordinance (BOD5 ≤ 40 mg/l, COD ≤ 150 mg/l in randomly collected samples; four out of five samples must be within the limit). In addition, vertical flow filters and aerated horizontal flow filters are suitable for further nitrification (SNH4 ≤ 10 mg/l) at filter effluent water temperatures of at least 12°C.

Values CONFIRMED (40 / 150 / 10 / 12). **SEV-1 secondary finding:** all four are `severity: block`, `data_class: standard_fixed`, `provenance: VA` — but (a) the sentence is a *capability* statement ("are able to meet"), not a design requirement, and (b) the numbers are a reproduction of the **German Wastewater Ordinance (AbwV)**, carried with no reproduction-provenance and no `doc-` node. See T4.

### 7. `cr-req-101` — claimed p.33, `f_A_F_CSB_Betrieb <= 27` → **PAGE-WRONG (actual printed 28)**
Printed p.28 (pdf 30), Table 10, verbatim rows:
> Table 10: Requirements of vertical filters with sand for use as the main biological treatment step in municipal wastewater treatment plants
> Specific area, as measured on the upper surface of the filter — AFo,spez — m²/P — ≥ 4 *)
> or average daily specific CSB (COD) areal loading rate over the total filter area … — fA,Fo,CSB — g/(m²·d) — ≤ 20
> and average daily specific CSB (COD) areal loading rate over the area of the filter in operation … — fA,Fo,CSB,Betrieb — g/(m²·d) — ≤ 27
> Average specific daily hydraulic loading rate over the total filter area AFo at QT,d,aM … — qFo,T — l/(m²·d) — ≤ 80
> Average minimum time between dosing intervals — tSicker,min,aM — h — ≥ 6

Value CONFIRMED. Same page also CONFIRMS the values of `cr-req-102` (≥6), `cr-req-103` (≤20), `cr-req-104` (≤80) — all four claim p.33; all four are **PAGE-WRONG → 28**.

### 8. `eq-a262-gl16` — claimed p.43, `eta_DN = 1 - 1/(1+RV) + eta_VF` → **PAGE-WRONG (actual printed 44)**
Printed p.44 (pdf 46), verbatim:
> The removal efficiency of the upstream denitrification (ηDN) depends on the recirculation ratio (RV) and the additional denitrification efficiency of 10 % to 20 % that can be expected within the vertical flow filter (ηVF). The overall removal efficiency is calculated as follows:
> ηDN = 1 − 1/(1 + RV) + ηVF   (16)
> Experience shows that RV > 2 leads to no additional improvement in treatment performance.

Formula CONFIRMED including the additive `+ ηVF` term the node itself flagged as uncertain. Same page CONFIRMS `cr-req-14` (`RV <= 2`, claimed p.43 → actual 44).

### 9. `eq-a262-gl18` — claimed p.46, `U = d_60/d_10 with U < 5` → **PAGE-WRONG (actual printed 47)**
Printed p.47 (pdf 49), verbatim:
> The uniformity coefficient should be:
> U = d60/d10 < 5   (18)

Formula CONFIRMED. Same page CONFIRMS `eq-a262-gl17` (`kfA-value (m/s) = (d10)²/100 (17)`, "d10 in mm") and `cr-req-16` (`U < 5`, claimed p.46 → actual 47).

### 10. `section-a262-28` — claimed p.43 → **CONFIRMED**
Printed p.43 (pdf 45), verbatim heading:
> 4.5   Treatment Systems with Additional Requirements on the Effluent Quality

**Sample-of-10 tally: 2 CONFIRMED (`cr-req-04a`, `section-a262-28`), 8 PAGE-WRONG. 0 value/formula MISMATCHES.**

## T3.b — full page re-verification (all 99 VA nodes with a `source_page`)

### Compliance requirements (56 with a page)

| node | claimed | actual printed | verdict |
|---|---|---|---|
| REQ-01 | 4 | 10 (§1 Scope) | PAGE-WRONG |
| REQ-02c | 20 | 21 (§4.1.3) | PAGE-WRONG |
| REQ-03 | 18 | 19 | PAGE-WRONG |
| REQ-04a | 19 | 19 | **CONFIRMED** |
| REQ-04b | 19 | 19 | **CONFIRMED** |
| REQ-05 | 19 | 19 | **CONFIRMED** |
| REQ-06 | 19 | 20 | PAGE-WRONG |
| REQ-07 | 20 | 20 | **CONFIRMED** |
| REQ-08 | 44 | 45 (§5.2) | PAGE-WRONG |
| REQ-11 | 31 | 32 | PAGE-WRONG |
| REQ-11b | 31 | 32 (also 18, 33) | PAGE-WRONG |
| REQ-13 | 31 | 33 (eqs 13/14) | PAGE-WRONG |
| REQ-14 | 43 | 44 | PAGE-WRONG |
| REQ-15 | 45 | 46 (§5.4.1) | PAGE-WRONG |
| REQ-16 | 46 | 47 | PAGE-WRONG |
| REQ-17 | 44 | 45 + 46 | PAGE-WRONG |
| REQ-18a | 44 | 45 | PAGE-WRONG |
| REQ-18c | 44 | 45 | PAGE-WRONG |
| REQ-19eff-a/-b | 4 | 10 | PAGE-WRONG ×2 |
| REQ-20 / REQ-20b | 4 | 10 | PAGE-WRONG ×2 |
| REQ-21 | 59 | 63 (§6.1) | PAGE-WRONG |
| REQ-22 | 3 | 3 | **CONFIRMED** |
| REQ-30 | 19 | 20 (Table 1 header) | PAGE-WRONG |
| REQ-33/34/35/36 | 11 | 23 (Table 3) | PAGE-WRONG ×4 |
| REQ-40 / REQ-41 | 22 | 25 (Table 4) | PAGE-WRONG ×2 |
| REQ-50 / REQ-51 | 23 | 26 (Table 5) | PAGE-WRONG ×2 |
| REQ-60 / REQ-61 | 24 | 26 (Table 6) | PAGE-WRONG ×2 |
| REQ-70 / REQ-71 | 25 | 26 (Table 7) | PAGE-WRONG ×2 |
| REQ-81/82/83/84 | 26 | 27 (Table 8) | PAGE-WRONG ×4 |
| REQ-90 | 27 | 27 (Table 9) | **CONFIRMED** |
| REQ-91 / REQ-92 | 27 | 28 (Table 9 end) | PAGE-WRONG ×2 |
| REQ-101/102/103/104 | 33 | 28 (Table 10) | PAGE-WRONG ×4 |
| REQ-110/111/112 | 34 | 29 (Table 11) | PAGE-WRONG ×3 |
| REQ-130 / REQ-131 | 36 | 31 (Table 13) | PAGE-WRONG ×2 |
| REQ-141 / REQ-142 | 37 | 32 (Table 14) | PAGE-WRONG ×2 |
| REQ-150 | 34 | 35 (Table 16) | PAGE-WRONG |

**CR page reliability: 6 / 56 = 10.7 %.**
**CR value reliability: 56 / 56 = 100 %** — every threshold, range bound and enum literal matched the printed source. Zero WRONG-QUANTITY.

Selected verbatim backing not already quoted:

printed p.23 (pdf 25), Table 3 — backs REQ-33/34/35/36:
> Table 3: Requirements for raw wastewater filters for use as primary treatment
> … fA,Fo,CSB — g/(m²·d) — ≤ 100 · qFo,T — l/(m²·d) — ≤ 250 · qBeschickung,Fo — l/(m²·min) — ≥ 10 · hBeschickung,Fo — l/m² — 20 – 50

printed p.27 (pdf 29), Table 8 — backs REQ-81/82/83/84:
> Specific length of infiltration pipe — lRieselr — m/P — ≥ 6
> Length of each infiltration pipe — LRieselr — m — ≤ 18
> Horizontal spacing between the infiltration pipes — BRieselr — m — ≥ 0.5
> Width of the trench floor per infiltration pipe — BFGR — m — ≥ 0.5
> … hBeschickung,Fu — l/m² — ≥ 20

printed p.31 (pdf 33), Table 13 — backs REQ-130/131:
> Specific area, measured on the bottom of the filter basin — AFu,spez — m²/P — ≥ 1
> Average specific daily CSB (COD) volumetric loading — fV,CSB — g/(m³·d) — ≤ 100
> Average minimum time between dosing intervals — tSicker,min,aM — h — ≤ 4

printed p.32 (pdf 34), Table 14 — backs REQ-141/142:
> Average specific daily hydraulic loading rate of the filter area in operation … — qFo,Betrieb — l/(m²·d) — ≤ 240
> Average specific daily hydraulic loading rate on the overflow filter — qAWF,aM — l/(m²·d) — ≤ 500

printed p.35 (pdf 37), Table 16 — backs REQ-150:
> and average specific daily CSB (COD) areal loading rate, as measured on the bottom of the filter basin — fA,Fu, CSB — g/(m²·d) — ≤ 16

printed p.46 (pdf 48) — backs REQ-15:
> The total content of fines (grain size < 63 μm) must not exceed 2%.

printed p.63 (pdf 65), §6.1 — backs REQ-21:
> A comprehensive and simple-to-understand operation and maintenance manual for all operating conditions that occur in practice … must be prepared by the designer/planner and given to the plant operator. … The treatment plants require professional and regular inspection and maintenance. These activities must be carefully documented.

printed p.3 (pdf 5) — backs REQ-22 (the only fully-correct page ref outside p.19/20/27):
> … summers and cold winters without permafrost. In other climatic conditions, changes in the design are possible, or even necessary. Regions with permafrost are fundamentally unsuitable for filters.

### Equations (18, all VA, all with a page)

| node | claimed | actual printed | verdict |
|---|---|---|---|
| gl1 … gl5 | 18 | **19** | PAGE-WRONG ×5 |
| gl6 … gl10 | 19 | **20** | PAGE-WRONG ×5 |
| gl11 | 31 | **32** | PAGE-WRONG |
| gl12, gl13, gl14 | 31 | **33** | PAGE-WRONG ×3 |
| gl15 | 34 | **35** | PAGE-WRONG |
| gl16 | 43 | **44** | PAGE-WRONG |
| gl17, gl18 | 46 | **47** | PAGE-WRONG ×2 |

**Equation page reliability: 0 / 18 = 0 %** — uniform −1, the signature of the index's inverted footer inference.
**Equation formula reliability: 18 / 18 CONFIRMED.**

Verbatim, printed p.19 (pdf 21) — eqs 1–5:
> QTr,h,max = 24 · QS,d,aM / xQ,max + QF + QR,Tr (l/s)   (1)
> QS,d,aM = EZ · wS,d / 86,400 (l/s)   (2)
> QF = qF · AE,k (l/s)   (3)
> QR,Tr = qR,Tr · AE,k (l/s)   (4)
> QF + QR,Tr = m · 24 · QS,d,aM / xQmax (l/s)   (5)

(the `xQmax` comma-drop in eq 5 is genuinely in the print — the node's note is CONFIRMED.)

Verbatim, printed p.20 (pdf 22) — eqs 6–10:
> QM = fS,QM · QS,d,aM + QF ≥ ∑QDr,RÜB (l/s)   (6)
> QF = qF · AE,k (l/s)   (7)
> QM ≥ ∑QDr,RÜ ≥ ∑Qkrit (l/s)   (8)
> QT,d,aM = QS,d,aM + QF,d,aM (m3/d)   (9)
> QF,d,aM = mT,aM · QS,d,aM (m³/d)   (10)

Verbatim, printed p.32 (pdf 34) — eq 11:
> The factor for the reduction of required area fred is linked to the annual share of resting periods, and can be up to 50% for treatment systems that operate for a maximum of 6 months per year.
> fred = 1 – tReg / 12   (11)
> and
> fred ≥ 0.5

Verbatim, printed p.33 (pdf 35) — eqs 12, 13, 14:
> for tReg / 12 > 0.5   fred must be set at a value of 0.5.
> tReg   number of regeneration months per year without significant wastewater loading, maximum calculation of 6 months
> AF,CSB,red = fred · AF,CSB [m²]   (12)
> for Bd,TKN / AF,CSB,red ≥ BA,TKN, zul   use: AF,TKN,red = Bd,TKN / BA,TKN, zul   (13)
> for Bd,TKN / AF,CSB,red < BA,TKN, zul   use: AF,TKN,red = Bd,TKN / BA,TKN, zul   (14)

Verbatim, printed p.35 (pdf 37) — eq 15:
> AANF = 2 · hzu · (QT,d,aM · LHF) / (kfB · (hzu² − hab²))  (m²)   (15)

### Sections (25 with a page)

| node | claimed | actual printed | verdict |
|---|---|---|---|
| section-02 | 4 | 10 (§1 Scope) | PAGE-WRONG |
| section-04 | 19 | 20 (Table 1) | PAGE-WRONG |
| section-05 | 18 | 19 (§4.1.2, eqs 1–5) | PAGE-WRONG |
| section-06 | 19 | 20 (eqs 6–10) | PAGE-WRONG |
| section-07 | 44 | 21 (§4.2) / 45 (§5.2) | PAGE-WRONG |
| section-08 | 4 | 10 | PAGE-WRONG |
| section-10 | 31 | 23 (Table 3) / 25 (§4.3.1) | PAGE-WRONG |
| section-11 | 22 | 25 (Table 4) | PAGE-WRONG |
| section-12 | 23 | 26 (Table 5) | PAGE-WRONG |
| section-13 | 24 | 26 (Table 6) | PAGE-WRONG |
| section-14 | 25 | 26 (Table 7) | PAGE-WRONG |
| section-15 | 26 | 27 (Table 8) | PAGE-WRONG |
| section-16 | 27 | 27 (Table 9) | **CONFIRMED** |
| section-18 | 33 | 28 (Table 10) | PAGE-WRONG |
| section-19 | 33 | 28 (Table 10) | PAGE-WRONG |
| section-20 | 34 | 29 (Table 11) | PAGE-WRONG |
| section-21 | 35 | 30 (Table 12) | PAGE-WRONG |
| section-22 | 36 | 31 (Table 13) | PAGE-WRONG |
| section-23 | 37 | 32 (Table 14) | PAGE-WRONG |
| section-25 | 31 | 32 (§4.3.4) | PAGE-WRONG |
| section-26 | 20 | 21 (§4.1.3) / 34 (§4.3.5) | PAGE-WRONG |
| section-27 | 34 | 34 (§4.3.6) | **CONFIRMED** |
| section-28 | 43 | 43 (§4.5) | **CONFIRMED** |
| section-29 | 44 | 46 (§5.4.1) / 47 (filter media) | PAGE-WRONG |
| section-32 | 59 | 63 (§6 Operation) | PAGE-WRONG |

**Section page reliability: 3 / 25 = 12 %.**

```
COMMAND: grep -n -E "4\.4 +|4\.5 +|^ *6 +Operation|6\.1|6\.2" pages/*.txt | grep -v "\.\.\.\."
RAW OUTPUT (excerpt):
pdf038.txt:4:  4.4      Summary of Dimensioning and Processes
pdf045.txt:42: 4.5      Treatment Systems with Additional Requirements on the Effluent Quality
pdf065.txt:5:  6        Operation
pdf065.txt:6:  6.1      Fundamentals
```

## T3 VERDICT

**Overall VA page reliability: 9 / 99 = 9.1 %.** Overall VA *value/formula* reliability: **99 / 99 = 100 %**.

The failure mode is not a single offset. Three distinct patterns coexist:
* **−1** across all 18 equations and most prose CRs (the inverted-footer inference documented in the index);
* **+5** across the entire municipal-filter block (Tables 10–14 → sections 19–23, REQ-101…142);
* **−1 to −3** and a run of *consecutive* pages 22, 23, 24, 25, 26, 27 assigned to sections 11–16 and 33, 34, 35, 36, 37 to sections 19–23 — an auto-increment signature, i.e. these page numbers were never looked up at all.

**SEV-1: `source_page` in this map is a generated, unverified field across all node types, not just `tab-`. The N-2 class generalises.** Because the *values* are all correct, the defect is provenance-only — but under SR-3 a VA claim with a wrong page ref is not a VA claim.

---

# T4 — Boundary + cap check

## `doc-` inventory (8 nodes)

```
COMMAND: Get-ChildItem $d -File | Where-Object {$_.Name -like "doc-*"} | … full read …

RAW OUTPUT (frontmatter summary — all 8 identical in shape):
doc-atv-a-128          provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-atv-dvwk-a-198     provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-din-18130-1        provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-din-4261-1         provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-din-en-13254       provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-din-en-iso-grain   provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-dwa-a-118          provenance: NR  in_library: false  source_page: (blank)  severity: none
doc-dwa-a-272          provenance: NR  in_library: false  source_page: (blank)  severity: none
```

All 8 correctly carry `in_library: false` and `provenance: NR`. ✅

## VIOLATION 1 (SEV-1) — the `references::` edge does not exist

```
COMMAND: grep -rn "references::" . ; grep -rhoE "^- \`[a-z_]+::\`" . | sort | uniq -c

RAW OUTPUT:
./doc-atv-a-128.md:23:        **Effect (validator invariant #7).** Every DWA-A-262E node with a `references::` edge …
./doc-atv-dvwk-a-198.md:23:   (same boilerplate)
./doc-din-18130-1.md:23:      (same boilerplate)
./doc-din-4261-1.md:23:       (same boilerplate)
./doc-din-en-13254.md:23:     (same boilerplate)
./doc-din-en-iso-grain.md:23: (same boilerplate)
./doc-dwa-a-118.md:23:        (same boilerplate)
./doc-dwa-a-272.md:23:        (same boilerplate)
./_index.md:95:               Every node with a `references::` edge to these caps at **NR/VC** …

=== all typed-link kinds ===
     18 - `consumed_by::`
     60 - `gated_by::`
     18 - `produces::`
     44 - `requires::`
```

**Zero `references::` edges exist in the map.** The string appears only inside the prose sentence that *describes* the mechanism. The 8 `doc-` nodes have no typed links at all — they are graph orphans; the "Dependent nodes (cap NR)" lists are plain wikilinks in body text, not edges. The NR-cap mechanism the index calls "validator invariant #7" is **declared but not implemented** in this map.

## VIOLATION 2 (SEV-2) — declared dependents do not cap at NR/VC

Re-derived from the dependents each `doc-` node names, against those nodes' own frontmatter:

| doc node | declared dependents | their actual provenance | caps at NR/VC? |
|---|---|---|---|
| doc-atv-a-128 | eq-gl6, eq-gl8, section-06 | VA, VA, VA | **no** |
| doc-atv-dvwk-a-198 | tab-01-massloads, section-04, section-06 | VA, VA, VA | **no** |
| doc-din-18130-1 | cr-req-17, section-29 | VA, VA | **no** |
| doc-din-4261-1 | section-07, section-02 | VA, VA | **no** |
| doc-din-en-13254 | cr-req-18c | VA | **no** |
| doc-din-en-iso-grain | eq-gl17, eq-gl18 | VA, VA | **no** |
| doc-dwa-a-118 | eq-gl3, eq-gl4 | VA, VA | **no** |
| doc-dwa-a-272 | cr-req-02c, cr-req-12, section-26 | VA, **VC**, VA | partial (1/3) |

19 of 20 declared dependents are `provenance: VA`. The doc nodes' own categorical claim ("Every DWA-A-262E node with a `references::` edge to this doc caps at NR/VC") is contradicted by the map itself.

*Fairness note (R-5):* substantively the VA is often defensible — eq 3/4 and the qF range are printed in DWA-A-262E's own body, so VA is right for those and the doc-node boilerplate over-claims. The defect is that a categorical cap rule is asserted and then not applied, with no distinction drawn between "formula printed here" and "value deferred there".

## VIOLATION 3 (SEV-1) — external content encoded without reproduction-provenance

`cr-req-19eff-a` (BOD5 ≤ 40), `cr-req-19eff-b` (COD ≤ 150), `cr-req-20` (SNH4 ≤ 10), `cr-req-20b` (T ≥ 12 °C): all four `provenance: VA`, `data_class: standard_fixed`, `severity: block`.

These four numbers are, by DWA-A-262E's own words, **Size Class #1, Appendix 1, Part C of the German Wastewater Ordinance (AbwV)** — a reproduction of another document. The standard's symbol table (printed p.16) confirms the dependency:

> GK — — size class according to Annex 1 of the German Wastewater Ordinance (AbwV)

and its bibliography lists:

> AbwV – Abwasserverordnung: Verordnung über Anforderungen an das Einleiten von Abwasser in Gewässer …

The four CR nodes carry **no reproduction-provenance and no `doc-` node for AbwV**. Under the Content Boundary Rule this is a printed reproduction (case 2) that may be encoded but must be labelled as such and must not be presented as DWA-A-262E's own normative threshold. It currently is.

*(By contrast, Table 1's ATV-DVWK-A 198 note and Table 2's / REQ-02c's DWA-A 272 note **are** carried in the node prose — those two are handled correctly.)*

## VIOLATION 4 (SEV-2) — `doc-` inventory incomplete and one identifier invented

The standard's §2 References (printed p.11, pdf 13) lists **12** normative documents:

> DIN 4261-1 · DIN 18130-1 · DIN EN 12255-5 · DIN EN 13254 · DIN EN ISO 14688-1 · DWA-A 118 · ATV-A 128 · DWA-A 178 · ATV-DVWK-A 198 · DWA-A 201 · DWA-A 272 · DWA-M 176

The map has 8 doc nodes. Missing: **DIN EN 12255-5, DIN EN ISO 14688-1, DWA-A 178, DWA-A 201, DWA-M 176** — plus **AbwV** (bibliography + symbol GK) and **DIN 16323:2014** (cited in §3, printed p.12). `DWA-A 201` is load-bearing: printed p.25 says "The design [of the aerated settling pond] should be made according to the specifications of Standard DWA-A 201 for aerated ponds", and the map has an aerated-settling-pond path with no doc node for it.
And `doc-din-en-iso-grain` names **DIN EN ISO 17892-4**, which occurs **0 times** in the standard (see T1 side-finding).

## Content-expansion check — the good news

I searched for expanded external content (thresholds from ATV-A 128, DWA-A 118, DIN 4261-1, DIN 18130-1, DWA-M 176, DIN EN 13254 appearing as this map's own fields/equations/tables). **None found.** Every external standard is encoded as a bare reference only:
* ATV-A 128 → eqs 6/8 are printed in 262E; no combined-sewer computation from A 128 is expanded.
* DWA-A 118 → only "must be based on Standard DWA-A 118"; the qF / qR,Tr ranges encoded are the ones 262E itself prints.
* DIN 4261-1 → only the septic-tank *reference*; 262E's own "at least 300 l/P and a minimum volume of 3,000 l" is not even encoded.
* DIN 18130-1 → only the test method; the ≤10⁻⁸ m/s value is 262E's own print.
* DIN EN 13254 / GRK4-GRK5 → printed in 262E's own §5.3.
* DIN EN ISO 14688-1 → Table 20's soil classes are **not** encoded as a table node (correct — no expansion).

**Content Boundary case 1 (bare-reference expansion): 0 violations.** The only boundary defect is the *reproduction-provenance* omission on the four AbwV effluent CRs.

---

# RATIFICATION ITEMS (human-only calls)

Each with its verbatim quote and printed page. All are `ratification_status: unratified` today.

**R1 — modal "usually" encoded as a range gate (REQ-07, `warn`).** printed p.20:
> Usually mT,aM is between 0.25 and 1.

**R2 — modal "should be selected" encoded as a range gate (REQ-06, `warn`); also an SR-2 range with no engineer selection surface.** printed p.20:
> For fS,QM, values between 6 and 9 should be selected (corresponding to Standard ATV-DVWK-A 198:2003).

**R3 — SR-2 ranges auto-encoded as greedy-AND bounds (REQ-04a/04b, `warn`).** printed p.19:
> … with qF (0.05 l/(s·ha) to 0.15 l/(s·ha)) and qR,Tr (0.2 l/(s·ha) to 0.7 l/(s·ha)).
Engineer must select a point value inside each range; the encoding only bounds it.

**R4 — experiential statement encoded as a gate (REQ-14, `warn`, `RV <= 2`).** printed p.44:
> Experience shows that RV > 2 leads to no additional improvement in treatment performance.
"No additional improvement" is not a prohibition.

**R5 — descriptive capability statement encoded as 4 `block` gates + AbwV reproduction (REQ-19eff-a/b, REQ-20, REQ-20b).** printed p.10:
> Generally, the treatment plants described herein are able to meet the wastewater treatment requirements according to the Size Class #1, Appendix 1, Part C of the German Wastewater Ordinance (BOD5 ≤ 40 mg/l, COD ≤ 150 mg/l in randomly collected samples; four out of five samples must be within the limit). In addition, vertical flow filters and aerated horizontal flow filters are suitable for further nitrification (SNH4 ≤ 10 mg/l) at filter effluent water temperatures of at least 12°C.
Two calls: (a) is this normative at all? (b) reproduction-provenance for the AbwV values.

**R6 — modal "should be" encoded as a gate (REQ-16 `U < 5`, `warn`; and eq 18's embedded constraint).** printed p.47:
> The uniformity coefficient should be:
> U = d60/d10 < 5   (18)

**R7 — missing weld-free branch (REQ-18a). Source branch CONFIRMED present.** printed p.45:
> plastic water-resistant geomembrane which must be embedded in the slope: thickness of ≥ 1.5 mm UV-resistant … For liner installation without welds in small wastewater treatment systems, the thickness of the polyethylene-based liner can be ≥ 1 mm.
Modal "can be" — engineer call on whether the relaxation is elective.

**R8 — eqs 13/14 identical RHS is IN THE PRINTED SOURCE.** printed p.33:
> for Bd,TKN / AF,CSB,red ≥ BA,TKN, zul   use: AF,TKN,red = Bd,TKN / BA,TKN, zul   (13)
> for Bd,TKN / AF,CSB,red < BA,TKN, zul   use: AF,TKN,red = Bd,TKN / BA,TKN, zul   (14)
This is a defect of the *standard* (or its English translation), not of the encoding. Do **not** "fix" the encoding without a DWA erratum or an engineer ruling.

**R9 — minimum-area values printed bare, encoded with `>=`.** printed p.25 (Table 4) and p.28 (Table 9 end):
> and minimum filter area, as measured on the upper surface of the filter — AFo,min — m² — 16
> Minimum filter length — LHF,min — m — 2
Also Table 3 `AFo,min 4.8`, Table 5 `AFo,min (AFo1+AFo2) 4+4`, Table 8 `AFu,min 12`. The standard prints these without a relational operator; REQ-41 / REQ-92 / REQ-61 / REQ-71 encode `>=`. Reading "minimum ⇒ ≥" is almost certainly right but is an engineer call.

**R10 — coverage gap A262-21 CONFIRMED (dp-a262-21-no-gate).** printed p.30, Table 12:
> Specific area of the filter surface (after primary treatment in a raw wastewater filter) for a separated sewer network … — AFo,spez, Tr — m²/P — ≥ 0.8
> … for a combined sewer network … — AFo,spez, M — m²/P — ≥ 1
> … qBeschickung,Fo — l/(m²·min) — ≥ 6 · hBeschickung,Fo — l/m² — ≥ 20
Four printed minima, zero compliance requirements on A262-21. Gate authoring is an engineer call.

**R11 — `tSicker,min,aM` coverage gap (new, not previously logged).** The map has exactly one t_Sicker gate (REQ-102, `>= 6`, A262-19). The standard prints four different values for the same symbol:
> printed p.28 (Table 10): Average minimum time between dosing intervals — tSicker,min,aM — h — ≥ 6
> printed p.29 (Table 11): … tSicker,min,aM — h — ≥ 3
> printed p.31 (Table 13): … tSicker,min,aM — h — ≤ 4
> printed p.32 (Table 14): … tSicker,min,aM — h — ≥ 4
Three of four are ungated, and Table 13's is a **`≤`** where the encoded one is `≥`. Engineer call on whether the missing three are in scope.

**R12 — scope enum has 2 members, printed scope lists 5 bullets (REQ-01, `block`).** printed p.10:
> The scope of this Standard includes planted and unplanted filters for: small wastewater treatment systems treating domestic wastewater with an inflow of up to 50 P; wastewater treatment systems serving fewer than 50 P for which extraneous water must be taken into account. … These systems must be considered as municipal wastewater treatment plants; municipal wastewater treatment plants with either separated or combined sewer networks; combined wastewater treatment plants providing additional biological treatment or polishing; seasonal wastewater treatment plants operated only in summer.
`system_size_category IN {small_wwts, municipal_wwtp}` may be a legitimate 2-way size split (bullets 4 and 5 are orthogonal plant *modes*, and the map has dedicated sheets for both: A262-25 seasonal, A262-27 polishing). **I am not calling this a defect** — it is an engineer call on whether the size enum adequately covers the printed scope.

---

# HONEST RESIDUE — what I could NOT verify, and why

1. **DB state.** I audited the reasoning map on disk only. I did not query Supabase prod, so I could not re-derive the claims that `equations.source_quote IS NULL` for all 18, that `compliance_requirements.source_quote IS NULL` for REQ-03/REQ-12, or the 33/18/60 row counts. Those index claims are **unverified this session** (R-3 not satisfied). No prod read was in scope for a read-only-except-report brief with no DATABASE_URL confirmed.
2. **Field ownership / dead-gate claims.** `dp-req12-dead-gate` asserts that neither `wastewater_type` nor `w_s_d` is a field of A262-25. Verifying that requires the `fields` table (or the Pass3c workbook). **Not re-derived.** The map's `requires::` edges are the only on-disk signal and they are not a field inventory. Treat the "deadGates = 1" claim as unconfirmed.
3. **`dp-req03-fixed-as-gate` "UI-editable field"** — same reason: needs the field/enum tables. Not verified.
4. **Excel workbook cross-check.** `DWA-A_262E (2).xlsx` (405 KB) sits next to the PDF in the Guidelines folder. I did not open it; it is not the SR-3 authority and was not in the brief.
5. **The bilingual German title-block pages and the German-language annexes** (bibliography region, pdf ~70-74) were extracted but not line-by-line audited; no map node cites them.
6. **`section-a262-07` true page** is ambiguous between §4.2 "Dimensioning of Pretreatment" (printed 21) and §5.2 "General Requirements for Pretreatment" (printed 45) because the node's own scope statement is "Vorbehandlung Auswahl und Bemessung". Either reading makes the claimed p.44 wrong, so the verdict stands, but I cannot say which page it *should* be without an authoring decision.
7. **`section-a262-10` / `-18`** are "Filtertyp-Inventar" sheets spanning several tables; I record the page of the tables their CRs gate (23 and 28), but a multi-page section legitimately has no single page. The claimed 31 and 33 match neither.
8. **Superscript exponents.** pdftotext -layout emits `10⁻⁸` as `-8` on the preceding line and `10 m/s` on the next. I reconstructed `≤ 10⁻⁸ m/s` from the two lines and from context (`kf-value`, DIN 18130-1 lab test). I did **not** open the PDF as an image to visually confirm the superscript. Confidence high, not absolute.
9. **`dp-req09-10-attest`, `dp-req13-var-vs-var`, `dp-req07-modal-usually`** were read but their premises about child-sheet numeric gates depend on field-level data I did not query.

---

# REVERSALS — beliefs my evidence contradicts

**REV-1 (headline). The N-1 class does NOT reproduce on DWA-A-262E.** The campaign premise carried from DWA-A-138-1 — that a `VA`/`block` CR might gate on campaign vocabulary — is **false here**. 0 of 60 CRs. `Phase 4`, `gate_result`, `CONDITIONAL`, `verdict` appear neither in the standard nor in any condition. The premise was wrong for this standard; no fix exists to make.

**REV-2. The map's page-convention note is methodologically wrong, and its "no offset needed" boast is the opposite of reassuring.** `_index.md` claims 262E "needs no offset; the footer integer IS the printed page", citing eq (1) as "between footer 18 and footer 19 → printed 18". Content between those two footers belongs to printed p.**19**. This inverted inference is reproduced across all 18 equations (uniform −1).

**REV-3. `eq-a262-gl16`'s own doubt is resolved in the encoding's favour.** The node warns: *"NOTE: check '+ eta_VF' additive term vs source (SR-1: source_quote null)."* The print (p.44) reads `ηDN = 1 − 1/(1 + RV) + ηVF (16)`. **The encoding is correct.** Remove the doubt, not the term.

**REV-4. `eq-a262-gl14` / `dp-eq13-14-dead-branch` mis-attribute the defect.** The node says: *"Likely the second branch should read A_F_TKN_red = A_F_CSB_red (source-verify)"* and *"Encoding duplication of one formula."* The printed source (p.33) genuinely prints the **same** RHS in both branches. The encoding is **faithful**; the anomaly is in the standard/translation. Reclassify from encoding defect to source anomaly (R8 above). Any "fix" would be an unsourced invention.

**REV-5. The NR-cap mechanism is asserted but absent.** The index and all 8 doc nodes state that dependents "cap at NR/VC" via a `references::` edge. There are **0** `references::` edges in the map and 19 of 20 declared dependents are `VA`. The claim in the index — *"The validator's `document`/NR mechanism scales cleanly"* — is not supported by this map's contents.

**REV-6. `tab-a262-24-maint`'s page is not off by one but by seven** (59 → 66), and printed p.59 has no table at all. The "generated provenance" class is worse here than a systematic offset would suggest — for some nodes the page number appears to have been auto-incremented rather than looked up.

**REV-7. Value fidelity is excellent; provenance fidelity is not.** Contrary to what a 9 % page-verification rate would suggest about the encoding's quality: **every one of the 99 thresholds/ranges/formulas I re-derived matched the printed source exactly.** Zero MISMATCH, zero WRONG-QUANTITY. The correct remediation is a page-reference re-derivation pass, not a value re-encoding.
