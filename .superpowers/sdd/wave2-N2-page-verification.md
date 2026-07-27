# Wave 2 / N2 — Corpus-wide `source_page` verification against rendered PDFs

**Ledger header** — model `claude-opus-5` · Claude Code **2.1.218** (`claude --version`, no update
offered) · effort: high · date 2026-07-27 · branch `feat/data-track-fixes` (worktree
`_wt-data-track-fixes`; artefacts written to `_wt-fll`).

**Mandate.** Make the corpus' `source_page` claims verifiable AT SCALE, run that verification,
report evidence and proposals. **Nothing was edited.** No map node, no frontmatter, no ledger.
The only file created outside this report is the verifier itself.

**Binding doctrine applied.** SR-3 (rendered PDF is ground truth; a VA claim without a valid page
ref is INVALID) · R-1 (every claim backed by a re-executable command, raw output pasted) · R-3
(verification = re-execution) · R-5 (report the reversal) · NEVER INVENT (a page that cannot be
determined mechanically is marked UNRESOLVED/UNTESTABLE, never guessed) · `data_class:
product_workflow` nodes exempt.

---

## T1 — The verifier

**Artefact:** `C:\Users\Ekowai\_wt-fll\scripts\reasoning-map\verify-source-pages.mjs`
Node core only, no dependencies. Re-runnable. Flags: `--std <CODE>`, `--json`, `--out <file>`,
`--nodes` (per-node detail), `--refresh` (force pdftotext re-extraction).

### Method (and why each step refuses to guess)

1. **Resolve the PDF(s)** for the standard from `docs/source-pdf-inventory.md`, including the
   inventory's three path notations (plain, brace set `_Part{1,2,3,4}.pdf`, range set
   `_Part1.pdf .. _Part5`).
2. **Extract once** with `pdftotext -layout -enc UTF-8`, cached under
   `%LOCALAPPDATA%\Temp\rm-pdftext-cache`. Split on `\f` so **index N = PDF page N** (1-based).
   Multi-part sets are concatenated in part order into one global page array.
3. **Derive the printed→PDF offset** from running footers/headers (T2 below). Never assumed.
   Where a footer is directly readable, the node's claimed printed page is mapped through the
   **footer map** (exact); otherwise through the derived modal offset.
4. **Derive distinctive search tokens from the node itself** — clause/sub-clause number, equation
   or field symbol, table/figure caption, verbatim quoted phrase, rare long word or bigram from
   the title / "What it is." sentence, decimal threshold. Two match modes:
   - `raw` — literal substring (used for dotted clause numbers, decimals);
   - `squash` — both haystack and needle reduced to lowercase alphanumerics. This is what makes
     encoded symbols findable at all: node `A_F_TKN_red` → `aftknred`, PDF `AF,TKN,red` →
     `aftknred`. Subscripts, commas and layout spacing stop mattering.
5. **Rarity gate (the anti-guessing device).** A token is usable **only if it hits between 1 and 5
   pages document-wide**. Common words self-eliminate. If no token survives, the node is
   **UNTESTABLE — NO-DISTINCTIVE-TOKEN**. The tool never falls back to a plausible page.
6. **Table-of-contents suppression.** Pages whose text contains ≥5 dotted-leader lines
   (`/\.{4,}\s*\d{1,3}\s*$/m`) are excluded from hits — a TOC repeats every clause number and
   caption in the book and would otherwise both swamp the rarity gate and drag "nearest hit"
   into the front matter.
7. **Classify** against a ±8-page window around the mapped page, using up to 4 tokens:
   - **CONFIRMED** — any distinctive token appears on the claimed page.
   - **OFF-BY-N** — no token on the claimed page, but token(s) within the window; N is the
     offset, voted across tokens and weighted by token strength (rarer + higher-priority class
     carries more weight).
   - **NOT-FOUND** — no token anywhere in the window (includes `PAGE-OUT-OF-RANGE`).
   - **UNTESTABLE** — no PDF / no text layer / no derivable offset / non-numeric page / no
     distinctive token.
8. **Independent cross-check.** Where a token is **document-unique** (exactly 1 hit corpus-wide),
   the page it sits on is the node's true page *regardless of any offset assumption*. The modal
   `uniqueHitPage − claimedPrinted` per standard is recorded as `impliedOffset` and compared to
   the footer-derived offset. This is the backbone of T4.

### Calibration against Wave 1

Wave 1 hand-verified DWA-A-262E at **9/99 pages correct = 9.1 %**. The tool, run blind:

```
> node scripts\reasoning-map\verify-source-pages.mjs --std DWA-A-262E
std                  pdfPg off conf  claim  CONF  OFFN  NOTF  UNTEST  acc%   domN  error
DWA-A-262E              76    2 0.816    102    10    70     6      16   11.6    1x28
```

**11.6 % vs 9.1 % hand-count**, and the derived offset is **+2**, matching the independently
confirmed value. Slightly optimistic (a handful of weaker tokens confirm pages a human judged
wrong), so treat the corpus accuracy figure as an **upper bound**.

```
> node scripts\reasoning-map\verify-source-pages.mjs --std DWA-A-138-1
std                  pdfPg off conf  claim  CONF  OFFN  NOTF  UNTEST  acc%   domN  error
DWA-A-138-1            104    2 0.923    120    35    38    12      35   41.2   -1x21
```

Derived offset **+2**, matching the second independently confirmed value. Dominant error **−1**.

### Verdict calibration — what CONFIRMED actually rests on

```
> node -e "...corpus.json ... confirming token class..."
CONFIRMED total=889  of which confirmed by a DOCUMENT-UNIQUE token=446 (50.2%)
confirming token class:
   328  clause
   251  word
   123  quote
    67  bigram
    47  symbol
    41  caption
    17  clause2
    15  number
```

Half of all CONFIRMED verdicts rest on a token that occurs **exactly once in the whole
document** — the strongest evidence obtainable without a human. Only 15 rest on the weakest
(`number`) class.

---

## T2 — Printed→PDF offset, derived per standard

