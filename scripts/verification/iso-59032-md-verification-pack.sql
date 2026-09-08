-- ISO-59032 - VA verification pack (PDF text layer, SR-3 ground truth)
-- Generated 2026-09-08. DO NOT ADD transaction-control statements: apply-pack.mjs supplies the
-- transaction itself and implements --dry-run by discarding it. An inline transaction terminator in
-- this file would silently turn a dry run into a real prod write.
--
-- ============================================================================================
-- DOCUMENT IDENTITY - CHECKED FROM THE COVER BEFORE ANY QUOTING (this governs the whole pack)
-- ============================================================================================
--   File : C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59032\
--          ISO-TR-59032-2024-Circular-Economy-Review-of-Existing-Value.pdf   (51 PDF pages)
--   Text : <scratchpad>\pdftext\ISO-TR-59032-2024-Circular-Economy-Review-of-Existing-Value.txt
--          142 268 bytes, pdftotext -layout -enc UTF-8, zero undecodable characters.
--   Cover (PDF p.3, rendered to PNG and read as an image, not only as text):
--          "Technical Report"  /  "ISO/TR 59032"  /  "First edition 2024-05"  /
--          "Circular economy - Review of existing value networks"  /
--          "Economie circulaire - Examen des reseaux de valeur existants"  /
--          "Reference number ISO/TR 59032:2024(en)".  Language: English (title also in French).
--   Wrapper: BSI Published Document "PD ISO/TR 59032:2024", the UK implementation, ICS
--          03.100.01; 13.020.20, ISBN 978 0 539 17974 3, published 30 June 2024. The BSI national
--          foreword (PDF p.2) states verbatim: "This publication is not to be regarded as a British
--          Standard." and "Compliance with a Published Document cannot confer immunity from legal
--          obligations."
--   Running header on EVERY body page reads "Technical Report".
--
--   >>> THIS IS A TECHNICAL REPORT, NOT A STANDARD. <<<
--   A TR is informative throughout. It states no requirements, and nothing can be conformed to or
--   certified against it. This is confirmed inside the document itself, not merely by its title:
--     - Clause 2 (printed p.1): "There are no normative references in this document."
--     - Clause 1 Scope (printed p.1): "This document reviews the characteristics and structures of
--       some existing value networks as examples in accelerating a circular economy transition
--       process."  -> the document REVIEWS; it does not require.
--     - MECHANICAL MODALITY CENSUS over all 51 pages (word-boundary, case-insensitive):
--           shall            1      should         2      must              0
--           shall not        1      should not     0      may              10
--           can             40      "need/ought/have to", "it is necessary", "mandatory": 0
--       Every single one of the 1 "shall" and 2 "should" occurrences is in the BOILERPLATE ISO
--       FOREWORD (printed p.iv / PDF p.6), and none of them is a requirement on a user:
--           "ISO shall not be held responsible for identifying any or all such patent rights."
--           "...the different approval criteria needed for the different types of ISO document
--            should be noted."
--           "Any feedback or questions on this document should be directed to the user's national
--            standards body."
--       CLAUSES 1-5 (the entire body) CONTAIN ZERO NORMATIVE MODALITY. There are no annexes -
--       the document is Foreword, Introduction, clauses 1-5 and a Bibliography, nothing else.
--       The 40 "can" / 10 "may" are permissive/descriptive throughout.
--       "requir*" was censused separately (10 hits). Only THREE are in the body, and all three are
--       descriptive findings about what a value network needs in order to work - never an
--       obligation on a reader, and none carries a modal verb:
--           printed p.37  "Such long-term aspects are required for the realization of much wider
--                          impacts and the flow modification of products and materials."
--           printed p.37  "Therefore, a long-term financing scheme is required to develop
--                          sustainable finance."
--           printed p.39  "...some indicators and evaluation methods for the impacts, values and
--                          costs of the implementation are required to create and maintain the
--                          value network."
--       The other seven are BSI/ISO boilerplate ("may be required to implement this document"),
--       Introduction prose ("legal requirements", "the desired requirements"), the survey's own
--       "questionnaire requirements", one example's content, and a Bibliography entry title.
--
--   WHAT THIS MEANS FOR THE ENCODING (see also iso-59032-STAGED-rulings.sql, block S-1):
--       No block gate is defensible anywhere in this standard, and even the 18 "warn" gates that
--       exist should be read as prompts, not as compliance rules. A gate here can only ever mean
--       "the TR's survey observed this in its 15 examples" - never "your project must do this".
--       Prod's standards.version is honest about the document type: it reads
--       "First edition 2024-05 (ISO/TR 59032:2024)". Prod's standards.code, however, is
--       "ISO-59032" with the TR marker dropped, so in the picker it is indistinguishable from a
--       conformable standard. That naming, and the gate layer, are the subject of block S-1.
--
-- ============================================================================================
-- PAGE-NUMBER CONVENTION (reconstructed, then confirmed against the printed Contents list)
-- ============================================================================================
--   Form feeds are preserved: text page N = PDF page N. 51 pages, split on \f.
--   NO blank filler pages are interleaved inside the body (the only near-blank pages are the BSI
--   back matter, PDF pp.49-51). Mapping:
--       PDF p.4 = printed ii    PDF p.5 = printed iii (Contents)   PDF p.6 = printed iv (Foreword)
--       PDF p.7 = printed v     PDF p.8 = printed vi
--       PDF p.(N+8) = printed p.N   for the body, N = 1 .. 40
--   Confirmed against the printed Contents: "5 Discussion ... 33" -> PDF p.41 (41-8=33);
--   "4.2.15 Cargo Carousel System (Canada) ... 30" -> PDF p.38; "Bibliography ... 40" -> PDF p.48.
--   Every quote below carries BOTH the printed page and the PDF page, once, at the end.
--
-- ============================================================================================
-- SOURCE-QUALITY CHECK ON THE EXTRACTION (what the spotcheck cannot tell you)
-- ============================================================================================
--   The spotcheck only proves a quote is a substring of the EXTRACTION. It cannot prove the
--   extraction is faithful to the printed page. Skimmed for OCR/layout damage before quoting:
--     PROSE  - clean. Verified by rendering PDF pp.3, 9 and 41 to PNG at 110 dpi and reading them
--              as images: the Scope, clause 2, clause 3 definitions and the whole of 5.1 match the
--              extraction word for word.
--     TABLES - DAMAGED, in two distinct ways. Nothing below is silently repaired.
--       (a) Tables 17-21 are tick-mark grids. The check glyphs did not survive extraction, so the
--           row->example mapping is GONE. In Table 17 the "Number of sectors" summary row also
--           landed on the "Other services" line as the bare digit run "446884447322643". The ROW
--           and COLUMN LABELS survived intact and complete, and the labels are what the enums
--           encode - so enum verification is sound, but no cell value is quoted from these tables.
--       (b) Tables 2-16 (the per-example case profiles) have their label->value pairing shifted by
--           one row in the -layout extraction: e.g. the "Year of implementation" label line carries
--           "- Harita Metal Co., Ltd." (a Facilitators value) and the "Geographic location" label
--           line carries "- Japan Aluminium Association". The labels are readable; the pairs are
--           not trustworthy. NO Table 2-16 row is quoted anywhere in this pack. Where a field is
--           defined only by such a row, either a clean prose sentence carrying the same meaning is
--           quoted (and the row's note says so), or the field goes to residue rather than be
--           reconstructed.
--
-- ============================================================================================
-- COUNTS
-- ============================================================================================
--   worksheets 8 | fields 47 | equations 0 | gates 18 (all severity='warn', none 'block')
--   fields already verified ...... 0   (all 47 were verification_status='imported_unverified')
--   fields quoted in this pack ... 44
--   fields exempt (app metadata) .. 0  <- NEGATIVE RESULT: none of the 47 is client/project
--                                        metadata, a planning date, a phase-gate roll-up or an
--                                        overall verdict. The 2026-08-01 metadata exemption is
--                                        not used by this standard at all.
--   fields in residue ............. 3  (ISO-59032-03.year_of_implementation,
--                                       ISO-59032-03.relevant_products_services,
--                                       ISO-59032-03.added_created_value - each defined ONLY by a
--                                       Table 2-16 parameter row, which is layout-damaged per (b)
--                                       above, with no prose sentence defining it. Not invented.)
--   equations quoted .............. 0
--   equations in residue .......... 0  <- NEGATIVE RESULT and it is the correct number: the
--                                        document contains no formula, equation or calculation
--                                        anywhere (grep for formula|equation|calculat over all 51
--                                        pages returns zero matches). Prod holding 0 equations is
--                                        faithful to the source, not a gap.
--   Rollback file: rollback-iso-59032-md-verification-pack.sql
--   Rulings file : iso-59032-STAGED-rulings.sql (nothing in it is applied by this pack)
--
--   Every quote below is graded [VA]: read from the rendered PDF's own text layer, with the
--   printed AND PDF page given. Because the document is a Technical Report, each note also
--   records that the quoted sentence is INFORMATIVE - it describes what the survey observed in
--   its 15 collected examples, and imposes nothing.

-- ============================ ISO-59032-01  Registration, scope & terms ============================

-- value_network_name
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: | b) title and basic information; — printed p.3-4 (PDF p.11-12)', verification_note='VA-verified 2026-09-08 (§4.1.2 b, printed p.3-4 / PDF p.11-12) [VA] — informative TR, no requirement. The TR names "title and basic information" as a questionnaire item it collected about each surveyed case; it does not oblige anyone to record one.', verified_at=now() where id='3e57752f-0e99-426b-9601-43e78c4ca344' and verification_status not in ('verified_against_standard','corrected');

