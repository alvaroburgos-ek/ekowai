-- ============================================================================================
-- ISO-59004 — source verification pack (grade VA)
-- ============================================================================================
-- *** WHAT THE SOURCE ACTUALLY IS — read before trusting any row in this pack ***
--   The only document in the library for this standard is a DRAFT, twice over:
--     * ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard. The running head on printed
--       p.1 (PDF p.1 of the body, PDF page 8) literally reads "FINAL DRAFT International Standard".
--     * reproduced inside a Moroccan national DRAFT: "Projet de Norme Marocaine — PNM ISO/FDIS
--       59004, IC 00.1.016, 2024", issued by the Institut Marocain de Normalisation (IMANOR).
--       Cover: "Correspondance — La présente norme est identique à l''ISO/FDIS 59004:2024."
--       The approval line is unfilled ("Par décision du Directeur ... N°........... du ............ 2024"),
--       and every page carries a diagonal "Projet de Norme Marocaine" watermark.
--   Consequence: this is NOT the published ISO 59004:2024. It may not be cited as a published
--   standard, and its clause numbering can differ from the published edition. Every note below
--   therefore NAMES the draft instead of saying only "VA-verified", so no reader can mistake these
--   rows for verification against the published ISO 59004:2024.
--   prod standards.version already reads 'FDIS 2024 (ISO/FDIS 59004:2024)' — the FDIS status IS
--   recorded; the Moroccan draft-adoption provenance is not (see STAGED file, block S-1).
--
-- Source text : C:\Users\Ekowai\AppData\Local\Temp\claude\...\scratchpad\pdftext\ISO_FDIS_59004_N.txt
--               (pdftotext -layout -enc UTF-8, 63 pages, 197 245 bytes, 0 undecodable characters)
-- Source PDF  : C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59004\
--               ISO_FDIS_59004_N.pdf
-- Grade       : VA. There is no markdown transcript for this standard; the source is the text layer
--               of the rendered PDF, and EVERY quote below was additionally confirmed by reading the
--               rendered page image (pdftoppm -png -r 125) — PDF pages 8, 11, 20, 21, 22, 23, 24, 25,
--               34, 35, 36, 37, 38, 39, 40, 41, 42, 43. SR-3 satisfied.
--
-- PAGE CONVENTION
--   Form feeds preserved: text page N = PDF page N (62 form feeds -> 63 pages).
--   Printed-page mapping reconstructed from the footer line after "© ISO 2024 - All rights reserved"
--   and cross-checked against the printed Contents (e.g. "1 Scope .... 1", "4 Circular economy
--   vision .... 14", "6.7 Guidance for resource management actions .... 27", "7.2.2 Assess the
--   reference situation .... 31" all land on the reconstructed page):
--       front matter  PDF p.3..7  = printed iii..vii
--       body          PDF p.N     = printed p.(N-7)   i.e. printed p.1 = PDF p.8
--   Each quote below cites BOTH numbers once, at the end: "- printed p.X (= PDF p.Y)".
--
-- TEXT-LAYER CAVEATS (both worked around, neither affects the quotes)
--   * The "Projet de Norme Marocaine" watermark lands in the text layer as stray one/two-character
--     fragments at the start of roughly half the lines ("e ", "in ", "rHuman", "Pbiodiversity", ...).
--     Quotes below are the PRINTED text, read off the rendered pages; the watermark debris is not
--     reproduced. A de-watermarked companion file (ISO_FDIS_59004_N.dewatermarked.txt = raw +
--     de-watermarked + line-break-hyphen-rejoined + aggressive, concatenated) exists purely so
--     spotcheck-pack.mjs can find the windows; every one of its transforms DELETES characters, none
--     adds text, and the untouched raw copy is the first block of the file. Reproduce it with:
--       FRAG = '(?:Projet|rojet|ojet|jet|Proje|roje|oje|je|Proj|roj|oj|Pro|ro|Pr|P|r|o|j|e|t|d|de|N|No|
--                Nor|Norm|Norme|orme|orm|rme|rm|me|M|Ma|Mar|Maro|Marocaine|arocaine|rocaine|ocaine|
--                caine|aine|ine|ne|aro|roc|oca|cai|ai|ain|c|ca|a|i|n|s|in|m)'
--       cleaned    = per line, strip up to 3 leading `^\s*FRAG\s+(?=\S)`, then `^(\s*)(?:P|N|M|r|o|e|
--                    t|d|c|a|m|je|Pr|ro|rm)(?=[A-Z][a-z])`
--       hyph       = cleaned with `(\p{L})-[ \t]*\r?\n(?:[ \t]*\r?\n)*[ \t]*(\p{L})` -> `$1-$2`
--       aggressive = cleaned with `^(\s*)(?:P|N|M|r|o|e|t|d|c|a|m|i|s|j)(?=[a-z]{3})` stripped, then hyph
--       output     = raw + cleaned + hyph + aggressive
--     Spot-check result: 32/32 quotes >=85 % verbatim, mean 100 %, against that companion;
--     24/32, mean 92 %, against the raw text layer — the 8 shortfalls are all watermark-straddling
--     windows, and every one of the 32 quotes was independently read off a rendered page image.
--   * pdftotext DROPS the box labels of Figure 4 (printed p.30 = PDF p.37) entirely. The five
--     implementation stages were therefore read off the RENDERED page image, not the text layer.
--
-- MODALITY CENSUS (mechanical, whole document)
--   body (clauses 1-7, text lines 324-2999):  shall 0 | should 128 | should not 4 | may 3 | can 196 | must 0
--   informative Annexes A/B/C (lines 3000-3620): shall 0 | should 3 | may 0 | can 50 | must 0
--   front matter: the ONLY "shall" in the entire 63-page document is the ISO patent boilerplate
--     ("ISO shall not be held responsible for identifying any or all such patent rights.", printed p.vi).
--   Ratio shall:should in the normative body = 0:128. The document is titled "guidance" and it is:
--   it contains ZERO requirements. WHAT THE ENCODING USED: 24 of 33 fields carry is_required=true and
--   one gate (CR-015) carries severity='block'. That does NOT match the source — there is no mandatory
--   verb anywhere behind any of them. Both are staged for ratification (STAGED blocks S-4 and S-5),
--   NOT changed here.
--
-- NUMERIC CONTENT: none. 0 fields of a numeric/date type, 0 equations, 0 formulas, 0 inequalities,
--   0 units, one table (Table 1, purely textual). Nothing in this standard can carry an invented
--   value, unit, limit or tolerance, and there is nothing to lift or backfill as an equation.
--
-- COUNTS
--   fields examined ............ 33
--   already verified ........... 0   (all 33 were 'imported_unverified')
--   quoted here (VA) ........... 32
--   exempt (app metadata) ...... 1   (ISO-59004-01.organization_name)
--   residue .................... 0
--   equations quoted / residue . 0 / 0  (the standard has no equations; prod has none)
-- ROLLBACK: rollback-iso-59004-md-verification-pack.sql
--
-- NO TRANSACTION CONTROL IN THIS FILE. apply-pack.mjs supplies BEGIN/COMMIT and implements
-- --dry-run by rolling back. An inline begin/commit would silently turn a dry run into a real apply.
-- ============================================================================================


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-01  Registrierung & Anwendungsbereich
-- ---------------------------------------------------------------------------------------------

