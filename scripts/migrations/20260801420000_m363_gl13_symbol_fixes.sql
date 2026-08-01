-- DWA-M-363 · §5.7 Deponiegas equations · SOURCE-SETTLED Gl.13-class symbol/case fixes
-- ============================================================================
-- DEFECT: four equations use formula tokens that do NOT match their OWN declared
-- input_symbols (engine is case-sensitive → formula.ts returns manual_required
-- "Unbekanntes Symbol"). Determined by each row's own input_symbols — zero interpretation.
--   g_t   : G_e/k/t            → g_e/k_abbau/t_jahr
--   g_td  : G_e/k/t (Gl.4b) ; C_ab/M_n_abfallmasse/k/t (Gl.5) → declared lowercase fields
--   ddoc  : DDOC_ma_T_minus_1/k → ddoc_ma_t_minus_1/k_abbau  (MINUS kept verbatim per print;
--           minus-vs-× is a SEPARATE owner ruling — not changed here)
-- Applied to BOTH duplicate homes (M363-05 + M363-11). Fixes are by equation id.
-- NOTE (flagged, NOT fixed): g_td has TWO producers on the same worksheet (Gl.4b + Gl.5) →
--   multi-producer collision; a selector ruling is needed for g_td to materialize cleanly.
--   The token fix is still correct per-row and pre-authorized.
--   Apply: Mgmt-API POST · Rollback: scripts/rollback-20260801420000-m363-gl13.sql
UPDATE equations SET formula = 'g_t = g_e * (1 - e^(-k_abbau*t_jahr))'
  WHERE id IN ('cfab7241-ba1b-40d9-8947-bf957e4542be','60097156-8b99-4eaa-9a62-f0e08eb13a22');
UPDATE equations SET formula = 'g_td = g_e * k_abbau * e^(-k_abbau*t_jahr)'
  WHERE id IN ('78e61753-6fa8-42bc-97b2-6aa2f4607a83','8502b3d8-9233-443b-86d0-9e8d1555c9e8');
UPDATE equations SET formula = 'g_td = 1.868 * c_ab * f_1_aerob * f_2_ausbeute * f_3 * m_n_abfallmasse * k_abbau * e^(-k_abbau*t_jahr)'
  WHERE id IN ('905fe4b9-4926-4346-b9a0-92d9adde7df2','9c453ddb-2376-42c8-83be-9b2b8f849608');
UPDATE equations SET formula = 'ddoc_m_decomp_t = ddoc_ma_t_minus_1 - (1 - e^(-k_abbau))'
  WHERE id IN ('ea86e593-47c6-48e7-8354-cb85ba511843','21202924-1835-4ed6-833b-10521265ce20');