-- geographic_location
update public.fields set verification_status='verified_against_standard', verification_quote='The collected cases are geographically diverse across countries or regions (Japan, Europe, the United States, Brazil, China, India, Canada, Mauritius and Singapore). | Table 1 — Geographical location of collected and selected examples — printed p.4-5 (PDF p.12-13)', verification_note='VA-verified 2026-09-08 (§4.1.3 + Table 1, printed p.4-5 / PDF p.12-13) [VA] — informative TR, no requirement. Table 1 records the geographical location of the cases the authors collected; the country list is what the survey happened to reach, not an allowed-value set.', verified_at=now() where id='35a6bb15-4d4b-48f6-a21a-2c988a73b402' and verification_status not in ('verified_against_standard','corrected');

-- circular_economy_alignment
update public.fields set verification_status='verified_against_standard', verification_quote='This document reviews the characteristics and structures of some existing value networks as examples in accelerating a circular economy transition process. — printed p.1 (PDF p.9)', verification_note='VA-verified 2026-09-08 (§1 Scope, printed p.1 / PDF p.9) [VA] — informative TR, no requirement. PARTIAL: the Scope states the document''s own review purpose. The TR defines no test of "circular-economy alignment", so this boolean is an EKOWAI construct laid over the scope sentence, not a criterion the source states.', verified_at=now() where id='8f9e2753-6015-4b34-82d1-c3cd51bce18e' and verification_status not in ('verified_against_standard','corrected');

