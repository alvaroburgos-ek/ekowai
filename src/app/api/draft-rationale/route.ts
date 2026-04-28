import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { calculations, orgMembers } from '@/lib/db/schema';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.2';
import { compute } from '@/lib/engine';
import { draftRationale } from '@/lib/llm/client';
import { checkRateLimit } from '@/lib/llm/rate-limit';
import { env } from '@/env';

const schema = z.object({
  calcId: z.string().uuid(),
  locale: z.enum(['de', 'en']),
});

export async function POST(request: NextRequest) {
  if (!env.GROQ_API_KEY && !env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: 'llm_not_configured', message: 'No LLM provider configured.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipLimit = checkRateLimit(`ip:${ip}`, 20, 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: { 'retry-after': String(Math.ceil((ipLimit.retryAfterMs ?? 0) / 1000)) },
      },
    );
  }

  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, body.data.calcId))
    .limit(1);
  if (!calc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id));
  if (!memberships.some((m) => m.orgId === calc.orgId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const orgLimit = checkRateLimit(`org:${calc.orgId}`, 200, 60_000);
  if (!orgLimit.ok) return NextResponse.json({ error: 'org_rate_limited' }, { status: 429 });

  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) return NextResponse.json({ error: 'unknown_worksheet' }, { status: 500 });

  const result = compute(
    worksheet,
    (calc.inputs ?? {}) as Record<string, number | string | boolean | null>,
  );

  try {
    const { text, provider } = await draftRationale({
      worksheetId: worksheet.id,
      regulation: worksheet.regulation,
      regulationVersion: worksheet.regulationVersion,
      inputs: (calc.inputs ?? {}) as Record<string, number | string | boolean | null>,
      computed: result.computed,
      locale: body.data.locale,
    });

    await db
      .update(calculations)
      .set({ rationaleDraft: text, updatedAt: new Date() })
      .where(eq(calculations.id, calc.id));

    return NextResponse.json({ text, provider });
  } catch (e) {
    return NextResponse.json(
      { error: 'llm_failed', message: e instanceof Error ? e.message : 'unknown' },
      { status: 502 },
    );
  }
}