-- value_chain_position
update public.fields set verification_status='verified_against_standard', verification_quote='Prior to implementing any of the identified actions in this clause, an organization should have an understanding of where their solutions fit in the value chain. | These organizations can be either private or public, acting individually or collectively, regardless of type or size, and located in any jurisdiction, or position within a specific value chain or value network. — printed p.18 (§6.1) and p.1 (§1) = PDF p.25 and p.8', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6.1 + §1, printed p.18 and p.1 = PDF p.25 and p.8) [VA]. The obligation lives in §6.1, not in §1 as the clause_reference says — retag staged, not applied.' where id='863cdc93-3d43-46fc-8462-a0f5ad081ca9' and verification_status not in ('verified_against_standard','corrected');

-- ce_commitment
update public.fields set verification_status='verified_against_standard', verification_quote='It is applicable to organizations seeking to understand and commit or contribute to a circular economy while contributing to sustainable development. — printed p.1 (§1) = PDF p.8', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§1, printed p.1 = PDF p.8) [VA]. CAVEAT: this sentence is an APPLICABILITY statement (who the document is for), not an obligation. Gate CR-002 enforces ce_commitment == true, i.e. it turns a scope predicate into a compliance check — staged, not changed.' where id='cfe85257-2334-47eb-ac71-dbb8af526cc8' and verification_status not in ('verified_against_standard','corrected');