-- vn_term_defined
update public.fields set verification_status='verified_against_standard', verification_quote='For the purposes of this document, the following terms and definitions apply. | circular economy economic system that uses a systemic approach to maintain a circular flow of resources, by recovering, retaining or adding to their value, while contributing to sustainable development | value network network of interlinked value chains (3.5) and interested parties — printed p.1-2 (PDF p.9-10)', verification_note='VA-verified 2026-09-08 (§3.1-3.6, printed p.1-2 / PDF p.9-10) [VA] — informative TR, no requirement. The six enum entries reproduce the six clause-3 terms (3.1 circular economy, 3.2 common infrastructure, 3.3 governance, 3.4 organization, 3.5 value chain, 3.6 value network); the enum LABELS paraphrase rather than quote the definitions. See STAGED S-10: this field is a glossary picker, not a project datum.', verified_at=now() where id='9dd386df-7780-4559-842a-e9c9c67ca1b5' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-02  Review method & survey process ============================

-- mutually_beneficial_collaboration
update public.fields set verification_status='verified_against_standard', verification_quote='Fifteen examples were selected from the collected value network cases using the following criteria: | a) Does the case have a mutually beneficial collaboration? — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.4 a, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. CAVEAT: this is the TR authors'' own past-tense criterion for choosing which submitted cases to write up, not a criterion a user''s project has to meet. See STAGED S-6.', verified_at=now() where id='e9a5251e-8e69-4c94-8373-6b61ae3d478d' and verification_status not in ('verified_against_standard','corrected');

-- commercial_flow_modification
update public.fields set verification_status='verified_against_standard', verification_quote='Fifteen examples were selected from the collected value network cases using the following criteria: | b) Does the case achieve the flow modification of products and materials commercially? — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.4 b, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. CAVEAT: a case-selection criterion of the authors'' survey, not a project obligation. See STAGED S-6.', verified_at=now() where id='963f127a-9417-426b-b4c7-6533944cae0b' and verification_status not in ('verified_against_standard','corrected');

-- multi_org_business_alliance
update public.fields set verification_status='verified_against_standard', verification_quote='Fifteen examples were selected from the collected value network cases using the following criteria: | c) Does the case form a business alliance between multiple organizations? — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.4 c, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. CAVEAT: a case-selection criterion of the authors'' survey, not a project obligation. See STAGED S-6.', verified_at=now() where id='15e65d84-6ebf-4bba-8997-f483f7a18931' and verification_status not in ('verified_against_standard','corrected');

-- cases_collected_count
update public.fields set verification_status='verified_against_standard', verification_quote='There were 99 cases collected that fulfilled the questionnaire requirements for further analysis. — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.3, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. CAVEAT: 99 is a FIXED reported fact of the TR''s own 2024 survey. It can never be a user''s project input, yet it is encoded as an editable number field. See STAGED S-9.', verified_at=now() where id='2b78a3be-b5af-4503-9c8f-c6eb1dc519f3' and verification_status not in ('verified_against_standard','corrected');

-- examples_selected_count
update public.fields set verification_status='verified_against_standard', verification_quote='The examples shown in Figure 6 and listed in Table 1 were selected as examples of value networks from the 99 worldwide examples collected. — printed p.5 (PDF p.13)', verification_note='VA-verified 2026-09-08 (§4.1.5, printed p.5 / PDF p.13) [VA] — informative TR, no requirement. CAVEAT: 15 is a FIXED reported fact of the TR''s own survey (§4.1.4 "Fifteen examples were selected"), not a user input. See STAGED S-9.', verified_at=now() where id='d386e867-13b9-4721-b1d9-303622642fe2' and verification_status not in ('verified_against_standard','corrected');

-- questionnaire_item_provided
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: a) type of case; | b) title and basic information; c) overview of the implementation model; d) beneficial or detrimental impacts (listing and highlighting critical aspects); e) relevance to the Sustainable Development Goals (SDGs), including detrimental impacts; f) key aspects relevant to the circular economy ; g) implementation methodology; h) enablers, barriers and concerns; i) relevant information specific to businesses or individual projects. — printed p.3-4 (PDF p.11-12)', verification_note='VA-verified 2026-09-08 (§4.1.2 a-i, printed p.3-4 / PDF p.11-12) [VA] — informative TR, no requirement. The 9 enum values reproduce items a)-i) exactly and completely. The " | " join marks the printed p.3/p.4 page break between item a) and item b), not an omission. CAVEAT: §4.1.2 collected ALL NINE items per case; a single-select "which item was supplied" flattens a 9-item checklist into a pick-one. See STAGED S-13.', verified_at=now() where id='c320af88-f170-41ac-920c-f39f118f81da' and verification_status not in ('verified_against_standard','corrected');

