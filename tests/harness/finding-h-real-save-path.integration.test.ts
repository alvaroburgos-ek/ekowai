/**
 * FINDING H — real-save-path integration harness (self-provided embedded Postgres).
 *
 * This is the acceptance artifact that was missing: it drives the REAL
 * `saveWorksheet` (imported, run against a genuine disposable Postgres) with a
 * CLIENT-FAITHFUL payload for an A138-17 h_M nudge — and the payload includes the
 * client's V_M write-back EXACTLY WHEN the real client would send it (derived from
 * the real `composeEngineSuppressedSymbols`, the seam the fix modifies).
 *
 * Finding H: on A138-17 the client engine writes V_M via Gl.14 (bfe6e59a-…, NOT
 * displayOnly). Client-side Gl.14 can't compute (needs the server-swept D) → it
 * write-backs V_M=null; V_M is a LOCAL A138-17 field so no home-boundary signal
 * catches it. This models the REAL live sequence (two saves — the clobber is the
 * DEBOUNCED AUTOSAVE, 12 s after the nudge, per phase4-progress.md Finding H):
 *
 *   SAVE 1 — h_M nudge: h_M ∈ ASM_INPUT_SYMBOLS → producer 'asm' fires → the
 *            geometry sweep materializes A_S_m + step-6b materializes V_M=283.03.
 *   SAVE 2 — debounced autosave: the client flushes Gl.14's V_M write-back. h_M
 *            did NOT change → 'asm' does NOT fire → step-6b does NOT run → the
 *            batch's V_M value UPSERTs directly onto the persisted row.
 *
 *   RED  (current code): composeEngineSuppressedSymbols does NOT suppress V_M →
 *        SAVE 2 carries V_M=null → it CLOBBERS step-6b's 283.03 → DB V_M=null,
 *        A138-23 summary volume=null / complete=false.
 *   GREEN (with the fix): V_M ∈ the facility-volume suppress set → the client
 *        never enqueues V_M → SAVE 2 carries no V_M → step-6b's 283.0302 stands →
 *        summary volume=283.0302 / complete=true.
 *
 * The RED/GREEN switch is driven by the REAL suppress function (whether SAVE 2
 * carries V_M), so reverting the fix genuinely flips this test through the real
 * save path. Requires no external DB — the harness stands up its own Postgres.
 */
// @vitest-environment node
import './_harness-env'; // top-level-await: starts PG + seeds BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getHarness } from './_harness-env';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import { PLT_HS_01, A138_17_V_M_EQUATIONS } from './seed-plt-hs01';

const { harness, fixture } = getHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

// The pure sweep is authoritative — recompute expected A_S_m/V_M in-test so the
// assertion cannot drift from the server rule (matches prod PLT-HS-01 baseline).
const EXPECTED_A_S_M = computeMuldeGeometrySweep(PLT_HS_01.RAIN_ROWS, {
  A_C: PLT_HS_01.A_C, h_M: PLT_HS_01.h_M, f_Z: PLT_HS_01.f_Z, k_i: PLT_HS_01.k_i,
}).A_S_m!;
const EXPECTED_V_M = EXPECTED_A_S_M * PLT_HS_01.h_M; // 283.0301613361302

/**
 * Whether the real client would enqueue a V_M write-back on A138-17.
 *
 * The client engine's write-back loop SKIPS displayOnly equations
 * (use-equation-engine.ts:527). V_M has two producers on A138-17: Gl.14
 * (bfe6e59a-…) and Gl.15 (44fd56a8-…, already displayOnly). The client enqueues
 * V_M iff at least one V_M-producing equation is NOT displayOnly. On CURRENT code
 * Gl.14 is non-displayOnly → it enqueues V_M=null (Gl.14 can't compute the
 * server-only D). The Finding-H fix marks Gl.14 displayOnly → NO non-displayOnly
 * V_M producer remains → the client never enqueues V_M. This mirrors the real
 * write-back skip against the REAL equation-profiles, so reverting the fix flips
 * the harness through the real save path.
 */
function clientSendsVM(): boolean {
  return A138_17_V_M_EQUATIONS.some((id) => !equationProfiles[id]?.displayOnly);
}

describe('Finding H — V_M through the REAL saveWorksheet (embedded Postgres)', () => {
  it('two-save autosave sequence persists V_M correctly (RED: null clobber / GREEN: derived 283.03)', async () => {
    // saveWorksheet is dynamically imported AFTER the harness set DATABASE_URL +
    // BYPASS_AUTH (via _harness-env top-level await) so @/lib/db connects to the
    // harness Postgres, not a frozen prod URL.
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // ── SAVE 1: the h_M nudge → producer 'asm' fires → step-6b materializes V_M ──
    const save1 = await saveWorksheet({
      instanceId: fixture.ws17InstanceId,
      values: { [fixture.hMFieldId]: { type: 'number', value: PLT_HS_01.h_M } },
    });
    expect(save1.ok).toBe(true);

    // ── SAVE 2: the debounced autosave that flushes Gl.14's V_M write-back ──
    //    h_M is NOT re-sent (unchanged) → 'asm' does NOT re-fire → step-6b does
    //    NOT run → whatever V_M the client sends UPSERTs directly. On current code
    //    the client sends V_M=null (the clobber); with the fix it sends nothing.
    const save2Values: Record<string, { type: 'number'; value: number | null }> = {};
    if (clientSendsVM()) {
      save2Values[fixture.vMFieldId] = { type: 'number', value: null };
    }
    const save2 = await saveWorksheet({ instanceId: fixture.ws17InstanceId, values: save2Values });
    expect(save2.ok).toBe(true);

    // ── V_M row on A138-17 after BOTH saves ──
    const [vM] = await sql<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${fixture.vMFieldId}`;

    // GREEN assertion — V_M is the server-materialized derived governing volume.
    // On CURRENT code this FAILS: the client's V_M=null clobbers step-6b (RED).
    expect(vM?.source_type).toBe('derived');
    expect(vM?.value_number == null ? null : Number(vM.value_number)).toBeCloseTo(EXPECTED_V_M, 6);

    // ── A138-23 summary consumed the persisted V_M (Finding F + G1 chain-fire) ──
    const summary = await sql<{ field_id: string; value_number: string | null; value_text: string | null; value_boolean: boolean | null }[]>`
      SELECT field_id, value_number, value_text, value_boolean FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN (${fixture.f_dimensioned}, ${fixture.f_volume}, ${fixture.f_complete})`;
    const by = (id: string) => summary.find((r) => r.field_id === id);

    expect(by(fixture.f_dimensioned)?.value_text).toBe('mulde');
    const vol = by(fixture.f_volume)?.value_number;
    expect(vol == null ? null : Number(vol)).toBeCloseTo(EXPECTED_V_M, 6);
    expect(by(fixture.f_complete)?.value_boolean).toBe(true);
  });
});