-- organization_type
update public.fields set verification_status='verified_against_standard', verification_quote='These organizations can be either private or public, acting individually or collectively, regardless of type or size, and located in any jurisdiction, or position within a specific value chain or value network. — printed p.1 (§1) = PDF p.8', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§1, printed p.1 = PDF p.8) [VA]. CAVEAT: the source names a fixed pair (private / public) and a fixed pair (individually / collectively); the field is free text — selection-widget proposal staged, not applied.' where id='f7c980f0-4f03-44eb-98fe-757e6b2343c7' and verification_status not in ('verified_against_standard','corrected');

-- jurisdiction
update public.fields set verification_status='verified_against_standard', verification_quote='These organizations can be either private or public, acting individually or collectively, regardless of type or size, and located in any jurisdiction, or position within a specific value chain or value network. — printed p.1 (§1) = PDF p.8', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§1, printed p.1 = PDF p.8) [VA]. CAVEAT: "located in any jurisdiction" explicitly imposes NO constraint on this field — the clause records that the document applies everywhere. is_required=false, which is correct.' where id='1198f1b3-e3f2-46cf-b9f4-af083b190ae3' and verification_status not in ('verified_against_standard','corrected');

-- organization_name — app/project metadata, exempt per the 2026-08-01 metadata ruling
update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-08: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling. Source = ISO/FDIS 59004:2024, a FINAL DRAFT International Standard reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024), not the published ISO 59004:2024.' where id='12b9022c-dc42-41ed-b321-3025a6367674' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-02  Begriffe & Definitionen (Vokabular)
-- ---------------------------------------------------------------------------------------------

-- system_in_focus
update public.fields set verification_status='verified_against_standard', verification_quote='system in focus | system (3.1.22) that is defined by selected system boundaries and is the subject of a circularity measurement (3.6.4) and a circularity assessment (3.6.5) | Note 1 to entry: Four system levels are being used for measuring and assessing circularity performance (3.6.3): regional, interorganizational, organizational and product level. — printed p.4 (§3.1.23) = PDF p.11', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§3.1.23, printed p.4 = PDF p.11) [VA]. The four levels named in the field description match Note 1 to entry exactly.' where id='54c8f4df-8ff2-4571-8020-a8cf39b71b2c' and verification_status not in ('verified_against_standard','corrected');

-- circularity_aspect
update public.fields set verification_status='verified_against_standard', verification_quote='circularity aspect | element of an organization’s (3.4.1) activities or solutions (3.2.1) that interacts with the circular economy (3.1.1) | EXAMPLE Durability, recyclability, reusability, repairability, recoverability. — printed p.13 (§3.6.1) = PDF p.20', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§3.6.1, printed p.13 = PDF p.20) [VA]. The five items in the field description are the printed EXAMPLE, verbatim and complete.' where id='032bb918-83c1-49f2-8350-d08eb2d42e19' and verification_status not in ('verified_against_standard','corrected');