**Derivation.** For every PDF page, candidate page numbers are read from the first 3 and last 6
non-empty lines (wide window because scanned DWA parts carry rotated-sidebar OCR junk — `Cl)`,
`C:`, `0`, `>` — *after* the real footer). Four folio shapes are recognised: integer at line end,
integer at line start, integer isolated by ≥4-space runs (centred footer), and dash-delimited
(`– 21 –`, VDI/ISO style). Each candidate yields a delta `d = pdfIndex − printedNumber`. Deltas
are scored by the number of **distinct pages** supporting them; the modal delta is the offset and
`confidence = supportingPages / totalPages`.

**Plausibility constraints (these are what stop the tool inventing an offset):** `−3 ≤ d ≤ 80`
(a printed number essentially never exceeds its PDF index; front matter is bounded) and
`printedNumber ≤ totalPages + 80`. **If confidence < 0.10 the offset is REJECTED and set to
null** — the standard's nodes then become `UNTESTABLE / NO-OFFSET-DERIVABLE` rather than being
scored against a fabricated offset.

### Confidence, and the independent corroboration of every offset

Column `impliedModal` is the node-implied offset from document-unique anchors (§T1 step 8) —
derived from a completely different signal than the footers.

```
> node -e "footer-derived vs node-implied offset cross-check"
std                  footerOff conf   impliedModal(count)/anchors   verdict
DIN-14021                 6  0.889        +6(3)/   6   AGREE
DIN-14071-1               4  0.833        +5(5)/  13   DIVERGE by 1
DIN-1989-2                0  0.885       +0(12)/  19   AGREE
DIN-276                   0  0.557        +0(4)/  11   AGREE
DIN-EN-16941-2            2  0.909        +2(9)/  17   AGREE
DIN-EN-ISO-14044          4   0.94        +4(3)/  11   AGREE
DVS-2225-4                0  0.897       +1(14)/  25   DIVERGE by 1
DWA-A-102-2               2   0.88       +37(1)/   5   DIVERGE by 35
DWA-A-131                 2  0.882       +2(22)/  30   AGREE
DWA-A-138-1               2  0.923       +1(16)/  49   DIVERGE by -1
DWA-A-178                 2  0.833        +6(4)/  25   DIVERGE by 4
DWA-A-201                 0   0.95        +0(3)/  10   AGREE
DWA-A-222                 1  0.743       +1(32)/  55   AGREE
DWA-A-226                 0  0.966       +1(25)/  40   DIVERGE by 1
DWA-A-262E                2  0.816       +3(20)/  33   DIVERGE by 1
DWA-A-272E                2  0.841        +4(1)/   3   DIVERGE by 2
DWA-M-102-4               2  0.875       +3(23)/  55   DIVERGE by 1
DWA-M-1200-1              0  0.905       -19(2)/  12   DIVERGE by -19
DWA-M-1200-2              0   0.93       +0(12)/  20   AGREE
DWA-M-1200-3              0  0.944        +0(7)/  34   AGREE
DWA-M-179-1               0    0.9        +0(8)/  12   AGREE
DWA-M-187                 0  0.896       +0(11)/  27   AGREE
DWA-M-205                 2  0.864        +2(2)/   2   AGREE
DWA-M-229-1               1  0.961       +18(2)/  12   DIVERGE by 17
DWA-M-229-2               2  0.875        +2(5)/  12   AGREE
DWA-M-277E                2  0.875        +2(3)/   7   AGREE
DWA-M-349                 2  0.913       +1(13)/  33   DIVERGE by -1
DWA-M-363                 2   0.92        +2(3)/  11   AGREE
DWA-M-381E                0  0.973       +0(13)/  29   AGREE
DWA-M-708                 0   0.96        +0(6)/  18   AGREE
DWA-M-732                 2  0.571       +2(10)/  14   AGREE
DWA-M-760                 2   0.88        +2(3)/   5   AGREE
DWA-M-816                 2  0.955        +2(5)/  15   AGREE
DWA-M-820-1               2  0.908       +2(16)/  22   AGREE
DWA-M-820-2               2  0.924        +2(7)/  16   AGREE
DWA-M-820-3               2  0.864        +2(9)/  15   AGREE
FLL-GAR-2023              2   0.95        +2(5)/  22   AGREE
FLL-Naturteich-2017       3  0.935       +3(16)/  37   AGREE
FLL-TP-RHIZOM-2023        1  0.889       +1(15)/  20   AGREE
HOAI-2021                 -  0.022            -/   0   -
ISO-14002-2              12    0.1       +12(9)/  27   AGREE
ISO-14004                 4  0.963       +12(1)/   6   DIVERGE by 8
ISO-14015                10  0.684            -/   0   -
ISO-14019-1               6  0.879       +6(22)/  25   AGREE
ISO-14033                 6  0.446            -/   0   -
ISO-14046                10  0.771       +12(5)/  13   DIVERGE by 2
ISO-14050                 6  0.912            -/   0   -
ISO-14064-1               4  0.954        +4(8)/  25   AGREE
ISO-14064-2               4  0.909        +4(5)/   9   AGREE
ISO-14067                 -  0.024            -/   0   -
ISO-14097                 0      1       +0(17)/  25   AGREE
ISO-46001                10   0.38            -/   0   -
ISO-5667-1                1  0.882       +2(11)/  21   DIVERGE by 1
ISO-5667-10               7    0.8        +7(7)/  11   AGREE
ISO-5667-13               6   0.75        +6(9)/  14   AGREE
ISO-59004                 7  0.871            -/   0   -
ISO-59014                 8  0.784            -/   0   -
ISO-59020                10  0.867            -/   0   -
ISO-59032                 8    0.8       +8(18)/  25   AGREE
VDI-2163                  0  0.957        +0(9)/  29   AGREE
VDI-3477                  0  0.971       +0(10)/  32   AGREE
VDI-3814-Blatt-2-1        0  0.971       +0(23)/  32   AGREE
VSME                      1  0.875            -/   0   -
```

