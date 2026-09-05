-- ============================================================================
-- FLL-Naturteich — STAGED, WRITTEN-NOT-APPLIED (owner rulings; each changes structure, enforcement
-- or required-ness, so it sits outside the pre-authorised evidence-capture class). 2026-09-05.
-- Apply only after Alvaro marks each block RATIFIED. Rollback = inverse statements noted per block.
-- ============================================================================

-- R-4 (AL-1) · phantom enum-value fields materialised as standalone fields by the encoder.
-- Never referenced by any equation or gate; spurious inputs on FLLNT-03 / FLLNT-09.
-- ☐ RATIFIED  → soft-delete (active=false) rather than hard delete, so a rollback is a one-liner.
-- update public.fields set active=false, audit_notes=coalesce(audit_notes,'')||' | deactivated 2026-09-05: phantom enum-value token (AL-1)'
--  where id in ('8c627e22-4795-4b4b-89ef-95d0bacaa769',  -- FLLNT-03 type_III
--               '8248f4d6-bda8-4f91-98c4-e863ab771faa',  -- FLLNT-09 submergent
--               '78830e94-abf2-4324-890e-fcf3e093d3ee',  -- FLLNT-09 emersed
--               'e93e2266-ffb5-4c03-835a-9f50bac5131d',  -- FLLNT-09 vertical_continuous_overflow
--               'b6f5cce2-97d5-4c04-a051-d511421ddb3d'); -- FLLNT-09 vertical_no_overflow
-- rollback: set active=true on the same ids.

-- Clause-reference retags (zero-risk class, same as the 2026-08-05 batch) — evidence in the pack notes.
-- ☐ RATIFIED
-- update public.fields set clause_reference='§8.1.4' where id in ('80babe71-060c-4c41-8e54-54491fad6cfe','ececcdbb-8ab0-49d2-bdc6-205f7d728ce0') and clause_reference='§8.4';   -- planner_name, contractor_name
-- update public.fields set clause_reference='§10.3.1, §10.3.2' where id='86a5eb0a-8994-4531-8454-2147d8b5a9df' and clause_reference='§10.3.2';                                     -- overflow_type
-- update public.fields set clause_reference='§10.4.1, §6.2.2' where id='130d57e0-f0ae-437a-9f01-be4334aadffc' and clause_reference='§10.4';                                        -- plant_species_list
-- update public.fields set unit='mg P/kg' where id='f20f8b04-9567-4137-a918-be8b4e5631d2' and unit='mg/kg';                                                                         -- filter_substrate_elutable_p (FLLNT-05/F1)

-- Required-flag review (source modal is "should"/"recommend"/"for example", or app-only) — enforcement change.
-- ☐ RATIFIED
-- update public.fields set is_required=false where id in (
--   'b30144d0-40be-4a55-afd2-52b527bf8c51',  -- pre_maturity_care_provided  (§10.4.5 "We recommend")
--   '1d73d7a8-6ecc-4f10-9d5f-447bb5207bd3',  -- maintenance_contract_in_place (§12.1 "should contract")
--   '4fd22e99-5e00-493d-888f-baf4f8e0d275',  -- inspection_frequency (§12.2 "should")
--   '2e34761a-5bc2-4505-b443-68ab3540097c',  -- equipment_elements_list (§8.3 "For example")
--   '318e54a1-76ed-44f7-ab96-faab74bb3819',  -- project_id (app)
--   'e963c39d-e216-4223-9b80-fdd98e8fe199'); -- planning_date (app)
-- rollback: set is_required=true on the same ids.

-- Gate re-homes (AL-3) — REQ-09/10 → FLLNT-04, REQ-11 → FLLNT-05 already sit there; the remaining
-- cross-sheet gates REQ-20/REQ-21 (Tab.11/12 fields live on FLLNT-10) and REQ-33 (fields on FLLNT-11)
-- are hosted on FLLNT-09. ☐ RATIFIED
-- update public.compliance_requirements set worksheet_template_id='4cbb5d72-3f5e-4998-95af-89c88d31b69d' where id in ('0414e322-5142-4e84-b268-662362f63236','8ccccbf8-3590-4058-baa5-ec19392da9b1'); -- REQ-20, REQ-21 → FLLNT-10
-- update public.compliance_requirements set worksheet_template_id='25606456-2018-47f7-b0e4-b7f9b5bd87c2' where id='585759fc-a645-4d0e-b484-bd75558b23f6';                                          -- REQ-33 → FLLNT-11
-- rollback: set worksheet_template_id='488a3367-537b-4628-b186-c323eb976dc9' (FLLNT-09) on the same ids.

-- REQ-27 severity (AL-4 / FLLNT-14 F1): §12.1 says the owner "should contract" a company only if unwilling or
-- unable to maintain the pool — an unconditional block on maintenance_contract_in_place over-enforces.
-- ☐ RATIFIED block→warn
-- update public.compliance_requirements set severity='warn' where id='03890b11-a518-4ed1-8b2d-b8cad0bdbe26' and severity='block';