-- defined_term
update public.fields set verification_status='verified_against_standard', verification_quote='3.1 Terms related to a circular economy | circular economy | economic system (3.1.2) that uses a systemic approach to maintain a circular flow of resources (3.1.6), by recovering, retaining or adding to their value (3.1.7), while contributing to sustainable development (3.1.11) | system in focus | system (3.1.22) that is defined by selected system boundaries and is the subject of a circularity measurement (3.6.4) and a circularity assessment (3.6.5) — printed pp.1-4 (§3.1.1 and §3.1.23) = PDF pp.8-11', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§3.1, printed pp.1-4 = PDF pp.8-11) [VA]. The enum holds 23 values; §3.1 prints exactly 23 numbered terms, 3.1.1 through 3.1.23, and every enum value and its regulation_reference matches one of them (first and last quoted above; the full run was read on the rendered pages).' where id='e49c7202-6a79-4558-b0b3-f52b7b643385' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-03  Vision der Kreislaufwirtschaft
-- ---------------------------------------------------------------------------------------------

-- ce_vision_statement
update public.fields set verification_status='verified_against_standard', verification_quote='The long-term vision of a circular economy is, by design, to provide appropriate solutions for the reduced, efficient and effective use of resources, and to prevent harmful releases, losses and environmental degradation when meeting societal needs. | Under this vision, social and economic growth are decoupled from resource consumption. — printed pp.14-15 (§4) = PDF pp.21-22', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§4, printed pp.14-15 = PDF pp.21-22) [VA].' where id='b2436626-4bea-4bd3-a198-fffb9348edf0' and verification_status not in ('verified_against_standard','corrected');

-- systems_thinking_applied
update public.fields set verification_status='verified_against_standard', verification_quote='Systems thinking should be applied to circular economy activities, which supports progress towards sustainable development. — printed p.15 (§4) = PDF p.22', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§4, printed p.15 = PDF p.22) [VA]. Modal verb is "should"; the field is is_required=true — see STAGED block S-4.' where id='2930b494-3154-4d09-941f-c57e67407085' and verification_status not in ('verified_against_standard','corrected');

-- principles_integrated
update public.fields set verification_status='verified_against_standard', verification_quote='The six principles described in Clause 5 should be integrated into organizational strategies and objectives to support continual progress towards increasing circularity. — printed p.15 (§4) = PDF p.22', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§4, printed p.15 = PDF p.22) [VA]. Modal verb is "should"; the field is is_required=true — see STAGED block S-4.' where id='f5d68a9c-2e5a-45b6-937c-b2dbf06242af' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-04  Grundsaetze der Kreislaufwirtschaft
-- ---------------------------------------------------------------------------------------------

-- all_principles_considered
update public.fields set verification_status='verified_against_standard', verification_quote='Considering the integration of all the circular economy principles is important, as focusing on only one or two principles can undermine the achievements that would otherwise occur if all the principles were considered. — printed p.16 (§5.3.2) = PDF p.23', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§5.3.2, printed p.16 = PDF p.23) [VA]. Note the phrasing is "is important" / "can undermine" — no mandatory verb.' where id='86c49ff8-ff8d-4971-b571-5e361b00e84b' and verification_status not in ('verified_against_standard','corrected');

-- hazardous_substance_risk_approach
update public.fields set verification_status='verified_against_standard', verification_quote='A circular economy should not harm the health of people, wildlife or the environment. Therefore, a risk-based approach should be used to avoid exposure to hazardous substances. When possible, organizations should avoid their use. — printed p.17 (§5.3.4) = PDF p.24', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§5.3.4, printed p.17 = PDF p.24) [VA]. This is the only field behind a severity=block gate (CR-015), and its source text is "should" three times over, with the printed carve-out "When possible" — block severity is unsupported; see STAGED block S-5. The field description says "where possible"; the source reads "When possible".' where id='bf42aa68-b9ad-48c4-af29-e61557c912ec' and verification_status not in ('verified_against_standard','corrected');

-- stocks_flows_monitored
update public.fields set verification_status='verified_against_standard', verification_quote='To efficiently manage the resource utilization in a circular way, the organization can identify and measure the use of all types of resources (virgin or recovered, non-renewable or renewable) and trace the mass and value over time, while resource substitution, resource recovery and recycling are carried out and improved. There is inevitably loss of resources (e.g. material and energy) over time that should be monitored in terms of type, final disposition and effects. — printed p.17 (§5.3.6) = PDF p.24', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§5.3.6, printed p.17 = PDF p.24) [VA]. The identify/measure/trace half is printed with "can" (permissive), only the loss-monitoring half carries "should"; is_required=false is therefore correct, but gate CR-017 asserts the field == true — see STAGED block S-6.' where id='1c8e0886-5389-409f-8beb-f582097923a8' and verification_status not in ('verified_against_standard','corrected');

