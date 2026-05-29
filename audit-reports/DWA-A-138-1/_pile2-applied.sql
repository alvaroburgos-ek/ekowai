-- ============================================================
-- DWA-A-138-1 Pile-2 applied SQL
-- Campaign tag: claude-code-2026-05-29
-- Applied: 2026-05-29
-- Source of decisions: _pile2-decisions.md
-- Idempotency: every UPDATE guarded by id + current value, so re-runs no-op.
-- ============================================================

-- =====================================================================
-- GROUP 1 — Pile-1 anchor fixes (12 rows). Result: 12 / 12 updated.
-- =====================================================================

-- A138-04 (4 rows: §4.4 → §5.3.3.x)
UPDATE fields SET clause_reference = '§5.3.3.5', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '71051b96-0b88-4c12-9270-40ecc41b415d' AND clause_reference = '§4.4'; -- a138_dauerstufe_D

UPDATE fields SET clause_reference = '§5.3.3.4', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'd2d46324-555f-4090-921b-a7329d81df4c' AND clause_reference = '§4.4'; -- a138_jaehrlichkeit_T

UPDATE fields SET clause_reference = '§5.3.3.5', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'd150f471-d2f3-4023-835b-be182734ed9e' AND clause_reference = '§4.4'; -- a138_KOSTRA_DWD_Atlas

UPDATE fields SET clause_reference = '§5.3.3.5', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '1f803cf6-0b02-4c0e-b12b-fc9d95b8e3e9' AND clause_reference = '§4.4'; -- a138_regenspende_r_DT

-- A138-11 (2 rows: §4.5 → §5.3.3.6) — the other 2 §4.5 rows handled in Group 2
UPDATE fields SET clause_reference = '§5.3.3.6', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'f0f8fd25-9777-4346-9be1-2c6333e2f3cc' AND clause_reference = '§4.5'; -- a138_k_f_design

UPDATE fields SET clause_reference = '§5.3.3.6', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'd656bfee-91d8-425b-9f81-9ef135c7f17a' AND clause_reference = '§4.5'; -- a138_k_f_min

-- A138-13 (2 rows: §4.6 → §5.3.3.7) — the other 2 §4.6 rows handled in Groups 2 & 3
UPDATE fields SET clause_reference = '§5.3.3.7', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '40201521-2697-45a6-837d-d821363a6f59' AND clause_reference = '§4.6'; -- a138_bemessung_bestanden

UPDATE fields SET clause_reference = '§5.3.3.7', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '10751722-dae7-4b21-84ce-65b0d49f0bc2' AND clause_reference = '§4.6'; -- a138_V_Sp_erforderlich

-- A138-15 (2 rows: §4.7 → §6.1 Bild 7) — the other §4.7 row handled in Group 3
UPDATE fields SET clause_reference = '§6.1 Bild 7', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '922e0c09-7372-43da-b258-baa729f95942' AND clause_reference = '§4.7'; -- a138_anlagentyp_gewaehlt

UPDATE fields SET clause_reference = '§6.1 Bild 7', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'bacf6189-3883-4ec7-a860-8b8f294897df' AND clause_reference = '§4.7'; -- a138_auswahlkriterien

-- A138-16 (2 rows: §4.8 → §6.2.2) — the other §4.8 row handled in Group 2
UPDATE fields SET clause_reference = '§6.2.2', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = '8e0f1d8e-974f-4672-8d4f-f195cb95effa' AND clause_reference = '§4.8'; -- a138_A_s_dim

UPDATE fields SET clause_reference = '§6.2.2', audit_status = 'match', verification_status = 'verified_against_standard',
  audit_notes = COALESCE(audit_notes, '') || ' | clause_reference corrected from §4.x per Pile-1 review 2026-05-29',
  audited_at = NOW()
WHERE id = 'feebf431-eea4-4c28-8e5b-d09788d9c8c2' AND clause_reference = '§4.8'; -- a138_A_s_erf


