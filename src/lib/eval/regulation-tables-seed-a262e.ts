/**
 * DWA-A-262E regulation-table seed builders (Plan 3 Task 3, 2026-09-17).
 *
 * SR-1: every seeded value and every `verbatim_quote` was read in this session
 * from the transcript `Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md`
 * (English edition, 2217 lines, LaTeX tables; the line is in the comment next
 * to each span). Verified by
 * `scripts/regulation-tables/verify-regulation-tables.ts a262e "<transcript>"`.
 * Emitted as `20260917100300_regulation_tables_seed_a262e.sql` (no earlier
 * DWA-A-262E seed exists — nothing superseded).
 *
 * Edition: the title page prints "November 2017" (L7, L9, L20, L23) → `'2017-11'`
 * (same form as A138's `'2024-10'`); prod `standards.version` reads
 * "November 2017" (read-only query in-session) — consistent.
 *
 * Key tokens (G-A3): `filter_type` = prod `A262-10.filter_type` enum values,
 * `system_size` = prod `A262-02.system_size_category` values, `pretreatment` =
 * prod `A262-07.pretreatment_selected` values (captured a262e.prior.json,
 * 2026-09-17). The `sewer` key of TABLE_LIMITS uses its own tokens `tr` / `m`
 * (the printed "Tr" / "M" suffixes of A_Fo,spez,Tr / A_Fo,spez,M, L749/L751);
 * the register maps prod `sewer_system_type` onto them in a derived column.
 *
 * Verbatim quotes: a limits row is the printed table body (one contiguous
 * span, lines cited) — every cell of the row comes from that span, as A138
 * TAB14 did for its transposed rows. Tables whose printed body carries no
 * sewer split are seeded for BOTH sewer tokens with identical cells (the
 * printed table applies regardless of the sewer type; see the report).
 *
 * Verification status: `md_verified` only where every seeded row is lifted
 * and every cell is legible. Two tables stay `imported_unverified`:
 * TABLE_LIMITS (Tab. 13 prints "≤ 4" for t_Sicker,min,aM where every other
 * table prints "≥", L1019 — encoded as printed, sign-off a262e-U-2) and
 * TABLE18_ORIFICE (lava sand cell printed "≤ 25-<5**", L1244 — not encodable as
 * one number, a262e-U-3).
 */
import type { RegulationTable, RegulationRow, ValueColumn } from './regulation-tables';

const STD = 'DWA-A-262E';
export const A262E_EDITION = '2017-11';
const ED = A262E_EDITION;