-- selection_criterion_met
update public.fields set verification_status='verified_against_standard', verification_quote='Fifteen examples were selected from the collected value network cases using the following criteria: | a) Does the case have a mutually beneficial collaboration? | b) Does the case achieve the flow modification of products and materials commercially? | c) Does the case form a business alliance between multiple organizations? — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.4 a-c, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. The 3 enum values reproduce criteria a)-c) exactly. CAVEAT: the three criteria are conjunctive (all were applied together to select the 15 examples), so a single-select "which criterion is met" is wrong-shaped; and the same three criteria are ALSO encoded as the three booleans on this worksheet, so this field is a duplicate. See STAGED S-13 and S-14.', verified_at=now() where id='23a8580d-5387-4329-bbca-0d0fa95e7fdf' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-03  Value-network case profile ============================

-- facilitators_designers
update public.fields set verification_status='verified_against_standard', verification_quote='All of the examples have facilitators or designers of a business ecosystem for the value network. — printed p.35 (PDF p.43)', verification_note='VA-verified 2026-09-08 (§5.3, printed p.35 / PDF p.43) [VA] — informative TR, no requirement. The Tables 2-16 parameter row "Facilitators (designers)" is layout-damaged in the extraction, so this clean §5.3 sentence carrying the same meaning is quoted instead of the table row.', verified_at=now() where id='f2f63e34-122b-452f-8a84-a59271b9ae5f' and verification_status not in ('verified_against_standard','corrected');

-- participating_companies
update public.fields set verification_status='verified_against_standard', verification_quote='All the examples have at least two participating sectors and achieve a flow modification of products and materials (see Table 17). — printed p.33 (PDF p.41)', verification_note='VA-verified 2026-09-08 (§5.1, printed p.33 / PDF p.41) [VA] — informative TR, no requirement. The Tables 2-16 parameter row "Participating companies" is layout-damaged in the extraction, so this clean §5.1 sentence carrying the same meaning is quoted instead of the table row.', verified_at=now() where id='a371b38d-184c-4495-b3ef-882b31631bb2' and verification_status not in ('verified_against_standard','corrected');

-- relevant_matters
update public.fields set verification_status='verified_against_standard', verification_quote='The collected cases cover various sectors, including machinery and equipment, forest and bio-based industries, waste management, textiles, chemicals, food, drink, mining, metals, minerals, cement, construction, transport, furniture, glass and steel. — printed p.4 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§4.1.3, printed p.4 / PDF p.12) [VA] — informative TR, no requirement. PARTIAL: this sentence describes the subject matter the collected cases covered; "including" makes it an open list. The Tables 2-16 parameter row "Relevant matters" is layout-damaged, so it is not quoted.', verified_at=now() where id='db929aea-dd2d-4abe-8f81-9d23df83accc' and verification_status not in ('verified_against_standard','corrected');

-- key_aspects_activities
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: | f) key aspects relevant to the circular economy ; — printed p.3-4 (PDF p.11-12)', verification_note='VA-verified 2026-09-08 (§4.1.2 f, printed p.3-4 / PDF p.11-12) [VA] — informative TR, no requirement. Quoted verbatim including the printed space before the semicolon in item f).', verified_at=now() where id='c03ec6bd-00ab-42f6-a451-9062c3d73ac8' and verification_status not in ('verified_against_standard','corrected');

-- impact_category
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: | d) beneficial or detrimental impacts (listing and highlighting critical aspects); — printed p.3-4 (PDF p.11-12)', verification_note='VA-verified 2026-09-08 (§4.1.2 d, printed p.3-4 / PDF p.11-12) [VA] — informative TR, no requirement. PARTIAL: §4.1.2 d) establishes that impacts were collected, but the three-way social/environmental/economic split comes from the "Impacts" sub-rows of Tables 2-16, and those sub-rows are layout-damaged in the extraction (label and value lines interleave). The split was read from the rendered table structure only and is NOT quoted here rather than reconstructed. CAVEAT: each example lists social AND environmental AND economic impacts together, so a single-select is wrong-shaped. See STAGED S-13.', verified_at=now() where id='98e7b5ff-959b-4ada-b077-21954e726f9d' and verification_status not in ('verified_against_standard','corrected');

-- impacts_description
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: | d) beneficial or detrimental impacts (listing and highlighting critical aspects); | e) relevance to the Sustainable Development Goals (SDGs), including detrimental impacts; — printed p.3-4 (PDF p.11-12)', verification_note='VA-verified 2026-09-08 (§4.1.2 d-e, printed p.3-4 / PDF p.11-12) [VA] — informative TR, no requirement.', verified_at=now() where id='ba87a922-ee6b-43ed-867c-730bc0076db1' and verification_status not in ('verified_against_standard','corrected');

