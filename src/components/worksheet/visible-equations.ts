/**
 * U-5 (UX pass 820, 2026-10-08): the "Gleichungen dieses Arbeitsblatts" list drops an equation the engineer cannot
 * feed or see — every one of its (non-empty) `inputSymbols` is hidden by `visible_when`, or its `outputSymbol` is a
 * hidden field. Display only: the engine already treats hidden symbols as null. Pure.
 */
export function visibleEquations<E extends { inputSymbols: string[] | null; outputSymbol: string | null }>(
  equations: readonly E[],
  hiddenSymbols: ReadonlySet<string> | undefined,
  hiddenFieldSymbols: ReadonlySet<string> | undefined = hiddenSymbols,
): E[] {
  const hs = hiddenSymbols ?? new Set<string>();
  const hf = hiddenFieldSymbols ?? new Set<string>();
  if (hs.size === 0 && hf.size === 0) return [...equations];
  return equations.filter((eq) => {
    if (eq.outputSymbol && hf.has(eq.outputSymbol)) return false;
    const inputs = eq.inputSymbols ?? [];
    if (inputs.length > 0 && inputs.every((s) => hs.has(s))) return false;
    return true;
  });
}
