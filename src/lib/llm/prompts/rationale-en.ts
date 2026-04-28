import type { RationaleRequest } from '../types';

export function promptEn(req: RationaleRequest): string {
  const inputsTable = Object.entries(req.inputs)
    .map(([k, v]) => `- ${k} = ${JSON.stringify(v)}`)
    .join('\n');
  const computedTable = Object.entries(req.computed)
    .map(([k, v]) => `- ${k} = ${v}`)
    .join('\n');

  return `You are a planning engineer drafting an explanatory note for a sizing calculation per ${req.regulation} ${req.regulationVersion}, worksheet ${req.worksheetId}.

Inputs:
${inputsTable}

Computed results:
${computedTable}

Write a factual rationale (4–8 sentences) in engineering register:
- Describe the basis of design and the key assumptions.
- Reference the relevant § sections of the standards (e.g. "per §A 6.5.1").
- Avoid marketing language, avoid speculation. Use only the values above.
- If values look plausible, note this briefly; if unusual, recommend a sanity check.

Return only the rationale text — no preamble, no bullet lists.`;
}
