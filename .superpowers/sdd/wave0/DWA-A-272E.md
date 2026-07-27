# Wave 0 triage — DWA-A-272E

**Standard.** DWA-A 272E — Principles for the Planning and Implementation of New Alternative
Sanitation Systems (NASS), June 2014 (English edition). standard_id
`5c5d38a1-91dd-4143-8697-d828bca54ef6`, prod `vadsmshzebefjreqcicl` (read-only).
**pdfStatus = text** (clean text PDF). **Page offset = 0 (printed = physical)**, derived this session
from THIS PDF's own footer (physical p.3 → footer "3"; p.4 → "4"; p.5 Content → "5"). TOC (p.5) fixes
clause→page. Reader: `scoop pdftotext -layout` via PowerShell.

**Map:** `C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-272E\`
(`_index.md` + 11 node files: eq-rule-01/07/08/10, tab-05-loads, cr-comp-13, doc-bdew-2011,
dp-dead-gates, dp-ranges, dp-missing-docs, dp-phantom-fields).

## Node counts
nodeCount = 98 (25 section + 10 equation + 6 table + 35 CR + 6 decision-point + 16 document).
Provenance: VA 20 / VC 41 / EV 21 / NR 16.  belowVA (VC+EV+NR) = 78.

## Encoding shape (context)
- 25 worksheet_templates (codes A272E-01..25; order_index skips 14). 5 are archetype `calculation`
  with ZERO equations (A272E-16/22/23/24/25). 186 fields, 225 worksheet_sections (fixed 9-section
  scaffold ×25). 10 equations — ALL EKOWAI `RULE-*`, none source-verbatim. 37 CR rows / 35 codes.
- The standard has **no numbered equations** (encoding self-declares: RULE-1 source_quote =
  "Source has no numbered equations (§1.4 XML mapping)"). Numeric layer is entirely synthesized.

## Findings by class
- **dead gate (non-parsing / literal-placeholder condition) — 7** (dominant):
  COMP-06 `condition="RULE-10"`; COMP-07 `="RULE-11"`; COMP-19 `="VR-40"`; COMP-26 `="VR-11"`;
  COMP-13(A272E-01) `="manual"`; COMP-16 `="site_measurement_used eq true OR (Table 5 verbatim)"`
  (`eq` unsupported + free-text); COMP-21 `="both populated"`. None parse under evaluate.ts
  worksheet-local grammar → no reachable-fail → dead. → dp-a272e-dead-gates.
- **phantom-field gate — 1:** COMP-01 (A272E-01, block) requires `rationale_documented==true`; no such
  field on A272E-01. → dp-a272e-phantom-fields.
- **verdict/lookup-as-producer — 4:** RULE-8 `examine_NASS`, RULE-9 `horizon_ok`, RULE-10
  `consistency_ok`, RULE-11 `consistency_ok` (Table-3 lookup, "engineer must lookup, not compute").
  Boolean/lookup outputs, arithmetic engine cannot emit → attestation/rule-fed.
- **derived-not-verbatim (SR-1) — 5:** RULE-1..5 (`L=L_pop·E`) self-declared EKOWAI skeletons
  ("not verbatim … verify with engineer"). Cap VC.
- **#22 hand-enterable-derived — 5 fields:** A272E-07 `L_BOD5_daily_total` / `L_COD_daily_total` /
  `L_N_daily_total` / `L_P_daily_total` / `Q_daily_total` editable while RULE-2..5 produce `L_*_total`.
- **F-7 range / undefined-threshold (SR-2) — 2:** §7.3 three-band horizon (30-50 / 50-100 / 10-20 yr)
  flattened to RULE-9 `30..50` + COMP-11/COMP-22 `10..100` with no case-binding; §5.1 "several"
  encoded as `favourable_conditions_count ≥ 1` (numeric pick of undefined word). → dp-a272e-ranges.
- **duplicate CR code — 1:** COMP-13 on A272E-01 (warn/`manual`) AND A272E-18 (block/
  `monitoring_program_defined==true`). → cr-a272e-comp-13.
- **empty calculation worksheets — 5:** A272E-16/22/23/24/25 (archetype calculation, 0 equations);
  over-scaffolded 25-worksheet template vs. a single qualitative source narrative. → dp-a272e-phantom-fields.
- **F-4 var-vs-var non-enforcement:** none clean (no source var-vs-var comparison is silently dropped
  beyond the horizon/several cases already logged under F-7).

## Below-VA list (78) — grouped
- **NR (16):** all out-of-library document nodes — BDEW 2011, DWA-Topics 2008, KVR/DWA 2012, Annex A
  standard set, DIN EN 752, DIN EN 12056-1, DIN 4045, WHG, KrWG, TrinkwV, DüngG, DüV, BioAbfV,
  + 3 supporting refs. Dependents (RULE-7 derivation, §8 legal gates COMP-08/24/25, §3 term enums)
  cap NR on the deferred content. NOT acquisition-blocking (gates are attestation/enum, not the
  external test).
- **EV (21):** the empty/over-scaffolded worksheets (A272E-16/17/19/20/21/22/23/24/25) and their
  unverified scaffold fields; the 9-section-per-worksheet scaffold rows (source has no such sections).
- **VC (41):** the 10 RULE-* equations (source-attested intent, EKOWAI-synthesized form); the load-total
  and share fields; the completeness/attestation gates (COMP-05/10/12/23/27/34 and the §9.2 stakeholder
  block COMP-28..33 whose conditions are `stakeholder_* == true` bare booleans — parse-OK but
  attestation-grade, no printed scalar to assert VA against).

## Dead gates (count = 7)
COMP-06, COMP-07, COMP-13(A272E-01), COMP-16, COMP-19, COMP-21, COMP-26. (Plus phantom-field COMP-01
is functionally unpassable but classed separately.)

## Missing-doc dependencies (16, in_library:false)
BDEW (2011); DWA-Topics 2008 "New Alternative Sanitation Systems"; KVR Guidelines (DWA 2012);
Annex A applicable-standards set; DIN EN 752; DIN EN 12056-1; DIN 4045; WHG; KrWG; TrinkwV;
DüngG; DüV; BioAbfV; + ATV-A-198 / DIN EN 16323 / UN-Water (supporting). None blocks the
planning-narrative gates → standard is NOT acquisition-blocked.

## VA basis (rendered PDF, offset 0, this session — verbatim quotes captured)
- §5.1 p.15: "If several of the favourable conditions are met in a specific case, the implementation
  of NASS should be examined in the planning process."
- §4.3 p.11: "Faeces are only captured via dry toilets." / "…urine diverting toilets (gravity or
  vacuum technology)."
- §6.2 Table 5 fn.3 p.20: "The average flushing water requirement is given in BDEW (2011) as 33 l/(E d)."
- §6.2 p.20: "If measurements are not possible, Table 5 can be used as a guide for the estimation of
  loads and volumes."
- §7.3 p.24: "Typical planning horizons should be 30 to 50 years, but may also be 50 to 100 years if
  sewer systems are included. However, for isolated applications, the planning horizon may be only a
  period of 10 to 20 years."

## Tier
**fix-first.** The source PDF is clean text and abundantly VA-quotable, so this is NOT
acquisition-blocked (no in-library-doc dependency gates a mandatory numeric path — all external
refs sit behind attestation/enum gates). But before any harness run the gate layer needs a parse
pass: 7 dead gates + 1 phantom-field gate + 4 verdict-as-producer equations + 5 hand-enterable-derived
fields + the §7.3/§5.1 range flattening. Defects-to-fix-first dominate a majority of the
compliance/value layer.