// ---------------------------------------------------------------------------
// Verbatim spans (transcript line ranges in the doc comments).
// ---------------------------------------------------------------------------
/** L617 */
const Q_T1_BSB5 = String.raw`\hline $\mathrm{BSB}_{5}\left(\mathrm{BOD}_{5}\right)$ & 60 & 40 & 10 & 30 \\`;
/** L618 */
const Q_T1_CSB = String.raw`\hline CSB (COD) & 120 & 80 & 25 & 60 \\`;
/** L620 */
const Q_T1_TKN = String.raw`\hline TKN & 11 & 10 & $4.4\left(>12^{\circ} \mathrm{C}\right)$ & 8.5 \\`;
/** L678 */
const Q_T2_CSB = String.raw`\hline CSB (COD) & 47 & 57 \\`;
/** L700 */
const Q_S422 = String.raw`The required size of the multicompartment septic tank must be at least $300 \mathrm{l} / \mathrm{P}$ and a minimum volume of $3,000 \mathrm{l}$.`;
/** L705 */
const Q_S423 = String.raw`with DIN 4261-1. Rotting tanks must be designed with a useable volume of $\geq 200 \mathrm{l} / \mathrm{P}$ and a maximum dosing of $1,000 \mathrm{l} / / \mathrm{m}^{2} \cdot \mathrm{~d}$ ). The downstream multicompartment septic tank must have a useable volume of at least $300 \mathrm{l} / \mathrm{P}$ and a minimum volume of $3,000 \mathrm{l}$.`;
/** L709 */
const Q_S424 = String.raw`If settling ponds (Figure 1) are used as pretreatment, they must be designed, constructed, and operated in accordance with Standard DWA-A 201. Apart from this, a minimum specific area as measured on the surface of the pond must be $1.5 \mathrm{~m}^{2} / \mathrm{P}$, in order to ensure the required removal of suspended solids. The passing of sludge and floating aquatic plants (e.g., Lemna spp.) must to be prevented at the sampling point. For settling ponds, coarse desludging should be installed upstream (see Standard DWA-A 201).`;
/** L721 */
const Q_S425 = String.raw`The volume of the sedimentation chamber must be dimensioned for a hydraulic residence time of $\geq 2$ hours at a maximum inflow $Q_{\text {Tr, } h, \max }$ and a minimum volume of $75 \mathrm{l} / \mathrm{P}$.`;
/** L777 */
const Q_S427 = String.raw`The volume of the aerated settling pond, including the sludge storage but excluding the retention volume for stormwater treatment, must be at least $1.2 \mathrm{~m}^{3} / \mathrm{P}$. The stormwater treatment volume must be determined on the basis of Standard ATV-A 128. For combined sewer networks, the aerated settling ponds must be divided into a base volume for retention, pollutant degradation, and sludge storage, and a retention volume for storage of stormwater runoff.`;
/** L749–L755 (Tab. 3 body) */
const Q_T3 = String.raw`\hline Specific area, as measured on the upper surface of the filter, for separated sewer networks & $A_{\text {Fo,spez, Tr }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1.2$ \\
\hline and minimum filter area, as measured on the upper surface of the filter, for separated sewer networks & $A_{\text {Fo }, \text { min }}$ & $\mathrm{m}^{2}$ & 4.8 \\
\hline Specific area, as measured on the upper surface of the filter, for combined sewer networks & $A_{\text {Fo,spez, M }}$ & $\mathrm{m}^{2} / \mathrm{p}$ & $\geq 1.5$ \\
\hline Average daily specific CSB (COD) loading rate on the total area of all filters, as measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{F}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 100$ \\
\hline Average daily specific hydraulic loading rate of the total area of all filters during dry weather, as measured on the upper surface of the filter & $q_{\mathrm{F} 0, \mathrm{~T}}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 250$ \\
\hline Average specific hydraulic loading rate of the filter area in operation during a dosing event, as measured on the upper surface of the filter & $q_{\text {Beschickung,Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 10$ \\
\hline Specific hydraulic loading of the filter area in operation, per dose, as measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung,Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & 20-50 \\`;
/** L804–L805 (Tab. 4 body) */
const Q_T4 = String.raw`\hline Specific area per population equivalent, as measured on the upper surface of the filter & $A_{\text {Fo, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 4$ \\
\hline and minimum filter area, as measured on the upper surface of the filter & $A_{\text {Fo }, \text { min }}$ & $\mathrm{m}^{2}$ & 16 \\`;
/** L819–L821 (Tab. 5 body) */
const Q_T5 = String.raw`\hline Specific area of the first stage, as measured on the upper surface of the filter & $A_{\text {Fo1, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Specific area of the second stage, as measured on the upper surface of the filter & $A_{\text {Fo } 2 \text {,spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline and minimum total filter area, as measured on the upper surface of the filter & $A_{\mathrm{F} 0, \text { min }}\left(A_{\mathrm{F} 01}+A_{\mathrm{F} 02}\right)$ & $\mathrm{m}^{2}$ & $4+4$ \\`;
/** L836–L840 (Tab. 6 body) */
const Q_T6 = String.raw`\hline Specific area, as measured on the upper surface of the filter & $A_{\text {Fo, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline \begin{tabular}{l}
and minimum total filter area, as measured on the upper \\
surface of the filter
\end{tabular} & $A_{\text {Fo, min }}$ & $\mathrm{m}^{2}$ & 4 \\`;
/** L856–L857 (Tab. 7 body) */
const Q_T7 = String.raw`\hline Specific area, as measured on the bottom of the filter basin & $A_{\text {Fu,spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline and minimum total filter area, as measured on the bottom of the filter basin & $A_{\text {Fu,min }}$ & $\mathrm{m}^{2}$ & 4 \\`;
/** L873–L879 (Tab. 8 body) */
const Q_T8 = String.raw`\hline Specific area, as measured on the bottom of the filter basin & $A_{\text {Fu, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 3$ \\
\hline Minimum filter area, as measured on the bottom of the filter basin & $A_{\text {Fu,min }}$ & $\mathrm{m}^{2}$ & 12 \\
\hline Specific length of infiltration pipe & $l_{\text {Rieselr }}$ & m/P & $\geq 6$ \\
\hline Length of each infiltration pipe & $L_{\text {Rieselr }}$ & m & $\leq 18$ \\
\hline Horizontal spacing between the infiltration pipes & $B_{\text {Rieselr }}$ & m & $\geq 0.5$ \\
\hline Width of the trench floor per infiltration pipe & $B_{\text {FGR }}$ & m & $\geq 0.5$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the bottom of the filter basin; dosing height & $h_{\text {Beschickung,Fu }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 20$ \\`;
/** L899–L916 (Tab. 9 — printed in two parts, one contiguous span) */
const Q_T9 = String.raw`\begin{tabular}{|l|c|c|c|}
\hline Parameter & Abbreviation & Unit & Value \\
\hline Specific area, as measured on the bottom of the filter basin & $A_{\text {Fu,spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline and minimum filter area, as measured on the bottom of the filter basin & $A_{\text {Fu,min }}$ & $\mathrm{m}^{2}$ & 4 \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 9 (end)}
\begin{tabular}{|l|l|l|l|}
\hline Parameter & Abbreviation & Unit & Value \\
\hline and CSB (COD) loading on the cross-sectional area & $f_{\mathrm{A}, \mathrm{ANF}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 200$ \\
\hline and CSB (COD) loading per $\mathrm{m}^{3}$ of filter & $f_{\mathrm{V}, \text { CSB }}$ & $\mathrm{g} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ & $\leq 100$ \\
\hline Minimum filter length & $L_{\text {HF,min }}$ & m & 2 \\
\hline
\end{tabular}`;
/** L936–L942 (Tab. 10 body; "≥ 10* ≥ 20" with footnote L945 "*) For tightly-spaced distribution networks, see Section 5.5.2.3") */
const Q_T10 = String.raw`\hline Specific area, as measured on the upper surface of the filter & $A_{\text {Fo, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 4^{*}$ \\
\hline or average daily specific CSB (COD) areal loading rate over the total filter area, as measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{Fo}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 20$ \\
\hline and average daily specific CSB (COD) areal loading rate over the area of the filter in operation, as measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{F}, \mathrm{CSB}, \mathrm{Betrieb}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 27$ \\
\hline Average specific daily hydraulic loading rate over the total filter area $A_{\mathrm{Fo}}$ at $Q_{\mathrm{T}, \mathrm{d}, \mathrm{am}}$ as measured on the upper surface of the filter & $q_{\mathrm{F} 0, \mathrm{~T}}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 80$ \\
\hline Average minimum time between dosing intervals & $t_{\text {Sicker,min,am }}$ & h & $\geq 6$ \\
\hline Average specific hydraulic loading rate of the filter area during the interval loading of the filter surface in operation, measured on the upper surface of the filter & $q_{\text {Beschickung, Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 6$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung,Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 10^{*}$ $\geq 20$ \\`;
/** L968–L973 (Tab. 11 body) */
const Q_T11 = String.raw`\hline Specific area of the first stage, as measured on the upper surface of the filter & $A_{\text {Fo } 1, \text { spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Specific area of the second stage, as measured on the upper surface of the filter & $A_{\text {Fo } 2 \text {,spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Average daily specific CSB (COD) loading rate on the total filter area $A_{\text {fo1 }}$, measured on the upper surface of the first filter & $f_{\mathrm{A}, \mathrm{F} 01, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 80$ \\
\hline Average minimum time between dosing intervals & $t_{\text {Sicker,min,am }}$ & h & $\geq 3$ \\
\hline Average specific hydraulic loading rate of the filter area during the interval loading of the filter surface in operation, measured on the upper surface of the filter & $q_{\text {Beschickung, Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 10$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung, Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 20$ \\`;
/** L994–L997 (Tab. 12 body; "lafter" is the OCR of "(after") */
const Q_T12 = String.raw`\hline Specific area of the filter surface lafter primary treatment in a raw wastewater filter) for a separated sewer network, as measured on the upper surface of the filter & $A_{\text {Fo, spez, Tr }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 0.8$ \\
\hline Specific area of the filter surface lafter primary treatment in a raw wastewater filter) for a combined sewer network, as measured on the upper surface of the filter & $A_{\text {Fo,spez, M }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Average specific hydraulic loading rate of the filter area during the interval loading of the filter surface in operation, measured on the upper surface of the filter & $q_{\text {Beschickung,Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 6$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung,Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 20$ \\`;
/** L1017–L1020 (Tab. 13 body; L1019 prints "≤ 4" for t_Sicker,min,aM — a262e-U-2) */
const Q_T13 = String.raw`\hline Specific area, measured on the bottom of the filter basin & $A_{\text {Fu, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Average specific daily CSB (COD) volumetric loading & $f_{\mathrm{V}, \text { CSB }}$ & $\mathrm{g} /\left(\mathrm{m}^{3} \cdot \mathrm{~d}\right)$ & $\leq 100$ \\
\hline Average minimum time between dosing intervals & $t_{\text {Sicker,min,aM }}$ & h & $\leq 4$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the bottom of the filter basin; dosing height & $h_{\text {Beschickung,Fu }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 6$ \\`;
/** L1046–L1053 (Tab. 14 body) */
const Q_T14 = String.raw`\hline Specific area per inhabitant, as measured on the upper surface of the filter & $A_{\text {Fo, spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 3$ \\
\hline Average specific daily CSB (COD) areal loading rate over the entire area of the filter, as measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{F}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 20$ \\
\hline Average specific daily hydraulic loading rate of the filter area in operation, as measured on the upper surface of the filter & $q_{\text {Fo, Betrieb }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 240$ \\
\hline Average minimum time between dosing intervals & $t_{\text {Sicker,min,am }}$ & h & $\geq 4$ \\
\hline Average specific hydraulic loading rate of the filter area during the interval loading of the filter surface in operation, measured on the upper surface of the filter & $q_{\text {Beschickung,Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 10$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung,Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 20$ \\
\hline Specific area per inhabitant of the overflow filter (for combined sewer networks) & $A_{\text {AWF,spez }}$ & $\mathrm{m}^{2} / \mathrm{P}$ & $\geq 1$ \\
\hline Average specific daily hydraulic loading rate on the overflow filter & $q_{\text {AWF,aM }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 500$ \\`;
/** L1134–L1141 (Tab. 15 body; "Ch" = "°C" + unit "h" run together by the OCR) */
const Q_T15 = String.raw`\hline Average daily specific CSB (COD) loading rate on the total filter area, measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{F}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 20$ \\
\hline and average daily specific CSB (COD) loading rate on the filter area in operation, measured on the upper surface of the filter & $f_{\mathrm{A}, \mathrm{F}, \mathrm{CSB}, \mathrm{Betrieb}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 27$ \\
\hline \multirow{2}{*}{Average specific daily hydraulic loading rate over the entire area of the filter $A_{\mathrm{Fo}}$ at $Q_{\mathrm{T}, \mathrm{d}, \mathrm{aM}}$, as measured on the filter surface} & $q_{F o, T}$ & $<12^{\circ} \mathrm{C} \mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 80$ \\
\hline & $q_{F o, T}$ & $\geq 12^{\circ} \mathrm{C} \mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 120^{*}$ \\
\hline \multirow{2}{*}{Average minimum time between dosing intervals} & $t_{\text {Sicker,min,aM }}$ & $<12^{\circ} \mathrm{Ch}$ & $\geq 6$ \\
\hline & $t_{\text {Sicker,min,am }}$ & $\geq 12^{\circ} \mathrm{Ch}$ & $\geq 3$ \\
\hline Average specific hydraulic loading rate of the filter area during the interval loading of the filter surface in operation, measured on the upper surface of the filter & $q_{\text {Beschickung, Fo }}$ & $\mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~min}\right)$ & $\geq 6$ \\
\hline Specific hydraulic loading rate on the filter area in operation per dose, measured on the upper surface of the filter; dosing height & $h_{\text {Beschickung, Fo }}$ & $\mathrm{l} / \mathrm{m}^{2}$ & $\geq 20$ \\`;
/** L1158–L1160 (Tab. 16 body) */
const Q_T16 = String.raw`\hline Average specific daily CSB (COD) loading rate on the horizontal cross-section when the filter material is coarse sand & $f_{\text {A,ANF, CSB }}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 40$ \\
\hline Average specific daily CSB (COD) loading rate on the horizontal cross-section when the filter material is gravel & $f_{\mathrm{A}, \mathrm{ANF}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 200$ \\
\hline and average specific daily CSB (COD) areal loading rate, as measured on the bottom of the filter basin & $f_{\mathrm{A}, \mathrm{Fu}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 16$ \\`;
/** L1244 (Tab. 18 orifice row; column order = the Tab. 18 header L1224) */
const Q_T18_ORIFICE = String.raw`\hline Filter surface area per orifice of distribution network & $\mathrm{m}^{2}$ /orifice & $\leq 50$ & $\leq 1$ & $\leq 5^{*)}$ better $\leq 1$ & $\leq 1$ & $\leq 1$ & $\leq 1$ & $\leq 25-<5^{* *}$ & & $\leq 1$ & & \\`;
/** L1450 */
const Q_T21_RAW = String.raw`\hline Raw wastewater filter & 5.4.2.1 & 2 to 8 & fG & fine gravel & $\leq 2$ & < 5 & 3 & $\approx 10^{-1}$ & $9.0 \times 10^{-2}$ \\`;
/** L1451 */
const Q_T21_SAND = String.raw`\hline Vertical filter with sand & 5.4.2.2 & 0 to 2 & S & sand & $\leq 2$ & < 5 & 0.20 to 0.4 & $\approx 10^{-4}$ & $4.0 \times 10^{-4}$ to $1.6 \times 10^{-3}$ \\`;
/** L1452–L1470 */
const Q_T21_TWOSTAGE = String.raw`\hline Two-stage vertical filter with fine gravel and coarse sand & 5.4.2.3 & \begin{tabular}{l}
2 to 8 \\
0 to 4
\end{tabular} & \begin{tabular}{l}
fG \\
gS
\end{tabular} & \begin{tabular}{l}
fine gravel \\
coarse sand
\end{tabular} & $\leq 2$ & <5 & \begin{tabular}{l}
3 \\
0.25 to 0.4
\end{tabular} & \begin{tabular}{l}
$\approx 10^{-1}$ \\
$\approx 10^{-3}$
\end{tabular} & \begin{tabular}{l}
$9.0 \times 10^{-2}$ \\
$6.3 \times 10^{-4}$ to $1.6 \times 10^{-3}$
\end{tabular} \\`;
/** L1471 */
const Q_T21_COARSE = String.raw`\hline Vertical filter with coarse sand & 5.4.2.4 & 0 to 4 & gS & coarse sand & $\leq 2$ & < 5 & 0.25 to 0.4 & $\approx 10^{-3}$ & $6.3 \times 10^{-4}$ to $1.6 \times 10^{-3}$ \\`;
/** L1472 */
const Q_T21_AERVF = String.raw`\hline Actively aerated vertical filter with gravel & 5.4.2.5 & 8 to 16 & mG & medium gravel & $\leq 2$ & <5 & $\geq 5$ & $\approx 1$ & $6.4 \times 10^{-1}$ \\`;
/** L1473 */
const Q_T21_LAVA = String.raw`\hline Vertical filter with lava sand & 5.4.2.6 & 0 to 4 & S & lava sand & <8 & < 5 & 0.05 to 0.3 & $4 \times 10^{-5}$ to $8 \times 10^{-4}$ & $2.5 \times 10^{-5}$ to $9 \times 10^{-4}$ \\`;
/** L1474–L1492 */
const Q_T21_TRENCH = String.raw`\hline Filter trenches with fine gravel and coarse sand & 5.4.2.7 & \begin{tabular}{l}
2 to 8 \\
0 to 4
\end{tabular} & \begin{tabular}{l}
fG \\
gS
\end{tabular} & \begin{tabular}{l}
fine gravel \\
coarse sand
\end{tabular} & $\leq 2$ & < 5 & \begin{tabular}{l}
3 \\
0.25 to 0.4
\end{tabular} & \begin{tabular}{l}
$\approx 10^{-1}$ \\
$\approx 10^{-3}$
\end{tabular} & \begin{tabular}{l}
$9.0 \times 10^{-2}$ \\
$6.3 \times 10^{-4}$ to $1.6 \times 10^{-3}$
\end{tabular} \\`;
/** L1493 */
const Q_T21_HFCOARSE = String.raw`\hline Horizontal filter with coarse sand & 5.4.3.1 & 0 to 4 & gS & coarse sand & $\leq 2$ & < 5 & 0.30 to 0.4 & $\approx 10^{-3}$ & $9 \times 10^{-4}$ to $1.6 \times 10^{-3}$ \\`;
/** L1494 */
const Q_T21_HFGRAVEL = String.raw`\hline Horizontal filter with fine gravel & 5.4.3.2 & 2 to 8 & fG & fine gravel & $\leq 2$ & < 5 & 3 & $\approx 10^{-1}$ & $9.0 \times 10^{-2}$ \\`;
/** L1495 */
const Q_T21_AERHF = String.raw`\hline Actively aerated horizontal filter with gravel & 5.4.3.3 & 8 to 16 & mG & medium gravel & $\leq 2$ & < 5 & $\geq 5$ & $\approx 1$ & $6.4 \times 10^{-1}$ \\`;

