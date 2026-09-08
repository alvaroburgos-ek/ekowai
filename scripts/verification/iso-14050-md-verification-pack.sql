-- ============================================================================
-- SR-1 field-verification pack — ISO-14050
--
-- Standard identity (read from the RENDERED cover page, PDF p.1, as an image):
--   ISO 14050, "Environmental management — Vocabulary" / "Management environnemental —
--   Vocabulaire". FOURTH EDITION, 2020-07. Reference number ISO 14050:2020(E). © ISO 2020.
--   Language: English. Issuing body: ISO. Document kind: PUBLISHED International Standard —
--   and specifically a VOCABULARY (terms-and-definitions) standard. Not a draft, not a national
--   adoption, not a Technical Report. Prod standards.version = "2020 (Fourth edition,
--   ISO 14050:2020(E))"; standard id db1c8091-62b8-4f2e-82ea-8e7da44519dd.
--
-- *** HEADLINE FINDING — READ BEFORE APPLYING ANYTHING ***
--   ISO 14050:2020 CONTAINS NO REQUIREMENTS. Mechanical modality census over all 81 PDF pages:
--     shall  : 1 occurrence, ALL of it in the ISO boilerplate Foreword (printed p.iv:
--              "ISO shall not be held responsible for identifying any or all such patent rights").
--              ZERO in Clauses 1-3. ZERO in Annex A.
--     should : 2 occurrences, BOTH in the same boilerplate Foreword (about ISO/IEC Directives
--              approval criteria, and about directing feedback to a national standards body).
--              ZERO in Clauses 1-3. ZERO in Annex A.
--     must   : 0 occurrences anywhere.
--     may    : 2 (1 Foreword boilerplate; 1 inside the informative Annex A mouse example).
--     can    : 15, every body occurrence INSIDE a definition ("that can affect", "can be measured",
--              "can be assigned") — descriptive of a concept, never a permission granted to a user.
--     "is/are required": 0. "required to": 3, all three INSIDE definitions (3.1.11, 3.4.x, 3.6.x).
--   The document also contains ZERO tables, ZERO equations and ZERO "=" characters in its entire
--   text layer. Its 27 figures are all in Annex A, which is marked (informative) and is a
--   terminology-methodology annex (generic/partitive/associative concept relations, illustrated
--   with a computer-mouse example taken from ISO 704:2009).
--   Scope, verbatim (printed p.1 / PDF p.7): "This document defines terms used in documents in the
--   fields of environmental management systems and tools in support of sustainable development."
--   Clause 2, verbatim (printed p.1 / PDF p.7): "There are no normative references in this document."
--
--   CONSEQUENCE: a "compliance gate" over ISO 14050 has nothing to enforce. There is no duty, no
--   limit, no threshold, no range, no table row and no formula in this standard that a machine
--   could check a project against. The 6 gates that exist in prod reflect that honestly by accident
--   — all 6 carry condition = '' (empty string) — but the app does NOT read an empty condition as
--   "nothing to check": src/lib/compliance/evaluate.ts:538 returns kind:'manual', and
--   src/lib/eval/attestation.ts classifies an empty string as NOT an attestation, so
--   src/components/worksheet/compliance-block.tsx:422 and src/lib/pdf/sections/compliance.tsx:85
--   render all six as the DEFECT badge "Bedingung nicht auswertbar — Regel reparieren"
--   ("condition not evaluable — fix the rule"), in the worksheet UI AND in the generated PDF.
--   Every ISO-14050 project therefore ships six permanent red rows telling the engineer to repair
--   rules that were never repairable, because the source they cite contains no rule.
--   Recommendation (staged, NOT applied): ISO 14050 is not coherent as a fillable, gated worksheet
--   set. It IS coherent — and genuinely valuable — as a REFERENCE GLOSSARY for the rest of the
--   ISO 14000 family already in this library (14004, 14015, 14033, 14044, 14046, 14064-1/-2,
--   14067, 14019-1, 14002-2, 59014/59020/59032, 46001), every one of which uses these terms.
--   See iso-14050-STAGED-rulings.sql blocks R-1 .. R-10.
--
-- WHAT THIS PACK DOES: evidence only. It records verification_status / verification_quote /
--   verification_note / verified_at on the 25 encoded fields, each against the printed term entry
--   or subclause it encodes. It changes NO structure, NO enforcement, NO required-ness, NO units,
--   NO gates. All of that sits unapplied in iso-14050-STAGED-rulings.sql.
--
-- Generated: 2026-09-08. Grade: VA (SR-3) — this pass has NO markdown transcript; the source is the
--   text layer of the RENDERED PDF, which SR-3 names as ground truth. Every row is labelled [VA].
--
-- Source text: C:\Users\Ekowai\AppData\Local\Temp\claude\C--Users-Ekowai\
--   521e3f3a-2033-49ca-827b-4adef8491545\scratchpad\pdftext\ISO-14050-2020-en.txt
--   (81 pages, 155 579 bytes, pdftotext -layout -enc UTF-8, form feeds preserved, zero
--   undecodable characters).
-- Original PDF: C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\
--   ISO 14050-2020\ISO-14050-2020-en.pdf
--
-- PAGE CONVENTION: text page N = PDF page N (form feeds preserved).
--   Printed-page mapping reconstructed from the running footers and CONFIRMED against the printed
--   Contents (printed p.iii / PDF p.3), 12 of 12 subclause entries agreeing:
--        printed p.N  =  PDF page N + 6
--   i.e. PDF p.7 = printed p.1 (Scope) ... PDF p.79 = printed p.73. Front matter: PDF p.2 = ii,
--   p.3 = iii (Contents), p.4 = iv (Foreword), p.5 = v (Introduction), p.6 = blank vi.
--   Cross-check, Contents vs. body heading: 3.1→1, 3.2→3, 3.3→6, 3.4→6, 3.5→10, 3.6→12, 3.7→17,
--   3.8→19, 3.9→21, 3.10→25, 3.11→27, 3.12→27. All twelve match. Both numbers cited on every quote.
--
-- SOURCE-QUALITY CHECK BEYOND THE SPOTCHECK (the spotcheck only proves a quote is a substring of
--   the EXTRACTION, never that the extraction matches the printed page). FOUR pages were read as
--   RENDERED IMAGES at 110-130 dpi and compared line by line to the extraction:
--     * PDF p.1  (cover)         — edition/date/title/reference number read from the image. Match.
--     * PDF p.27 (printed p.21)  — §3.9.1-3.9.7, incl. the CO2e entry. Match. The printed form uses
--                                  a typographic subscript (CO₂e); pdftotext flattens it to "CO2e".
--                                  That is subscript flattening, NOT a Symbol-font dropout, and it
--                                  is not load-bearing (no formula, no limit depends on it).
--     * PDF p.36 (printed p.30)  — §3.12.28-3.12.41, incl. material distribution percentage. Match.
--     * PDF p.39 (printed p.33)  — Annex A.2.3/A.2.4 + Figures A.2/A.3. Match; figure labels are
--                                  real text and survive extraction.
--   The Symbol-font risk that silently removed square roots and a ">=" on two other standards CANNOT
--   bite here: this document has no formula, no inequality, no table and no numeric limit anywhere,
--   so there is no load-bearing glyph to lose. Nothing was silently repaired.
--   Unit check: the strings "kg", "%" and "currency" occur ZERO times in the whole 81-page text
--   (grep, raw count 0/0/0) — the units carried on 6 encoded fields are EKOWAI conventions, not
--   quotable from ISO 14050. Recorded per field in verification_note; staged as R-5.
--
-- ENUM COVERAGE (a positive result worth keeping): the source defines 354 terms across §3.1-§3.12;
--   the 12 term-selector enum families carry 354 values, and every printed clause number 3.x.y is
--   present in the matching family. 354/354, no gaps, no invented entries, no printed open list
--   closed (a vocabulary subclause IS a closed list). Per family: 3.1=21, 3.2=35, 3.3=6, 3.4=51,
--   3.5=28, 3.6=51, 3.7=23, 3.8=26, 3.9=39, 3.10=24, 3.11=5, 3.12=45.
-- ENUM FIDELITY (NOT clean — found by checking all 354 definition strings against the source, not
--   by sampling): 344 of the 354 definitions are byte-exact. TEN are contaminated — the LAST entry
--   of ten of the twelve subclauses has the FOLLOWING subclause's printed HEADING appended to its
--   definition text, e.g. §3.1.21 monitoring reads "determining the status of a system, a process
--   (3.1.9) or an activity 3.2 General terms relating to environmental management". Systematic
--   encoder off-by-one at subclause boundaries, not an extraction fault. Affected: §3.1.21,
--   §3.2.35, §3.3.6, §3.4.51, §3.5.28, §3.6.51, §3.7.23, §3.8.26, §3.9.39, §3.10.24. The terminal
--   entries of §3.11 and §3.12 are clean. Full detail and the fix SQL: STAGED R-10 (not applied).
--
-- COUNTS: 25 fields examined / 25 quoted now / 0 exempt (there is no app-metadata field in this
--   standard) / 0 residue / 0 equations (the standard contains none — nothing to lift or backfill).
--   Prior state, read back from prod (vadsmshzebefjreqcicl) before this pack was written, UNIFORM:
--   25 fields, all verification_status='imported_unverified', all 25 active, verification_quote /
--   verification_note / verified_at all NULL (0/0/0). 0 equations. 6 gates, untouched by this pack.
--
-- Rollback: rollback-iso-14050-md-verification-pack.sql
-- Contains ONLY update statements — no begin/commit/rollback (apply-pack.mjs supplies the transaction).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Term-selector fields (12) — one per vocabulary subclause. These are glossary
--    lookups, not data entry: the field's meaning is "which defined term of this
--    subclause is being referred to". Quoted against the printed subclause heading
--    plus the Introduction sentence that establishes the subclause arrangement.
-- ---------------------------------------------------------------------------