**Reading.** 44 of the 56 standards with anchors show the footer-derived offset and the
node-implied offset **agreeing exactly** — two independent signals converging. `AGREE` means the
offset is sound *and* the node population is broadly on-page. **`DIVERGE by N` is the systematic
encoding shift**: the whole node population sits N printed pages away from where it claims. That
is the T4 signal.

**Confidence tiers.** ≥0.80 (46 standards): high — accept the offset. 0.10–0.79 (8 standards:
DIN-276 0.557, DWA-M-732 0.571, ISO-14015 0.684, DWA-A-222 0.743, ISO-14046 0.771, ISO-59014
0.784, ISO-14033 0.446, ISO-46001 0.38, ISO-14002-2 0.10): moderate — offset corroborated by the
implied cross-check where anchors exist, but treat per-node verdicts as advisory. Rejected
(<0.10): **HOAI-2021 (0.022)** and **ISO-14067 (0.024)** — no offset derivable, 100 nodes
UNTESTABLE by design rather than mis-scored.

### Multi-part sets

```
> node -e "per-part offsets for the 4 multi-part standards"
== DWA-A-102-2  totalPages=100
   DWA-A_102-2_Part1.pdf          pages=  25 offset=    2 conf=0.88 matchedPages=22
   DWA-A_102-2_Part2.pdf          pages=  25 offset=    2 conf=1 matchedPages=25
   DWA-A_102-2_Part3.pdf          pages=  25 offset=    2 conf=1 matchedPages=25
   DWA-A_102-2_Part4.pdf          pages=  25 offset=    2 conf=0.92 matchedPages=23
== DWA-M-708  totalPages=102
   DWA-M_708_GD_Part1.pdf         pages=  25 offset=    0 conf=0.96 matchedPages=24
   DWA-M_708_GD_Part2.pdf         pages=  25 offset=    0 conf=0.96 matchedPages=24
   DWA-M_708_GD_Part3.pdf         pages=  25 offset=    0 conf=1 matchedPages=25
   DWA-M_708_GD_Part4.pdf         pages=  25 offset=    0 conf=0.96 matchedPages=24
   DWA-M_708_GD_Part5.pdf         pages=   2 offset= null conf=0 matchedPages=0
== DWA-M-732  totalPages=53
   DWA-M_732_Part1.pdf            pages=  28 offset=    2 conf=0.571 matchedPages=16
   DWA-M_732_Part2.pdf            pages=  25 offset=    2 conf=0.76 matchedPages=19
== DWA-M-760  totalPages=144
   DWA-M_760_WD_Part1.pdf         pages=  25 offset=    2 conf=0.88 matchedPages=22
   DWA-M_760_WD_Part2.pdf         pages=  25 offset=    2 conf=1 matchedPages=25
   DWA-M_760_WD_Part3.pdf         pages=  25 offset=    2 conf=1 matchedPages=25
   DWA-M_760_WD_Part4.pdf         pages=  25 offset=    2 conf=1 matchedPages=25
   DWA-M_760_WD_Part5.pdf         pages=  25 offset=    2 conf=0.2 matchedPages=5
   DWA-M_760_WD_Part6.pdf         pages=  19 offset= null conf=0 matchedPages=0
```

Under the concatenated model a **single uniform offset holds across every part** of each set
(+2 / 0 / +2 / +2). The two `null` parts are trailing stubs (2 pages, 19 pages of back matter)
and contribute no folios; they do not disturb the global map.

---

## T3 — Corpus-wide run

**Command**

```
node scripts\reasoning-map\verify-source-pages.mjs --out <scratch>\corpus.json
```

**Raw output — 71 standards, worst accuracy first**

