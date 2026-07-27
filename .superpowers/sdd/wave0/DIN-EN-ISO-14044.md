# Wave 0 triage — DIN-EN-ISO-14044 (DIN EN ISO 14044:2006-10)

Standard: Umweltmanagement · Ökobilanz · Anforderungen und Anleitungen (ISO 14044:2006); Deutsche
und Englische Fassung EN ISO 14044:2006. Prod standard_id `bd42b6db-884c-46d3-98b5-120c73076269`
(project vadsmshzebefjreqcicl, read-only).
PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-ISO-14044\DIN-EN-ISO-14044-D.pdf`
(pdfStatus=text, 4114 lines, bilingual D/E, 84 pp). Reasoning map:
`Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DIN-EN-ISO-14044\`.

## What this standard IS
A **requirements standard** (modal "muss/shall"), the certifiable-companion "requirements & guidelines"
half of the ISO 1400x LCA pair — ISO 14040 is the "sollte/should" principles/framework half.
Encoding: 6 worksheets = the six LCA phases (Goal&Scope, LCI, LCIA, Interpretation, Reporting,
Critical review), 51 sections, **67 fields**, **1 equation** (EQ-01 characterization, prose-formalized),
**0 tables**, **17 compliance_requirements — 16 `block`, 1 `warn`**, enum_values on 10 fields. It
prints essentially **no numeric value** (sole constant: "review panel ≥3 members", §6.3) and **no
formula** (EQ-01 is described in prose, not printed as a `Gl.`). Almost every field is
`engineer_input` LCA project data; VA lives at the **clause/CR/equation-clause level**.

## Node counts (36 total)
sections 6 · equations 1 · tables 0 · CRs 17 · documents 1 (ISO 14040, out-of-library) ·
decision-points 10 · index 1. Fields (67) rolled up into section nodes.

Provenance: **VA 24** (6 sections + 17 CRs + 1 equation-clause, each verbatim-quotable w/ printed
page pinned) · **VC 11** (10 enum choice-lists + EQ-01 constructed-algebra ceiling) · **NR 1**
(doc-iso-14040) · EV 0.
data_class: **engineer_input 65** (fields) · **standard_fixed 1** (§6.3 panel ≥3, page 60) ·
**derived 1** (EQ-01 output category_indicator_result) · normative-as-input-reference 0.
**belowVA = 12** (11 VC + 1 NR).

## Page convention (derived from THIS pdf — not inherited)
ISO body pages carry footer `EN ISO 14044:2006 (D/E)`; the printed page integer sits on the line
immediately ABOVE that footer (line 1160→14, 1230→15, … 4108→60, monotonic). Content following a
page-N footer is on printed page N+1 (verified vs TOC: §4.1 body follows p14 footer → p15, TOC lists
§4.1 p15; §6.1 follows p58 footer → p59, TOC lists §6.1 p59). DIN national front matter has its own
short 1..~14 sequence; body clause pages are cited. Clause→page: §4.1→15, §4.2.2→15, §4.2.3.2→17,
§4.2.3.6→19-20, §4.3.3→26, §4.3.4→28, §4.4.2→33, §4.4.2.4→39, §4.4.5→43, §4.5.3→51, §4.5.4→53,
§5.1→54, §5.2→55, §5.3→58, §6.1→59, §6.2→60, §6.3→60. VA nodes cite quote + printed page.

## Findings by defect class
- **dead gate (enum-domain tautology) ×2** — REQ-01 `study_type IN {lca,lci}` and REQ-12
  `report_type IN {internal,third_party}` name the COMPLETE enum domain of their field → predicate
  always true → no reachable-fail, can never `block`. [[dp-14044-enum-tautology-gates]].
- **boolean-verdict checked `IS NOT NULL` instead of `== true` (non-enforcement) ×7** — REQ-05, 07,
  09, 13, 14, 16, 17 let a `false` answer satisfy a `block` gate (e.g. `allocation_balance_preserved`,
  `reviewer_independent`, `iso_conformance_statement`). Gate enforces presence, not the required
  affirmative. **Highest-value fix surface.** [[dp-14044-notnull-vs-true]].
- **normative rule absent from condition (semantic gate gap) ×2** — REQ-09 (§4.4.5: weighting shall
  NOT be used for public comparative assertions — prohibition never encoded) and REQ-05/REQ-14
  (§4.2.3.6 / §5.3 lists mandatory ONLY for public comparisons — condition never branches on
  `comparative_assertion_public = true`). [[dp-14044-semantic-gaps]].
- **greedy-AND multi-field gate ×6 (up to 11-way)** — REQ-02/03/04/05/07/08/11/13/14/16/17 AND
  2–11 `!=''`/`IS NOT NULL`; REQ-05's 11-field AND is extreme; mostly `block` so weight is higher.
  No per-field attribution. [[dp-14044-greedy-and]].
- **#22 derived-hand-enterable ×1** — `category_indicator_result` is EQ-01's output AND a plain
  `number` field the UI lets the engineer type. [[dp-14044-eq01-derived-hand-enter]].
- **prose-formalized equation (VC ceiling on algebra) ×1** — §4.4.2.4 prints no `Gl.`/symbols; the
  encoded `SUM(lci_result * characterization_factor)` is constructed. VA on clause/page-39, VC on the
  algebra; validator must not force it to VA. [[dp-14044-eq01-prose-formalized]].
- **standard_fixed constant not enforced ×1** — §6.3 "review panel ≥3 members" (page 60) lives in
  field `review_panel_members` but NO gate enforces `>= 3` (REQ-16 only not-null-checks it).
  [[dp-14044-panel-min3]].
- **enum value node has no per-option source page ×10 (VC ceiling)** — 10 enum fields; clause_ref
  present, per-option page not pinned. Ceiling, not defect. [[dp-14044-enum-pages]].
- **`source_quote` NULL on all 67 fields (systemic) ×1** — anchoring lives only at CR/eq level; not
  blocking (page derivable from clause_reference + PDF, SR-3).
- **NO phantom-field gate** — every CR condition symbol resolves to a real encoded field (checked vs
  the 67-field set). **NO inequality/enum/verdict-as-producer, NO F-4 var-vs-var** (single equation,
  no var-vs-var comparison).

## Below-VA node list (12)
- **NR (1):** [[doc-iso-14040]] (normative-ref, in_library:false; citation not data edge → caps
  nothing downstream).
- **VC (11):** 10 enum choice-list clusters (study_type, critical_review_type, allocation_procedure,
  data_category, heating_value_basis, recycling_allocation_type, lcia_dq_technique, optional_element,
  report_type, + the DQ narrative set) — per-option page not pinned; + [[eq-14044-01-characterization]]
  algebra ceiling (VA on clause, VC on constructed formula).

## Dead gates (2)
REQ-01 (`study_type IN {lca,lci}`), REQ-12 (`report_type IN {internal,third_party}`) — full-enum-
domain tautologies, no reachable-fail. Both `block`.

## Missing-doc dependencies (1)
- **ISO 14040** — normatively referenced (§4.1 "shall … see ISO 14040 for principles and framework";
  §6 conformity to "dieser Norm"). NOT in prod library (0 `standards` rows for %14040%). NR. BUT
  **no value flows from it** → it caps nothing downstream; §4.1's obligation is quotable from 14044's
  own text. Citation, not data edge (ISO-14004 precedent). Does not gate the harness.

## Tier
**fix-first.** The standard is clause-VA-reachable (24/36 VA, good page discipline, one honest NR that
gates nothing), but it carries **9 enforcement-behaviour defects that fire the wrong way** before a
harness run: 2 dead enum-tautology gates + 7 boolean-not-null non-enforcers (a `false` verdict passes
a `block` gate) + 2 semantic gaps (the §4.4.5 no-weighting prohibition and the public-comparison
conditionals are unencoded) + 1 unenforced §6.3 ≥3 constant + the #22 hand-enterable EQ output. None
is acquisition-blocked (ISO 14040 is a citation, not a data dependency). All fixes are PDF-attested
and unambiguous but change gate behaviour → staged written-not-applied for Alvaro's batch, not
auto-applied.
