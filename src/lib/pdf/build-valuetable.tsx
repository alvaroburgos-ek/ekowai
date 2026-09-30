import 'server-only';
import { renderPdf } from './render-pdf';
import { ValuetableDocument } from '@/components/pdf/valuetable-document';
import { loadValuetableData, type ValuetableData, type ValuetableRow } from './load-valuetable';

/**
 * Raised when the Wertetabelle cannot be rendered. Carries the rows that make the
 * renderer fail (found by bisection) so the route can name them instead of returning
 * an opaque PDF-writer message. Readiness run 2026-09-30: prod returned 500
 * "unsupported number: -1.77e+21" for DWA-A-138-1 and no local reproduction of the
 * visible worksheet values reproduced it — the failing input has to be named by the
 * deployed build itself.
 */
export class ValuetableRenderError extends Error {
  readonly offendingRows: ValuetableRow[];
  constructor(message: string, offendingRows: ValuetableRow[]) {
    super(message);
    this.name = 'ValuetableRenderError';
    this.offendingRows = offendingRows;
  }
}

const MAX_BISECTION_RENDERS = 40;

async function render(data: ValuetableData): Promise<Buffer> {
  return renderPdf(<ValuetableDocument data={data} />);
}

/** Smallest rows that fail on their own, found by halving; bounded so a broken renderer cannot loop. */
async function findOffendingRows(data: ValuetableData): Promise<ValuetableRow[]> {
  const budget = { renders: 0 };
  const failing: ValuetableRow[] = [];
  const failsAlone = async (rows: ValuetableRow[]): Promise<boolean> => {
    if (budget.renders >= MAX_BISECTION_RENDERS) return false;
    budget.renders += 1;
    try {
      await render({ ...data, rows });
      return false;
    } catch {
      return true;
    }
  };
  const walk = async (rows: ValuetableRow[]): Promise<void> => {
    if (rows.length === 0) return;
    if (!(await failsAlone(rows))) return;
    if (rows.length === 1) {
      failing.push(rows[0]);
      return;
    }
    const mid = Math.floor(rows.length / 2);
    await walk(rows.slice(0, mid));
    await walk(rows.slice(mid));
  };
  await walk(data.rows);
  return failing;
}

export async function buildValuetablePdf(data: ValuetableData): Promise<Buffer> {
  try {
    return await render(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const offending = await findOffendingRows(data);
    throw new ValuetableRenderError(message, offending);
  }
}

export { loadValuetableData };