-- term__3_1  (ISO-14050-02)
update public.fields set verification_status='verified_against_standard', verification_quote='3.1 General terms relating to management systems | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.1 and p.v / PDF p.7 and p.5', verification_note='VA-verified 2026-09-08 (§3.1 heading, printed p.1 / PDF p.7; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.1 states 21 definitions and imposes no obligation; the enum family carries all 21 (§3.1.1-§3.1.21), complete, no printed open list closed. FIDELITY DEFECT: the terminal entry §3.1.21 "monitoring" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='6cb078fe-697c-4f37-8d5f-114cff07e8e9' and verification_status not in ('verified_against_standard','corrected');

-- term__3_2  (ISO-14050-03)
update public.fields set verification_status='verified_against_standard', verification_quote='3.2 General terms relating to environmental management | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.3 and p.v / PDF p.9 and p.5', verification_note='VA-verified 2026-09-08 (§3.2 heading, printed p.3 / PDF p.9; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.2 states 35 definitions and imposes no obligation; the enum family carries all 35 (§3.2.1-§3.2.35), complete. FIDELITY DEFECT: the terminal entry §3.2.35 "trade-off" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='b7645e00-c055-45f7-b367-a3f08b1be5e6' and verification_status not in ('verified_against_standard','corrected');

-- term__3_3  (ISO-14050-04)
update public.fields set verification_status='verified_against_standard', verification_quote='3.3 Terms relating to environmental management systems | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.6 and p.v / PDF p.12 and p.5', verification_note='VA-verified 2026-09-08 (§3.3 heading, printed p.6 / PDF p.12; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.3 states 6 definitions and imposes no obligation; the enum family carries all 6 (§3.3.1-§3.3.6), complete. FIDELITY DEFECT: the terminal entry §3.3.6 "procedure" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='29166771-3495-4b9b-8a50-57faa4849b63' and verification_status not in ('verified_against_standard','corrected');