-- selected_principle
update public.fields set verification_status='verified_against_standard', verification_quote='The set of principles given in 5.2, which are interlinked and complementary, should be considered by an organization to transition towards a circular economy. | 5.2.1 Systems thinking | 5.2.2 Value creation | 5.2.3 Value sharing | 5.2.4 Resource stewardship | 5.2.5 Resource traceability | 5.2.6 Ecosystem resilience — printed pp.15-16 (§5.1 and §5.2) = PDF pp.22-23', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§5.2, printed pp.15-16 = PDF pp.22-23) [VA]. The six enum values and their §5.2.x references match the printed subclause headings one for one. CAVEAT: the field is a SINGLE-select over a printed conjunction — §5.1 says the set "should be considered" and §5.3.2 says focusing on only one or two principles undermines the achievements. Multi-select proposal staged, not applied.' where id='140e3977-fce7-409e-ba5a-d135103c831b' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-05  Massnahmen fuer eine Kreislaufwirtschaft
-- ---------------------------------------------------------------------------------------------

-- action_category
update public.fields set verification_status='verified_against_standard', verification_quote='6.2 Actions that create added value | 6.3 Actions that contribute to value retention | 6.4 Actions that contribute to value recovery | 6.5 Actions to regenerate ecosystems | 6.6 Actions to support a circular economy transition — printed pp.18, 21, 22, 25 (§6.2 to §6.6) = PDF pp.25, 28, 29, 32', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6, printed pp.18-25 = PDF pp.25-32) [VA]. The five enum values are the five printed action subclauses of Clause 6; §6.1 (General) and §6.7 (resource-management guidance) are correctly excluded as non-categories.' where id='06d21589-3812-404c-bc62-0baf0432ff7c' and verification_status not in ('verified_against_standard','corrected');

-- preliminary_action_refuse_rethink
update public.fields set verification_status='verified_against_standard', verification_quote='Organizations should consider refuse and rethink as preliminary actions. — printed p.18 (§6.1) = PDF p.25', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6.1, printed p.18 = PDF p.25) [VA]. "should consider" — the obligation is to consider, not to adopt; the field is a boolean and is_required=true (STAGED block S-4).' where id='152afe33-75b1-4e24-889a-46e524630cf6' and verification_status not in ('verified_against_standard','corrected');

-- life_cycle_perspective_applied
update public.fields set verification_status='verified_against_standard', verification_quote='This resource management guidance is intended to help organizations prioritize actions to increase circularity performance. A life cycle perspective should guide the organization in the identification of the best action for their value creation model and to avoid unwanted trade-offs. — printed p.27 (§6.7) = PDF p.34', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6.7, printed p.27 = PDF p.34) [VA].' where id='f2078636-0072-4f7b-ac72-cd518bd16fc1' and verification_status not in ('verified_against_standard','corrected');

-- repair_before_remanufacture_before_recycle
update public.fields set verification_status='verified_against_standard', verification_quote='In general, products should be repaired before they are remanufactured, and remanufactured before they are recycled. However, in cases where applying this guidance does not lead to the best outcome, organizations should consider applying a life cycle perspective to determine the best action. — printed p.28 (§6.7) = PDF p.35', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6.7, printed p.28 = PDF p.35) [VA]. The rule is printed with TWO softeners — "In general" and the explicit "However, in cases where ..." carve-out. Gate CR-028 asserts the field == true with no exception path; severity is warn, so it advises rather than blocks. See STAGED block S-7.' where id='488f7f2a-0090-492e-af07-bd26e5f69391' and verification_status not in ('verified_against_standard','corrected');