-- =====================================================================
-- GROUP 2 — Deprecate 4 sourceless fields (NOT delete). Result: 4 / 4.
-- Pre-check: grepped repo for symbols + ids → only audit-report markdown refs.
-- DB equations / compliance conditions: 0 references. Grep clean.
-- =====================================================================

ALTER TABLE fields ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

UPDATE fields SET active = false, verification_status = 'needs_engineer_review', audit_status = 'not_found',
  audit_notes = COALESCE(audit_notes, '') || ' | Deprecated 2026-05-29 — no source basis, no code consumer; hidden not deleted, retain for audit trail.',
  audited_at = NOW()
WHERE id IN (
  '7af2b6e8-18ce-443e-942f-6a1de3b8895f',  -- a138_k_f_geo  (geo-mean ≠ source's "minimum" rule per §5.3.3.6 L1354)
  '52b6f9cb-0821-448e-85e5-1aca402f11a7',  -- a138_korrekturfaktor  (source defines only f_Ort + f_Methode, Gl. 6)
  '3a327d2d-8013-464c-be6f-112402e8904b',  -- a138_speichertyp  (duplicate of facility_type_selected)
  '77c7461c-26d9-4db2-acef-df975d34decf'   -- a138_A_u  (symbol not in Tab. 2, ambiguous with A_E,b,a / A_C)
) AND active = true;


-- =====================================================================
-- GROUP 3 — Wizard-derived fields (2 rows): NULL anchor, inferred_from_worksheet.
-- =====================================================================

UPDATE fields SET clause_reference = NULL, verification_status = 'inferred_from_worksheet',
  audit_notes = COALESCE(audit_notes, '') || ' | Wizard-internal, no source anchor — reclassified 2026-05-29.',
  audited_at = NOW()
WHERE id IN (
  '0c5051cd-c992-4287-a8b1-187eb3af9393',  -- a138_V_Sp_vorhanden
  'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9'   -- a138_anlagentyp_kandidaten
) AND verification_status <> 'inferred_from_worksheet';

-- audit_status end state: not_found (was mismatch — Pile-1 had flagged §4.x;
-- with NULL anchor the row is no longer source-mismatched, it's source-absent.)
UPDATE fields SET audit_status = 'not_found', audited_at = NOW()
WHERE id IN (
  '0c5051cd-c992-4287-a8b1-187eb3af9393',
  'd52ed064-0a8f-47da-a2e1-e9fa40eae0a9'
) AND audit_status = 'mismatch';


-- =====================================================================
-- GROUP 4 — d_a / d_i reclassification.  Result: 2 / 2 updated.
-- Engineer confirmed 2026-05-29: §6.4.2 L1831-1832 locally defines d_i/d_a
-- as m for the Rigole context (dimensionally consistent with b_R/h_R · m
-- in Gl. 21), superseding Tab. 2 mm. DB unit m is source-correct.
-- Parallel to §6.7.2 Schacht L2110/2142.
-- =====================================================================

UPDATE fields SET
  audit_status = 'match',
  verification_status = 'verified_against_standard',
  source_anchor = '§6.4.2 (Rigole, Gl. 21 lokale Variablenliste L1831-1832: d_a/d_i in m, lokaler Override über Tab. 2 mm — parallel zu §6.7.2 Schacht L2110/2142)',
  audit_notes = COALESCE(audit_notes, '') || ' | KORREKTUR Pile-2 Group 4 2026-05-29: §6.4.2 L1831-1832 definiert d_i/d_a unter Gl. (21) lokal als m, dimensional konsistent mit b_R/h_R in m. Dies überschreibt Tab. 2 mm im Rigole-Kontext, parallel zur §6.7.2-Schacht-Definition (L2110/2142). DB-Unit m source-konform. Engineer-bestätigt.',
  audited_at = NOW()
WHERE id IN (
  '37eb0b5f-d412-442c-9b8e-d8b7b4a3f91d',  -- d_a
  'fdd0e2fe-c67c-4cce-ba6b-d0a6206fa743'   -- d_i
) AND audit_status = 'mismatch';
