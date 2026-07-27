# Wave 0 triage — DWA-M-205 (Merkblatt DWA-M 205, Desinfektion von biologisch gereinigtem Abwasser)

- standard_id: `01c46e30-92cb-45c8-9a6e-96ea58be317c`  (prod `vadsmshzebefjreqcicl`, READ-ONLY)
- PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.pdf`  (pdfStatus = **text**)
- Page offset (derived from THIS footer, never inherited): **printed = physical − 6**
  (physical p.8 → footer "2 März 2013"; UV-dose text between footers "15"/"16" → printed 16;
  chlorine 0,2 mg/l just below footer "29" → printed 29).
- Map: `01-Projects/ekowai-wizard/reasoning-maps/DWA-M-205/` (`_index.md` + 100 nodes)
- Tier: **fix-first**

## Node roll-up
nodes=100 · VA=4 · VC=40 · EV=37 · NR=19 · belowVA=96
(sections 26, equations 12, tables 8, CRs 38, documents 11, decision-points 5)

## Findings by defect class
- **phantom-field gate / dead gate (CR resolves on symbols the host worksheet doesn't own):**
  25 CR codes affected (14 dead on EVERY placement, 11 dead on ≥1 placement).
  Fully-dead CRs: CR-02, CR-08, CR-09, CR-10, CR-11, CR-18, CR-19, CR-22, CR-24, CR-28,
  CR-29, CR-34 (12 by symbol-ownership) plus CR-05/CR-12 style microbio piled on M205-10
  where owned by M205-25 — verdict engine counted **14 fully-dead**. CR-28 and CR-34 are
  dead on BOTH placements (split ownership: `durchfluss_max`+`mehrstrassige_anlage` /
  `afs`+`vorsiebung_erforderlich` live in different worksheets).
- **dead gate (structural):** the 14 fully-dead CRs above = CRs with no reachable-fail
  (worksheet-local resolution can never bind the symbol → gate silently vacuous).
- **greedy-AND / range-fabrication:** CR-07 `uv_dosis >= 300 AND uv_dosis <= 700` fuses two
  distinct printed bands (300-450 baseline; 400-600/700 operational) into one gate not
  verbatim anywhere; CR-34 `... AND vorsiebung_erforderlich IN {ja, nein}` — the IN{ja,nein}
  conjunct is a **tautology** (any enum value passes) → vacuous AND-arm.
- **inequality/enum/verdict-as-producer:** EQ-02, EQ-06, EQ-07, EQ-09, EQ-10, EQ-11, EQ-12
  (7) declare `output_symbol` = LHS of a `>=`/`<=`/range constraint; EQ-05 `spez_energie_ozon
  = 10` is a printed constant mis-modelled as an equation. `ozon_pro_doc < 0,8` and
  `restchlor_betrieb >= 0,2` are threshold constraints modelled as producers.
- **#22 hand-enterable-derived:** all range/inequality "equations" are `imported_unverified`
  and would land as engineer-entered fields while declared `derived` output_symbols — the
  #22 class (derived that is hand-enterable). displayOnly must be set.
- **duplicate rows / single-owner violation:** 36 CR codes → 74 placements; 12 equations →
  26 rows. Same rule 2-3×, some at CONFLICTING severity: `ozon_pro_doc<0,8` = CR-21(block)+
  REQ-M205-ES1-04(warn)+eq; `restchlor_betrieb>=0,2` = CR-23(block)+REQ-M205-ES1-11(block)+eq.
- **missing source_quote (EV / SR-1):** every plain CR-01..CR-36 has `source_quote = null`;
  only the two REQ-M205-ES1-* rows carry a verbatim quote. Value gates capped VC/EV until a
  PDF quote is attached in-session.
- **F-4 var-vs-var non-enforcement:** none material (M-205 gates are var-vs-constant / enum);
  CR-26/CR-28 use OR-arms but against constants, not two engineer vars.
- **section artifact:** `worksheet_sections` (234) ≈ `fields` (237) → sections auto-emitted
  one-per-field (Pass3c artifact), not authored subsection structure.

## Below-VA list (why each is not VA)
- 26 section nodes — EV (no section-level scalar to assert).
- 11 fully-dead CRs — EV (no live gate / no attestation → nothing to verify).
- ~27 CR nodes — VC/EV (`source_quote = null`; value corroborated by same-clause table/eq
  where available, else EV).
- 8 table nodes — VC (rows carry `source_quote` in prod but page not individually read this
  session; promote to VA on a clause-page read).
- 10 equation nodes — VC (range/quotient/constant; PDF page not re-read, or defers to an
  out-of-library standard). 2 equation nodes VA (UV-dose bands p.16; restchlor p.29 — wait:
  UV bands + restchlor eq = the 3 VA equations; ES1-11 is the 4th VA node).
- 19 NR — 11 out-of-library `document` nodes + 8 CRs whose limit is governed by an
  out-of-library document (DIN 5031-1, DVGW W 225/W 625, BGV B4, TrinkwV, EG-Badegewässer-RL
  2006/7/EG + 76/160/EWG, BioStoffV/TRBA 220/400, WHO, EG-Fischgewässer-RL, TLL 2003).

## Dead gates (fully unreachable — count = 14)
CR-02, CR-08, CR-09, CR-10, CR-11, CR-18, CR-19, CR-22, CR-24, CR-28, CR-29, CR-34
(+ the two microbio codes stranded on the UV worksheet). Each = a `block` CR whose condition
symbol is never owned by any worksheet it is attached to → never fires. Plus 11 MIXED CRs
that fire on their true owner but carry a redundant dead placement on M205-05 / M205-10.

## Missing-doc dependencies (out-of-library → dependents NR)
DIN 5031-1 · DVGW W 225 · DVGW W 625 · BGV B4 · TrinkwV (Anlage 1 Teil I) ·
EG-Badegewässerrichtlinie 2006/7/EG · EG-Badegewässerrichtlinie 76/160/EWG ·
BioStoffV + TRBA 220 + TRBA 400 · WHO (DALY/Log-Reduktion) · EG-Fischgewässer-Richtlinie ·
TLL 2003 (Eignungsklassen Bewässerungswasser).

## Tier rationale
**fix-first.** Value layer is largely VA-capable (UV/chlorine values PDF-verbatim; Tab.1-8
all carry `source_quote`), so NOT acquisition-blocked on the primary standard. But the gate
layer is pervasively dead (14 fully-dead + 11 mixed phantom placements) and rule rows are
duplicated/conflicting — a harness run over this gate set would pass vacuously. Re-home CRs
to single owners, dedupe, and reclassify inequality/range/constant "equations" BEFORE harness.
The out-of-library-governed gates (CR-05/12/19/20 + Tab.1/Tab.3) remain NR regardless.