-- term__3_4  (ISO-14050-05)
update public.fields set verification_status='verified_against_standard', verification_quote='3.4 Terms relating to verification, validation and audit | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.6 and p.v / PDF p.12 and p.5', verification_note='VA-verified 2026-09-08 (§3.4 heading, printed p.6 / PDF p.12; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.4 states 51 definitions and imposes no obligation; the enum family carries all 51 (§3.4.1-§3.4.51), complete. FIDELITY DEFECT: the terminal entry §3.4.51 "environmental information statement" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='08ed965c-c461-419f-abab-cce5a857ea7e' and verification_status not in ('verified_against_standard','corrected');

-- term__3_5  (ISO-14050-06)
update public.fields set verification_status='verified_against_standard', verification_quote='3.5 Terms relating to product systems | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.10 and p.v / PDF p.16 and p.5', verification_note='VA-verified 2026-09-08 (§3.5 heading, printed p.10 / PDF p.16; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.5 states 28 definitions and imposes no obligation; the enum family carries all 28 (§3.5.1-§3.5.28), complete. FIDELITY DEFECT: the terminal entry §3.5.28 "value chain" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='7e8165c7-2f33-4c11-b612-5fd695515c4c' and verification_status not in ('verified_against_standard','corrected');

-- term__3_6  (ISO-14050-07)
update public.fields set verification_status='verified_against_standard', verification_quote='3.6 Terms relating to life cycle assessment | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.12 and p.v / PDF p.18 and p.5', verification_note='VA-verified 2026-09-08 (§3.6 heading, printed p.12 / PDF p.18; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.6 states 51 definitions and imposes no obligation; the enum family carries all 51 (§3.6.1-§3.6.51), complete. FIDELITY DEFECT: the terminal entry §3.6.51 "comparative eco-efficiency assertion" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='b890853e-fa12-441a-99cc-e4a9e10acfa0' and verification_status not in ('verified_against_standard','corrected');

