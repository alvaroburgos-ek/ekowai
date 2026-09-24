// Task 30 throwaway probe (READ-ONLY): do the proposed G-block gate conditions parse?
import { parseCondition } from '../../src/lib/expr/parser';
const CONDS = [
  'IF ueberlauf_versickerung == true THEN versickerung_bemessung_a138 == true',
  'IF sewer_system_type == separate_sewer THEN m_multiplier >= 1',
  'IF (system_size_category == small_wwts AND filter_type == vf_sand_0_2) THEN A_Fo_spez_VFS_KA >= 4',
  'IF (system_size_category == small_wwts AND filter_type == vf_sand_0_2) THEN A_Fo_min_VFS_KA >= 16',
  'IF (system_size_category == small_wwts AND filter_type == vf_coarse_sand_0_4) THEN A_Fo_spez_VFG_KA >= 1',
  'IF (system_size_category == small_wwts AND filter_type == vf_coarse_sand_0_4) THEN A_Fo_min_VFG_KA >= 4',
  'IF (system_size_category == small_wwts AND filter_type == aerated_hf_gravel_8_16) THEN A_F_spez_HFK_KA >= 1',
  'IF (system_size_category == municipal_wwtp AND filter_type == two_stage_vf_gravel_sand) THEN A_Fo1_spez_KomKA >= 1',
  'IF (system_size_category == municipal_wwtp AND filter_type == two_stage_vf_gravel_sand) THEN A_Fo2_spez_KomKA >= 1',
  'IF (system_size_category == municipal_wwtp AND filter_type == aerated_vf_gravel_8_16) THEN A_Fu_spez_VFK_KomKA >= 1',
  'IF (system_size_category == municipal_wwtp AND filter_type == aerated_vf_gravel_8_16) THEN f_V_CSB_VFK_KomKA <= 100',
  'IF wastewater_type == greywater_only THEN Q_GW_taeglich >= 75',
];
let bad = 0;
for (const c of CONDS) {
  let verdict: string;
  try { verdict = parseCondition(c) ? 'PARSE-OK' : 'PARSE-NULL'; } catch (e) { verdict = 'THROW: ' + (e as Error).message; }
  if (verdict !== 'PARSE-OK') bad++;
  console.log(`${verdict}\t${c}`);
}
console.log(`\n#TOTAL ${CONDS.length}  #NOT_OK ${bad}`);