// ---------------------------------------------------------------------------
// Table 1 (§4.1.2, L612–L631) — wastewater specific mass loads per P, split by parameter into three single-key
// tables (the lookup_fill binding cannot carry a literal key, brief G-12). Row keys = prod `pretreatment_selected`
// tokens; the four printed columns map as: column 2 "After pretreatment in a mulicompartment septic tank, settling
// pond, or Imhoff tank with a retention time of ≥ 2 h at Q_Tr,h,max" (L616) → multicompartment_septic_tank,
// settling_pond, imhoff_tank; column 3 "After primary treatment with a raw wastewater filter" → raw_wastewater_filter;
// column 4 "After pretreatment with an aerated settling pond" → aerated_settling_pond. Column 1 "Raw wastewater" has no
// pretreatment token and `rotting_tank` has no printed column → no row (sign-off a262e-E-2). Policy `messwert`: L573
// "If there is no available data … the wastewater pollutant loads per population equivalent given in Table 1 must be
// used" — measured data takes precedence (provenance: existing A262-03 `datenquelle_abwasser`).
// ---------------------------------------------------------------------------
export const TABLE1_PRETREATMENT_MAP = [
  { token: 'multicompartment_septic_tank', col: 2, label: 'Mehrkammergrube (nach Vorbehandlung, Tab. 1 Spalte 2)' },
  { token: 'settling_pond', col: 2, label: 'Absetzteich (nach Vorbehandlung, Tab. 1 Spalte 2)' },
  { token: 'imhoff_tank', col: 2, label: 'Emscherbrunnen (nach Vorbehandlung, Tab. 1 Spalte 2)' },
  { token: 'raw_wastewater_filter', col: 3, label: 'Rohabwasserfilter (nach Vorreinigung, Tab. 1 Spalte 3)' },
  { token: 'aerated_settling_pond', col: 4, label: 'Belüfteter Absetzteich (nach Vorbehandlung, Tab. 1 Spalte 4)' },
] as const;
const T1_OVERRIDE_QUOTE = 'If there is no available data about the quantity and quality of the wastewater to be treated, it must be decided whether the missing data should be determined by additional measurements or if it should be estimated based on empirical values. For the design of filters for municipal wastewater treatment plants based on empirical values, the wastewater pollutant loads per population equivalent given in Table 1 must be used.'; // L573

