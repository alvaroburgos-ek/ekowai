/**
 * DWA-A 138-1 — the save-path materialisations the case runner reproduces in memory (spec gap G-2).
 * Mirrors worksheet.ts (asm producer branch ≈ L1741–L1990 and the swale block ≈ L2945–L2995 at plan time) by calling the
 * SAME pure functions with the same inputs. A1 scope: the Mulde path. Everything else returns [] ⇒ the runner carries
 * the stored value and flags it `notRecomputed`.
 */
import {
  materializeAsm, computeMuldeGeometrySweep, computeMuldeRequiredVolumeSweep, swaleDesignInfiltrationRate, facilityGoverningVolume,
} from '@/lib/eval/materialize-asm';
import type { AsmMethod, FacilityType, Tab13Bodenart } from '@/lib/eval/asm-source';
import { normalizeRainfallCarrier, resolveSelectedTable, resolveColumn, facilityReturnPeriod } from '@/lib/eval/rainfall-tables';

export const A138_STANDARD_CODE = 'DWA-A-138-1';
export const A138_GL10_EQUATION_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

export type MirrorAccessor = {
  num(sym: string): number | null;
  str(sym: string): string | null;
  json(sym: string): unknown;
};
export type MirrorWrite = { worksheetCode: string; symbol: string; value: number | null };

const finite = (x: number | null): x is number => x != null && Number.isFinite(x);

export function normaliseFacility(raw: string | null): FacilityType | null {
  const v = raw?.toLowerCase() ?? null;
  return v === 'flaeche' || v === 'mulde' || v === 'rigole' || v === 'mre' || v === 'mrs' || v === 'schacht' || v === 'becken' ? v : null;
}
function normaliseMethod(raw: string | null): AsmMethod {
  return raw === 'geometry' || raw === 'soil_estimate' || raw === 'manual' ? raw : 'direct';
}
function bodenart(raw: string | null): Tab13Bodenart | null {
  return raw === 'mittel_feinsand' || raw === 'schluffig' ? raw : null;
}

/** The facility's rain column, resolved like the save path (table ref, then the facility's return period). */
export function facilityRainRows(
  sheetCode: string,
  acc: MirrorAccessor,
  forceT?: number,
): { rows: Array<{ D_min: number | null; r_D_n: number | null }>; T: number | null } | null {
  const table = resolveSelectedTable(normalizeRainfallCarrier(acc.json('r_D_n_table')), acc.str('rainfall_table_ref'));
  if (!table) return null;
  const T = forceT ?? facilityReturnPeriod(sheetCode, (s) => acc.num(s));
  const col = resolveColumn(table, T);
  if (col.status === 'missing' || col.rows.length === 0) return null;
  return { rows: col.rows, T };
}

export function mirrorA138(sheetCode: string, acc: MirrorAccessor): MirrorWrite[] {
  if (sheetCode === 'A138-12') {
    const method = normaliseMethod(acc.str('a_s_m_determination_method'));
    if (method === 'direct' || method === 'manual') return [];
    const facility = normaliseFacility(acc.str('facility_type_selected'));
    let geometryValue: number | null = null;
    if (method === 'geometry') {
      if (facility !== 'mulde' && facility !== 'mre' && facility !== 'mrs') return []; // Rigole one-shot etc.: A2
      const rain = facilityRainRows('A138-17', acc);
      const A_C = acc.num('A_C'); const h_M = acc.num('h_M'); const f_Z = acc.num('f_Z');
      const k_i = acc.num('k_i_Mulde') ?? acc.num('k_i');
      if (rain && finite(A_C) && finite(h_M) && finite(f_Z) && finite(k_i)) {
        geometryValue = computeMuldeGeometrySweep(rain.rows, { A_C, h_M, f_Z, k_i }).A_S_m;
      }
    }
    const r = materializeAsm({
      method, A_S_min: acc.num('A_S_min'), A_S_max: acc.num('A_S_max'), A_C: acc.num('A_C'),
      bodenart: bodenart(acc.str('soil_bodenart_tab13')), geometryValue, manualValue: null, manualProvenance: null,
      facilityType: facility, sourceWorksheet: null,
    });
    return [{ worksheetCode: 'A138-12', symbol: 'A_S_m', value: r.A_S_m }];
  }

  if (sheetCode === 'A138-17') {
    if (normaliseFacility(acc.str('facility_type_selected')) !== 'mulde') return []; // composites (mre/mrs): A2
    const out: MirrorWrite[] = [];
    const k_i_M = swaleDesignInfiltrationRate(null, acc.num('k_i'), null);
    out.push({ worksheetCode: 'A138-17', symbol: 'k_i_Mulde', value: k_i_M });
    const A_C = acc.num('A_C'); const A_S_m = acc.num('A_S_m'); const f_Z = acc.num('f_Z'); const h_M = acc.num('h_M');
    const A_VA = acc.num('A_VA_Mulde') ?? acc.num('A_VA') ?? A_S_m;
    const rain = facilityRainRows('A138-17', acc);
    if (rain && finite(A_C) && finite(A_S_m) && finite(f_Z) && finite(A_VA) && finite(k_i_M)) {
      const req = computeMuldeRequiredVolumeSweep(rain.rows, { A_C, A_VA, A_S_m, k_i: k_i_M, f_Z });
      out.push({ worksheetCode: 'A138-17', symbol: 'V_M_erf', value: req.V_M_erf });
      out.push({ worksheetCode: 'A138-17', symbol: 'D_used_M', value: req.governingD });
      out.push({ worksheetCode: 'A138-17', symbol: 'r_D_n_used_M', value: req.r_D_at_governing });
    } else {
      for (const s of ['V_M_erf', 'D_used_M', 'r_D_n_used_M']) out.push({ worksheetCode: 'A138-17', symbol: s, value: null });
    }
    out.push({ worksheetCode: 'A138-17', symbol: 'V_M', value: facilityGoverningVolume('mulde', { A_S_m, h_M }) });
    return out;
  }
  return [];
}