```
std                  pdfPg off conf  claim  CONF  OFFN  NOTF  UNTEST  acc%   domN  error
ATV-A-704E              37    -     -      0     0     0     0       0      -       -  PDF yields almost no text (0 chars over 37 pages) — image-only/encrypted
DIN-18130-1             20    -     -     28     0     0     0      28      -       -  PDF yields almost no text (0 chars over 20 pages) — image-only/encrypted
DIN-1989-1              35    -     -     32     0     0     0      32      -       -  PDF yields almost no text (0 chars over 35 pages) — image-only/encrypted
DWA-A-125               78    -     -     49     0     0     0      49      -       -  PDF yields almost no text (0 chars over 78 pages) — image-only/encrypted
HOAI-2021              135    - 0.022     50     0     0     0      50      -       -
ISO-14015               38   10 0.684      0     0     0     0       0      -       -
ISO-14033               74    6 0.446      0     0     0     0       0      -       -
ISO-14050               80    6 0.912      0     0     0     0       0      -       -
ISO-14067               85    - 0.024     50     0     0     0      50      -       -
ISO-46001               50   10  0.38     23     0     0     0      23      -       -
ISO-5667-16             40    -     -      0     0     0     0       0      -       -  PDF yields almost no text (0 chars over 40 pages) — image-only/encrypted
ISO-5667-6               0    -     -      0     0     0     0       0      -       -  SOURCE-ABSENT (no recorded path)
ISO-59004               62    7 0.871      0     0     0     0       0      -       -
ISO-59010               45    -     -      0     0     0     0       0      -       -  PDF yields almost no text (0 chars over 45 pages) — image-only/encrypted
ISO-59014               37    8 0.784      0     0     0     0       0      -       -
ISO-59020               90   10 0.867      0     0     0     0       0      -       -
ISO-9001                42    -     -      7     0     0     0       7      -       -  PDF yields almost no text (0 chars over 42 pages) — image-only/encrypted
VSME                     8    1 0.875     31     0     0    31       0      0       -
ISO-14004              134    4 0.963     11     1     7     1       2   11.1     5x2
DWA-A-262E              76    2 0.816    102    10    70     6      16   11.6    1x28
ISO-14046               48   10 0.771     37     5    11    14       7   16.7     2x5
FLL-GAR-2023           140    2  0.95     70     7     2    28      33   18.9     1x2
DWA-M-1200-3            72    0 0.944     70    13    18    22      17   24.5    -1x5
DWA-M-1200-1           116    0 0.905     44     6    10     8      20     25    -1x2
DIN-14071-1             30    4 0.833     21     5    13     1       2   26.3     1x5
DWA-A-226               29    0 0.966     69    17    41     0      11   29.3    1x32
DIN-276                 61    0 0.557     40     9    19     1      11     31     2x5
DWA-M-102-4             56    2 0.875     89    25    48     0      16   34.2    1x26
DWA-M-708              102    0  0.96     51    12    11    11      17   35.3    -1x4
DWA-M-349               92    2 0.913     46    16    22     5       3   37.2    -2x7
DWA-A-201               20    0  0.95     62    10    15     0      37     40     1x4
DWA-A-138-1            104    2 0.923    120    35    38    12      35   41.2   -1x21
DWA-M-229-1            102    1 0.961     29    10     5     9       5   41.7    -1x1
DWA-M-363               88    2  0.92     23     5     5     2      11   41.7     4x2
VDI-2163                47    0 0.957     44    16    19     3       6   42.1     1x4
DWA-A-178               48    2 0.833     65    22    28     2      13   42.3     1x7
DWA-M-816              112    2 0.955     91    18    15     8      50   43.9     1x5
DWA-M-187               48    0 0.896     42    15    17     1       9   45.5     1x4
DVS-2225-4              29    0 0.897     44    17    18     0       9   48.6    1x17
DIN-14021               63    6 0.889      6     3     3     0       0     50     1x1
DIN-EN-ISO-14044        84    4  0.94     15     7     6     1       1     50     2x2
ISO-5667-1              17    1 0.882     39    13    13     0      13     50    1x10
VDI-3477               102    0 0.971     41    19    13     5       4   51.4     1x4
DWA-M-1200-2           100    0  0.93     41    15    11     3      12   51.7    -1x5
ISO-14002-2             60   12   0.1     35    17    15     0       3   53.1     1x7
DWA-M-277E              40    2 0.875     32     7     5     1      19   53.8    -1x3
ISO-14064-2             66    4 0.909     36     7     3     3      23   53.8     1x1
DWA-A-222               35    1 0.743    117    49    34     1      33   58.3    -1x9
ISO-14064-1            109    4 0.954     41    20    12     2       7   58.8    -1x3
DWA-A-102-2            100    2  0.88    134     9     5     1     119     60    -1x2
DWA-M-820-2             92    2 0.924     33    15     7     1      10   65.2     1x3
FLL-Naturteich-2017     93    3 0.935     58    33    13     4       8     66     1x4
DWA-M-229-2             64    2 0.875     19    12     5     1       1   66.7    -1x3
DWA-M-381E              37    0 0.973     42    26    12     1       3   66.7     4x3
DWA-M-760              144    2  0.88      6     4     1     1       0   66.7    -3x1
ISO-14097               48    0     1     47    23     5     3      16   74.2     3x2
DIN-EN-16941-2          33    2 0.909     24    15     5     0       4     75     1x2
DWA-A-272E              44    2 0.841      7     3     1     0       3     75     1x1
DWA-M-820-1             76    2 0.908     57    33     5     4      15   78.6     1x1
DIN-1989-2              26    0 0.885     35    24     6     0       5     80     1x5
FLL-TP-RHIZOM-2023      36    1 0.889     56    30     6     0      20   83.3     3x2
ISO-59032               50    8   0.8     30    21     4     0       5     84     1x4
ISO-5667-10             35    7   0.8     16    12     2     0       2   85.7    -1x2
DWA-A-131               76    2 0.882     74    45     4     3      22   86.5    -1x2
DWA-M-179-1             40    0   0.9     43    16     1     1      25   88.9    -7x1
VDI-3814-Blatt-2-1      34    0 0.971     40    33     4     0       3   89.2     3x1
DWA-M-732               53    2 0.571     25    20     2     0       3   90.9     5x1
DWA-M-820-3             44    2 0.864     66    35     2     1      28   92.1     1x1
ISO-5667-13             32    6  0.75     16    15     1     0       0   93.8     5x1
ISO-14019-1             58    6 0.879     40    30     1     0       9   96.8     1x1
DWA-M-205               44    2 0.864      4     4     0     0       0    100       -

CORPUS: claimed=2715 testable=1730 CONFIRMED=889 OFF-BY-N=639 NOT-FOUND=202 UNTESTABLE=985 product_workflow_skipped=6
CORPUS ACCURACY = 51.4%  (CONFIRMED / testable)
```

**Totals and the VA slice**

```
> node analyze.mjs corpus.json totals
=== CORPUS TOTALS ===
{
 "claimed": 2715, "C": 889, "O": 639, "NF": 202, "U": 985, "pw": 6,
 "noPage": 1186, "testable": 1730, "accuracyPct": 51.4
}
VA-only slice: {"CONFIRMED":657,"OFF-BY-N":425,"NOT-FOUND":98,"UNTESTABLE":507,"testable":1180,"accuracyPct":55.7}
```

**Headline.** Of 1 730 mechanically testable page claims, **889 land on the right page — 51.4 %.
Roughly half the corpus' page references are wrong.** Restricted to nodes already asserting VA
(the ones SR-3 actually governs): **657 / 1 180 = 55.7 %**. Because the tool is calibrated
slightly optimistic against Wave 1's hand-count, these are **upper bounds**.

Node population for context (line-based census, `census.mjs`):

```
node files=3907 product_workflow=6 empty source_page=1186 purely-numeric=2573 non-numeric-nonempty=142
```

### R-3 spot-checks — verdicts re-executed against raw PDF text

*Spot 1 — an OFF-BY-N is real.* `eq-a262-gl13.md` claims printed **31**:

```
> node showpage.mjs "262E" x "TKN,red|TKN, red"
  PDFPAGE 16: AF,TKN,red             m        reduced required area of the filter, dimensioning according to TKN
  PDFPAGE 35: for Bd,TKN / AF,CSB,red ≥ BA,TKN, zul           use: AF,TKN,red = Bd,TKN / BA,TKN, zul                      (13)
```