function table1Split(code: string, param: string, quote: string, byCol: Record<2 | 3 | 4, number>, noteByCol: Partial<Record<2 | 3 | 4, string>> = {}): RegulationTable {
  const rows: RegulationRow[] = TABLE1_PRETREATMENT_MAP.map((m, i) => ({
    row_key: m.token, keys: { pretreatment: m.token }, group_label: null, label_de: m.label, order_index: i,
    values: { load_g_pd: byCol[m.col], note: noteByCol[m.col] ?? null }, verbatim_quote: quote,
  }));
  return { standard_code: STD, edition: ED, table_code: code, title_de: `Einwohnerspezifische Fracht ${param} nach Vorbehandlung (Tab. 1)`, clause_reference: '§4.1.2, Tab. 1', page_ref: null,
    key_columns: ['pretreatment'], value_columns: [{ name: 'load_g_pd', type: 'number', unit: 'g/(P·d)' }, { name: 'note', type: 'string' }],
    override_policy: 'messwert', override_quote: T1_OVERRIDE_QUOTE, verification_status: 'md_verified', rows };
}
/** Tab. 1 CSB (COD) row (L618): 120 / 80 / 25 / 60. */
export function table1CsbAsTable(): RegulationTable { return table1Split('TABLE1_CSB', 'CSB (COD)', Q_T1_CSB, { 2: 80, 3: 25, 4: 60 }); }
/** Tab. 1 BSB5 (BOD5) row (L617): 60 / 40 / 10 / 30. */
export function table1Bsb5AsTable(): RegulationTable { return table1Split('TABLE1_BSB5', 'BSB5 (BOD5)', Q_T1_BSB5, { 2: 40, 3: 10, 4: 30 }); }
/** Tab. 1 TKN row (L620): 11 / 10 / 4.4 (>12 °C) / 8.5 — the raw-filter cell carries its printed temperature condition. */
export function table1TknAsTable(): RegulationTable { return table1Split('TABLE1_TKN', 'TKN', Q_T1_TKN, { 2: 10, 3: 4.4, 4: 8.5 }, { 3: '(>12 °C)' }); }