-- term__3_7  (ISO-14050-08)
update public.fields set verification_status='verified_against_standard', verification_quote='3.7 Terms relating to environmental labelling, declarations and communication | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.17 and p.v / PDF p.23 and p.5', verification_note='VA-verified 2026-09-08 (§3.7 heading, printed p.17 / PDF p.23; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.7 states 23 definitions and imposes no obligation; the enum family carries all 23 (§3.7.1-§3.7.23), complete. FIDELITY DEFECT: the terminal entry §3.7.23 "environmental communication strategy" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='97e4b530-07d8-4158-9dcd-d98ca9be1bf4' and verification_status not in ('verified_against_standard','corrected');

-- term__3_8  (ISO-14050-09)
update public.fields set verification_status='verified_against_standard', verification_quote='3.8 Terms relating to climate change and climate action | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.19 and p.v / PDF p.25 and p.5', verification_note='VA-verified 2026-09-08 (§3.8 heading, printed p.19 / PDF p.25; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.8 states 26 definitions and imposes no obligation; the enum family carries all 26 (§3.8.1-§3.8.26), complete. FIDELITY DEFECT: the terminal entry §3.8.26 "transformation" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10. NOTE: three gates on THIS worksheet (CR-003, CR-004, CR-006) cite §3.9.x, which belongs to worksheet ISO-14050-10 — mis-homed, staged as R-4', verified_at=now() where id='77527d6b-1ade-4da4-8ab7-55e6c280a9ee' and verification_status not in ('verified_against_standard','corrected');