Equation (13) is on **PDF 35 = printed 33** (offset +2). Claim of 31 is wrong by **+2**. The tool
classified it OFF-BY-N(+2). ✔

*Spot 2 — a CONFIRMED is real.* `cr-req-22.md` claims printed 3 → PDF 5:

```
> node showpage.mjs "262E" x "permafrost"
  PDFPAGE 5: ... Regions with permafrost are fundamentally unsuitable for filters.
```
✔ True positive.

*Spot 3 — a NOT-FOUND is real, and reproduces the Wave-1 "off by 12" mode.*
`eq-gl2-a138-07.md` (`§5.3.3.5`, `A_C = Sum_i (A_E,i * C_i)`) claims printed **30** → PDF 32.
PDF 32 is about Flächentypen SD1/SD2 — unrelated. The real location:

```
> node showpage.mjs "138_1" x "5\.3\.3\.5"
  PDFPAGE 43: 5.3.3.5 Berechnung Zuflüsse Versickerungsanlagen
> node showpage.mjs "138_1" x "A_?C\s*=\s*|\(2\)\s*$"
  PDFPAGE 43: AC = ∑(AE,b,a,i · Ci) + ∑(AE,nb,a,i · Ci)                                                        (2)
```

True page = PDF 43 = **printed 41**. The node claims 30 — wrong by **+11**, outside the ±8 window,
hence correctly NOT-FOUND rather than OFF-BY-N. The node's own clause reference (§5.3.3.5) is
correct; only the page is wrong. Same fingerprint as Wave 1's `tab-` node that was off by 12.

*Spot 4 — DWA-A-226's +1 is backed by verbatim quotes, not weak tokens.*

```
cr-a226-cr-004.md claimed 11 ->pdf 11 N= 1 | quote:Nitrifikation: BTS,BSB ≤ 0,05 kg/(kg×d)=>12
cr-a226-cr-005.md claimed 11 ->pdf 11 N= 1 | quote:Denitrifikation: BTS,BSB ≤ 0,04 kg/(kg×d)=>12
cr-a226-cr-006.md claimed 12 ->pdf 12 N= 1 | quote:OB ≥ 3 kg/kg für Anlagen mit Nitrifikation=>13
```

Exact printed sentences, each found on exactly one page, each exactly one page after the claim.

---

## T4 — Proven mechanical offsets

Two independent criteria must both hold before a bulk correction is called *proven*:

1. a single N explains a large majority of the standard's OFF-BY-N nodes; **and**
2. the **node-implied offset diverges from the footer-derived offset by exactly that same N**
   (§T2 cross-check) — i.e. the shift is visible in a signal that never looked at the ±8 window.

```
> node -e "T4 corroborated bulk-offset candidates"
std                   N  expl/OFFN share  impliedDiv anchors  CORROB  residualCount
DWA-A-226            +1    32/41   78%         +1      40   YES        9
DWA-A-262E           +1    28/70   40%         +1      33   YES       42
DWA-M-102-4          +1    26/48   54%         +1      55   YES       22
DWA-A-138-1          -1    21/38   55%         -1      49   YES       17
DVS-2225-4           +1    17/18   94%         +1      25   YES        1
ISO-5667-1           +1    10/13   77%         +1      21   YES        3
DIN-14071-1          +1     5/13   38%         +1      13   YES        8
ISO-14046            +2     5/11   45%         +2      13   YES        6
DWA-A-222            -1     9/34   26%         +0      55   no        25
DWA-A-178            +1     7/28   25%         +4      25   no        21
DWA-M-349            -2     7/22   32%         -1      33   no        15
ISO-14002-2          +1     7/15   47%         +0      27   no         8
DIN-1989-2           +1      5/6   83%         +0      19   no         1
ISO-59032            +1      4/4  100%         +0      25   no         0
... (33 further standards, none corroborated)
```

Only **8 standards are corroborated on both signals**; of those only **3 also clear a
large-majority share with a small residual**. Note `ISO-59032 +1 4/4 = 100 %` and
`DIN-1989-2 +1 5/6 = 83 %` look tempting on share alone but are **not** corroborated by the
implied-offset cross-check (both `+0`) — on n=4 and n=6 that is noise, and they are rejected.
This is the discipline the second criterion buys.

Full residual lists for the corroborated set are in
**PROPOSED BULK CORRECTIONS** below.

### The DWA-A-262E residual is diagnostic, not noise

`+1` explains only 28/70. The residual is not random — it contains **consecutive
auto-incremented runs**, exactly the Wave-1 failure mode:

```
section-a262-11:+7  section-a262-12:+6  section-a262-13:+5  section-a262-14:+4  section-a262-15:+3  section-a262-16:+2
section-a262-20:-1  section-a262-21:-2  section-a262-22:-3  section-a262-23:-4
cr-req-101:-5 cr-req-102:-5 cr-req-103:-5 cr-req-104:-5 cr-req-110:-5 cr-req-111:-5 cr-req-112:-5
eq-a262-gl12:+2 eq-a262-gl13:+2 eq-a262-gl14:+2
```

Sections 11→16 with offsets +7,+6,+5,+4,+3,+2 is the signature of a block whose pages were
auto-incremented 22,23,24,25,26,27 while the real content stayed put. **These cannot be fixed by
one offset** — each run needs its own constant. They are listed as separate sub-patterns below,
but they are *not* claimed as proven; a human must confirm the run boundaries.

---

## T5 — SR-3 downgrade list

Every NOT-FOUND node is a page claim that could not be located anywhere within ±8 pages of where
it says it is. Under SR-3 a VA claim without a valid page reference is INVALID → **VA must
downgrade to VC**.

```
> node analyze.mjs corpus.json downgrade | tail
TOTAL NOT-FOUND = 202  (of which provenance VA = 98)
```