-- motivation_of_participants
update public.fields set verification_status='verified_against_standard', verification_quote='Some of the typical motivations related to the examples are shown in Table 18. Those deriving from a business aspect, such as cost reduction and sales improvements/improving the value of resources, are relatively common. — printed p.36 (PDF p.44)', verification_note='VA-verified 2026-09-08 (§5.4.1, printed p.36 / PDF p.44) [VA] — informative TR, no requirement. Note "typical" and "relatively common": the source frames motivations as an open, observed set.', verified_at=now() where id='b224544c-97c2-4c50-bd00-837138e106a4' and verification_status not in ('verified_against_standard','corrected');

-- methodology_creating_maintaining
update public.fields set verification_status='verified_against_standard', verification_quote='An information sharing/exchange platform is a critical methodology for creating and maintaining a value network, as shown in Table 20. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement. The Tables 2-16 parameter row "Methodology for creating and maintaining the value network" is layout-damaged, so this clean §5.4.2 sentence is quoted instead.', verified_at=now() where id='acdfa5be-aac7-405a-9afb-222c3b064e83' and verification_status not in ('verified_against_standard','corrected');

-- common_infrastructures
update public.fields set verification_status='verified_against_standard', verification_quote='common infrastructure systems shared among participants in a value network (3.6) for mutual benefit | Note 1 to entry: The system indicates an optimization system, traceability system, information exchange system, branding, equal relationship and internal standardization as a certification system. — printed p.1 (PDF p.9)', verification_note='VA-verified 2026-09-08 (§3.2 incl. Note 1 to entry, printed p.1 / PDF p.9) [VA] — informative TR, no requirement. This is the clause-3 definition, the only place the source defines the term.', verified_at=now() where id='0dfc9aa3-3447-47f9-abaa-c5c697b19841' and verification_status not in ('verified_against_standard','corrected');

-- enablers_barriers
update public.fields set verification_status='verified_against_standard', verification_quote='The survey was conducted by experts on existing value networks in each region, country or organization to collect the following information: | h) enablers, barriers and concerns; | Some value networks indicate that obstructive policy-making, bureaucracy and missing regulations are barriers to creating and maintaining the value network (see 5.2). — printed p.3-4 and p.38 (PDF p.11-12 and p.46)', verification_note='VA-verified 2026-09-08 (§4.1.2 h + §5.4.2, printed p.3-4 and p.38 / PDF p.11-12 and p.46) [VA] — informative TR, no requirement.', verified_at=now() where id='c3d12aa0-3eb9-4419-8a58-c189e1710409' and verification_status not in ('verified_against_standard','corrected');

-- case_source
update public.fields set verification_status='verified_against_standard', verification_quote='The process of collecting the cases was based on different experts voluntarily accepting an invitation to submit examples. — printed p.2 (PDF p.10)', verification_note='VA-verified 2026-09-08 (§4.1.1, printed p.2 / PDF p.10) [VA] — informative TR, no requirement. PARTIAL: §4.1.1 states the provenance of the collected cases. The Tables 2-16 parameter row "Source" is layout-damaged and its content is a per-example website citation, so it is not quoted.', verified_at=now() where id='ef80a79f-7f17-4822-abc7-bcd4a1415197' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-04  Sectors of facilitators & participants ============================

-- sector_category
update public.fields set verification_status='verified_against_standard', verification_quote='Table 17 — Sectors of facilitators and participants | All the examples have at least two participating sectors and achieve a flow modification of products and materials (see Table 17). — printed p.33 (PDF p.41)', verification_note='VA-verified 2026-09-08 (Table 17 + §5.1, printed p.33-34 / PDF p.41-42) [VA] — informative TR, no requirement. The 45 enum values reproduce Table 17''s 45 sector row labels exactly and in order (Agriculture, Mining, the Manufacturing group Food..Repair, Power generation .. Extra-territorial); the "Number of sectors" summary row is correctly excluded, and "Other" is correctly read as the Manufacturing group''s catch-all. The tick grid itself did not survive extraction and no cell is quoted. CAVEAT: Table 17 shows 2-8 sectors per example, so a single-select is wrong-shaped. See STAGED S-13.', verified_at=now() where id='efddfee2-3784-4c29-992d-1221f4317694' and verification_status not in ('verified_against_standard','corrected');

-- participating_sector_count
update public.fields set verification_status='verified_against_standard', verification_quote='All the examples have at least two participating sectors and achieve a flow modification of products and materials (see Table 17). — printed p.33 (PDF p.41)', verification_note='VA-verified 2026-09-08 (§5.1, printed p.33 / PDF p.41) [VA] — informative TR, no requirement. CAVEAT: "at least two" is an OBSERVATION about the TR''s own 15 collected examples, not a printed limit. Gate CR-006 encodes it as the threshold participating_sector_count >= 2; that number is lifted out of a case-study sample. See STAGED S-4.', verified_at=now() where id='9866b829-3815-481c-8403-687273642d10' and verification_status not in ('verified_against_standard','corrected');

-- cross_sectoral_collaboration
update public.fields set verification_status='verified_against_standard', verification_quote='Cross-sectoral collaboration is found in all of the examples. — printed p.33 (PDF p.41)', verification_note='VA-verified 2026-09-08 (§5.1, printed p.33 / PDF p.41) [VA] — informative TR, no requirement. CAVEAT: "is found in all of the examples" is an observation about the 15 collected cases; gate CR-007 turns it into a required project property. See STAGED S-5.', verified_at=now() where id='fda8ff7a-ba7f-43c1-9306-99581c863ba6' and verification_status not in ('verified_against_standard','corrected');