-- selected_action
update public.fields set verification_status='verified_against_standard', verification_quote='The guidance (see Table 1) suggests organizations can begin by determining if there is a need to be satisfied and if the need can be met without additional resource use (refuse). [...] designing solutions that use fewer resources (rethink, reduce) and prioritizing the use of recovered resources [...] (source). | Organizations should seek to extend the life of solutions by design and by maintaining the solution in use for as long as possible (repair, reuse, refurbish, remanufacture, repurpose) while continuing to provide value. | Finally, organizations should look to use resources in multiple cycles (cascade, recycle), recover the energy if the resource cannot be used again (energy recovery) or source resources from landfills (re-mine). — pp.27-28 (§6.7, Tab. 1) = PDF pp.34-35', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§6.7 / Table 1, printed pp.27-28 = PDF pp.34-35) [VA]. Table 1 was read off the RENDERED page (PDF p.35) because pdftotext scrambles its Action column into a separate block: the printed Action column is Refuse, Rethink, Source, Reduce, Repair, Re-use, Refurbish, Remanufacture, Repurpose, Cascade, Recycle, Recover energy, Re-mine — 13 rows, and the 13 enum values match one for one, in printed order.' where id='f301f926-4f37-4df9-9b3b-ee3801cb4753' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- ISO-59004-06  Leitfaden zur Umsetzung
-- ---------------------------------------------------------------------------------------------

-- implementation_stage
update public.fields set verification_status='verified_against_standard', verification_quote='The guidance is structured to allow for an iterative process. The stages of implementation can be altered and adapted to reflect changing circumstances of the organization. Figure 4 illustrates the stages, which are underpinned by the circular economy principles. | The proposed stages that an organization can undertake in order to implement a circular economy are discussed in 7.2 to 7.6. | NOTE The sequence of stages can differ and can also occur at the same time or in parallel. — printed p.30 (§7.1.4, Figure 4) = PDF p.37', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.1.4 / Figure 4, printed p.30 = PDF p.37) [VA]. pdftotext DROPS the Figure 4 box labels; they were read off the RENDERED page image: "Circular economy purpose, mission, vision and goals definition", "Circular economy strategic priorities and action plan development", "Circular economy implementation", "Circular economy monitoring, reviewing and reporting", and the base band "Context and reference situation assessment" — five stages, matching the five enum values and their §7.2-§7.6 references exactly.' where id='2084eca2-b592-4c8d-a63e-23e5a3125b24' and verification_status not in ('verified_against_standard','corrected');

-- implementation_level
update public.fields set verification_status='verified_against_standard', verification_quote='This guidance is applicable to organizations operating at all system levels, as follows: | Global, regional, country, local level: covers, but is not limited to, international agencies, countries, states, provinces, cities and municipalities. | Interorganizational level: covers inter-industry and inter-firm networks [...] | Organizational level: covers any type of organization [...] | ISO 59020 covers these three levels and also includes a system level focusing on products. This fourth system level is indirectly covered in this document by the goals, strategies and activities of the organizations that provide products. — printed p.29 (§7.1.3) = PDF p.36', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.1.3, printed p.29 = PDF p.36) [VA]. §7.1.3 prints THREE levels; the enum carries four. The fourth (product) is legitimate but comes from the follow-on sentence, which assigns it to ISO 59020 and says it is only "indirectly covered in this document" — the enum offers it at the same rank as the three printed levels. Flagged in STAGED block S-8.' where id='9d1e60c3-cf6c-4d33-bd9a-8462f2f9f114' and verification_status not in ('verified_against_standard','corrected');

-- reference_situation_assessed
update public.fields set verification_status='verified_against_standard', verification_quote='As an initial step, the organization should determine their reference situation with regards to a circular economy. This may encompass, but is not limited to: | identifying current resource management practices in the organization and its value chain(s) or value network(s); | assessing the flow of resources used by the organization; | assessing the current organizational practices and understanding how they align with the circular economy principles; — printed p.31 (§7.2.2) = PDF p.38', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.2.2, printed p.31 = PDF p.38) [VA]. The printed bullet list is open ("may encompass, but is not limited to") and has 10 items; the first three are quoted.' where id='ed937302-ec3e-4590-8932-50a10b60190c' and verification_status not in ('verified_against_standard','corrected');