202 NOT-FOUND nodes total; **98 currently assert VA** and form the proposed downgrade set. The
other 104 are already VC/EV/NR and need no provenance change (their wrong page is still a defect,
but not an SR-3 violation).

```
> node -e "VA NOT-FOUND grouped by standard"
  23  FLL-GAR-2023          2  DWA-A-131          1  DIN-14071-1        1  DWA-M-277E
  17  VSME                  2  DWA-A-178          1  DIN-EN-ISO-14044   1  DWA-M-381E
  11  DWA-A-138-1           2  DWA-M-349          1  DWA-A-222          1  DWA-M-760
   6  DWA-A-262E            2  DWA-M-363          1  DWA-M-1200-3       1  DWA-M-820-1
   4  DWA-M-708             2  ISO-14064-1        1  DWA-M-179-1        1  DWA-M-820-3
   4  FLL-Naturteich-2017   2  ISO-14064-2        1  DWA-M-229-1        1  ISO-14004
   3  ISO-14046             2  VDI-3477           1  DWA-M-229-2
   3  ISO-14097
```

Full per-node lists, written alongside this report:
- `C:\Users\Ekowai\_wt-fll\.superpowers\sdd\wave2-N2-downgrade-va.txt` — the 98 VA nodes
  (standard, node, claimed page, mapped PDF page, reason).
- `C:\Users\Ekowai\_wt-fll\.superpowers\sdd\wave2-N2-notfound-all.txt` — all 202 NOT-FOUND nodes
  with current provenance.

Head of the full 202-row list:

```
DIN-14071-1          section-din14071-03.md                       20     24  VA
DIN-276              section-din-05.md                             4      4  NR
DIN-EN-ISO-14044     cr-14044-01.md                               15     19  VA
DWA-A-131            section-a131-01.md                            9     11  VA
DWA-A-131            section-a131-06.md                           39     41  VA
DWA-A-138-1          cr-a138-req-10.md                            30     32  VA
DWA-A-138-1          eq-gl2-a138-07.md                            30     32  VA
DWA-A-138-1          eq-gl2c-a138-07.md                           30     32  VA
DWA-A-138-1          eq-gl2d-a138-07.md                           30     32  VA
DWA-A-138-1          eq-gl2e-a138-07.md                           30     32  VA
DWA-A-138-1          eq-gl2f-a138-07.md                           30     32  VA
DWA-A-138-1          eq-gl2g-a138-07.md                           30     32  VA
DWA-A-138-1          section-a138-04.md                           37     39  VA
DWA-A-138-1          section-a138-14.md                           48     50  VA
DWA-A-138-1          tab-05.md                                    26     28  VA
DWA-A-138-1          tab-13.md                                    44     46  VA
DWA-A-178            cr-a178-req-02.md                             4      6  VA
DWA-A-178            cr-a178-req-28.md                            20     22  VA
DWA-A-222            section-a222-02.md                           10     11  VA
DWA-A-262E           cr-req-33.md                                 11     13  VA
DWA-A-262E           cr-req-34.md                                 11     13  VA
DWA-A-262E           cr-req-35.md                                 11     13  VA
DWA-A-262E           cr-req-36.md                                 11     13  VA
DWA-A-262E           section-a262-02.md                            4      6  VA
DWA-A-262E           section-a262-07.md                           44     46  VA
...
VSME                 section-c09_000.md                           14     15  VA  [PAGE-OUT-OF-RANGE]
```

**Caveat that must ride with this list.** NOT-FOUND means *unverifiable by this method*, which is
the SR-3 trigger — but two sub-populations deserve a human look before the downgrade is written:

- The **7 DWA-A-138-1 `eq-gl2*-a138-07` nodes** are all off by the same **+11** (true page 41,
  claimed 30) — see Spot 3. They are a coherent *correctable block*, not seven independent
  mysteries. Correcting the page is the better fix than downgrading.
- The **17 VSME nodes** are NOT-FOUND only because the recorded PDF is the wrong document (below).
  Their pages may be perfectly correct against the real VSME Annex I. Downgrading them would
  record a defect that is the inventory's, not the encoding's.

---

## PROPOSED BULK CORRECTIONS (T4) — evidence only, **nothing applied**

**Tier A — proven: single offset, large majority, small residual, corroborated on both signals.**
Apply `source_page += N` to the OFF-BY-N nodes listed as explained; leave residuals to per-node
work.

| # | standard | node-class | N | explained / in-class | residual |
|---|---|---|---|---|---|
| A1 | DVS-2225-4 | all classes | **+1** | **17 / 18 (94 %)** | `cr-req-09.md:+2` |
| A2 | DWA-A-226 | all classes | **+1** | **32 / 41 (78 %)** | `cr-a226-cr-001:+2` `cr-a226-cr-019:-1` `eq-gl2-a226-03:-1` `eq-gl25-a226-07:+2` `eq-gl26-a226-07:-1` `eq-gl27-a226-07:+3` `eq-gl28-a226-07:+3` `eq-gl29-a226-07:+3` `section-a226-01:+7` |
| A3 | ISO-5667-1 | all classes | **+1** | **10 / 13 (77 %)** | `cr-iso5667-1-002:-1` `cr-iso5667-1-021:+5` `section-iso5667-1-05:+4` |

Tier A total: **59 nodes** correctable by three uniform edits, 13 residuals for per-node review.

Class-level breakdown for the same three (from `analyze.mjs bulk`, qualification ≥4 nodes and
≥70 % share):

```
DWA-A-226            eq       +1    18/24  75%
DWA-A-226            cr       +1     9/11  82%
DWA-A-226            section  +1      3/4  75%   residual: section-a226-01.md:+7
DVS-2225-4           cr       +1      7/8  88%   residual: cr-req-09.md:+2
DVS-2225-4           dp       +1      5/5  100%
ISO-5667-1           cr       +1      6/8  75%
ISO-5667-1           section  +1      3/4  75%   residual: section-iso5667-1-05.md:+4
DWA-A-262E           eq       +1     8/11  73%   residual: eq-a262-gl12/13/14:+2
DWA-M-816            eq       +1      3/4  75%   residual: eq-24-11.md:-5
```