-- includes_waste_management_sector
update public.fields set verification_status='verified_against_standard', verification_quote='A special aspect common to most of the examples is that they include a waste management sector, except for Examples 2, 3, 5, 14 and 15, as a tool for closing resource loops and/or separation of impurities that do not enhance cascading or upgrading products and materials. — printed p.33 (PDF p.41)', verification_note='VA-verified 2026-09-08 (§5.1, printed p.33 / PDF p.41) [VA] — informative TR, no requirement. The source explicitly names five counter-examples, so this is expressly NOT universal - correctly encoded as is_required=false with no gate.', verified_at=now() where id='07b148f4-506c-42db-a32a-3f53541d52a1' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-05  Common infrastructure of the network models ============================

-- common_infrastructure_type
update public.fields set verification_status='verified_against_standard', verification_quote='In addition to the information exchange system, common schemes exist for sharing and reusing resources (see 4.2.4), reducing costs and waste (see 4.2.4), accelerating the scale-up of circularity and/or extending circular supply chains (see 4.2.5 and 4.2.14), planning and executing products and services as an integrated whole (see 4.2.6), and maximizing space utilization throughout supply and return chains in the warehouse, trailer/container, retail store and last-mile delivery (see 4.2.15). — printed p.34 (PDF p.42)', verification_note='VA-verified 2026-09-08 (§5.2, printed p.34 / PDF p.42) [VA] — informative TR, no requirement. The 6 enum values map one-to-one onto the information exchange system plus the five schemes this sentence names, with the source''s own 4.2.x cross-references preserved. CAVEAT: the sentence enumerates what was observed across 15 examples, not an exhaustive taxonomy, and a network can run several of these at once - single-select is wrong-shaped. See STAGED S-12 and S-13.', verified_at=now() where id='7cf57274-46fb-407a-b21c-4d6d9ecd4739' and verification_status not in ('verified_against_standard','corrected');

-- information_exchange_system
update public.fields set verification_status='verified_against_standard', verification_quote='A distinctive point of the examples is that they have an information exchange system as a common infrastructure between organizations. This exchange system is not limited to bilateral exchanges but extends to multilateral exchanges, such as data sharing or a tracking system between an individual organization and another organization with which it does not necessarily trade directly (see Figure 9 b)). — printed p.34 (PDF p.42)', verification_note='VA-verified 2026-09-08 (§5.2, printed p.34 / PDF p.42) [VA] — informative TR, no requirement. "A distinctive point of the examples" is descriptive of the 15 cases; gate CR-008 requires it of a project. See STAGED S-1.', verified_at=now() where id='e3353fd6-adc0-4df7-aa73-85c4f16aafd0' and verification_status not in ('verified_against_standard','corrected');

-- ce_business_balance
update public.fields set verification_status='verified_against_standard', verification_quote='A good balance between the circular economy and business perspectives is the condition of compatibility for the value network model. — printed p.34 (PDF p.42)', verification_note='VA-verified 2026-09-08 (§5.2, printed p.34 / PDF p.42) [VA] — informative TR, no requirement. This is the single sentence in the whole body that reads closest to a condition, and even it is a descriptive conclusion of the review ("is the condition of compatibility for the value network model"), carrying no modal verb.', verified_at=now() where id='cb05c0aa-0d58-45b7-ae1f-298a796cd776' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-06  Transition from value chains to value networks ============================

-- facilitator_present
update public.fields set verification_status='verified_against_standard', verification_quote='All of the examples have facilitators or designers of a business ecosystem for the value network. — printed p.35 (PDF p.43)', verification_note='VA-verified 2026-09-08 (§5.3, printed p.35 / PDF p.43) [VA] — informative TR, no requirement. CAVEAT: "All of the examples have" is an observation about the 15 collected cases; gate CR-010 requires it of a project. See STAGED S-5.', verified_at=now() where id='d806d744-7a8b-4a73-bb61-f3d9d88d7c6a' and verification_status not in ('verified_against_standard','corrected');

-- grand_design_present
update public.fields set verification_status='verified_against_standard', verification_quote='Facilitators develop and present a grand design for mutual collaboration among organizations during the early stage of the growth process of the value network. — printed p.35 (PDF p.43)', verification_note='VA-verified 2026-09-08 (§5.3, printed p.35 / PDF p.43) [VA] — informative TR, no requirement. Present-tense description of what the surveyed facilitators do, not an instruction.', verified_at=now() where id='4964e25a-78fc-4e3b-8ba8-839666de425e' and verification_status not in ('verified_against_standard','corrected');

-- sphere_of_influence
update public.fields set verification_status='verified_against_standard', verification_quote='The vision and ambition of the design and scope of the examples equates to the value network''s sphere of influence. — printed p.35 (PDF p.43)', verification_note='VA-verified 2026-09-08 (§5.3, printed p.35 / PDF p.43) [VA] — informative TR, no requirement.', verified_at=now() where id='cf6be8a0-26d3-4446-8900-54ef7f27209d' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-07  Motivations of the participants ============================

