-- ISO-14033 - VA verification pack (PDF text layer, SR-3 ground truth)
-- Generated 2026-09-08. DO NOT ADD transaction-control statements: apply-pack.mjs supplies the
-- transaction itself and implements --dry-run by discarding it. An inline transaction terminator in
-- this file would silently turn a dry run into a real prod write. (This file contains ONLY update
-- statements - no begin/commit/rollback/start transaction/end.)
--
-- DOCUMENT IDENTITY (read off the cover and the Contents list BEFORE any quoting)
--   ISO 14033:2019(E) - "INTERNATIONAL STANDARD", Environmental management - Quantitative
--     environmental information - Guidelines and examples.  FIRST EDITION, 2019-02.  (c) ISO 2019.
--     Reference number ISO 14033:2019(E).  Published in Switzerland.
--   THIS IS THE PUBLISHED STANDARD - it is NOT a Draft/DIS/FDIS, NOT a Technical Report, NOT a
--     scoping report.  The cover reads "INTERNATIONAL STANDARD ISO 14033 / First edition 2019-02";
--     there is no ballot notice, no "shall not be cited as a standard" caution and no draft-stage
--     marking anywhere in the 75-page text layer.  Prod's standards.version row already records
--     "2019 (ISO 14033:2019, first edition; cancels and replaces ISO/TS 14033:2012)" - consistent.
--   Language: English (E).  The cover also carries the French title ("Management environnemental -
--     Information environnementale quantitative - Lignes directrices et exemples"); body English only.
--   No licensee stamp is present on this copy (unlike the ISO 14002-2 copy in the same folder).
--
-- Grade: [VA] - the source is the rendered PDF's own text layer, which under SR-3 is ground truth.
--   Source PDF : C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\
--                ISO 14033\ISO-14033-2019.pdf   (3 204 845 bytes, 75 pages)
--                (the brief said to locate rather than assume; the file sits in the "ISO 14033"
--                 subfolder, alongside a sibling .txt - recorded here so the trace is reproducible)
--   Text layer : pdftotext -layout -enc UTF-8, form feeds preserved, 75 pages / 233 671 bytes.
--                Codepoint audit of the whole extraction: 0 x U+FFFD (no undecodable characters);
--                the only non-ASCII are (c) U+00A9, +- U+00B1, x U+00D7, e-acute U+00E9, en/em
--                dashes U+2013/U+2014, curly quotes U+2019/U+201C/U+201D, bullet U+2022 and the
--                layout zero-widths U+200B/U+FEFF/U+0008 that sit in headers, footers and URLs.
--                No quote below is taken from a line carrying U+200B or U+0008.
--   Rendered-page cross-check (SR-3, beyond what a text spotcheck can prove - a spotcheck only
--   proves a quote is a substring of the EXTRACTION, never that the extraction is faithful to the
--   printed page): PDF pages 13 and 29 were opened as RENDERED IMAGES and compared word for word
--   against the extraction.  Both are faithful.  One layout artefact, not damage: on PDF p.13 the
--   extraction emits the caption "Figure 1 - The overall process model of the framework" BEFORE
--   the paragraph that on the printed page follows it.  That is column ordering, not corrupted
--   text; every quote below is taken from a prose paragraph, so no quote is affected.
--   No OCR damage was found anywhere in the normative body: a scan of printed p.1-18 for
--   intra-word capitals and 18+-character runs returned only the genuine word
--   "representativeness".  No quote below required a substitution.
--
-- PAGE CONVENTION: form feeds preserved and - unlike the ISO 14002-2 copy - this PDF interleaves
--   NO blank filler pages.  Every one of the 75 text pages carries its own footer.  The map is
--   therefore uniform: PDF p.2-6 -> printed p.ii-vi, and PDF p.N -> printed p.(N-6) for the
--   arabic pages, i.e. printed p.1 = PDF p.7 ... printed p.66 = PDF p.72.
--   Reconstructed from the footers and then CONFIRMED against the printed Contents list
--   (printed p.iii): Scope p.1 = PDF 7; Clause 6 p.7 = PDF 13; Annex A p.19 = PDF 25;
--   Annex B p.28 = PDF 34; Annex C p.33 = PDF 39; Annex D p.50 = PDF 56; Annex E p.64 = PDF 70;
--   Bibliography p.65 = PDF 71.  All eight entries reproduce exactly.
--   Every quote therefore ends "- printed p.N (PDF p.M)".
--
-- ============================================================================
-- MODALITY CENSUS - the arithmetic every severity judgement rests on
-- ============================================================================
--   Normative body, Clauses 1-6 (printed p.1-18 / PDF 7-24):  shall = 0  should = 10  may = 4  can = 37  must = 0
--   Informative Annexes A-E   (printed p.19-64 / PDF 25-70):  shall = 0  should = 88  may = 1  can = 69
--   Whole 75-page document:                                   shall = 1
--
--   The ONE "shall" in the entire document is ISO boilerplate in the Foreword:
--     "ISO shall not be held responsible for identifying any or all such patent rights."
--       - printed p.v (PDF p.5)
--   It binds ISO, not the user of the standard.  So the requirement-bearing shall:should ratio of
--   the normative body is 0:10, and ALL FIVE ANNEXES ARE MARKED "(informative)" on the printed
--   Contents list.  The title of the document itself is "Guidelines and examples".
--
--   NO BLOCK GATE IS DEFENSIBLE ANYWHERE IN THIS STANDARD.
--   WHAT THE ENCODING ACTUALLY DID: all 27 compliance_requirements rows are severity='warn';
--   zero are severity='block'.  THE ENCODING MATCHES THE CENSUS.  This is the one standard in
--   this folder so far where the severity choice needs no correction - it is recorded here as a
--   positive finding, not a defect.
--
-- COUNTS
--   fields examined ......... 48  (all 8 worksheets; every one arrived verification_status=
--                                  'imported_unverified' - 0 were verified before this pass)
--   quoted now .............. 46
--   exempt now ............... 0  (there are NO app/project-metadata fields in this workbook -
--                                  even system_identifier is anchored in the printed Scope, which
--                                  names "organizations, activities, facilities, technologies and
--                                  products"; no client name, project id, planning date or
--                                  phase-gate roll-up field exists here)
--   residue .................. 2  (ISO-14033-06.emission_removal_factor,
--                                  ISO-14033-07.verification_validation_external - reasons in the
--                                  report and in iso-14033-STAGED-rulings.sql)
--   equations examined ....... 1
--   equations quoted now ..... 0
--   equations residue ........ 1  (equation 1 - the standard prints NO formula anywhere; see the
--                                  STAGED file, block S-1)
--   gates examined .......... 27  (none touched by this pack; findings staged)
--
-- Nothing here changes structure, enforcement or required-ness. Every such proposal lives, as
-- commented SQL with a RATIFIED marker, in scripts/verification/iso-14033-STAGED-rulings.sql.
-- Rollback: scripts/verification/rollback-iso-14033-md-verification-pack.sql

-- ISO-14033-01 · normative_reference_iso14050 (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The following documents are referred to in the text in such a way that some or all of their content constitutes requirements of this document. For dated references, only the edition cited applies. For undated references, the latest edition of the referenced document (including any amendments) applies. | ISO 14050, Environmental management — Vocabulary | For the purposes of this document, the terms and definitions given in ISO 14050 and the following apply. — printed p.1 (PDF p.7)', verification_note='VA-verified 2026-09-08 (§2, §3, printed p.1 (PDF p.7)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='582e8033-0b01-408b-9b91-51b97d9c2579' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-01 · comparison_application (boolean)
update public.fields set verification_status='verified_against_standard', verification_quote='This document gives specific guidelines when the quantitative environmental information is intended for comparisons, such as: [...] When acquiring and providing data intended for comparison, it is important to consider not only the application at hand, but also that any decisions are generalizable and repeatable when acquiring the same or similar data for the other system(s) for comparison. — printed p.5 (PDF p.11)', verification_note='VA-verified 2026-09-08 (§4.4, printed p.5 (PDF p.11)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='a5b3ab2f-574b-4758-b326-3a57398aa9ee' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-01 · system_identifier (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The information is related to organizations, activities, facilities, technologies and products. | This document is applicable to all organizations, regardless of their size, type, location, structure, activities, products, level of development and whether or not they have an environmental management system in place. — printed p.1 (PDF p.7)', verification_note='VA-verified 2026-09-08 (§1, §4.1, printed p.1 (PDF p.7)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='64949c93-b258-43d4-8995-a08580e00bf0' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-01 · application_scope (enum, required)
update public.fields set verification_status='verified_against_standard', verification_quote='This document gives guidelines for organizations on the general principles, policies, strategies and activities necessary to obtain quantitative environmental information for internal and/or external purposes. | This document gives guidelines for the acquisition and provision of quantitative environmental information for internal applications. | This document also gives guidelines for the acquisition and provision of quantitative environmental information for external applications, such as the following: — printed p.1 and p.4 (PDF p.7 and p.10)', verification_note='VA-verified 2026-09-08 (§1, §4.2, §4.3, printed p.1 and p.4 (PDF p.7 and p.10)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: the source reads "internal and/or external" and treats comparison (§4.4) as a further use, not a third alternative — the encoded single-select enum {internal,external,comparison} narrows this; staged', verified_at=now() where id='004897c8-c194-48ef-93f6-619b9606a85f' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-01 · intended_application (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The application sets requirements on different characteristics of the quantitative environmental information that in turn implies how the data and information is acquired and provided. The application also specifies the intended use and the requirements or expectations concerning credibility, accuracy and transparency. — printed p.4 (PDF p.10)', verification_note='VA-verified 2026-09-08 (§4.1, printed p.4 (PDF p.10)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='4913fe80-d62b-45da-9446-f5a7334a3fc0' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · measurement_method (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='A measurement method is any means of acquiring data, from a defined measurement system such as a thermometer, copying a numerical value from a book or a database, or an estimated value provided by an expert. | Measurement methods might provide either primary or secondary data, depending on choice of measurement method. — printed p.11 (PDF p.17)', verification_note='VA-verified 2026-09-08 (§6.1.2.3, printed p.11 (PDF p.17)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='3cd74506-2fd1-4426-86d5-8d4cc5a0e3d3' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · data_origin_category (enum, required)
update public.fields set verification_status='verified_against_standard', verification_quote='primary data data obtained from known direct measurement or from implicitly or explicitly defined calculations based on data originating from such direct measurements | secondary data data obtained in other ways than primary data (3.1.5) | Application of any undefined calculation method on one or several primary data results in secondary data. — printed p.2 and p.11 (PDF p.8 and p.17)', verification_note='VA-verified 2026-09-08 (§3.1.5, §3.1.6, §6.1.2.2, printed p.2 and p.11 (PDF p.8 and p.17)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='37575fea-b25d-48a6-822a-28939cc68df6' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · metadata_supplied (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='For quantitative information to be reviewable, transparent and interpretable, metadata should be supplied, with sufficient explanations about what the quantitative data represents, such as the measurement method, data gaps and scope of the system. | This implies that sufficient metadata should be supplied while performing each step. — printed p.13 (PDF p.19)', verification_note='VA-verified 2026-09-08 (§6.1.2.6, printed p.13 (PDF p.19)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; modality: "should" (recommendation), not "shall" — gate CR-007 is severity=warn, consistent', verified_at=now() where id='61f4af4a-abab-44be-995a-062698d6feb4' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · data_type_classification (enum, required)
update public.fields set verification_status='verified_against_standard', verification_quote='basic data data acquired from a data acquisition process | activity data quantitative measure of an activity that results in an environmental impact | quantitative data numerical data item that includes its unit, or context for non-dimensional data | quantitative information quantitative data (3.1.3) that has been processed or analysed to be meaningful for a specific purpose or objective | metadata data that provides information about other data — printed p.2 (PDF p.8)', verification_note='VA-verified 2026-09-08 (§3.1, printed p.2 (PDF p.8)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='2891ed48-1f1d-4855-b2c4-543608e940a0' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · foreground_background_category (enum)
update public.fields set verification_status='verified_against_standard', verification_quote='Foreground data represents that part of the whole studied system over which the user of the information has control. It can, for example, include the operations of the organization that performs an evaluation of its life cycle environmental performance, while the background data in this case is data about the supply chain and the product life time. | Foreground and background data relate to how data are categorized in a specific systems analysis. They do not categorize a specific data source. — printed p.11-12 (PDF p.17-18)', verification_note='VA-verified 2026-09-08 (§6.1.2.4, printed p.11-12 (PDF p.17-18)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='527752d5-0ca1-421a-bf7a-0f827c3b4e7c' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · specific_generic_category (enum)
update public.fields set verification_status='verified_against_standard', verification_quote='Specific data are data (primary or secondary) that represent a specific category, such as: [...] Specific data has a considerably narrow applicability, whereas generic data has a considerably wide applicability. The choice of specific or generic data is determined by the requirements of the objective for which the information is acquired and compiled. — printed p.12-13 (PDF p.18-19)', verification_note='VA-verified 2026-09-08 (§6.1.2.5, printed p.12-13 (PDF p.18-19)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='8140edc5-bb55-45c1-8add-1fa0ab409b99' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-02 · calculation_method_type (enum)
update public.fields set verification_status='verified_against_standard', verification_quote='The calculation method is a strict mathematical operation. Any parameters or variables, such as emission factors needed to perform the calculation, are either primary data or secondary data. | A defined calculation method can be an algorithm or a mathematical function, without any secondary data factors or parameters. | An undefined calculation method can be any unknown algorithm or a mathematical function, or a known algorithm or mathematical function with secondary data factors or parameters. — printed p.11 (PDF p.17)', verification_note='VA-verified 2026-09-08 (§6.1.2.2.4, printed p.11 (PDF p.17)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='0c782d8b-cc19-49d6-ac65-fd51afac2c31' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_relevance (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='These principles are fundamental for ensuring that quantitative environmental information provides a true and fair account and is used as a guideline for decisions relating to this document. | The selected data sources, system boundaries, measurement methods and assessment methods meet the requirements of the interested parties and/or the application. — printed p.5 (PDF p.11)', verification_note='VA-verified 2026-09-08 (§5.1, §5.2, printed p.5 (PDF p.11)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='ce8dd2b0-d111-4ffe-856f-3b8042563574' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_credibility (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The quantitative environmental information provided is truthful, accurate and not misleading to interested parties. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.3, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='79f95dc1-318e-4947-925d-c211bb83fe03' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_consistency (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Compatible, coherent and not self-contradictory quantitative environmental data and information are developed using recognized and reproducible methods and indicators, which respect related integrity constraints. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.4, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='ded64461-1bba-4f8f-afe5-a1c5293d2b61' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_comparability (boolean)
update public.fields set verification_status='verified_against_standard', verification_quote='The quantitative environmental information is generated, selected and provided in a consistent way, with consistent measurement units, thereby allowing for comparisons. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.5, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='f33d0d8a-78e5-45a4-bcf9-336e007e04a3' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_transparency (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The processes, procedures, methods, data sources and assumptions for providing and generating quantitative information are made available to all relevant interested parties. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.6, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='2a182072-ff55-44bc-8a59-c2bb7c9a8f00' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_completeness (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='All significant quantitative environmental information for the intended use is reflected in such a way that no other relevant information needs to be added. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.7, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='1d0a2026-2f0a-4750-b484-030633d92be1' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_validity (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Systematic errors and associated uncertainties are minimized as far as practicable and tendencies towards a particular perspective or bias are eliminated. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.8, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='33b143c1-0012-420d-9a3e-39e0b2bb9841' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_appropriateness (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Quantitative environmental information is made relevant and fully understandable to interested parties, by using formats, language and media that meet their expectations and needs. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.9, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='ecbe801b-e0d1-4174-b1f5-cef97a27a805' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-03 · principle_materiality (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The focus is kept where it really matters and where the application of the quantitative environmental information could influence the intended user’s decisions and work efficiently with the acquisition and provision of quantitative environmental information. — printed p.6 (PDF p.12)', verification_note='VA-verified 2026-09-08 (§5.10, printed p.6 (PDF p.12)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='8b987f67-194f-4ec4-9739-a3864dc8f42a' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · metrological_confirmation (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Part of the definition of the measuring method is the data quality assurance associated with the metrological confirmation, which includes establishing baselines, calibration, validation of measuring system and verification of data collected. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.2.5, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='2b792c3f-c827-4919-8b7a-561f2e843ff5' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · basic_data_definition (text)
update public.fields set verification_status='verified_against_standard', verification_quote='Defining basic data means describing the data needed to quantify each parameter selected as described in 6.2.3. This includes the following: — which basic data are needed to obtain the quantitative value for the parameter; — how the basic data are transformed into quantitative value for the parameter; — the scale of precision and statistical representativeness. | NOTE If the parameter can be directly measured or acquired from a data source, defining basic data is not needed; one can continue directly to identify the measuring method (see 6.2.5). — printed p.14 (PDF p.20)', verification_note='VA-verified 2026-09-08 (§6.2.4, printed p.14 (PDF p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: the NOTE makes this step unnecessary when the parameter is directly measurable — gate CR-013 carries no such predicate; staged', verified_at=now() where id='265d0e94-3bf9-4c13-9488-809eebb9146d' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · parameter_category (enum)
update public.fields set verification_status='verified_against_standard', verification_quote='Different types of parameters can be chosen from system characteristics, for example: — technical: activity data, production data, geographical data, energy data and emission data; — ecological: biodiversity data, habitat data, nutrient data and biological data; — socio-economic: demographic data, health data, development status data and economic data; — other factors. — printed p.14 (PDF p.20)', verification_note='VA-verified 2026-09-08 (§6.2.3, printed p.14 (PDF p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: the printed list is OPEN ("for example"); the enum closes it, mitigated only by the "other" member', verified_at=now() where id='e94a327c-903f-4b9a-8ee2-0db0ad4afe1c' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · selected_parameters (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Selection of parameters means identifying quantifiable entities of a system component that can be made to represent the quantified data. The parameters chosen are either the ones requested by the requirements of the objective or those needed to perform the calculations and aggregations necessary to quantify the requested data. — printed p.14 (PDF p.20)', verification_note='VA-verified 2026-09-08 (§6.2.3, printed p.14 (PDF p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='5e5ab2a0-d697-45d7-9c41-bc68bc93e41d' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · system_components (text)
update public.fields set verification_status='verified_against_standard', verification_quote='Breaking down into system components means dividing the object (described in 6.2.1) into manageable components. This can be done recursively to reach a level where data can be acquired (see Figure 3). | NOTE If the system identified in 6.2.1 is simple and easy to overview, this step can be omitted. — printed p.14 (PDF p.20)', verification_note='VA-verified 2026-09-08 (§6.2.2, printed p.14 (PDF p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: the NOTE makes this step omittable for a simple system — gate CR-011 carries no such predicate; staged', verified_at=now() where id='6e1889e1-5f1a-4cf2-8944-04a946eae917' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · system_boundaries (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Conceptualizing the whole system involves understanding the basis for the collection of the quantitative environmental information. This includes the following: — the objective of the information and intended use; — the object on which information is to be provided; — system boundaries; — interested parties and target audience; — requirements for the general quality of the information. — printed p.13 (PDF p.19)', verification_note='VA-verified 2026-09-08 (§6.2.1, printed p.13 (PDF p.19)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='d765e0a7-4af1-4f01-9591-38aacfef90d9' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · system_conceptualization (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='This step starts the realization of the objective. It identifies the scope of the system for which the quantitative information is to be collected. The aim of this step is to establish all the characteristics of the requirements of the objective that are relevant from a data acquisition and compilation point of view. All such characteristics are explicitly conceptualized and made understandable in terms of information and data requirements. — printed p.13 (PDF p.19)', verification_note='VA-verified 2026-09-08 (§6.2.1, printed p.13 (PDF p.19)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='cfb37fa1-d38b-4330-8d31-569c338bd525' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · objective_requirements (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The framework is based on a process model. The input to the process is the requirements of the objective, set by the actual application of the quantitative information. The requirements of the objective and judgement of whether the objective has been met is outside of the scope of this document but is set by the application. — printed p.7 (PDF p.13)', verification_note='VA-verified 2026-09-08 (§6.1.1, printed p.7 (PDF p.13)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='9c7d5409-7094-403f-b7c0-fce33ba14dcc' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · precision_scale (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='the scale of precision and statistical representativeness | Basic data differ depending on which object, which property and which scale of precision is intended. | The measurement method depends on the object from which data are acquired, on the property data about which they are acquired, and on the required scale of precision of the basic data. — printed p.14-15 (PDF p.20-21)', verification_note='VA-verified 2026-09-08 (§6.2.4, §6.2.5, printed p.14-15 (PDF p.20-21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='628551de-5457-4c07-9f24-6cfbe7e38362' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-04 · measuring_method_plan (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Identifying measuring methods involves describing how to acquire the basic data with the required scale of precision and statistical representativeness, as described in 6.2.4 (see also 6.1.2.3). | The measurement method should be suitable regarding the definition of the basic data. Methods may be selected based on available standards, literature and/or expert advice. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.2.5, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='d243ad4a-0c26-4758-96ff-27ce7ffd1cc2' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · data_uncertainty (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Failures and disturbances of measurements affect the quality of the acquired data. Estimations of the magnitude of significance of these failures and disturbances should be expressed in terms of ranges or distributions of uncertainty of the acquired basic data. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.3.2, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='30db39c0-9cdb-44ae-8a6e-de77b28bbd15' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · measuring_setup_done (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Setting up a measuring method means to implement what has been planned in 6.2.5. | Sometimes the necessary measurement equipment and routines are already in place and only need to be identified. In some cases, adaptation of existing measuring systems might need to be carried out. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.3.1, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='d69249f4-339a-43e2-9bc9-88e42c5eb1b2' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · acquired_basic_data (number, required)
update public.fields set verification_status='verified_against_standard', verification_quote='basic data data acquired from a data acquisition process | Note 1 to entry: Basic data consist of one or several values and units, depending on the nature of the item that the basic data represent. Some basic data can be dimensionless and have no units, e.g. an index or ratio. | Basic data are acquired according to the measurement method as described in 6.2.5. — printed p.2 and p.15 (PDF p.8 and p.21)', verification_note='VA-verified 2026-09-08 (§3.1.1, §6.3.2, printed p.2 and p.15 (PDF p.8 and p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: §3.1.1/§3.1.3 make the UNIT part of the datum, but the encoded unit column literally holds the string "number"; staged', verified_at=now() where id='6867a2e7-667f-4676-8fb4-081978b29cee' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · consolidated_parameters (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Parameters are consolidated according to Plan, as described in 6.2.3. If data processing differs from Plan, the deviation is explained together with an estimation, evaluation or analysis of its significance. Significances are estimated iteratively, starting with a qualitative analysis that subsequently can lead to a thorough statistical analysis of uncertainty. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.3.3, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='3cb4ec1f-8c4b-45a6-bd8c-2a4c54f62679' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · deviation_from_plan (boolean)
update public.fields set verification_status='verified_against_standard', verification_quote='The significance of any deviation of Plan should be estimated and, if needed, corrective values should be used or corrective routines established. | If data processing differs from Plan, the deviation is explained together with an estimation, evaluation or analysis of its significance. — printed p.15 (PDF p.21)', verification_note='VA-verified 2026-09-08 (§6.3.1, §6.3.3, printed p.15 (PDF p.21)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='7feb5ba3-7940-44b3-8e0c-27ee55a73df3' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · synthesized_components (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='System components are synthesized according to Plan, described in 6.2.2. To synthesize the system components, the parameters consolidated as described in 6.3.3 are related to the parameters of each system component, as described in 6.2.2. — printed p.16 (PDF p.22)', verification_note='VA-verified 2026-09-08 (§6.3.4, printed p.16 (PDF p.22)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='9de767c8-dce2-4a4e-a37a-786da3a86054' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-05 · aggregated_result (number, required)
update public.fields set verification_status='verified_against_standard', verification_quote='This is where the data analyses are formulated into a quantitative statement of the total studied system. The whole system is aggregated according to the objectives, as described in 6.2.1. The system components are aggregated according to the appropriate aggregation type implied by the requirements of the objective. — printed p.16 (PDF p.22)', verification_note='VA-verified 2026-09-08 (§6.3.5, printed p.16 (PDF p.22)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: encoded unit column literally holds the string "number"; staged', verified_at=now() where id='4de671bd-592d-4674-a9ad-fc831b5be4a6' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-06 · activity_data (number)
update public.fields set verification_status='verified_against_standard', verification_quote='activity data quantitative measure of an activity that results in an environmental impact | — technical: activity data, production data, geographical data, energy data and emission data; — printed p.2 and p.14 (PDF p.8 and p.20)', verification_note='VA-verified 2026-09-08 (§3.1.2, §6.2.3, printed p.2 and p.14 (PDF p.8 and p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: encoded validation_rules carry an unsourced "activity_data >= 0" floor; staged', verified_at=now() where id='be9d1cb6-26ff-4ed3-af52-cb43d2045b6e' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-06 · parameter_value (number)
update public.fields set verification_status='verified_against_standard', verification_quote='Selection of parameters means identifying quantifiable entities of a system component that can be made to represent the quantified data. | — which basic data are needed to obtain the quantitative value for the parameter; — how the basic data are transformed into quantitative value for the parameter; — printed p.14 (PDF p.20)', verification_note='VA-verified 2026-09-08 (§6.2.3, §6.2.4, printed p.14 (PDF p.20)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: derived output of equation 1; encoded validation_rules carry an unsourced "parameter_value >= 0" floor, which a net-removal result can legitimately violate; staged', verified_at=now() where id='752392c9-5f17-48ed-9d0c-547c3b93e6f5' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-07 · review_type (enum)
update public.fields set verification_status='verified_against_standard', verification_quote='The framework provides systematic approaches to check of quantitative environmental information. Check might be, for example, in the form of peer data quality check, peer review or third-party review. — printed p.8 (PDF p.14)', verification_note='VA-verified 2026-09-08 (§6.1.1, printed p.8 (PDF p.14)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; CAVEAT: the printed list is OPEN ("might be, for example"); the encoded enum closes it to exactly three members; staged', verified_at=now() where id='2837cabc-4420-4996-8516-f338bc19ba7d' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-07 · plan_do_correspondence (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Each task of Plan corresponds to a task in Do. [...] Check is the evaluation of the actual correspondence between the tasks of Plan and Do, and of the overall meeting of the requirements of the objective. | Reviews to ensure that Plan and Do follow the same approach and methodology for each of the different conditions that are to be compared can be done at each task, or can cover several tasks throughout the work process. — printed p.8 and p.16 (PDF p.14 and p.22)', verification_note='VA-verified 2026-09-08 (§6.1.1, §6.4.1, printed p.8 and p.16 (PDF p.14 and p.22)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='3309ac69-5bce-44a1-bbdf-fa68c03b6dcf' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-07 · consecutive_check_applied (boolean)
update public.fields set verification_status='verified_against_standard', verification_quote='The framework provides a structure of distinct steps for planning and doing data acquisition and compilation, where previous steps set requirements for the next steps. [...] If a consecutive Check is applied throughout a quantification procedure, it will be possible to stop the work to perform corrective measures before spending resources on incorrect data and decisions. — printed p.17 (PDF p.23)', verification_note='VA-verified 2026-09-08 (§6.4.2.1, printed p.17 (PDF p.23)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='3c69e5df-be4a-4834-9676-f6505e60f91c' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-07 · review_documented (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The Check stage is largely based on the availability of documentation from the Plan and Do stages. It is also strongly recommended that each step of the Check stage is well-documented. It is especially important that any review comments are documented, and that they address the related documentation from the Plan and Do stages. — printed p.16 (PDF p.22)', verification_note='VA-verified 2026-09-08 (§6.4.1, printed p.16 (PDF p.22)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; modality: "strongly recommended", not "shall" — gate CR-023 is severity=warn, consistent', verified_at=now() where id='abb0f851-a085-4253-af62-7d81a056df32' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-08 · act_documented (boolean, required)
update public.fields set verification_status='verified_against_standard', verification_quote='The Act stage is largely based on the availability of documentation from the Check stage. It is also strongly recommended that the Act stage is well-documented, since it might function as a work specification for future Plan and Do stages. — printed p.18 (PDF p.24)', verification_note='VA-verified 2026-09-08 (§6.5, printed p.18 (PDF p.24)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]; modality: "strongly recommended", not "shall" — gate CR-027 is severity=warn, consistent', verified_at=now() where id='02c86d30-cc3b-41f1-9d71-425430d77369' and verification_status not in ('verified_against_standard','corrected');

-- ISO-14033-08 · improvement_actions (text, required)
update public.fields set verification_status='verified_against_standard', verification_quote='Based on the results from Check, necessary actions are taken to continually improve the acquisition and provision process. — printed p.18 (PDF p.24)', verification_note='VA-verified 2026-09-08 (§6.5, printed p.18 (PDF p.24)) [VA · ISO 14033:2019 published First edition 2019-02, PDF text layer]', verified_at=now() where id='9d561b26-9c7d-4109-a4fd-00515f53d697' and verification_status not in ('verified_against_standard','corrected');
