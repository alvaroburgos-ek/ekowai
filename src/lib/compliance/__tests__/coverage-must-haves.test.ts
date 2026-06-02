/**
 * Pile-7 coverage must-have compliance conditions.
 *
 * Each Pile-7 row's `condition` is replayed against the engine's
 * evaluateCondition() to prove pass + fail behavior. The conditions tested
 * here are exact copies of the Pile-7 SQL's `condition` column — keep them
 * verbatim in sync.
 *
 * Source quotes are in `audit-reports/DWA-A-138-1/_pile7-coverage-must-haves.sql`
 * per row.
 */
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('Pile-7 coverage compliance bounds', () => {
  // ============= A. §5.1.1 L713-714 Wasserschutzgebiete Zone I =============
  describe('A · A138-REQ-COV-01 — Wasserschutzgebiete Zone I unzulässig', () => {
    const COND = 'water_protection_zone != zone_I';
    it('PASS — outside Zone I (none / II / III)', () => {
      expect(evaluateCondition(COND, lookup({ water_protection_zone: 'none' }))).toEqual({ kind: 'pass' });
      expect(evaluateCondition(COND, lookup({ water_protection_zone: 'zone_II' }))).toEqual({ kind: 'pass' });
      expect(evaluateCondition(COND, lookup({ water_protection_zone: 'zone_III' }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — in Zone I', () => {
      expect(evaluateCondition(COND, lookup({ water_protection_zone: 'zone_I' }))).toEqual({ kind: 'fail' });
    });
  });

  // ============= B. §5.2.1 L779 Brunnen-Verbot =============
  describe('B · A138-REQ-COV-02 — Brunnen-Verbot', () => {
    const COND = 'direct_gw_injection == false';
    it('PASS — false', () => {
      expect(evaluateCondition(COND, lookup({ direct_gw_injection: false }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — true (direct injection planned)', () => {
      expect(evaluateCondition(COND, lookup({ direct_gw_injection: true }))).toEqual({ kind: 'fail' });
    });
  });

  // ============= C. §5.2.1 L781 Bankett-Versickerung ≥ 1 m =============
  describe('C · A138-REQ-COV-03 — Bankett-Versickerung Mindestabstand 1 m', () => {
    const COND = 'IF bankett_versickerung_active == true THEN bankett_clearance_to_mhgw >= 1.0';
    it('PASS — Bankett triggered AND clearance ≥ 1 m', () => {
      expect(
        evaluateCondition(COND, lookup({ bankett_versickerung_active: true, bankett_clearance_to_mhgw: 1.2 })),
      ).toEqual({ kind: 'pass' });
    });
    it('PASS — Bankett not triggered (guard false) ⇒ vacuously pass', () => {
      expect(
        evaluateCondition(COND, lookup({ bankett_versickerung_active: false, bankett_clearance_to_mhgw: 0.5 })),
      ).toEqual({ kind: 'pass' });
    });
    it('FAIL — Bankett triggered AND clearance < 1 m', () => {
      expect(
        evaluateCondition(COND, lookup({ bankett_versickerung_active: true, bankett_clearance_to_mhgw: 0.8 })),
      ).toEqual({ kind: 'fail' });
    });
  });

  // ============= D. §5.2.3.2 Tab. 6 AC/A_S,m per BK + BBZ thickness =============
  describe('D · A138-REQ-COV-04a..d — Tab. 6 AC/A_S,m by BK and BBZ thickness', () => {
    const COND_BK2_20 = 'IF belastungskategorie == BK_II AND bbz_thickness < 0.30 THEN AC_AS_ratio <= 30';
    const COND_BK2_30 = 'IF belastungskategorie == BK_II AND bbz_thickness >= 0.30 THEN AC_AS_ratio <= 50';
    const COND_BK3_20 = 'IF belastungskategorie == BK_III AND bbz_thickness < 0.30 THEN AC_AS_ratio <= 15';
    const COND_BK3_30 = 'IF belastungskategorie == BK_III AND bbz_thickness >= 0.30 THEN AC_AS_ratio <= 30';

    it('PASS — BK II + 20 cm BBZ + ratio ≤ 30', () => {
      expect(evaluateCondition(COND_BK2_20, lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.20, AC_AS_ratio: 25 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK II + 20 cm BBZ + ratio 35 (>30)', () => {
      expect(evaluateCondition(COND_BK2_20, lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.20, AC_AS_ratio: 35 }))).toEqual({ kind: 'fail' });
    });
    it('VACUOUS PASS — BK II + 30 cm BBZ (different rule applies, this row passes)', () => {
      expect(evaluateCondition(COND_BK2_20, lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.30, AC_AS_ratio: 35 }))).toEqual({ kind: 'pass' });
    });

    it('PASS — BK II + 30 cm BBZ + ratio ≤ 50', () => {
      expect(evaluateCondition(COND_BK2_30, lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.30, AC_AS_ratio: 45 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK II + 30 cm BBZ + ratio 60', () => {
      expect(evaluateCondition(COND_BK2_30, lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.30, AC_AS_ratio: 60 }))).toEqual({ kind: 'fail' });
    });

    it('PASS — BK III + 20 cm BBZ + ratio ≤ 15', () => {
      expect(evaluateCondition(COND_BK3_20, lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.20, AC_AS_ratio: 14 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK III + 20 cm BBZ + ratio 18 (>15)', () => {
      expect(evaluateCondition(COND_BK3_20, lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.20, AC_AS_ratio: 18 }))).toEqual({ kind: 'fail' });
    });

    it('PASS — BK III + 30 cm BBZ + ratio ≤ 30', () => {
      expect(evaluateCondition(COND_BK3_30, lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.30, AC_AS_ratio: 28 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK III + 30 cm BBZ + ratio 40', () => {
      expect(evaluateCondition(COND_BK3_30, lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.30, AC_AS_ratio: 40 }))).toEqual({ kind: 'fail' });
    });

    it('VACUOUS PASS — BK I (no Tab. 6 numeric limit)', () => {
      // All four conditions vacuously pass for BK_I because the guard is false.
      for (const COND of [COND_BK2_20, COND_BK2_30, COND_BK3_20, COND_BK3_30]) {
        expect(evaluateCondition(COND, lookup({ belastungskategorie: 'BK_I', bbz_thickness: 0.20, AC_AS_ratio: 99 }))).toEqual({ kind: 'pass' });
      }
    });
  });

  // ============= E. §5.2.3.2 + Tab. 14 BBZ Mindestmächtigkeit ≥ 20 cm (= 0.20 m) =============
  describe('E · A138-REQ-COV-05 — BBZ Mindestmächtigkeit ≥ 20 cm', () => {
    const COND = 'bbz_thickness >= 0.20';
    it('PASS — exactly 20 cm', () => {
      expect(evaluateCondition(COND, lookup({ bbz_thickness: 0.20 }))).toEqual({ kind: 'pass' });
    });
    it('PASS — 30 cm', () => {
      expect(evaluateCondition(COND, lookup({ bbz_thickness: 0.30 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — 15 cm', () => {
      expect(evaluateCondition(COND, lookup({ bbz_thickness: 0.15 }))).toEqual({ kind: 'fail' });
    });
  });

  // ============= F. §5.2.3.3 Tab. 7 η-Soll (SOFT WARN) =============
  describe('F · A138-REQ-COV-06a..f — Tab. 7 η-Soll per BK (warn)', () => {
    const COND_AFS_I = 'IF belastungskategorie == BK_I THEN eta_AFS63 >= 40';
    const COND_AFS_II = 'IF belastungskategorie == BK_II THEN eta_AFS63 >= 70';
    const COND_AFS_III = 'IF belastungskategorie == BK_III THEN eta_AFS63 >= 80';
    const COND_GEL_I = 'IF belastungskategorie == BK_I THEN eta_geloest >= 50';
    const COND_GEL_II = 'IF belastungskategorie == BK_II THEN eta_geloest >= 65';
    const COND_GEL_III = 'IF belastungskategorie == BK_III THEN eta_geloest >= 75';

    it('PASS — BK I + η_AFS63 50% (≥ 40)', () => {
      expect(evaluateCondition(COND_AFS_I, lookup({ belastungskategorie: 'BK_I', eta_AFS63: 50 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK II + η_AFS63 65% (< 70)', () => {
      expect(evaluateCondition(COND_AFS_II, lookup({ belastungskategorie: 'BK_II', eta_AFS63: 65 }))).toEqual({ kind: 'fail' });
    });
    it('FAIL — BK III + η_AFS63 75% (< 80)', () => {
      expect(evaluateCondition(COND_AFS_III, lookup({ belastungskategorie: 'BK_III', eta_AFS63: 75 }))).toEqual({ kind: 'fail' });
    });
    it('PASS — BK III + η_AFS63 80% (= 80)', () => {
      expect(evaluateCondition(COND_AFS_III, lookup({ belastungskategorie: 'BK_III', eta_AFS63: 80 }))).toEqual({ kind: 'pass' });
    });
    it('PASS — BK I + η_gelöst 50%', () => {
      expect(evaluateCondition(COND_GEL_I, lookup({ belastungskategorie: 'BK_I', eta_geloest: 50 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — BK II + η_gelöst 60% (<65)', () => {
      expect(evaluateCondition(COND_GEL_II, lookup({ belastungskategorie: 'BK_II', eta_geloest: 60 }))).toEqual({ kind: 'fail' });
    });
    it('FAIL — BK III + η_gelöst 70% (<75)', () => {
      expect(evaluateCondition(COND_GEL_III, lookup({ belastungskategorie: 'BK_III', eta_geloest: 70 }))).toEqual({ kind: 'fail' });
    });
  });

  // ============= H. §5.3.3.7 f_Z range 1.1–1.2 + Sonderfall =============
  describe('H · A138-REQ-COV-07a/b — f_Z Wertebereich + Sonderfall', () => {
    const COND_RANGE = 'f_Z >= 1.1 AND f_Z <= 1.2';
    const COND_SONDER = 'IF q_S_AC <= 5 THEN f_Z >= 1.2';

    it('PASS — f_Z = 1.15 (mid range)', () => {
      expect(evaluateCondition(COND_RANGE, lookup({ f_Z: 1.15 }))).toEqual({ kind: 'pass' });
    });
    it('PASS — f_Z = 1.1 (boundary)', () => {
      expect(evaluateCondition(COND_RANGE, lookup({ f_Z: 1.1 }))).toEqual({ kind: 'pass' });
    });
    it('PASS — f_Z = 1.2 (boundary)', () => {
      expect(evaluateCondition(COND_RANGE, lookup({ f_Z: 1.2 }))).toEqual({ kind: 'pass' });
    });
    it('FAIL — f_Z = 1.0 (below range)', () => {
      expect(evaluateCondition(COND_RANGE, lookup({ f_Z: 1.0 }))).toEqual({ kind: 'fail' });
    });
    it('FAIL — f_Z = 1.3 (above range)', () => {
      expect(evaluateCondition(COND_RANGE, lookup({ f_Z: 1.3 }))).toEqual({ kind: 'fail' });
    });

    it('SONDERFALL PASS — q_S_AC = 4, f_Z = 1.2', () => {
      expect(evaluateCondition(COND_SONDER, lookup({ q_S_AC: 4, f_Z: 1.2 }))).toEqual({ kind: 'pass' });
    });
    it('SONDERFALL FAIL — q_S_AC = 4, f_Z = 1.1 (must be 1.2)', () => {
      expect(evaluateCondition(COND_SONDER, lookup({ q_S_AC: 4, f_Z: 1.1 }))).toEqual({ kind: 'fail' });
    });
    it('SONDERFALL VACUOUS PASS — q_S_AC = 10 (Sonderfall not triggered)', () => {
      expect(evaluateCondition(COND_SONDER, lookup({ q_S_AC: 10, f_Z: 1.1 }))).toEqual({ kind: 'pass' });
    });
  });

  // ============= J. §6.3.1 + Tab. 14 h_M ≤ 30 cm =============
  describe('J · A138-REQ-COV-08 — Muldeneinstau h_M ≤ 0.30 m', () => {
    const COND = 'h_M <= 0.30';
    it('PASS — h_M = 0.25', () => expect(evaluateCondition(COND, lookup({ h_M: 0.25 }))).toEqual({ kind: 'pass' }));
    it('PASS — h_M = 0.30 (boundary)', () => expect(evaluateCondition(COND, lookup({ h_M: 0.30 }))).toEqual({ kind: 'pass' }));
    it('FAIL — h_M = 0.40', () => expect(evaluateCondition(COND, lookup({ h_M: 0.40 }))).toEqual({ kind: 'fail' }));
  });

  // ============= K. §6.3.2 + Tab. 14 t_E ≤ 84 h =============
  describe('K · A138-REQ-COV-09 — Entleerungszeit t_E ≤ 84 h', () => {
    const COND = 't_E <= 84';
    it('PASS — t_E = 60', () => expect(evaluateCondition(COND, lookup({ t_E: 60 }))).toEqual({ kind: 'pass' }));
    it('PASS — t_E = 84 (boundary)', () => expect(evaluateCondition(COND, lookup({ t_E: 84 }))).toEqual({ kind: 'pass' }));
    it('FAIL — t_E = 100', () => expect(evaluateCondition(COND, lookup({ t_E: 100 }))).toEqual({ kind: 'fail' }));
  });

  // ============= L. §6.5.1 + Tab. 14 BBZ k_f langjährig ≥ 1·10⁻⁵ =============
  describe('L · A138-REQ-COV-10 — BBZ k_f langjährig ≥ 1·10⁻⁵', () => {
    const COND = 'bbz_kf_long_term >= 1e-5';
    it('PASS — 1e-5 (boundary)', () => expect(evaluateCondition(COND, lookup({ bbz_kf_long_term: 1e-5 }))).toEqual({ kind: 'pass' }));
    it('PASS — 5e-5 (above)', () => expect(evaluateCondition(COND, lookup({ bbz_kf_long_term: 5e-5 }))).toEqual({ kind: 'pass' }));
    it('FAIL — 5e-6 (below)', () => expect(evaluateCondition(COND, lookup({ bbz_kf_long_term: 5e-6 }))).toEqual({ kind: 'fail' }));
  });

  // ============= M. §6.7.2 L2169 erf. k_f,FS ≤ 1·10⁻³ =============
  describe('M · A138-REQ-COV-11 — erf. k_f,FS ≤ 1·10⁻³', () => {
    const COND = 'erf_k_f_FS <= 1e-3';
    it('PASS — 1e-3 (boundary)', () => expect(evaluateCondition(COND, lookup({ erf_k_f_FS: 1e-3 }))).toEqual({ kind: 'pass' }));
    it('PASS — 5e-4 (below)', () => expect(evaluateCondition(COND, lookup({ erf_k_f_FS: 5e-4 }))).toEqual({ kind: 'pass' }));
    it('FAIL — 2e-3 (above ⇒ GW-Schutz verletzt)', () => expect(evaluateCondition(COND, lookup({ erf_k_f_FS: 2e-3 }))).toEqual({ kind: 'fail' }));
  });

  // ============= N. Tab. 14 Freibord =============
  describe('N · A138-REQ-COV-12 — Freibord Becken ≥ 35 cm', () => {
    const COND = 'freibord_B >= 35';
    it('PASS — 40 cm', () => expect(evaluateCondition(COND, lookup({ freibord_B: 40 }))).toEqual({ kind: 'pass' }));
    it('PASS — 35 cm (boundary)', () => expect(evaluateCondition(COND, lookup({ freibord_B: 35 }))).toEqual({ kind: 'pass' }));
    it('FAIL — 20 cm', () => expect(evaluateCondition(COND, lookup({ freibord_B: 20 }))).toEqual({ kind: 'fail' }));
  });

  describe('N · A138-REQ-COV-13 — Freibord MRE ≥ 10 cm', () => {
    const COND = 'freibord_MRE >= 10';
    it('PASS — 15 cm', () => expect(evaluateCondition(COND, lookup({ freibord_MRE: 15 }))).toEqual({ kind: 'pass' }));
    it('PASS — 10 cm (boundary)', () => expect(evaluateCondition(COND, lookup({ freibord_MRE: 10 }))).toEqual({ kind: 'pass' }));
    it('FAIL — 5 cm', () => expect(evaluateCondition(COND, lookup({ freibord_MRE: 5 }))).toEqual({ kind: 'fail' }));
  });
});
