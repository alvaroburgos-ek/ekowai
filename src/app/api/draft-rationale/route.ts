import { NextResponse } from 'next/server';

/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * Previously looked up calculations + DWA-A-201 worksheets + ran the
 * now-deleted engine to supply context to the LLM for rationale
 * generation. Plan 6 retargets to worksheet_instances +
 * project_parameters + the new DB-driven field schema.
 */

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Rationale draft pending Plan 6 reattachment' },
    { status: 410 },
  );
}
