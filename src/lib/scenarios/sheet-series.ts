/** Which iteration series a sheet carries in one run, read from the run's visible values (hidden ⇒ null). */
import { BASIN_GL8_EQUATION_ID } from '@/lib/eval/governing-duration';
import { ASM_GL16_EQUATION_ID } from '@/lib/eval/asm-source';
import { A138_GL10_EQUATION_ID, facilityRainRows, normaliseFacility, type MirrorAccessor } from './a138-mirror';
import { gl8Series, gl10Series, gl16Series } from './iteration-series';
import type { IterationSeries } from './types';

const finite = (x: number | null): x is number => x != null && Number.isFinite(x);

export function seriesForSheet(sheetCode: string, equationIds: readonly string[], acc: MirrorAccessor): IterationSeries[] {
  const out: IterationSeries[] = [];
  if (equationIds.includes(BASIN_GL8_EQUATION_ID)) {
    const rain = facilityRainRows(sheetCode, acc);
    const A_C = acc.num('A_C'); const A_VA = acc.num('A_VA'); const Q_S = acc.num('Q_S');
    const f_Z = acc.num('f_Z'); const f_A = acc.num('f_A'); const Q_Dr = acc.num('Q_Dr') ?? 0;
    if (rain && finite(A_C) && finite(A_VA) && finite(Q_S) && finite(f_Z) && finite(f_A)) {
      out.push(gl8Series(rain.rows, { A_C, A_VA, Q_S, Q_Dr, f_Z, f_A }, rain.T));
    }
  }
  if (equationIds.includes(A138_GL10_EQUATION_ID)) {
    let AcS = acc.num('A_C_s_flood');
    if (!finite(AcS)) {
      const sub = acc.json('sub_areas_A138_26') as { rows?: Array<{ area_m2?: unknown; c_S?: unknown }> } | undefined;
      if (sub && Array.isArray(sub.rows) && sub.rows.length > 0 && sub.rows.every((r) => typeof r.area_m2 === 'number' && typeof r.c_S === 'number')) {
        AcS = sub.rows.reduce((t, r) => t + (r.area_m2 as number) * (r.c_S as number), 0);
      }
    }
    const A_VA = acc.num('A_VA'); const Q_S = acc.num('Q_S'); const V_VA = acc.num('V_VA'); const Q_Dr = acc.num('Q_Dr') ?? 0;
    if (finite(AcS) && finite(A_VA) && finite(Q_S) && finite(V_VA)) {
      for (const T of [30, 100] as const) {
        const rain = facilityRainRows(sheetCode, acc, T);
        if (rain) out.push(gl10Series(rain.rows, { AcS_paved: AcS, A_VA, Q_S, Q_Dr, V_VA }, T));
      }
    }
  }
  if (equationIds.includes(ASM_GL16_EQUATION_ID)) {
    const f = normaliseFacility(acc.str('facility_type_selected'));
    if (f === 'mulde' || f === 'mre' || f === 'mrs') {
      const rain = facilityRainRows(sheetCode, acc);
      const A_C = acc.num('A_C'); const h_M = acc.num('h_M'); const f_Z = acc.num('f_Z');
      const k_i = acc.num('k_i_Mulde') ?? acc.num('k_i');
      if (rain && finite(A_C) && finite(h_M) && finite(f_Z) && finite(k_i)) out.push(gl16Series(rain.rows, { A_C, h_M, f_Z, k_i }, rain.T));
    }
  }
  return out;
}