-- baseline_circularity_assessment
update public.fields set verification_status='verified_against_standard', verification_quote='As part of the reference situation assessment, the selected circularity indicators should be calculated and a baseline circularity assessment performed. A baseline can assist the organization when setting targets for a circular transition, assessing progress, evaluating the effectiveness of actions introduced, and making improvements, as needed. | NOTE 2 More information on how to identify appropriate circularity indicators can be found in ISO 59020. — printed p.31 (§7.2.2) = PDF p.38', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.2.2, printed p.31 = PDF p.38) [VA]. The field description says the methods are owned by ISO 59020; that is what NOTE 2 and the §7.2.2 bullet ("see ISO 59020 for methods to analyse circularity impacts") say. This document defines no calculation method itself — an NR dependency on ISO 59020.' where id='e2831e54-13ae-4a10-8bc7-0e80b4dd6eb9' and verification_status not in ('verified_against_standard','corrected');

-- selected_circularity_indicator
update public.fields set verification_status='verified_against_standard', verification_quote='As part of its action plan for a circular economy (see 7.1.4), the organization should choose circularity indicators to assess the effectiveness and efficiency of the interventions adopted and monitor the progress. The circularity indicators should be determined with the circular economy principles in mind, as well as the circularity goals and strategic priorities established by the organization. — printed p.36 (§7.6) = PDF p.43', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.6, printed p.36 = PDF p.43) [VA]. CAVEAT: the source is plural throughout ("circularity indicators", "a set of circularity indicators" in §7.4.3); the field is a single text value. Flagged in STAGED block S-9. The indicators themselves are defined by ISO 59020, not here (NR).' where id='1a37d6cb-2e64-4062-b556-52b808543b34' and verification_status not in ('verified_against_standard','corrected');

-- ce_purpose_mission_vision
update public.fields set verification_status='verified_against_standard', verification_quote='Organizations should develop their purpose, mission and vision for a circular economy in alignment with the circular economy principles (see 5.2). The vision should inspire change and provide a clear direction for the organization to transition towards a circular economy. — printed p.32 (§7.3.1) = PDF p.39', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.3.1, printed p.32 = PDF p.39) [VA].' where id='4a0d089d-1395-4bf6-9997-518d08be3d2d' and verification_status not in ('verified_against_standard','corrected');

-- ce_goals
update public.fields set verification_status='verified_against_standard', verification_quote='The organization should develop goals with an aim to create structured and lasting change and identify pathways and key actions to achieve their vision for a circular economy. Intermediate targets should be established to allow for circularity assessments of progress from the reference situation towards the longer-term goals. — printed p.33 (§7.3.2) = PDF p.40', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.3.2, printed p.33 = PDF p.40) [VA].' where id='8ffe261f-1527-4051-a397-5a53fdd0b068' and verification_status not in ('verified_against_standard','corrected');

-- ce_strategy
update public.fields set verification_status='verified_against_standard', verification_quote='An organization’s strategy should link its mission, vision, goals, priorities, targets and respective actions or projects followed by a measuring framework. This should also include the establishment of a set of circularity indicators that allows for monitoring the strategic priorities and action plan implementation and goals achievement, as well as the outcomes of the different actions applied (see ISO 59020). — printed p.33 (§7.4.3) = PDF p.40', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.4.3, printed p.33 = PDF p.40) [VA].' where id='f34c2fab-d2a7-4e41-8340-af9b9ff40f7e' and verification_status not in ('verified_against_standard','corrected');

