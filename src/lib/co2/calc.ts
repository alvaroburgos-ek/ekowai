/** Pure CO₂ math. KOSTRA discipline: no imports from src/lib/eval/ and no DB. */
export type Co2Line = { scope: string; amount: number; kgCo2ePerUnit: number };

export function lineCo2eTonnes(amount: number, kgCo2ePerUnit: number): number {
  return (amount * kgCo2ePerUnit) / 1000;
}

export function sumByScope(lines: Array<{ scope: string; tco2e: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) out[l.scope] = (out[l.scope] ?? 0) + l.tco2e;
  return out;
}
