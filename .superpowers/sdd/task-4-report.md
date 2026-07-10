# Task 4 Report: Registry entry `asm` in `materialize-registry.ts`

## Summary

Task 4 completed successfully. Added the `asm` entry to the materialize registry with producer-side reactive recompute for A_S,m (A138-12 consumer).

## Files Changed

1. **src/lib/actions/materialize-registry.ts**
   - Added import: `ASM_GL7_EQUATION_ID`, `ASM_GL16_EQUATION_ID`, `ASM_GL17_EQUATION_ID` from `@/lib/eval/asm-source`
   - Added constant `ASM_INPUT_SYMBOLS` (12 symbols covering direct, soil_estimate, geometry, facility type, method, provenance)
   - Added registry entry with:
     - `id: 'asm'`
     - `inputSymbols: new Set<string>(ASM_INPUT_SYMBOLS)`
     - `ownerTrigger`: fires when saved template owns Gl.7, Gl.16, or Gl.17
     - `consumerTemplateCode: 'A138-12'`

2. **src/lib/actions/__tests__/materialize-registry.test.ts** (created)
   - New test file with `describe('asm registry entry', …)` block
   - Tests: existence, A138-12 targeting, producer firing on geometry/facility inputs, no double-fire

## TDD Evidence

### RED (Step 2)
```
❯ |unit| src/lib/actions/__tests__/materialize-registry.test.ts (3 tests | 2 failed) 9ms
     × exists and targets A138-12 5ms
     × fires on a geometry input or facility_type_selected change 2ms
```

### GREEN (Step 4)
```
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Implementation Details

### ASM_INPUT_SYMBOLS
Exactly as specified in the brief:
- Direct inputs: `A_S_min`, `A_S_max`
- Soil estimate: `A_C`, `soil_bodenart_tab13` (not `k_f`)
- Geometry: `h_M`, `b_R`, `h_R`, `L_R`
- Cross-worksheet: `facility_type_selected` (A138-15)
- Control: `a_s_m_determination_method`, `a_s_m_provenance` (A138-12)

### ownerTrigger Logic
Fires when the saved template owns any of:
- `ASM_GL7_EQUATION_ID` (A138-12 direct method, Gl.7)
- `ASM_GL16_EQUATION_ID` (A138-17 Mulde geometry)
- `ASM_GL17_EQUATION_ID` (A138-18 Rigole geometry)

### Test Coverage
✓ Registry entry exists
✓ Targets `A138-12`
✓ Produces from changed geometry input (`h_M`)
✓ Produces from changed facility selection
✓ Prevents double-fire when already owner-triggered

## Bindings Verified

- Equation IDs imported from `asm-source.ts`: Confirmed exported (lines 19–21)
- `producerFiredEntries` signature: Unchanged (two params, correct return type)
- No changes to dispatch loop in worksheet.ts: Confirmed (not touched)
- Existing entries (`loading`, `basin`, `surface`): Untouched
- YAGNI: No extraneous changes

## Commit

- Short SHA: `e1d3d71`
- Subject: `feat(a138): register A_S,m materialize (producer-side, A138-12 consumer)`
- Branch: `feat/a138-asm-single-source`
- Author: `alvaro.burgos@ekowai.com`

## Self-Review

- Inline `138-SPECIFIC` comments added per convention (lines 154–156, 174–177)
- Symbol list matches brief verbatim, including `soil_bodenart_tab13` (not `k_f`)
- `ownerTrigger` closure captures three equation IDs as OR chain
- `inputSymbols` is a set (as required by type signature)
- Test file created (did not pre-exist); all three assertions pass
- No type errors; TSC clean

## Concerns

None. Registry entry is isolated, self-contained, and does not require coordination with other code paths beyond the test verification.