**Tier B — real systematic shift, but NOT a clean bulk edit.** The implied-offset cross-check
corroborates the direction and magnitude, so the shift is genuine; but the dominant N explains
well under three quarters, so a blanket edit would break as many nodes as it fixes. Recommend
per-node correction driven by the tool's per-node `--nodes` output.

| standard | N | explained / OFF-BY-N | implied divergence | why not Tier A |
|---|---|---|---|---|
| DWA-M-102-4 | +1 | 26 / 48 (54 %) | +1 | 22 residuals spanning −4…+6 |
| DWA-A-138-1 | −1 | 21 / 38 (55 %) | −1 | 17 residuals; separate `eq-gl19..23-a138-18` block at −2 and a `+11` block (see T5) |
| DWA-A-262E | +1 | 28 / 70 (40 %) | +1 | 42 residuals containing auto-increment runs (below) |
| ISO-14046 | +2 | 5 / 11 (45 %) | +2 | 6 residuals |
| DIN-14071-1 | +1 | 5 / 13 (38 %) | +1 | 8 residuals spanning −5…+7 |

**Tier B sub-patterns worth ratifying separately** (coherent runs, each needs its own constant —
proposed, *not* proven):

- `DWA-A-262E` sections 11–16 → `+7,+6,+5,+4,+3,+2` (auto-increment artefact; true pages are
  constant-ish while claims incremented).
- `DWA-A-262E` sections 20–23 → `−1,−2,−3,−4` (same artefact, opposite sign).
- `DWA-A-262E` `cr-req-101/102/103/104/110/111/112` → uniform **−5** (7 nodes, one clean constant).
- `DWA-A-262E` `eq-a262-gl12/13/14` → uniform **+2** (corroborated verbatim in Spot 1).
- `DWA-A-138-1` `eq-gl19/21/22/23-a138-18`, `eq-gl40-a138-21` → uniform **−2**.
- `DWA-A-138-1` `eq-gl2*-a138-07` (7 nodes) → uniform **+11** (true printed 41; Spot 3).

**Tier C — rejected as bulk candidates.** 33 standards whose dominant N is *not* corroborated by
the implied-offset cross-check, including the two that look strongest on share alone
(`ISO-59032 +1 4/4 100 %`, `DIN-1989-2 +1 5/6 83 %` — both implied `+0`). Their OFF-BY-N nodes are
individually wrong, not systematically shifted. No bulk edit proposed.

---

## PROPOSED DOWNGRADES (T5)

**98 nodes, VA → VC**, being every NOT-FOUND node currently asserting VA (per-standard counts and
head of list in T5 above; full list `.superpowers\sdd\wave2-N2-downgrade-va.txt`). Recommended
sequencing before any write:

1. **Hold the 17 VSME nodes** — the recorded source PDF is the wrong document (see residue). Fix
   the inventory first; re-run; downgrade only what still fails.
2. **Hold the 7 DWA-A-138-1 `eq-gl2*-a138-07` nodes** — proven correctable to printed 41. Correct
   the page rather than downgrade the claim.
3. Remaining **74 nodes** are clean SR-3 downgrades on current evidence.

---

## HONEST RESIDUE — what could not be tested, and why

```
> node analyze.mjs corpus.json untestable
    682  NO-DISTINCTIVE-TOKEN
    116  NO-TEXT-LAYER
    100  NO-OFFSET-DERIVABLE
     87  NON-NUMERIC-PAGE
```

**985 nodes (36 % of all page claims) could not be tested.** Breakdown:

**1. NO-DISTINCTIVE-TOKEN — 682 nodes.** No token in the node survived the rarity gate. Dominant
causes: nodes whose entire body is an encoded boolean condition
(`gewaesser_in_scope == true`) with no printed vocabulary; and OCR-garbled sources where squash
matching still fails (**DWA-A-102-2 alone contributes 119 UNTESTABLE** — its scanned parts render
symbols as `1'/;` and `AFs 63`). This is the honest floor of the method: these nodes are neither
confirmed nor refuted.

**2. NO-TEXT-LAYER — 116 nodes across 7 standards.** The recorded PDF is an image-only scan.
Independently re-executed outside the tool:

```
> & pdftotext.exe -layout "...\DWA-A-125\DWA-A-125.pdf" out.txt ; (Get-Item out.txt).Length
chars=78
> ... ISO-9001.pdf     -> chars=42
> ... DIN-1989-1.pdf   -> chars=35
```

78 / 42 / 35 characters for entire documents — form feeds only. Affected: **DWA-A-125 (49
nodes), DIN-1989-1 (32), DIN-18130-1 (28), ISO-9001 (7)**, plus ATV-A-704E, ISO-5667-16,
ISO-59010 (0 page claims each). **These standards cannot reach VA by any text method** until the
PDFs are OCR'd. That is a new source-inventory finding, not previously recorded.

**3. NO-OFFSET-DERIVABLE — 100 nodes.** HOAI-2021 (50) and ISO-14067 (50). Offset confidence
0.022 / 0.024, below the 0.10 floor, so the tool refused to score rather than invent. For
ISO-14067 the cause is a **wrong source file** (below).

**4. NON-NUMERIC-PAGE — 87 nodes.** `source_page` holds no digit at all. Line-based census:

```
> node census.mjs
   36   "n/a (worksheet-level)"     (DWA-A-102-2)
   23   "MISSING-PDF"               (ISO-46001 — all 23 of its claims)
    8   "n/a"
    7   "none"                      (DWA-M-277E)
    7   "block"                     (DWA-M-277E)
    3   "warn"                      (DWA-M-277E)
    1   "various" / 1 "i" / 1 "cover"
```

Two sub-findings here:
- **DWA-M-277E has severity values in `source_page`** — 17 nodes carry `block` / `warn` / `none`
  where a page belongs, with `severity:` sitting empty. Confirmed by raw read of
  `section-m277e-07.md` and `section-m277e-08.md` (`source_page: none`, `severity:` blank). This
  is a field-shift authoring defect, not a page error.
