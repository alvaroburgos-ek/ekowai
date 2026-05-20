import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'PDF generation pending Plan 6 reattachment' },
    { status: 410 },
  );
}
