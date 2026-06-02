/**
 * Pile-10 — end-to-end coverage for the gating compliance conditions
 * after enum_values are populated.
 *
 * SCOPE: each test replays the production-merged or Pile-7-pending
 * `condition` string against the evaluator with every selectable enum
 * value, proving:
 *   (a) every enum value produces a definite pass/fail (no `pending`
 *       for the symbol — meaning the enum value is recognised);
 *   (b) the value the engineer would pick from the populated enum
 *       (Pile-10 SQL §1) matches the value the condition tests against
 *       — so the gate actually fires.
 *
 * If any enum value were ever changed without updating the matching
 * condition (or vice versa), these tests fail with "dead-check"
 * symptoms.
 */
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluate';

function lookup(map: Record<string, unknown>) {
  return (sym: string) => map[sym] as number | string | boolean | null | undefined;
}

describe('Pile-10 — gating fields ↔ compliance conditions match', () => {
  describe('water_protection_zone (A138-01) ↔ COV-01 zone_I prohibition', () => {
    const COND = 'water_protection_zone != zone_I';
    const ENUM_VALUES = ['none', 'zone_I', 'zone_II', 'zone_III'] as const;

    it('PASS — all non-zone_I values', () => {
      for (const v of ENUM_VALUES.filter((x) => x !== 'zone_I')) {
        expect(
          evaluateCondition(COND, lookup({ water_protection_zone: v })).kind,
        ).toBe('pass');
      }
    });

    it('FAIL — zone_I (the prohibition fires exactly when expected)', () => {
      expect(
        evaluateCondition(COND, lookup({ water_protection_zone: 'zone_I' })).kind,
      ).toBe('fail');
    });

    it('GATE LIVENESS — every selectable enum value yields a definite result (never pending)', () => {
      for (const v of ENUM_VALUES) {
        const r = evaluateCondition(COND, lookup({ water_protection_zone: v }));
        expect(r.kind).not.toBe('pending');
      }
    });
  });

  describe('belastungskategorie (A138-06) ↔ COV-04 Tab. 6 AC/A_S,m', () => {
    const COND_BK2_20 =
      'IF belastungskategorie == BK_II AND bbz_thickness < 0.30 THEN AC_AS_ratio <= 30';
    const COND_BK3_30 =
      'IF belastungskategorie == BK_III AND bbz_thickness >= 0.30 THEN AC_AS_ratio <= 30';
    const ENUM_VALUES = ['BK_I', 'BK_II', 'BK_III'] as const;

    it('GATE LIVENESS — every BK enum value is recognised by COV-04 conditions', () => {
      for (const bk of ENUM_VALUES) {
        const r = evaluateCondition(
          COND_BK2_20,
          lookup({ belastungskategorie: bk, bbz_thickness: 0.20, AC_AS_ratio: 25 }),
        );
        expect(r.kind).not.toBe('pending');
      }
    });

    it('PASS — BK_II + 20cm + ratio 25 (≤30)', () => {
      expect(
        evaluateCondition(
          COND_BK2_20,
          lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.20, AC_AS_ratio: 25 }),
        ).kind,
      ).toBe('pass');
    });

    it('FAIL — BK_II + 20cm + ratio 35 (>30) — the gate fires', () => {
      expect(
        evaluateCondition(
          COND_BK2_20,
          lookup({ belastungskategorie: 'BK_II', bbz_thickness: 0.20, AC_AS_ratio: 35 }),
        ).kind,
      ).toBe('fail');
    });

    it('VACUOUS PASS — BK_I (no Tab.6 ratio limit applies)', () => {
      expect(
        evaluateCondition(
          COND_BK2_20,
          lookup({ belastungskategorie: 'BK_I', bbz_thickness: 0.20, AC_AS_ratio: 99 }),
        ).kind,
      ).toBe('pass');
    });

    it('PASS — BK_III + 30cm + ratio 25 (≤30)', () => {
      expect(
        evaluateCondition(
          COND_BK3_30,
          lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.30, AC_AS_ratio: 25 }),
        ).kind,
      ).toBe('pass');
    });

    it('FAIL — BK_III + 30cm + ratio 40 (>30) — the gate fires', () => {
      expect(
        evaluateCondition(
          COND_BK3_30,
          lookup({ belastungskategorie: 'BK_III', bbz_thickness: 0.30, AC_AS_ratio: 40 }),
        ).kind,
      ).toBe('fail');
    });
  });

  describe('feasibility_determination (A138-02) ↔ REQ-02 (post-fix)', () => {
    // Pile-10 SQL §2 rewrites the condition in TWO ways:
    //   1) `IN (...)` paren-style SQL → `IN {...}` brace-style DSL
    //      (the evaluator's actual grammar).
    //   2) Lowercase the values to match the source enum.
    // Both bugs compounded — the production condition is doubly dead
    // today. Captured below as a regression.
    const COND_FIXED = 'feasibility_determination IN {feasible, conditional}';
    const COND_BROKEN_PRE_PILE_10 = "feasibility_determination IN ('Feasible','Conditional')";
    const ENUM_VALUES = ['feasible', 'conditional', 'not_feasible'] as const;

    it('PASS — feasible / conditional after fix', () => {
      expect(
        evaluateCondition(COND_FIXED, lookup({ feasibility_determination: 'feasible' })).kind,
      ).toBe('pass');
      expect(
        evaluateCondition(COND_FIXED, lookup({ feasibility_determination: 'conditional' })).kind,
      ).toBe('pass');
    });

    it('FAIL — not_feasible after fix', () => {
      expect(
        evaluateCondition(COND_FIXED, lookup({ feasibility_determination: 'not_feasible' })).kind,
      ).toBe('fail');
    });

    it('GATE LIVENESS — every enum value yields a definite result post-fix', () => {
      for (const v of ENUM_VALUES) {
        expect(
          evaluateCondition(COND_FIXED, lookup({ feasibility_determination: v })).kind,
        ).not.toBe('pending');
      }
    });

    it('DEAD-CHECK REGRESSION — the pre-Pile-10 condition returns manual (unparseable)', () => {
      // The paren form `IN ('a','b')` is not the evaluator DSL. Parser
      // rejects it; result is `manual` (neither pass nor fail). That's
      // strictly worse than "fail" because the gate is silent — it does
      // not block, does not flag, does not show as failing in any UI
      // count. Captured so a future regression that re-introduces paren
      // syntax fails this test.
      for (const v of ENUM_VALUES) {
        expect(
          evaluateCondition(COND_BROKEN_PRE_PILE_10, lookup({ feasibility_determination: v })).kind,
        ).toBe('manual');
      }
    });
  });

  describe('phase_2_gate_result (A138-09) ↔ REQ-09 (post-fix)', () => {
    const COND = 'phase_2_gate_result IN {PASS, CONDITIONAL}';
    const ENUM_VALUES = ['PASS', 'CONDITIONAL', 'FAIL'] as const;

    it('PASS — PASS or CONDITIONAL', () => {
      expect(evaluateCondition(COND, lookup({ phase_2_gate_result: 'PASS' })).kind).toBe('pass');
      expect(
        evaluateCondition(COND, lookup({ phase_2_gate_result: 'CONDITIONAL' })).kind,
      ).toBe('pass');
    });

    it('FAIL — FAIL blocks the gate', () => {
      expect(evaluateCondition(COND, lookup({ phase_2_gate_result: 'FAIL' })).kind).toBe('fail');
    });

    it('GATE LIVENESS — every selectable value yields definite', () => {
      for (const v of ENUM_VALUES) {
        expect(evaluateCondition(COND, lookup({ phase_2_gate_result: v })).kind).not.toBe(
          'pending',
        );
      }
    });
  });

  describe('design_adequacy_result (A138-25) ↔ REQ-21', () => {
    const COND = "design_adequacy_result == 'PASS'";

    it('PASS — PASS', () => {
      expect(evaluateCondition(COND, lookup({ design_adequacy_result: 'PASS' })).kind).toBe(
        'pass',
      );
    });

    it('FAIL — FAIL / NA both block', () => {
      expect(evaluateCondition(COND, lookup({ design_adequacy_result: 'FAIL' })).kind).toBe(
        'fail',
      );
      expect(evaluateCondition(COND, lookup({ design_adequacy_result: 'NA' })).kind).toBe('fail');
    });
  });

  describe('flood_check_result (A138-26) ↔ REQ-23 (post-fix)', () => {
    const COND_FIXED = 'flood_check_result IN {PASS, NA}';
    const COND_BROKEN_PRE_PILE_10 = "flood_check_result IN ('PASS','N/A')";

    it('PASS — PASS or NA (after paren→brace AND slash-drop fix)', () => {
      expect(evaluateCondition(COND_FIXED, lookup({ flood_check_result: 'PASS' })).kind).toBe(
        'pass',
      );
      expect(evaluateCondition(COND_FIXED, lookup({ flood_check_result: 'NA' })).kind).toBe(
        'pass',
      );
    });

    it('FAIL — FAIL blocks', () => {
      expect(evaluateCondition(COND_FIXED, lookup({ flood_check_result: 'FAIL' })).kind).toBe(
        'fail',
      );
    });

    it('DEAD-CHECK REGRESSION — pre-Pile-10 paren-style condition returns manual', () => {
      // Pre-Pile-10 the condition is doubly broken: paren syntax (parser
      // bails out → manual) AND 'N/A' value (which the enum can't produce
      // anyway). Either bug alone would kill the gate.
      expect(
        evaluateCondition(COND_BROKEN_PRE_PILE_10, lookup({ flood_check_result: 'NA' })).kind,
      ).toBe('manual');
      expect(
        evaluateCondition(COND_BROKEN_PRE_PILE_10, lookup({ flood_check_result: 'PASS' })).kind,
      ).toBe('manual');
    });
  });

  describe('phase_3_gate_result (A138-14) ↔ REQ-16 + phase_4_gate_result (A138-23) ↔ REQ-19 (post-fix)', () => {
    const COND_3 = 'phase_3_gate_result IN {PASS, CONDITIONAL}';
    const COND_4 = 'phase_4_gate_result IN {PASS, CONDITIONAL}';

    it('PHASE-3 PASS / FAIL', () => {
      expect(evaluateCondition(COND_3, lookup({ phase_3_gate_result: 'PASS' })).kind).toBe(
        'pass',
      );
      expect(evaluateCondition(COND_3, lookup({ phase_3_gate_result: 'FAIL' })).kind).toBe(
        'fail',
      );
    });

    it('PHASE-4 PASS / FAIL', () => {
      expect(evaluateCondition(COND_4, lookup({ phase_4_gate_result: 'PASS' })).kind).toBe(
        'pass',
      );
      expect(evaluateCondition(COND_4, lookup({ phase_4_gate_result: 'FAIL' })).kind).toBe(
        'fail',
      );
    });
  });

  describe('facility_type_selected (A138-15) ↔ REQ-17', () => {
    const COND = 'facility_type_selected IS NOT NULL';
    const ENUM_VALUES = ['flaeche', 'mulde', 'rigole', 'MRE', 'MRS', 'schacht', 'becken'] as const;

    it('PASS — every facility_type enum value satisfies IS NOT NULL', () => {
      for (const v of ENUM_VALUES) {
        expect(
          evaluateCondition(COND, lookup({ facility_type_selected: v })).kind,
        ).toBe('pass');
      }
    });
  });

  describe('final_compliance_verdict (A138-28) ↔ REQ-30', () => {
    const COND = 'final_compliance_verdict IS NOT NULL';

    it('PASS — every compliance_verdict enum value satisfies IS NOT NULL', () => {
      for (const v of ['compliant', 'compliant_with_conditions', 'not_compliant']) {
        expect(
          evaluateCondition(COND, lookup({ final_compliance_verdict: v })).kind,
        ).toBe('pass');
      }
    });
  });
});