// ---------------------------------------------------------------------------
// Table 2 (§4.1.3, L672–L685) — greywater loads, CSB row only (the consumer is A262-26 B_CSB_Grauwasser). Keys =
// the two printed columns (L676 "Greywater Median (from Standard DWA-A 272:2014)" / "Greywater Average (from Sievers
// et al. 2:2014)"). Policy `anhaltswert`: L670 "Table 2 gives informative specific loads for greywater."
// ---------------------------------------------------------------------------
export function table2CsbAsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'median', keys: { source: 'median' }, group_label: null, label_de: 'Greywater Median (from Standard DWA-A 272:2014)', order_index: 0, values: { load_g_pd: 47 }, verbatim_quote: Q_T2_CSB },
    { row_key: 'average', keys: { source: 'average' }, group_label: null, label_de: 'Greywater Average (from Sievers et al. 2:2014)', order_index: 1, values: { load_g_pd: 57 }, verbatim_quote: Q_T2_CSB },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE2_CSB', title_de: 'Einwohnerspezifische CSB-Fracht Grauwasser (Tab. 2)', clause_reference: '§4.1.3, Tab. 2', page_ref: null,
    key_columns: ['source'], value_columns: [{ name: 'load_g_pd', type: 'number', unit: 'g/(P·d)' }],
    override_policy: 'anhaltswert', override_quote: 'Table 2 gives informative specific loads for greywater.', // L670
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// §4.2.2 / §4.2.3 / §4.2.4 / §4.2.5 / §4.2.7 — the printed pretreatment size floors, one row per prod
// `pretreatment_selected` token that prints one (raw_wastewater_filter is sized by Tab. 3 — no row, a262e-E-2).
// The aerated settling pond prints "1.2 m³/P" (L777) — stored in the column's unit l/P as exactly 1200.
// Policy `locked`: "must be at least" (L700).
// ---------------------------------------------------------------------------
export function s42VorbehandlungAsTable(): RegulationTable {
  type R = { token: string; label: string; v_l_p: number | null; v_l: number | null; hrt: number | null; a: number | null; note: string | null; quote: string };
  const R: R[] = [
    { token: 'multicompartment_septic_tank', label: 'Mehrkammergrube: ≥ 300 l/P und mindestens 3 000 l (§4.2.2)', v_l_p: 300, v_l: 3000, hrt: null, a: null, note: null, quote: Q_S422 }, // L700
    { token: 'rotting_tank', label: 'Rottebehälter: Nutzvolumen ≥ 200 l/P (§4.2.3)', v_l_p: 200, v_l: null, hrt: null, a: null, note: 'plus downstream multicompartment septic tank: useable volume of at least 300 l/P and a minimum volume of 3,000 l; maximum dosing of 1,000 l/(m²·d)', quote: Q_S423 }, // L705
    { token: 'settling_pond', label: 'Absetzteich: spezifische Oberfläche ≥ 1,5 m²/P (§4.2.4)', v_l_p: null, v_l: null, hrt: null, a: 1.5, note: null, quote: Q_S424 }, // L709
    { token: 'imhoff_tank', label: 'Emscherbrunnen: Absetzraum ≥ 2 h bei Q_Tr,h,max und ≥ 75 l/P (§4.2.5)', v_l_p: 75, v_l: null, hrt: 2, a: null, note: null, quote: Q_S425 }, // L721
    { token: 'aerated_settling_pond', label: 'Belüfteter Absetzteich: ≥ 1,2 m³/P = 1 200 l/P (§4.2.7)', v_l_p: 1200, v_l: null, hrt: null, a: null, note: null, quote: Q_S427 }, // L777
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({ row_key: r.token, keys: { pretreatment: r.token }, group_label: null, label_de: r.label, order_index: i,
    values: { v_min_l_p: r.v_l_p, v_min_l: r.v_l, hrt_min_h: r.hrt, a_spez_min_m2_p: r.a, note: r.note }, verbatim_quote: r.quote }));
  return { standard_code: STD, edition: ED, table_code: 'S4_2_VORBEHANDLUNG', title_de: 'Mindestgrößen der Vorbehandlung je Verfahren (§4.2)', clause_reference: '§4.2.2–§4.2.7', page_ref: null,
    key_columns: ['pretreatment'],
    value_columns: [{ name: 'v_min_l_p', type: 'number', unit: 'l/P' }, { name: 'v_min_l', type: 'number', unit: 'l' }, { name: 'hrt_min_h', type: 'number', unit: 'h' }, { name: 'a_spez_min_m2_p', type: 'number', unit: 'm²/P' }, { name: 'note', type: 'string' }],
    override_policy: 'locked', override_quote: Q_S422, verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// TABLE_LIMITS — Tables 3–14 (§4.2.6, §4.3.1–§4.3.3) as one limits table keyed (filter_type, system_size, sewer).
// One row per printed table × sewer token; a table without a sewer split is seeded for `tr` and `m` with identical
// cells. Sewer-split cells: Tab. 3 (A_Fo,spez,Tr ≥ 1.2 with A_Fo,min 4.8 "for separated sewer networks" / A_Fo,spez,M
// ≥ 1.5), Tab. 12 (≥ 0.8 / ≥ 1), Tab. 14 (A_AWF,spez and q_AWF,aM "for combined sewer networks"). Tab. 3 (raw
// wastewater filter, pretreatment) is printed once and summarised for both sizes (Tab. 17 L1199, Tab. 18 L1226) →
// seeded under both size tokens. Tab. 5/11 two-stage: A_Fo1,spez ≥ 1 and A_Fo2,spez ≥ 1 (each stage), A_Fo,min "4+4"
// → per-stage a_spez_min 1 / a_min_m2 4 with the printed pair in a_spez_1_min / a_spez_2_min. Tab. 10 "≥ 10* ≥ 20":
// h_beschickung_min 20, h_beschickung_min_tight 10 (footnote L945 "*) For tightly-spaced distribution networks, see
// Section 5.5.2.3"). Tab. 13 "t_Sicker,min,aM ≤ 4" (L1019) is the only "≤" on that quantity in the standard — encoded
// as printed in t_sicker_max (a262e-U-2; table stays imported_unverified). Policy `locked`: the cells are "≥"/"≤"
// limits ("The requirements are given in Table 3." L742); the Tab. 15 redox footnote is a262e-P-1.
// Not seeded here: the Tab. 17/18 summary cells that the detail tables do not print (a262e-J-2), the Tab. 18 orifice
// row (TABLE18_ORIFICE), Tab. 15 (TABLE15, temperature-keyed) and Tab. 16 (TABLE16, material-keyed).
// ---------------------------------------------------------------------------
export const LIMITS_VALUE_COLUMNS: ValueColumn[] = [
  { name: 'area_ref', type: 'string' },
  { name: 'a_spez_min', type: 'number', unit: 'm²/P' }, { name: 'a_min_m2', type: 'number', unit: 'm²' },
  { name: 'a_spez_1_min', type: 'number', unit: 'm²/P' }, { name: 'a_spez_2_min', type: 'number', unit: 'm²/P' },
  { name: 'f_a_f_csb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'f_a_f_csb_betrieb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'f_a_f01_csb_max', type: 'number', unit: 'g/(m²·d)' },
  { name: 'q_f_t_max', type: 'number', unit: 'l/(m²·d)' }, { name: 'q_f_betrieb_max', type: 'number', unit: 'l/(m²·d)' },
  { name: 'q_beschickung_min', type: 'number', unit: 'l/(m²·min)' },
  { name: 'h_beschickung_min', type: 'number', unit: 'l/m²' }, { name: 'h_beschickung_max', type: 'number', unit: 'l/m²' }, { name: 'h_beschickung_min_tight', type: 'number', unit: 'l/m²' },
  { name: 't_sicker_min', type: 'number', unit: 'h' }, { name: 't_sicker_max', type: 'number', unit: 'h' },
  { name: 'f_v_csb_max', type: 'number', unit: 'g/(m³·d)' }, { name: 'f_a_anf_csb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'l_hf_min', type: 'number', unit: 'm' },
  { name: 'l_rieselr_min_m_p', type: 'number', unit: 'm/P' }, { name: 'l_rieselr_each_max', type: 'number', unit: 'm' }, { name: 'b_rieselr_min', type: 'number', unit: 'm' }, { name: 'b_fgr_min', type: 'number', unit: 'm' },
  { name: 'a_awf_spez_min', type: 'number', unit: 'm²/P' }, { name: 'q_awf_max', type: 'number', unit: 'l/(m²·d)' },
];
type LimitCells = Partial<Record<string, number | string | null>>;
export type LimitsRow = { filter_type: string; system_size: 'small_wwts' | 'municipal_wwtp'; sewer: 'tr' | 'm'; table: string; label: string; cells: LimitCells; quote: string };
const UPPER = 'upper_surface';
const BOTTOM = 'basin_bottom';
/** Both sewer rows of a table without a sewer split. */
function bothSewers(filter_type: string, system_size: LimitsRow['system_size'], table: string, label: string, cells: LimitCells, quote: string): LimitsRow[] {
  return (['tr', 'm'] as const).map((sewer) => ({ filter_type, system_size, sewer, table, label, cells, quote }));
}
// Tab. 3 (L749–L755): raw wastewater filter — pretreatment, both sizes; separated (Tr) / combined (M) split.
const T3_COMMON: LimitCells = { area_ref: UPPER, f_a_f_csb_max: 100, q_f_t_max: 250, q_beschickung_min: 10, h_beschickung_min: 20, h_beschickung_max: 50 };
const t3 = (system_size: LimitsRow['system_size']): LimitsRow[] => [
  { filter_type: 'raw_wastewater_filter', system_size, sewer: 'tr', table: 'Tab. 3', label: 'Rohabwasserfilter (Vorbehandlung), Trennsystem – Tab. 3', cells: { ...T3_COMMON, a_spez_min: 1.2, a_min_m2: 4.8 }, quote: Q_T3 },
  { filter_type: 'raw_wastewater_filter', system_size, sewer: 'm', table: 'Tab. 3', label: 'Rohabwasserfilter (Vorbehandlung), Mischsystem – Tab. 3', cells: { ...T3_COMMON, a_spez_min: 1.5 }, quote: Q_T3 },
];
export const TABLE_LIMITS_ROWS: LimitsRow[] = [
  // ---- small wastewater treatment systems (§4.2.6, §4.3.1, §4.3.2; summary Tab. 17) ----
  ...t3('small_wwts'),
  ...bothSewers('vf_sand_0_2', 'small_wwts', 'Tab. 4', 'VF Sand 0–2 mm, Kleinanlage – Tab. 4', { area_ref: UPPER, a_spez_min: 4, a_min_m2: 16 }, Q_T4), // L804–L805
  ...bothSewers('two_stage_vf_gravel_sand', 'small_wwts', 'Tab. 5', 'Zweistufiger VF Feinkies + Grobsand, Kleinanlage – Tab. 5 (je Stufe)', { area_ref: UPPER, a_spez_min: 1, a_min_m2: 4, a_spez_1_min: 1, a_spez_2_min: 1 }, Q_T5), // L819–L821
  ...bothSewers('vf_coarse_sand_0_4', 'small_wwts', 'Tab. 6', 'VF Grobsand 0–4 mm, Kleinanlage – Tab. 6', { area_ref: UPPER, a_spez_min: 1, a_min_m2: 4 }, Q_T6), // L836–L840
  ...bothSewers('aerated_vf_gravel_8_16', 'small_wwts', 'Tab. 7', 'Aktiv belüfteter VF Kies 8–16 mm, Kleinanlage – Tab. 7', { area_ref: BOTTOM, a_spez_min: 1, a_min_m2: 4 }, Q_T7), // L856–L857
  ...bothSewers('two_layer_filter_trench', 'small_wwts', 'Tab. 8', 'Zweischicht-Filtergraben, Kleinanlage – Tab. 8', { area_ref: BOTTOM, a_spez_min: 3, a_min_m2: 12, l_rieselr_min_m_p: 6, l_rieselr_each_max: 18, b_rieselr_min: 0.5, b_fgr_min: 0.5, h_beschickung_min: 20 }, Q_T8), // L873–L879
  ...bothSewers('aerated_hf_gravel_8_16', 'small_wwts', 'Tab. 9', 'Aktiv belüfteter HF Kies 8–16 mm, Kleinanlage – Tab. 9', { area_ref: BOTTOM, a_spez_min: 1, a_min_m2: 4, f_a_anf_csb_max: 200, f_v_csb_max: 100, l_hf_min: 2 }, Q_T9), // L899–L916
  // ---- municipal wastewater treatment plants (§4.2.6, §4.3.3; summary Tab. 18) ----
  ...t3('municipal_wwtp'),
  ...bothSewers('vf_sand_0_2', 'municipal_wwtp', 'Tab. 10', 'VF Sand 0–2 mm, kommunale KA – Tab. 10', { area_ref: UPPER, a_spez_min: 4, f_a_f_csb_max: 20, f_a_f_csb_betrieb_max: 27, q_f_t_max: 80, t_sicker_min: 6, q_beschickung_min: 6, h_beschickung_min: 20, h_beschickung_min_tight: 10 }, Q_T10), // L936–L942
  ...bothSewers('two_stage_vf_gravel_sand', 'municipal_wwtp', 'Tab. 11', 'Zweistufiger VF Feinkies + Grobsand, kommunale KA – Tab. 11 (je Stufe)', { area_ref: UPPER, a_spez_min: 1, a_spez_1_min: 1, a_spez_2_min: 1, f_a_f01_csb_max: 80, t_sicker_min: 3, q_beschickung_min: 10, h_beschickung_min: 20 }, Q_T11), // L968–L973
  { filter_type: 'vf_coarse_sand_0_4', system_size: 'municipal_wwtp', sewer: 'tr', table: 'Tab. 12', label: 'VF Grobsand 0–4 mm, kommunale KA, Trennsystem – Tab. 12', cells: { area_ref: UPPER, a_spez_min: 0.8, q_beschickung_min: 6, h_beschickung_min: 20 }, quote: Q_T12 }, // L994
  { filter_type: 'vf_coarse_sand_0_4', system_size: 'municipal_wwtp', sewer: 'm', table: 'Tab. 12', label: 'VF Grobsand 0–4 mm, kommunale KA, Mischsystem – Tab. 12', cells: { area_ref: UPPER, a_spez_min: 1, q_beschickung_min: 6, h_beschickung_min: 20 }, quote: Q_T12 }, // L995
  ...bothSewers('aerated_vf_gravel_8_16', 'municipal_wwtp', 'Tab. 13', 'Aktiv belüfteter VF Kies 8–16 mm, kommunale KA – Tab. 13', { area_ref: BOTTOM, a_spez_min: 1, f_v_csb_max: 100, t_sicker_max: 4, h_beschickung_min: 6 }, Q_T13), // L1017–L1020 (t_Sicker "≤ 4" as printed, U-2)
  { filter_type: 'vf_lava_sand_0_4', system_size: 'municipal_wwtp', sewer: 'tr', table: 'Tab. 14', label: 'VF Lavasand 0–4 mm, kommunale KA, Trennsystem – Tab. 14', cells: { area_ref: UPPER, a_spez_min: 3, f_a_f_csb_max: 20, q_f_betrieb_max: 240, t_sicker_min: 4, q_beschickung_min: 10, h_beschickung_min: 20 }, quote: Q_T14 }, // L1046–L1051
  { filter_type: 'vf_lava_sand_0_4', system_size: 'municipal_wwtp', sewer: 'm', table: 'Tab. 14', label: 'VF Lavasand 0–4 mm + Abschlagfilter, kommunale KA, Mischsystem – Tab. 14', cells: { area_ref: UPPER, a_spez_min: 3, f_a_f_csb_max: 20, q_f_betrieb_max: 240, t_sicker_min: 4, q_beschickung_min: 10, h_beschickung_min: 20, a_awf_spez_min: 1, q_awf_max: 500 }, quote: Q_T14 }, // L1046–L1053
];
export function tableLimitsAsTable(): RegulationTable {
  const rows: RegulationRow[] = TABLE_LIMITS_ROWS.map((r, i) => {
    const values: RegulationRow['values'] = {};
    for (const c of LIMITS_VALUE_COLUMNS) values[c.name] = r.cells[c.name] ?? null;
    return { row_key: `${r.filter_type}|${r.system_size}|${r.sewer}`, keys: { filter_type: r.filter_type, system_size: r.system_size, sewer: r.sewer }, group_label: r.table, label_de: r.label, order_index: i, values, verbatim_quote: r.quote };
  });
  return { standard_code: STD, edition: ED, table_code: 'TABLE_LIMITS', title_de: 'Bemessungsgrenzwerte je Filtertyp, Anlagengröße und Kanalsystem (Tab. 3–14)', clause_reference: '§4.2.6, §4.3.1–§4.3.3, Tab. 3–14', page_ref: null,
    key_columns: ['filter_type', 'system_size', 'sewer'], value_columns: LIMITS_VALUE_COLUMNS,
    override_policy: 'locked',
    // L742 (Tab. 3 cue) — L1147 (Tab. 15 redox footnote, the only printed relaxation; a262e-P-1)
    override_quote: 'Sizing is based on the specific area, as measured on the upper surface of the filter, and the permissible hydraulic load (the larger of the two values determines the design), and differs depending on the type of sewer network (separated or combined). The requirements are given in Table 3. — *) when monitoring the filter effluent for redox potential, an increased loading (up to the maximal loading rate) is possible, when oxic conditions are observed.',
    verification_status: 'imported_unverified', rows }; // a262e-U-2
}

// ---------------------------------------------------------------------------
// Table 15 (§4.3.6.1, L1129–L1144) — VF sand 0–2 mm as polishing step, keyed by the printed temperature band
// (L1136 "<12 °C" / L1137 "≥ 12 °C"); the temperature-independent cells are repeated on both rows. Policy `locked`
// with the "*)" footnote (L1147) quoted — the printed relaxation for redox-monitored filters is a262e-P-1.
// ---------------------------------------------------------------------------
export function table15AsTable(): RegulationTable {
  const common = { f_a_f_csb_max: 20, f_a_f_csb_betrieb_max: 27, q_beschickung_min: 6, h_beschickung_min: 20 };
  const rows: RegulationRow[] = [
    { row_key: 'lt12', keys: { temp_band: 'lt12' }, group_label: null, label_de: '< 12 °C', order_index: 0, values: { ...common, q_f_t_max: 80, t_sicker_min: 6 }, verbatim_quote: Q_T15 },
    { row_key: 'ge12', keys: { temp_band: 'ge12' }, group_label: null, label_de: '≥ 12 °C', order_index: 1, values: { ...common, q_f_t_max: 120, t_sicker_min: 3 }, verbatim_quote: Q_T15 },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE15', title_de: 'VF Sand 0–2 mm als Nachreinigungsstufe nach Ablauftemperatur (Tab. 15)', clause_reference: '§4.3.6.1, Tab. 15', page_ref: null,
    key_columns: ['temp_band'],
    value_columns: [{ name: 'f_a_f_csb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'f_a_f_csb_betrieb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'q_f_t_max', type: 'number', unit: 'l/(m²·d)' }, { name: 't_sicker_min', type: 'number', unit: 'h' }, { name: 'q_beschickung_min', type: 'number', unit: 'l/(m²·min)' }, { name: 'h_beschickung_min', type: 'number', unit: 'l/m²' }],
    override_policy: 'locked',
    override_quote: '*) when monitoring the filter effluent for redox potential, an increased loading (up to the maximal loading rate) is possible, when oxic conditions are observed.', // L1147
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Table 16 (§4.3.6.2, L1153–L1163) — horizontal filters as downstream step, keyed by the printed material
// ("when the filter material is coarse sand" L1158 / "gravel" L1159); f_A,Fu,CSB ≤ 16 applies to both (L1160).
// Policy `locked`: L1151 "must be designed according to the allowable mass and hydraulic loads".
// ---------------------------------------------------------------------------
export function table16AsTable(): RegulationTable {
  const rows: RegulationRow[] = [
    { row_key: 'coarse_sand', keys: { material: 'coarse_sand' }, group_label: null, label_de: 'coarse sand', order_index: 0, values: { f_a_anf_csb_max: 40, f_a_fu_csb_max: 16 }, verbatim_quote: Q_T16 },
    { row_key: 'gravel', keys: { material: 'gravel' }, group_label: null, label_de: 'gravel', order_index: 1, values: { f_a_anf_csb_max: 200, f_a_fu_csb_max: 16 }, verbatim_quote: Q_T16 },
  ];
  return { standard_code: STD, edition: ED, table_code: 'TABLE16', title_de: 'HF Grobsand 0–4 mm oder Kies 2–8 mm als nachgeschaltete Stufe (Tab. 16)', clause_reference: '§4.3.6.2, Tab. 16', page_ref: null,
    key_columns: ['material'], value_columns: [{ name: 'f_a_anf_csb_max', type: 'number', unit: 'g/(m²·d)' }, { name: 'f_a_fu_csb_max', type: 'number', unit: 'g/(m²·d)' }],
    override_policy: 'locked',
    override_quote: 'Horizontal filters without active aeration can be used as an additional biological treatment step. They are operated with permanent saturation and must be designed according to the allowable mass and hydraulic loads. The requirements are provided in Table 16:', // L1151
    verification_status: 'md_verified', rows };
}

// ---------------------------------------------------------------------------
// Table 18 orifice row (§4.4, L1244) — "Filter surface area per orifice of distribution network" in m²/orifice, by
// the eleven Tab. 18 columns (header L1224): raw ≤ 50 · coarse sand ≤ 1 · sand "≤ 5*) better ≤ 1" · two-stage ≤ 1
// (both stages) · aerated ≤ 1 · lava "≤ 25-<5**" · lava overflow (blank) · polishing sand ≤ 1 · HF coarse sand /
// HF gravel (blank). Keyed (filter_type, stage_role) because the sand column appears twice (main ≤ 5, polishing ≤ 1).
// The lava cell is not one number ("≤ 25-<5**", footnote L1248 "**) See Section 5.5.2.7") → orifice_area_max null,
// printed text kept (a262e-U-3; table stays imported_unverified).
// ---------------------------------------------------------------------------
export function table18OrificeAsTable(): RegulationTable {
  type R = { ft: string; role: string; label: string; max: number | null; better: number | null; printed: string };
  const R: R[] = [
    { ft: 'raw_wastewater_filter', role: 'primary', label: 'Raw wastewater filter as pretreatment', max: 50, better: null, printed: '≤ 50' },
    { ft: 'vf_coarse_sand_0_4', role: 'main', label: 'Coarse sand filter 0 mm to 4 mm as main biological treatment step after a raw wastewater filter', max: 1, better: null, printed: '≤ 1' },
    { ft: 'vf_sand_0_2', role: 'main', label: 'Sand filter 0 mm to 2 mm as main biological treatment step', max: 5, better: 1, printed: '≤ 5*) better ≤ 1' },
    { ft: 'two_stage_vf_gravel_sand', role: 'main', label: 'Two-stage filter (gravel first stage / coarse sand second stage)', max: 1, better: null, printed: '≤ 1 / ≤ 1' },
    { ft: 'aerated_vf_gravel_8_16', role: 'main', label: 'Actively aerated filter with gravel 8 mm to 16 mm', max: 1, better: null, printed: '≤ 1' },
    { ft: 'vf_lava_sand_0_4', role: 'main', label: 'Lava sand 0 mm to 4 mm as main biolotical treatment step', max: null, better: null, printed: '≤ 25 - < 5**' },
    { ft: 'vf_sand_0_2', role: 'polishing', label: 'Sand filter 0 mm to 2 mm as polishing step', max: 1, better: null, printed: '≤ 1' },
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({ row_key: `${r.ft}|${r.role}`, keys: { filter_type: r.ft, stage_role: r.role }, group_label: null, label_de: r.label, order_index: i,
    values: { orifice_area_max: r.max, orifice_area_better: r.better, orifice_printed: r.printed }, verbatim_quote: Q_T18_ORIFICE }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE18_ORIFICE', title_de: 'Filterfläche je Verteilöffnung (Tab. 18)', clause_reference: '§4.4, Tab. 18', page_ref: null,
    key_columns: ['filter_type', 'stage_role'],
    value_columns: [{ name: 'orifice_area_max', type: 'number', unit: 'm²/orifice' }, { name: 'orifice_area_better', type: 'number', unit: 'm²/orifice' }, { name: 'orifice_printed', type: 'string' }],
    override_policy: 'locked',
    override_quote: 'Table 18 summarizes the main design parameters for planted and unplanted filters used in municipal wastewater treatment plants.', // L1189
    verification_status: 'imported_unverified', rows }; // a262e-U-3
}

// ---------------------------------------------------------------------------
// Table 21 (§5.4.1, L1444–L1502) — recommended filter media, all ten printed rows (the brief expected the aerated-
// gravel row truncated; in this transcript every row is complete, L1450–L1495). Keyed (filter_type = prod token,
// material = the printed "Designation" as a token) because one prod token covers two printed rows (horizontal filter
// with coarse sand / with fine gravel) and the two-material rows print one pair per cell. Numeric columns are filled
// only where the printed cell is one number or one range; two-material cells stay in the printed strings.
// Policy `anhaltswert`: L1426 "Table 21 summarizes grain size distributions and characteristics of recommended filter
// media." + L1423 "other types of filter material may be used".
// ---------------------------------------------------------------------------
export function table21AsTable(): RegulationTable {
  type R = { ft: string; mat: string; label: string; section: string; sieve: string; sym: string; desig: string; fines: string; finesMax: number; u: string; d10: string; d10min: number | null; d10max: number | null; kOpt: string; kCalc: string; quote: string };
  const R: R[] = [
    { ft: 'raw_wastewater_filter', mat: 'fine_gravel', label: 'Raw wastewater filter', section: '5.4.2.1', sieve: '2 to 8', sym: 'fG', desig: 'fine gravel', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '3', d10min: 3, d10max: 3, kOpt: '≈ 10^-1', kCalc: '9.0 × 10^-2', quote: Q_T21_RAW },
    { ft: 'vf_sand_0_2', mat: 'sand', label: 'Vertical filter with sand', section: '5.4.2.2', sieve: '0 to 2', sym: 'S', desig: 'sand', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '0.20 to 0.4', d10min: 0.2, d10max: 0.4, kOpt: '≈ 10^-4', kCalc: '4.0 × 10^-4 to 1.6 × 10^-3', quote: Q_T21_SAND },
    { ft: 'two_stage_vf_gravel_sand', mat: 'fine_gravel_coarse_sand', label: 'Two-stage vertical filter with fine gravel and coarse sand', section: '5.4.2.3', sieve: '2 to 8 / 0 to 4', sym: 'fG / gS', desig: 'fine gravel / coarse sand', fines: '≤ 2', finesMax: 2, u: '<5', d10: '3 / 0.25 to 0.4', d10min: null, d10max: null, kOpt: '≈ 10^-1 / ≈ 10^-3', kCalc: '9.0 × 10^-2 / 6.3 × 10^-4 to 1.6 × 10^-3', quote: Q_T21_TWOSTAGE },
    { ft: 'vf_coarse_sand_0_4', mat: 'coarse_sand', label: 'Vertical filter with coarse sand', section: '5.4.2.4', sieve: '0 to 4', sym: 'gS', desig: 'coarse sand', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '0.25 to 0.4', d10min: 0.25, d10max: 0.4, kOpt: '≈ 10^-3', kCalc: '6.3 × 10^-4 to 1.6 × 10^-3', quote: Q_T21_COARSE },
    { ft: 'aerated_vf_gravel_8_16', mat: 'medium_gravel', label: 'Actively aerated vertical filter with gravel', section: '5.4.2.5', sieve: '8 to 16', sym: 'mG', desig: 'medium gravel', fines: '≤ 2', finesMax: 2, u: '<5', d10: '≥ 5', d10min: 5, d10max: null, kOpt: '≈ 1', kCalc: '6.4 × 10^-1', quote: Q_T21_AERVF },
    { ft: 'vf_lava_sand_0_4', mat: 'lava_sand', label: 'Vertical filter with lava sand', section: '5.4.2.6', sieve: '0 to 4', sym: 'S', desig: 'lava sand', fines: '<8', finesMax: 8, u: '< 5', d10: '0.05 to 0.3', d10min: 0.05, d10max: 0.3, kOpt: '4 × 10^-5 to 8 × 10^-4', kCalc: '2.5 × 10^-5 to 9 × 10^-4', quote: Q_T21_LAVA },
    { ft: 'two_layer_filter_trench', mat: 'fine_gravel_coarse_sand', label: 'Filter trenches with fine gravel and coarse sand', section: '5.4.2.7', sieve: '2 to 8 / 0 to 4', sym: 'fG / gS', desig: 'fine gravel / coarse sand', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '3 / 0.25 to 0.4', d10min: null, d10max: null, kOpt: '≈ 10^-1 / ≈ 10^-3', kCalc: '9.0 × 10^-2 / 6.3 × 10^-4 to 1.6 × 10^-3', quote: Q_T21_TRENCH },
    { ft: 'hf_coarse_sand_or_gravel_downstream', mat: 'coarse_sand', label: 'Horizontal filter with coarse sand', section: '5.4.3.1', sieve: '0 to 4', sym: 'gS', desig: 'coarse sand', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '0.30 to 0.4', d10min: 0.3, d10max: 0.4, kOpt: '≈ 10^-3', kCalc: '9 × 10^-4 to 1.6 × 10^-3', quote: Q_T21_HFCOARSE },
    { ft: 'hf_coarse_sand_or_gravel_downstream', mat: 'fine_gravel', label: 'Horizontal filter with fine gravel', section: '5.4.3.2', sieve: '2 to 8', sym: 'fG', desig: 'fine gravel', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '3', d10min: 3, d10max: 3, kOpt: '≈ 10^-1', kCalc: '9.0 × 10^-2', quote: Q_T21_HFGRAVEL },
    { ft: 'aerated_hf_gravel_8_16', mat: 'medium_gravel', label: 'Actively aerated horizontal filter with gravel', section: '5.4.3.3', sieve: '8 to 16', sym: 'mG', desig: 'medium gravel', fines: '≤ 2', finesMax: 2, u: '< 5', d10: '≥ 5', d10min: 5, d10max: null, kOpt: '≈ 1', kCalc: '6.4 × 10^-1', quote: Q_T21_AERHF },
  ];
  const rows: RegulationRow[] = R.map((r, i) => ({ row_key: `${r.ft}|${r.mat}`, keys: { filter_type: r.ft, material: r.mat }, group_label: null, label_de: r.label, order_index: i,
    values: { section: r.section, sieve_mm: r.sieve, symbol_din: r.sym, designation: r.desig, fines_printed: r.fines, fines_max_pct: r.finesMax, u_printed: r.u, u_max: 5, d10_printed: r.d10, d10_min: r.d10min, d10_max: r.d10max, k_fa_optimal: r.kOpt, k_fa_calc: r.kCalc },
    verbatim_quote: r.quote }));
  return { standard_code: STD, edition: ED, table_code: 'TABLE21', title_de: 'Kennwerte empfohlener Filtermaterialien (Tab. 21)', clause_reference: '§5.4.1, Tab. 21', page_ref: null,
    key_columns: ['filter_type', 'material'],
    value_columns: [
      { name: 'section', type: 'string' }, { name: 'sieve_mm', type: 'string' }, { name: 'symbol_din', type: 'string' }, { name: 'designation', type: 'string' },
      { name: 'fines_printed', type: 'string' }, { name: 'fines_max_pct', type: 'number', unit: '%' }, { name: 'u_printed', type: 'string' }, { name: 'u_max', type: 'number' },
      { name: 'd10_printed', type: 'string' }, { name: 'd10_min', type: 'number', unit: 'mm' }, { name: 'd10_max', type: 'number', unit: 'mm' },
      { name: 'k_fa_optimal', type: 'string' }, { name: 'k_fa_calc', type: 'string' },
    ],
    override_policy: 'anhaltswert',
    override_quote: 'Table 21 summarizes grain size distributions and characteristics of recommended filter media. — As long as the requirements for permeability and suffusion lunwanted mixing of a finer filter layer into a coarser one) are met, other types of filter material may be used.', // L1426 — L1423
    verification_status: 'md_verified', rows };
}

/** The live DWA-A-262E set (ten tables), in the order the brief's Step 2 lists them. */
export function a262eSeedTables(): RegulationTable[] {
  return [table1CsbAsTable(), table1Bsb5AsTable(), table1TknAsTable(), table2CsbAsTable(), s42VorbehandlungAsTable(), tableLimitsAsTable(), table15AsTable(), table16AsTable(), table18OrificeAsTable(), table21AsTable()];
}
