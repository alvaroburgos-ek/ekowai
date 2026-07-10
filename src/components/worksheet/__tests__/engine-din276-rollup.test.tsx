/**
 * Engine-generalization (Layer 0) — REAL DIN-276 deep-chain roll-up.
 *
 * Re-points the legacy-sum-retire regression at the actual DIN-276 equation set
 * (all 53 equations, pulled verbatim from prod) instead of a synthetic 3-level
 * chain. This is the standard where a deep-chain evaluation-ordering bug would
 * surface for a user: the cost roll-up is 4 levels deep —
 *
 *   leaves (kg_121 …)  →  sub-totals (kg_120_total …)
 *                       →  group totals (kg_100_total …)
 *                       →  grand total GK_total = Σ kg_X00_total
 *
 * The engine has NO within-pass ordering; cross-render convergence (write-back
 * → re-render → recompute) is what carries the chain. This test proves that
 * mechanism resolves the real, deepest roll-up. All leaves are set to 1, so
 * every total equals the count of leaves beneath it; the expected grand total
 * (277) and building costs (130) are hand-derived from the real formulas.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';

// --- The real DIN-276 equations (verbatim formula + output_symbol from prod) --
// Sub-totals carry no LHS (`kg_121 + …`); the IDENT rows carry `X = …`. The
// engine's rhs() handles both.
const RAW: Array<{ num: string; out: string; formula: string }> = [
  { num: 'KG1-01', out: 'kg_120_total', formula: 'kg_121 + kg_122 + kg_123 + kg_124 + kg_125 + kg_126 + kg_127 + kg_128 + kg_129' },
  { num: 'KG1-02', out: 'kg_130_total', formula: 'kg_131 + kg_132 + kg_139' },
  { num: 'KG1-03', out: 'kg_100_total', formula: 'kg_110 + kg_120_total + kg_130_total' },
  { num: 'KG2-01', out: 'kg_210_total', formula: 'kg_211 + kg_212 + kg_213 + kg_214 + kg_215 + kg_216 + kg_219' },
  { num: 'KG2-02', out: 'kg_220_total', formula: 'kg_221 + kg_222 + kg_223 + kg_224 + kg_225 + kg_226 + kg_227 + kg_228 + kg_229' },
  { num: 'KG2-03', out: 'kg_240_total', formula: 'kg_241 + kg_242 + kg_249' },
  { num: 'KG2-04', out: 'kg_250_total', formula: 'kg_251 + kg_252 + kg_259' },
  { num: 'KG2-05', out: 'kg_200_total', formula: 'kg_210_total + kg_220_total + kg_230 + kg_240_total + kg_250_total' },
  { num: 'KG3-01', out: 'kg_310_total', formula: 'kg_311 + kg_312 + kg_313 + kg_314 + kg_319' },
  { num: 'KG3-02', out: 'kg_320_total', formula: 'kg_321 + kg_322 + kg_323 + kg_324 + kg_325 + kg_326 + kg_329' },
  { num: 'KG3-03', out: 'kg_330_total', formula: 'kg_331 + kg_332 + kg_333 + kg_334 + kg_335 + kg_336 + kg_337 + kg_338 + kg_339' },
  { num: 'KG3-04', out: 'kg_340_total', formula: 'kg_341 + kg_342 + kg_343 + kg_344 + kg_345 + kg_346 + kg_347 + kg_349' },
  { num: 'KG3-05', out: 'kg_350_total', formula: 'kg_351 + kg_352 + kg_353 + kg_354 + kg_355 + kg_359' },
  { num: 'KG3-06', out: 'kg_360_total', formula: 'kg_361 + kg_362 + kg_363 + kg_364 + kg_365 + kg_366 + kg_369' },
  { num: 'KG3-07', out: 'kg_370_total', formula: 'kg_371 + kg_372 + kg_373 + kg_374 + kg_375 + kg_376 + kg_377 + kg_378 + kg_379' },
  { num: 'KG3-08', out: 'kg_380_total', formula: 'kg_381 + kg_382 + kg_383 + kg_384 + kg_385 + kg_386 + kg_387 + kg_389' },
  { num: 'KG3-09', out: 'kg_390_total', formula: 'kg_391 + kg_392 + kg_393 + kg_394 + kg_395 + kg_396 + kg_397 + kg_398 + kg_399' },
  { num: 'KG3-10', out: 'kg_300_total', formula: 'kg_310_total + kg_320_total + kg_330_total + kg_340_total + kg_350_total + kg_360_total + kg_370_total + kg_380_total + kg_390_total' },
  { num: 'KG4-01', out: 'kg_410_total', formula: 'kg_411 + kg_412 + kg_413 + kg_419' },
  { num: 'KG4-02', out: 'kg_420_total', formula: 'kg_421 + kg_422 + kg_423 + kg_424 + kg_429' },
  { num: 'KG4-03', out: 'kg_430_total', formula: 'kg_431 + kg_432 + kg_433 + kg_434 + kg_439' },
  { num: 'KG4-04', out: 'kg_440_total', formula: 'kg_441 + kg_442 + kg_443 + kg_444 + kg_445 + kg_446 + kg_447 + kg_449' },
  { num: 'KG4-05', out: 'kg_450_total', formula: 'kg_451 + kg_452 + kg_453 + kg_454 + kg_455 + kg_456 + kg_457 + kg_458 + kg_459' },
  { num: 'KG4-06', out: 'kg_460_total', formula: 'kg_461 + kg_462 + kg_463 + kg_464 + kg_465 + kg_466 + kg_469' },
  { num: 'KG4-07', out: 'kg_470_total', formula: 'kg_471 + kg_472 + kg_473 + kg_474 + kg_475 + kg_476 + kg_477 + kg_478 + kg_479' },
  { num: 'KG4-08', out: 'kg_480_total', formula: 'kg_481 + kg_482 + kg_483 + kg_484 + kg_485 + kg_489' },
  { num: 'KG4-09', out: 'kg_490_total', formula: 'kg_491 + kg_492 + kg_493 + kg_494 + kg_495 + kg_496 + kg_497 + kg_498 + kg_499' },
  { num: 'KG4-10', out: 'kg_400_total', formula: 'kg_410_total + kg_420_total + kg_430_total + kg_440_total + kg_450_total + kg_460_total + kg_470_total + kg_480_total + kg_490_total' },
  { num: 'KG5-01', out: 'kg_510_total', formula: 'kg_511 + kg_512 + kg_513 + kg_514 + kg_519' },
  { num: 'KG5-02', out: 'kg_520_total', formula: 'kg_521 + kg_522 + kg_523 + kg_524 + kg_525 + kg_529' },
  { num: 'KG5-03', out: 'kg_530_total', formula: 'kg_531 + kg_532 + kg_533 + kg_534 + kg_535 + kg_536 + kg_537 + kg_538 + kg_539' },
  { num: 'KG5-04', out: 'kg_540_total', formula: 'kg_541 + kg_542 + kg_543 + kg_544 + kg_545 + kg_546 + kg_547 + kg_548 + kg_549' },
  { num: 'KG5-05', out: 'kg_550_total', formula: 'kg_551 + kg_552 + kg_553 + kg_554 + kg_555 + kg_556 + kg_557 + kg_558 + kg_559' },
  { num: 'KG5-06', out: 'kg_560_total', formula: 'kg_561 + kg_562 + kg_563 + kg_569' },
  { num: 'KG5-07', out: 'kg_570_total', formula: 'kg_571 + kg_572 + kg_573 + kg_574 + kg_579' },
  { num: 'KG5-08', out: 'kg_580_total', formula: 'kg_581 + kg_582 + kg_583 + kg_589' },
  { num: 'KG5-09', out: 'kg_590_total', formula: 'kg_591 + kg_592 + kg_593 + kg_594 + kg_595 + kg_596 + kg_597 + kg_598 + kg_599' },
  { num: 'KG5-10', out: 'kg_500_total', formula: 'kg_510_total + kg_520_total + kg_530_total + kg_540_total + kg_550_total + kg_560_total + kg_570_total + kg_580_total + kg_590_total' },
  { num: 'KG6-01', out: 'kg_640_total', formula: 'kg_641 + kg_642 + kg_643 + kg_649' },
  { num: 'KG6-02', out: 'kg_600_total', formula: 'kg_610 + kg_620 + kg_630 + kg_640_total + kg_690' },
  { num: 'KG7-01', out: 'kg_710_total', formula: 'kg_711 + kg_712 + kg_713 + kg_714 + kg_715 + kg_719' },
  { num: 'KG7-02', out: 'kg_720_total', formula: 'kg_721 + kg_722 + kg_723 + kg_724 + kg_725 + kg_729' },
  { num: 'KG7-03', out: 'kg_730_total', formula: 'kg_731 + kg_732 + kg_733 + kg_734 + kg_739' },
  { num: 'KG7-04', out: 'kg_740_total', formula: 'kg_741 + kg_742 + kg_743 + kg_744 + kg_745 + kg_746 + kg_747 + kg_748 + kg_749' },
  { num: 'KG7-05', out: 'kg_750_total', formula: 'kg_751 + kg_752 + kg_759' },
  { num: 'KG7-06', out: 'kg_760_total', formula: 'kg_761 + kg_762 + kg_763 + kg_764 + kg_765 + kg_766 + kg_769' },
  { num: 'KG7-07', out: 'kg_790_total', formula: 'kg_791 + kg_799' },
  { num: 'KG7-08', out: 'kg_700_total', formula: 'kg_710_total + kg_720_total + kg_730_total + kg_740_total + kg_750_total + kg_760_total + kg_790_total' },
  { num: 'KG8-01', out: 'kg_800_total', formula: 'kg_810 + kg_820 + kg_830 + kg_840 + kg_890' },
  { num: 'IDENT-01', out: 'GK_total', formula: 'GK_total = kg_100_total + kg_200_total + kg_300_total + kg_400_total + kg_500_total + kg_600_total + kg_700_total + kg_800_total' },
  { num: 'IDENT-03', out: 'cost_parameter', formula: 'cost_parameter = cost / reference_unit' },
  { num: 'IDENT-02', out: 'building_costs', formula: 'building_costs = kg_300_total + kg_400_total' },
  { num: 'IDENT-04', out: 'deviation_amount', formula: 'deviation_amount = current_stage_total - previous_stage_total' },
];

const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*/g;
const EQUATIONS = RAW.map((r, i) => {
  const rhs = r.formula.includes('=') ? r.formula.split('=').slice(1).join('=') : r.formula;
  const ids = Array.from(new Set(rhs.match(IDENT_RE) ?? []));
  return {
    id: `din276-${i}`,
    equationNumber: r.num,
    formula: r.formula,
    inputSymbols: ids.filter((s) => s !== r.out),
    outputSymbol: r.out,
  };
});

