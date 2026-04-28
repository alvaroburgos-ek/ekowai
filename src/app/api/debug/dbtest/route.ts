import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Temporary debug endpoint — remove once production DB connection is healthy.
// Gated to dev autologin scope: only enabled when DEV_AUTOLOGIN_EMAIL is set.
export async function GET() {
  if (!process.env.DEV_AUTOLOGIN_EMAIL) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const url = process.env.DATABASE_URL ?? '(unset)';
  const safeUrl = url.replace(/:[^:@/]+@/, ':***@');

  try {
    const result = await db.execute(sql`select 1 as ok`);
    return NextResponse.json({
      ok: true,
      url: safeUrl,
      result,
    });
  } catch (e) {
    const err = e as Error & { code?: string; cause?: Error & { message?: string; hint?: string; detail?: string; routine?: string } };
    return NextResponse.json(
      {
        ok: false,
        url: safeUrl,
        message: err.message,
        code: err.code,
        causeMessage: err.cause?.message,
        causeDetail: err.cause?.detail,
        causeHint: err.cause?.hint,
        causeRoutine: err.cause?.routine,
        causeFull: err.cause,
      },
      { status: 500 },
    );
  }
}