-- motivation_type
update public.fields set verification_status='verified_against_standard', verification_quote='Table 18 — Types of motivation of participants in the value network | Some of the typical motivations related to the examples are shown in Table 18. — printed p.36-37 (PDF p.44-45)', verification_note='VA-verified 2026-09-08 (Table 18 + §5.4.1, printed p.36-37 / PDF p.44-45) [VA] — informative TR, no requirement. The 12 enum values reproduce Table 18''s 12 row labels exactly. The tick grid did not survive extraction and no cell is quoted. CAVEAT: the source calls these "typical" motivations, i.e. an OPEN list, and each example carries several at once - a closed single-select misstates both. See STAGED S-12 and S-13.', verified_at=now() where id='345f9a80-0463-4d2b-bec8-dd08db593775' and verification_status not in ('verified_against_standard','corrected');

-- motivation_horizon
update public.fields set verification_status='verified_against_standard', verification_quote='Considering these motivations from a short- or long-term perspective, most have long-term goals, generally more than five or ten years (see Table 19). — printed p.37 (PDF p.45)', verification_note='VA-verified 2026-09-08 (§5.4.1 + Table 19, printed p.37 / PDF p.45) [VA] — informative TR, no requirement. The 2 enum values match Table 19''s two columns. The enum label reads "Long term (generally >5-10 years)"; the source says "generally more than five or ten years", which is a loose characterisation, not a boundary - it is not usable as a numeric threshold anywhere.', verified_at=now() where id='c8d1bb5e-89bf-453b-bc7d-b276ae43a721' and verification_status not in ('verified_against_standard','corrected');

-- long_term_management_plan
update public.fields set verification_status='verified_against_standard', verification_quote='Such long-term aspects are required for the realization of much wider impacts and the flow modification of products and materials. In addition, the research and development of technologies contribute to these points. Therefore, in the value network, it is key to determine long-term management plans by collaborating with the participating organizations. — printed p.37 (PDF p.45)', verification_note='VA-verified 2026-09-08 (§5.4.1, printed p.37 / PDF p.45) [VA] — informative TR, no requirement. "it is key to" is a soft recommendation with no modal verb; the field is is_required=false, yet gate CR-011 demands the value true. See STAGED S-7.', verified_at=now() where id='bf25f4d2-04df-4279-9a7c-6225504e068f' and verification_status not in ('verified_against_standard','corrected');

-- long_term_financing_scheme
update public.fields set verification_status='verified_against_standard', verification_quote='As an external factor for the value chain, funding is also included as motivation, i.e. the funding positions in both the short and long term (see Table 19). Therefore, a long-term financing scheme is required to develop sustainable finance. — printed p.37 (PDF p.45)', verification_note='VA-verified 2026-09-08 (§5.4.1, printed p.37 / PDF p.45) [VA] — informative TR, no requirement. "is required" here is one of only three "required" statements in the whole body, and like the other two it is a descriptive conclusion of the survey about what a value network needs in order to work, not an obligation on a reader. The field is is_required=false, yet gate CR-012 demands the value true. See STAGED S-7.', verified_at=now() where id='9c463c68-bb5e-4028-b9cd-0dd1511859aa' and verification_status not in ('verified_against_standard','corrected');

-- ============================ ISO-59032-08  Methodology & governance ============================

-- methodology_type
update public.fields set verification_status='verified_against_standard', verification_quote='Table 20 — Type of methodology for creating and maintaining the value network | An information sharing/exchange platform is a critical methodology for creating and maintaining a value network, as shown in Table 20. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (Table 20 + §5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement. The 13 enum values reproduce Table 20''s 13 row labels exactly. The tick grid did not survive extraction and no cell is quoted. CAVEAT: each example uses several methodologies at once - single-select is wrong-shaped. See STAGED S-13.', verified_at=now() where id='57615cd5-0d65-47f9-9970-425b5a14c5e2' and verification_status not in ('verified_against_standard','corrected');

-- governance_dimension
update public.fields set verification_status='verified_against_standard', verification_quote='Some methodologies support implementing governance consisting of impartiality, inclusivity, transparency and accountability (see Table 21). Impartiality indicates the establishment/participation of a neutral organization, construction of equal relationships and enabling the making of decisions by each participant. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2 + Table 21, printed p.38-39 / PDF p.46-47) [VA] — informative TR, no requirement. CAVEAT: Table 21''s printed header spans "Benefit increase" as ONE column and "Governance" as a group over the other three (Impartiality, Inclusivity, Transparency and accountability). This enum, named governance_dimension, folds the benefit axis and the governance axis into a single list - two orthogonal axes flattened into one field. Table 21 also maps a methodology to several columns at once, so single-select is wrong-shaped too. See STAGED S-11 and S-13.', verified_at=now() where id='c2468260-a35f-4f9e-a1a9-15ffa0dcd2ca' and verification_status not in ('verified_against_standard','corrected');

