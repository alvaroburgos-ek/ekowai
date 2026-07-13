/**
 * FLL-GAR-22 bring-up precondition: Gl.2b (`g_prime >= …`) is an INEQUALITY
 * (required-minimum check), not a 2nd producer of g_prime. Encoded with
 * output_symbol=g_prime it would make the multi-producer collision guard BLANK
 * g_prime (Gl.2a's value lost). Marking Gl.2b `displayOnly` (equation-profiles)
 * removes it from producer dispatch so Gl.2a's g_prime stands unchallenged.
 *
 * This guards that config so the FLL acceptance run inherits it as a PROVEN
 * precondition, not an assumption. (Pattern: "inequality encoded as producer" —
 * defect register / pattern library.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useMemo } from 'react';
import { useEquationEngine } from '@/lib/eval/use-equation-engine';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { equationProfiles } from '@/lib/eval/equation-profiles';

const FLL_2A = '430d62b2-a4b5-4bfb-afd2-bc7f8bd03d6f'; // g_prime = gamma_D_prime · d_D (primary)
const FLL_2B = 'c7dc584b-0f65-476d-935a-d5306d885a65'; // g_prime >= (…)/cos(beta) (inequality)

const FLD = { gamma: 'fll-gamma_D_prime', dD: 'fll-d_D', g: 'fll-g_prime' };
const FIELDS = [
  { id: FLD.gamma, symbol: 'gamma_D_prime', unit: null },
  { id: FLD.dD, symbol: 'd_D', unit: null },
  { id: FLD.g, symbol: 'g_prime', unit: null },
];
const EQUATIONS = [
  { id: FLL_2A, equationNumber: '2a', formula: 'g_prime = gamma_D_prime * d_D', inputSymbols: ['gamma_D_prime', 'd_D'], outputSymbol: 'g_prime' },
  { id: FLL_2B, equationNumber: '2b', formula: 'g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)) / cos(beta)', inputSymbols: ['Delta_u', 'gamma_A', 'gamma_F_prime', 'd_F', 'gamma_Di_prime', 'd_Di', 'beta'], outputSymbol: 'g_prime' },
];

function Harness() {
  const f = useMemo(() => FIELDS, []);
  const e = useMemo(() => EQUATIONS, []);
  useEquationEngine({ worksheetCode: 'FLL-GAR-22', fields: f, equations: e });
  return null;
}
function setNumber(id: string, v: number) { act(() => { useWorksheetStore.getState().setField(id, { type: 'number', value: v }); }); }
function getStored(id: string): number | null { const v = useWorksheetStore.getState().values[id]; return v?.type === 'number' ? v.value : null; }

describe('FLL-GAR-22:2b displayOnly — Gl.2a g_prime unchallenged', () => {
  beforeEach(() => { act(() => { useWorksheetStore.getState().init('fll-22-instance', {}, {}, {}); }); });

  it('Gl.2b is flagged displayOnly (config precondition)', () => {
    expect(equationProfiles[FLL_2B]?.displayOnly).toBe(true);
  });

  it('g_prime computes from Gl.2a (NOT blanked by a false multi-producer collision with the inequality Gl.2b)', () => {
    render(<Harness />);
    setNumber(FLD.gamma, 2);
    setNumber(FLD.dD, 3);
    expect(getStored(FLD.g)).toBe(6); // Gl.2a: 2·3 — would be null if the collision guard blanked g_prime
  });
});