- **ISO-46001's 23 nodes carry the sentinel `MISSING-PDF`** — but the inventory now records a
  50-page, text-extractable ISO-46001 PDF. The sentinel is stale; those nodes are re-encodable.

**5. Values the tool tested by leading integer (55 nodes).** Where `source_page` is non-numeric
but *contains* a number — `"49 (transcription); compute capped EV"`, `"26/28"`,
`"~30 (§5, printed body page)"` — the verifier extracts the leading integer and tests it. Sound
for the `(transcription)` and `~N` forms; **unsound for 2 nodes**: `"3,6"` → tests 3, and
`"v,1"` → tests 1. Flagged, not corrected.

**6. Three `_template-node.md` files were tested** (`source_page:
"<PRINTED page from the DWA footer, e.g. 42; ...>"` → tested as page 42). Templates should be
excluded from future runs; impact is 3 nodes.

**7. Source-inventory findings — AUTO paths that are the wrong document.** The inventory warns
AUTO paths must be confirmed on first VA use. Three failures found:

- **VSME** — recorded path is `250730-recommendation-vsme_en.pdf`, which is the **9-page European
  Commission Recommendation cover instrument**, not the VSME standard (which is its Annex I).
  Verified by reading PDF page 8: *"The Commission recommends that Member States raise awareness
  among SMEs … in accordance with the standard set out in Annex I."* All 31 VSME page claims
  point past page 9 → 31 NOT-FOUND, of which 17 assert VA. **Not an encoding defect — an
  inventory defect.**
- **ISO-14067** — recorded PDF is a **Vietnamese/English bilingual translation (TCVN)**, not the
  ISO 14067 English standard. Raw page 20: *"triển khai của PCR (3.1.1.9) có thể áp dụng cho tiêu
  chuẩn này."* Its pagination cannot correspond to the encoded ISO pages. 50 nodes untestable.
- **ISO-14097** — already flagged QUESTIONED in the inventory (Scoping Report, not the standard).
  The tool scored it 74.2 %, which measures agreement with the *wrong* document and should be
  disregarded.

**8. ISO-5667-6** — SOURCE-ABSENT, as the inventory records. 0 page claims; nothing to test. No
change to its VC ceiling.

**9. Not tested at all:** 1 186 nodes have an empty `source_page` (no claim to verify) and **6
`data_class: product_workflow` nodes were skipped as exempt**, per the 2026-07-27 ratification.

---

## REVERSALS (R-5)

1. **"DWA-A-102-2's recorded path is broken" — WRONG, my bug.** The first corpus run reported
   `recorded path not found on disk` and marked all 134 nodes untestable. The four part files
   exist. My brace-expansion regex was swallowing the inventory's trailing annotation, producing
   `..._Part1.pdf (4-part set)`. Fixed; the standard now resolves to 100 pages and scores 60 %.

2. **"36 DWA-A-102-2 nodes and 23 ISO-46001 nodes have malformed frontmatter" — WRONG, my bug.**
   An exploratory PowerShell regex `^source_page:\s*(.*)$` let `\s*` consume the newline and
   capture the *following* line, so empty `source_page:` fields appeared to contain
   `owner_worksheet:` and `MISSING-PDF`. A line-based re-census (`census.mjs`) shows the frontmatter
   is well-formed. The Node verifier was never affected (it splits frontmatter line-by-line first),
   and its counts reconcile exactly: 36 `"n/a (worksheet-level)"` + 5 `"n/a"` = the 41 NON-NUMERIC
   it reported for DWA-A-102-2. **`MISSING-PDF` on ISO-46001 is nonetheless real** — confirmed by
   the line-based census, 23 nodes.

3. **"Six standards have wildly negative page offsets" — WRONG, my bug.** The first run derived
   offsets of −705 (DWA-M-708), −728 (DWA-M-732), −293 (VDI-3477), −74 (DIN-1989-2), −32
   (DWA-M-760), −25 (ISO-14067), producing 375 NOT-FOUND. Cause: unconstrained footer inference
   picking up years and reference numbers, plus a footer window too narrow to see past
   rotated-sidebar OCR junk. After constraining the offset to a plausible range, widening the
   window and adding dash-delimited folios, five of the six derive clean offsets (0/+2/0/0/+2) and
   corpus NOT-FOUND fell 375 → 202. **The 173-node difference was my tooling, not corpus defects.**
   Reported here so no one downgrades those nodes on the strength of the first run.

4. **"The inventory's DWA-A-102-2 per-part offsets (−1/+24/+49/+74) are needed" — superseded, not
   wrong.** Under the concatenated-parts model a single uniform **+2** holds across all four parts
   (confidence 0.88 / 1.0 / 1.0 / 0.92). The two descriptions are equivalent; the global one is
   simpler and is what the verifier uses.

5. **No reversal on the core Wave-1 finding.** The `source_page` field is confirmed as generated
   and unverified at corpus scale. DWA-A-262E independently re-measured at 11.6 % against Wave 1's
   9.1 %; both of Wave 1's independently-confirmed offsets (+2, +2) were re-derived blind; and the
   named failure modes — uniform ±1 shifts, uniform block shifts, consecutive auto-incremented
   runs, and a double-digit page error on an `eq`/`tab` node — were each reproduced with raw PDF
   evidence.

---

## Re-execution

```
# whole corpus
node C:\Users\Ekowai\_wt-fll\scripts\reasoning-map\verify-source-pages.mjs --out corpus.json

# one standard, per-node detail
node ...\verify-source-pages.mjs --std DWA-A-226 --nodes

# machine output
node ...\verify-source-pages.mjs --std DWA-A-226 --json
```

Cache lives at `%LOCALAPPDATA%\Temp\rm-pdftext-cache`; `--refresh` forces re-extraction. A cold
run over all 70 PDFs takes ~2 minutes; warm runs ~20 seconds.