-- information_sharing_platform
update public.fields set verification_status='verified_against_standard', verification_quote='As discussed in 5.2, an information exchange system is essentially a common infrastructure for value networks. An information sharing/exchange platform is a critical methodology for creating and maintaining a value network, as shown in Table 20. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement. "essentially"/"critical" are the authors'' emphasis on a survey finding, not a modal obligation; gate CR-013 nonetheless requires the value true. See STAGED S-1.', verified_at=now() where id='6060bdc9-6c71-4c0b-82fd-7fc96ab59798' and verification_status not in ('verified_against_standard','corrected');

-- matching_demand_supply
update public.fields set verification_status='verified_against_standard', verification_quote='Matching demand and supply is also a key methodology for the value network that is strongly related to the information sharing/exchange platform, which contributes to the enhancement of resource efficiency, as well as to the reduction of primary resource usage and waste generation. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement.', verified_at=now() where id='96eea065-925e-4a7b-bbec-c8ec4b3286a5' and verification_status not in ('verified_against_standard','corrected');

-- governance_secured
update public.fields set verification_status='verified_against_standard', verification_quote='Some methodologies support implementing governance consisting of impartiality, inclusivity, transparency and accountability (see Table 21). Accountability is related to a traceability system, meeting certain criteria is considered to participate, standardization and certification system, evaluation of material flows, implementation impacts and costs. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement. NOTE ON THE CHOICE OF QUOTE: the sentence that states this most directly - "In creating and maintaining value networks, it is important to secure governance consisting of impartiality, inclusivity, transparency and accountability in the implementation activities..." - straddles the printed p.38/p.39 break, so it is not a contiguous run in the extraction. The contiguous p.38 sentences carrying the same content are quoted instead; nothing is stitched across the page break. "it is important to" is in any case a soft recommendation, while gate CR-014 requires the value true.', verified_at=now() where id='378bd985-f3d8-49ba-94c6-642143f59a2c' and verification_status not in ('verified_against_standard','corrected');

-- evaluation_methods_present
update public.fields set verification_status='verified_against_standard', verification_quote='The methodology of profit-sharing in the participating organizations in the value network is rarely mentioned in the examples; however, some indicators and evaluation methods for the impacts, values and costs of the implementation are required to create and maintain the value network. — printed p.39 (PDF p.47)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.39 / PDF p.47) [VA] — informative TR, no requirement. "are required to create and maintain the value network" is a statement about what a value network needs in order to work, not an obligation placed on a reader; the field is is_required=false yet gate CR-015 demands the value true. See STAGED S-7.', verified_at=now() where id='06f63a4e-7398-4375-ae2c-d09593991fd6' and verification_status not in ('verified_against_standard','corrected');

-- government_cooperation
update public.fields set verification_status='verified_against_standard', verification_quote='Some value networks indicate that obstructive policy-making, bureaucracy and missing regulations are barriers to creating and maintaining the value network (see 5.2). In that sense, cooperation with national and local governments matters and promotes future symbiosis. — printed p.38 (PDF p.46)', verification_note='VA-verified 2026-09-08 (§5.4.2, printed p.38 / PDF p.46) [VA] — informative TR, no requirement. "Some value networks indicate" / "matters and promotes" is observational; the field is is_required=false yet gate CR-016 demands the value true. See STAGED S-7.', verified_at=now() where id='00360bdb-558b-499f-8f7f-19d8c12176b4' and verification_status not in ('verified_against_standard','corrected');

-- iso59010_governance_alignment
update public.fields set verification_status='verified_against_standard', verification_quote='NOTE Transparency and accountability correspond to clear member rights, clear roles and responsibilities of members, transparent decision-making processes, traceability mechanisms, and the fostering of trust-building and engagement in ISO 59010. — printed p.39 (PDF p.47)', verification_note='VA-verified 2026-09-08 (Table 21 NOTE, printed p.39 / PDF p.47) [VA] — informative TR, no requirement. The NOTE is verified verbatim, but what alignment with ISO 59010 actually demands is defined in ISO 59010, which is not in the library - that half caps at NR. Gate CR-017 requires the value true on an is_required=false field whose criterion is not readable from any document we hold. See STAGED S-7 and S-15.', verified_at=now() where id='f3be4570-3fdc-44ad-92e7-26876ee1652a' and verification_status not in ('verified_against_standard','corrected');

-- ============================================================================================
-- RESIDUE - 3 fields deliberately NOT quoted (see header). Nothing is invented for them.
--   ISO-59032-03.year_of_implementation    (b7ebb463-dd50-454b-8837-2e2c59786736)
--       Defined only by the Tables 2-16 parameter row "Year of implementation". That row's
--       label->value pairing is shifted by one row in the -layout extraction (its label line
--       carries a Facilitators value), and no prose sentence anywhere in the body defines it.
--   ISO-59032-03.relevant_products_services (897aa38b-e62d-4840-a4d9-fee15459d758)
--       Same: a Tables 2-16 parameter row only, layout-damaged, with no defining prose. It is not
--       one of the nine §4.1.2 questionnaire items either, so no clean substitute quote exists.
--   ISO-59032-03.added_created_value        (429022af-aec9-41ee-8dbb-a963e04ab668)
--       Same: the only text is the per-example "Added/created value aspects" cell, which is
--       additionally hyphen-broken across lines. Not one of the §4.1.2 items.
-- ============================================================================================