// Every symbol that appears anywhere → a field. Leaves = never an output.
const OUTPUTS = new Set(EQUATIONS.map((e) => e.outputSymbol));
const ALL_SYMBOLS = new Set<string>();
for (const e of EQUATIONS) {
  ALL_SYMBOLS.add(e.outputSymbol);
  for (const s of e.inputSymbols) ALL_SYMBOLS.add(s);
}
const LEAVES = [...ALL_SYMBOLS].filter((s) => !OUTPUTS.has(s));
const FIELDS = [...ALL_SYMBOLS].map((symbol) => ({ id: `f-${symbol}`, symbol, unit: 'EUR' as const }));

function Harness() {
  const memoFields = useMemo(() => FIELDS, []);
  const memoEqs = useMemo(() => EQUATIONS, []);
  useEquationEngine({ worksheetCode: 'DIN-276', fields: memoFields, equations: memoEqs });
  return null;
}

function num(symbol: string): number | null {
  const v = useWorksheetStore.getState().values[`f-${symbol}`];
  return v?.type === 'number' ? v.value : null;
}

describe('engine generalization — real DIN-276 deep-chain roll-up', () => {
  beforeEach(() => {
    act(() => useWorksheetStore.getState().init('fixture-din276', {}, {}, {}));
  });

  it('resolves the real 4-level cost roll-up via cross-render convergence (all leaves = 1)', () => {
    render(<Harness />);
    act(() => {
      for (const leaf of LEAVES) {
        useWorksheetStore.getState().setField(`f-${leaf}`, { type: 'number', value: 1 });
      }
    });

    // Level-2 group totals (each = count of leaves beneath it)
    expect(num('kg_100_total')).toBeCloseTo(13, 9); // 1 + 9 + 3
    expect(num('kg_300_total')).toBeCloseTo(68, 9);
    expect(num('kg_400_total')).toBeCloseTo(62, 9);
    expect(num('kg_800_total')).toBeCloseTo(5, 9);
    // Level-3 grand total + derived building costs
    expect(num('GK_total')).toBeCloseTo(277, 9); // 13+23+68+62+60+8+38+5
    expect(num('building_costs')).toBeCloseTo(130, 9); // kg_300_total + kg_400_total
    // Non-sum IDENT rows compute too (division + subtraction)
    expect(num('cost_parameter')).toBeCloseTo(1, 9); // 1 / 1
    expect(num('deviation_amount')).toBeCloseTo(0, 9); // 1 - 1
  });
});