-- ce_action_plan
update public.fields set verification_status='verified_against_standard', verification_quote='Once the circular economy strategic priorities are established, the organization should develop an action plan for how the circular economy strategy will be implemented. This should include consideration of the scope and capabilities for the circular economy implementation. | The organization should determine responsibilities for the different steps and critical areas towards circularity. | The action plan for a circular economy also should consider the capabilities allocated and timeline for implementation and should identify potential setbacks that can occur during the implementation phase, so that preventive measures, if necessary, can be adopted. — printed pp.34-35 (§7.4.6) = PDF pp.41-42', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.4.6, printed pp.34-35 = PDF pp.41-42) [VA]. Every element in the field description (scope, responsibilities, capabilities, timeline, potential setbacks) is printed here.' where id='1fb9879b-24b0-4cd0-8424-c854ffdb72c4' and verification_status not in ('verified_against_standard','corrected');

-- feasibility_dimension
update public.fields set verification_status='verified_against_standard', verification_quote='To assess the feasibility of the adoption of a circular economy and its associated circular economy value creation models, actions should be assessed against the following dimensions: | technical aspects [...] | organizational aspects [...] | financial and economic aspects: financial feasibility for the organization [...] | context aspects: regulatory frameworks, institutional settings and social norms [...] | social aspects: the impact on social systems, including the social equity benefits to be achieved; | environmental aspects: the environmental impacts considering the different scenarios where actions will be implemented. — printed p.34 (§7.4.5) = PDF p.41', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.4.5, printed p.34 = PDF p.41) [VA]. The printed list is closed and has exactly six dimensions; the six enum values match them one for one. The technical and organizational bullets are elided above only for length — both are printed in full on p.34.' where id='3476e0a8-29a1-40a9-8384-7742177ae134' and verification_status not in ('verified_against_standard','corrected');

-- pilot_project
update public.fields set verification_status='verified_against_standard', verification_quote='Prior to formal implementation some organizations can consider a preliminary pilot application of a specific circular economy practice or for a specific segment of the organization to ensure the application works as planned and any specific risk or barriers are addressed before wider implementation. — printed p.35 (§7.4.7) = PDF p.42', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.4.7, printed p.35 = PDF p.42) [VA]. "some organizations can consider" — permissive; is_required=false is correct.' where id='eeca86b2-0dcb-4407-add3-9cb1da1b246c' and verification_status not in ('verified_against_standard','corrected');

-- value_creation_model
update public.fields set verification_status='verified_against_standard', verification_quote='The organization should align its actions with the strategy and address identified opportunities to create value and have a value creation model in place that is aligned with the circular economy. — printed p.33 (§7.4.4) = PDF p.40', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.4.4, printed p.33 = PDF p.40) [VA]. The classification of value creation models is owned by ISO 59010, not by this document (NOTE on printed p.34).' where id='82b7680e-b5c0-4ee1-a9d6-bb1746a25f17' and verification_status not in ('verified_against_standard','corrected');

-- monitoring_review_process
update public.fields set verification_status='verified_against_standard', verification_quote='The organization should often review these indicators and circularity performance. The review links the actions to the circular economy principles. | Review of the circularity indicators and circularity performance should set the basis for continual improvement and, therefore, can include milestones and targets for the next period. — printed p.36 (§7.6) = PDF p.43', verification_note='VA-verified 2026-09-08 against ISO/FDIS 59004:2024 — a FINAL DRAFT International Standard, reproduced in the Moroccan draft PNM ISO/FDIS 59004 (IMANOR 2024); NOT the published ISO 59004:2024, clause numbering may differ (§7.6, printed p.36 = PDF p.43) [VA].' where id='c66ed4f7-d3d6-46ca-af8e-8a933ea7cae1' and verification_status not in ('verified_against_standard','corrected');


-- ---------------------------------------------------------------------------------------------
-- EQUATIONS: none. ISO/FDIS 59004 contains no formula, no inequality and no numeric limit
-- anywhere in its 63 pages (grep over the text layer: 0 occurrences of any of the glyphs
-- √ ≥ ≤ ± × ÷ ∑ ∫ ≠, 0 occurrences of "formula"/"equation" outside the French copyright page and
-- the word "formulations" in Table 1). prod holds 0 equations for ISO-59004, which is correct.
-- Nothing to lift, nothing to backfill.
-- ---------------------------------------------------------------------------------------------