-- term__3_9  (ISO-14050-10)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9 Terms relating to greenhouse gases | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.21 and p.v / PDF p.27 and p.5', verification_note='VA-verified 2026-09-08 (§3.9 heading, printed p.21 / PDF p.27; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.9 states 39 definitions and imposes no obligation; the enum family carries all 39 (§3.9.1-§3.9.39), complete. FIDELITY DEFECT: the terminal entry §3.9.39 "responsible party" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='16bfd01b-94bf-4348-b179-a4d273dfa708' and verification_status not in ('verified_against_standard','corrected');

-- term__3_10  (ISO-14050-11)
update public.fields set verification_status='verified_against_standard', verification_quote='3.10 Terms relating to water footprint | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.25 and p.v / PDF p.31 and p.5', verification_note='VA-verified 2026-09-08 (§3.10 heading, printed p.25 / PDF p.31; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.10 states 24 definitions and imposes no obligation; the enum family carries all 24 (§3.10.1-§3.10.24), complete. FIDELITY DEFECT: the terminal entry §3.10.24 "elementary water flow" carries the NEXT subclause heading appended to its definition text (systematic encoder off-by-one at subclause boundaries; 10 of 354 entries affected) — see STAGED R-10', verified_at=now() where id='a39d52cb-3881-47b3-bab9-da8f13f59963' and verification_status not in ('verified_against_standard','corrected');

-- term__3_11  (ISO-14050-12)
update public.fields set verification_status='verified_against_standard', verification_quote='3.11 Terms relating to carbon footprint | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.27 and p.v / PDF p.33 and p.5', verification_note='VA-verified 2026-09-08 (§3.11 heading, printed p.27 / PDF p.33; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.11 states 5 definitions and imposes no obligation; the enum family carries all 5 (§3.11.1-§3.11.5), complete', verified_at=now() where id='60c08559-954f-402f-8b9c-dfa01a46465c' and verification_status not in ('verified_against_standard','corrected');

-- term__3_12  (ISO-14050-13)
update public.fields set verification_status='verified_against_standard', verification_quote='3.12 Terms relating to economy and finance | The terminology is arranged in subclauses, each representing a specific sub-domain. The sequence of the term entries corresponds to the concept diagrams in Annex A. — printed p.27 and p.v / PDF p.33 and p.5', verification_note='VA-verified 2026-09-08 (§3.12 heading, printed p.27 / PDF p.33; Introduction, printed p.v / PDF p.5) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — glossary selector, not a duty: §3.12 states 45 definitions and imposes no obligation; the enum family carries all 45 (§3.12.1-§3.12.45), complete', verified_at=now() where id='090b4eb5-f715-4ebb-9f18-dc26a4ba37f5' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------
-- B. Quantity fields (13) — each lifted from ONE printed term entry. Every one is
--    a DEFINED CONCEPT, not a required input: ISO 14050 states what the quantity
--    means and never states a value, a limit, a range, a unit or a duty to report
--    it. All 13 are is_required=false in prod, which is correct and stays.
-- ---------------------------------------------------------------------------

-- maturity_level  (ISO-14050-04, §3.3.5)
update public.fields set verification_status='verified_against_standard', verification_quote='3.3.5 maturity level | level of achievement in the implementation process measured on a scale of maturity for environmental management system (3.3.1) elements — printed p.6 / PDF p.12', verification_note='VA-verified 2026-09-08 (§3.3.5, printed p.6 / PDF p.12) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only. The standard names a "scale of maturity" but never prints that scale, its bounds or its steps; the encoded data_type=number with no unit and no enum is therefore honest, and no scale was invented. Nothing consumes this field (0 equations, 0 gates reference it)', verified_at=now() where id='6dd8e361-cdf1-40e1-974a-b3ca07e734eb' and verification_status not in ('verified_against_standard','corrected');

-- product_system_value_indicator  (ISO-14050-06, §3.5.6)
update public.fields set verification_status='verified_against_standard', verification_quote='3.5.6 product system value indicator | numerical quantity representing the product system value (3.5.5) — printed p.10 / PDF p.16', verification_note='VA-verified 2026-09-08 (§3.5.6, printed p.10 / PDF p.16) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; no unit, no limit and no method of determination is printed. Nothing consumes this field', verified_at=now() where id='50d5ba20-f736-4cfc-9444-e8327644657d' and verification_status not in ('verified_against_standard','corrected');

-- global_warming_potential  (ISO-14050-10, §3.9.2)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.2 global warming potential GWP | index, based on the radiative properties of greenhouse gases (3.9.1), measuring the radiative forcing following a pulse emission of a unit mass of a given greenhouse gas in the present-day atmosphere integrated over a chosen time horizon, relative to that of carbon dioxide (CO2) — printed p.21 / PDF p.27', verification_note='VA-verified 2026-09-08 (§3.9.2, printed p.21 / PDF p.27) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; an index, hence dimensionless, so the encoded empty unit is correct. ISO 14050 prints NO GWP value for any gas and NO time horizon: every numeric GWP is NR from this document (it comes from IPCC via ISO 14064-1/14067). No value was invented here', verified_at=now() where id='9b9b9bae-9db3-4c79-893c-a2f21f593790' and verification_status not in ('verified_against_standard','corrected');

-- co2_equivalent  (ISO-14050-10, §3.9.3)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.3 carbon dioxide equivalent CO2e CO2 equivalent | unit for comparing the radiative forcing of a greenhouse gas (3.9.1) to that of carbon dioxide — printed p.21 / PDF p.27', verification_note='VA-verified 2026-09-08 (§3.9.3, printed p.21 / PDF p.27) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — CAVEAT, two of them. (1) §3.9.3 defines CO2e as a UNIT, not as a quantity; encoding it as a number field named "CO2-Aequivalent" makes the unit itself into a measurand. (2) The encoded unit string "kg CO2e" is NOT quotable: "kg" occurs zero times in the whole 81-page document. Both staged as R-5/R-6, nothing changed here', verified_at=now() where id='757b07ed-48ae-4ac2-936b-95630022bfdd' and verification_status not in ('verified_against_standard','corrected');

-- ghg_emission_reduction  (ISO-14050-10, §3.9.17)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.17 greenhouse gas emission reduction GHG emission reduction | quantified decrease in greenhouse gas emissions (3.9.8) between a baseline scenario (3.9.18) and the project — printed p.22 / PDF p.28', verification_note='VA-verified 2026-09-08 (§3.9.17, printed p.22 / PDF p.28) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; ISO 14050 prints no formula for the difference and no unit. The encoded unit "kg CO2e" is NOT quotable from this document ("kg" occurs zero times); staged as R-5', verified_at=now() where id='b8f1e765-ff5f-416c-b582-0c1aec3f12b4' and verification_status not in ('verified_against_standard','corrected');

-- ghg_emission_factor  (ISO-14050-10, §3.9.20)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.20 greenhouse gas emission factor GHG emission factor | coefficient relating greenhouse gas activity data (3.9.31) with the greenhouse gas emission (3.9.8) — printed p.23 / PDF p.29', verification_note='VA-verified 2026-09-08 (§3.9.20, printed p.23 / PDF p.29) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; a coefficient whose units follow from the activity data, which ISO 14050 never states. The encoded empty unit is therefore the honest choice; no unit was invented. No factor VALUE is printed anywhere: all are NR from this document', verified_at=now() where id='e4536264-fe7f-401b-a774-fc0f589fdb8e' and verification_status not in ('verified_against_standard','corrected');

-- ghg_removal_enhancement  (ISO-14050-10, §3.9.23)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.23 greenhouse gas removal enhancement GHG removal enhancement | quantified increase in greenhouse gas removals (3.9.22) between a baseline scenario (3.9.18) and the greenhouse gas project (3.9.26) — printed p.23 / PDF p.29', verification_note='VA-verified 2026-09-08 (§3.9.23, printed p.23 / PDF p.29) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; no formula and no unit printed. The encoded unit "kg CO2e" is NOT quotable from this document; staged as R-5', verified_at=now() where id='e131b4af-7e87-44e6-85ac-a544f07a544c' and verification_status not in ('verified_against_standard','corrected');

-- ghg_removal_factor  (ISO-14050-10, §3.9.24)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.24 greenhouse gas removal factor GHG removal factor | coefficient relating greenhouse gas activity data (3.9.31) with the greenhouse gas removal (3.9.22) — printed p.23 / PDF p.29', verification_note='VA-verified 2026-09-08 (§3.9.24, printed p.23 / PDF p.29) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; units follow from the activity data, which ISO 14050 never states, so the encoded empty unit is correct. No factor VALUE is printed: all are NR from this document', verified_at=now() where id='a4328313-b1ab-4d06-baae-94a3632cd492' and verification_status not in ('verified_against_standard','corrected');

-- ghg_activity_data  (ISO-14050-10, §3.9.31)
update public.fields set verification_status='verified_against_standard', verification_quote='3.9.31 greenhouse gas activity data GHG activity data | quantitative measure of activity that results in a greenhouse gas emission (3.9.8) or greenhouse gas removal (3.9.22) — printed p.24 / PDF p.30', verification_note='VA-verified 2026-09-08 (§3.9.31, printed p.24 / PDF p.30) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only; the standard prints no unit (activity data can be energy, mass, distance, ...), so the encoded empty unit is correct and nothing was invented', verified_at=now() where id='43b307a4-0c9e-401e-a1c6-acf575668cb8' and verification_status not in ('verified_against_standard','corrected');

-- water_footprint  (ISO-14050-11, §3.10.1)
update public.fields set verification_status='verified_against_standard', verification_quote='3.10.1 water footprint | metric(s) that quantifies the potential environmental impacts (3.2.22) related to water — printed p.25 / PDF p.31', verification_note='VA-verified 2026-09-08 (§3.10.1, printed p.25 / PDF p.31) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — CAVEAT: the printed definition is plural, "metric(s)", i.e. a water footprint is a SET of impact metrics; the encoding collapses it to one scalar number field with no unit. ISO 14050 states no unit and no method — those live in ISO 14046, already in this library. Staged as R-7', verified_at=now() where id='04b550df-9c1e-44fc-80a5-f028c6c2554c' and verification_status not in ('verified_against_standard','corrected');

-- carbon_footprint_of_a_product  (ISO-14050-12, §3.11.1)
update public.fields set verification_status='verified_against_standard', verification_quote='3.11.1 carbon footprint of a product CFP | sum of greenhouse gas emissions (3.9.8) and greenhouse gas removals (3.9.22) in a product system (3.5.1), expressed as carbon dioxide equivalents (3.9.3) and based on a life cycle assessment (3.6.2) using the single impact category (3.6.18) of climate change (3.8.3) — printed p.27 / PDF p.33', verification_note='VA-verified 2026-09-08 (§3.11.1, printed p.27 / PDF p.33) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — the definition names a sum, but ISO 14050 prints NO equation for it (the document contains zero "=" characters); the quantification method is ISO 14067, already in this library, so the arithmetic is NR from here. "expressed as carbon dioxide equivalents" supports a CO2e unit in substance, but the specific string "kg CO2e" is not printed ("kg" occurs zero times); staged as R-5', verified_at=now() where id='0832994c-2e17-4b79-8799-9e44952a7c8b' and verification_status not in ('verified_against_standard','corrected');

-- monetary_value  (ISO-14050-13, §3.12.7)
update public.fields set verification_status='verified_against_standard', verification_quote='3.12.7 monetary value | amount of money representing willingness to pay (3.12.14) or willingness to accept compensation (3.12.15) — printed p.28 / PDF p.34', verification_note='VA-verified 2026-09-08 (§3.12.7, printed p.28 / PDF p.34) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only. CAVEAT: the encoded unit string "currency" occurs zero times in the source; it is an app placeholder, not an ISO unit, and no actual currency is named or implied by the standard. Staged as R-5', verified_at=now() where id='2a14c93c-b895-4da2-b04b-f8a9478c02bf' and verification_status not in ('verified_against_standard','corrected');

-- material_distribution_percentage  (ISO-14050-13, §3.12.32)
update public.fields set verification_status='verified_against_standard', verification_quote='3.12.32 material distribution percentage | proportion of the material inputs that flow into products (3.5.12) or material losses — printed p.30 / PDF p.36', verification_note='VA-verified 2026-09-08 (§3.12.32, printed p.30 / PDF p.36) [VA · ISO 14050:2020(E) Fourth edition 2020-07, rendered-PDF text layer] — definition only. CAVEAT: the printed definition says "proportion", which does not fix a scale; the encoded unit "%" is an interpretation and the "%" character occurs zero times in the whole document (confirmed on the RENDERED printed p.30, not only in the extraction). Percent vs. dimensionless fraction is unresolved by the source; staged as R-5', verified_at=now() where id='334d5e4b-c596-44f9-824a-0b2731fc52b7' and verification_status not in ('verified_against_standard','corrected');
